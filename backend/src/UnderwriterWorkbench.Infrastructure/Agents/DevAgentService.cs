using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using CosmosContainer = Microsoft.Azure.Cosmos.Container;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Infrastructure.Agents;

public class DevAgentService
{
    private readonly ISubmissionRepository _repo;
    private readonly IOpenShiftApiClient _openShift;
    private readonly IWorkbenchNotifier _notifier;
    private readonly CosmosClient _cosmos;
    private readonly IConfiguration _config;
    private readonly ILogger<DevAgentService> _logger;
    private const string Namespace = "uw-devtools";

    public DevAgentService(
        ISubmissionRepository repo,
        IOpenShiftApiClient openShift,
        IWorkbenchNotifier notifier,
        CosmosClient cosmos,
        IConfiguration config,
        ILogger<DevAgentService> logger)
    {
        _repo = repo;
        _openShift = openShift;
        _notifier = notifier;
        _cosmos = cosmos;
        _config = config;
        _logger = logger;
    }

    public async Task<DevTool> StartAsync(string submissionId, string taskDescription, string connectionId, string userId)
    {
        var db = _config["CosmosDb:DatabaseName"] ?? "underwriter-workbench";
        var container = _cosmos.GetContainer(db, "devtools");

        var toolId = Guid.NewGuid().ToString();
        var tool = new DevTool
        {
            Id = toolId,
            OwnerId = userId,
            PodName = $"devtool-{toolId[..8]}",
            AgentTaskId = Guid.NewGuid().ToString(),
            SessionConnectionId = connectionId,
            Description = taskDescription,
            PodStatus = "building"
        };

        var response = await container.CreateItemAsync(tool, new PartitionKey(tool.OwnerId));
        tool = response.Resource;

        _ = Task.Run(() => RunBuildPipelineAsync(tool, submissionId, taskDescription, connectionId, userId, container));

        return tool;
    }

    private async Task RunBuildPipelineAsync(DevTool tool, string submissionId, string taskDescription, string connectionId, string userId, CosmosContainer container)
    {
        async Task Log(string phase, string line, string? toolUrl = null)
        {
            await _notifier.SendDevToolBuildLogAsync(connectionId, new
            {
                devToolId = tool.Id, taskId = tool.AgentTaskId,
                logLine = line, phase, toolUrl
            });
        }

        try
        {
            await Log("generating", "Generating tool source code...");
            var (sourceCode, networkPolicy) = await GenerateCodeAsync(taskDescription);
            tool.SourceCode = sourceCode;
            tool.NetworkPolicy = networkPolicy;
            tool.PodStatus = "building";
            await container.UpsertItemAsync(tool, new PartitionKey(tool.OwnerId));

            await _notifier.SendNetworkPolicyApprovalRequiredAsync(connectionId, new
            {
                devToolId = tool.Id, taskId = tool.AgentTaskId,
                networkPolicyProposal = new
                {
                    allowedEgress = tool.NetworkPolicy.AllowedEgress,
                    reasoning = tool.NetworkPolicy.Reasoning
                }
            });

            // Wait for UW approval (poll with timeout)
            var deadline = DateTime.UtcNow.AddMinutes(10);
            while (DateTime.UtcNow < deadline)
            {
                await Task.Delay(2000);
                var current = await GetDevToolAsync(container, tool.Id, tool.OwnerId);
                if (current?.NetworkPolicy?.ApprovedBy is not null) { tool = current; break; }
                if (current?.PodStatus == "failed") return;
            }

            if (tool.NetworkPolicy?.ApprovedBy is null)
            {
                tool.PodStatus = "failed";
                await container.UpsertItemAsync(tool, new PartitionKey(tool.OwnerId));
                return;
            }

            await Log("building", "Building container image...");
            tool.ImageRef = $"acr.azurecr.io/devtools/{tool.Id}:latest";
            await Task.Delay(1000);
            await Log("pushing", "Pushing image to ACR...");
            await Task.Delay(500);

            await Log("deploying", "Creating OpenShift pod...");
            await _openShift.CreatePodAsync(tool.PodName!, tool.ImageRef, Namespace);
            var routeUrl = await _openShift.ProvisionRouteAsync(tool.PodName!, Namespace);
            tool.RouteUrl = routeUrl;
            tool.PodStatus = "running";
            await container.UpsertItemAsync(tool, new PartitionKey(tool.OwnerId));

            await Log("ready", "Tool is ready!", routeUrl);

            await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
            {
                Action = "devtool-built",
                Summary = $"Developer tool '{tool.Name}' built and deployed",
                Actor = new AuditActor { Type = "agent", Id = "developer", DisplayName = "Developer Agent" }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DevTool build failed for {ToolId}", tool.Id);
            tool.PodStatus = "failed";
            await container.UpsertItemAsync(tool, new PartitionKey(tool.OwnerId));
            await Log("failed", $"Build failed: {ex.Message}");
        }
    }

    private async Task<(string SourceCode, DevToolNetworkPolicy Policy)> GenerateCodeAsync(string description)
    {
        var apiKey = _config["Claude:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "test-key")
        {
            return (
                "<html><body><h1>Layer Pricing Calculator</h1><p>Mock tool</p></body></html>",
                new DevToolNetworkPolicy
                {
                    AllowedEgress = ["https://api.exchangerate.host"],
                    Reasoning = "Exchange rate API needed for currency conversion"
                }
            );
        }

        var client = new AnthropicClient(apiKey);
        var prompt = $$"""
            Generate a simple single-file HTML tool: {{description}}
            Also propose a network egress policy (list of URLs the tool needs to call).
            Return JSON: {"sourceCode": "html string", "allowedEgress": ["url"], "reasoning": "why these URLs are needed"}
            """;

        var response = await client.Messages.GetClaudeMessageAsync(new MessageParameters
        {
            Model = _config["Claude:AgentModel"] ?? "claude-opus-4-6",
            MaxTokens = 2048,
            Messages = [new() { Role = RoleType.User, Content = [new TextContent { Text = prompt }] }]
        });

        var text = response.Content.OfType<TextContent>().FirstOrDefault()?.Text ?? "{}";
        var doc = JsonDocument.Parse(text);
        var sourceCode = doc.RootElement.GetProperty("sourceCode").GetString() ?? "<html><body>Tool</body></html>";
        var egress = doc.RootElement.GetProperty("allowedEgress").EnumerateArray().Select(e => e.GetString() ?? "").ToList();
        var reasoning = doc.RootElement.GetProperty("reasoning").GetString() ?? "";

        return (sourceCode, new DevToolNetworkPolicy { AllowedEgress = egress, Reasoning = reasoning });
    }

    private static async Task<DevTool?> GetDevToolAsync(CosmosContainer container, string id, string ownerId)
    {
        try
        {
            var r = await container.ReadItemAsync<DevTool>(id, new PartitionKey(ownerId));
            return r.Resource;
        }
        catch { return null; }
    }

    public async Task CleanupAsync(string devToolId, string ownerId)
    {
        var db = _config["CosmosDb:DatabaseName"] ?? "underwriter-workbench";
        var container = _cosmos.GetContainer(db, "devtools");
        var tool = await GetDevToolAsync(container, devToolId, ownerId);
        if (tool?.PodName is null) return;

        await _openShift.DeletePodAsync(tool.PodName, Namespace);
        tool.PodStatus = "stopped";
        await container.UpsertItemAsync(tool, new PartitionKey(tool.OwnerId));
    }
}
