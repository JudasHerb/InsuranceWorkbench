using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using UnderwriterWorkbench.Core.Models;
using UnderwriterWorkbench.Infrastructure.Agents;

namespace UnderwriterWorkbench.Api.Controllers;

[ApiController]
[Route("api/v1/devtools")]
public class DevToolsController : ControllerBase
{
    private readonly DevAgentService _devAgent;
    private readonly CosmosClient _cosmos;
    private readonly IConfiguration _config;

    public DevToolsController(DevAgentService devAgent, CosmosClient cosmos, IConfiguration config)
    {
        _devAgent = devAgent;
        _cosmos = cosmos;
        _config = config;
    }

    private Microsoft.Azure.Cosmos.Container GetContainer() =>
        _cosmos.GetContainer(_config["CosmosDb:DatabaseName"] ?? "underwriter-workbench", "devtools");

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDevToolRequest req)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var connectionId = HttpContext.Connection.Id;

        var tool = await _devAgent.StartAsync(req.SubmissionId, req.TaskDescription, connectionId, userId);

        return Accepted(new
        {
            devToolId = tool.Id,
            taskId = tool.AgentTaskId,
            status = tool.PodStatus,
            networkPolicyProposal = new
            {
                allowedEgress = tool.NetworkPolicy.AllowedEgress,
                reasoning = tool.NetworkPolicy.Reasoning
            }
        });
    }

    [HttpPost("{devToolId}/approve-network-policy")]
    public async Task<IActionResult> ApproveNetworkPolicy(string devToolId, [FromBody] ApproveNetworkPolicyRequest req)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var container = GetContainer();

        DevTool? tool = null;
        try
        {
            var response = await container.ReadItemAsync<DevTool>(devToolId, new PartitionKey(userId));
            tool = response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return NotFound();
        }

        if (!req.Approved)
        {
            tool.PodStatus = "failed";
            await container.UpsertItemAsync(tool, new PartitionKey(tool.OwnerId));
            return BadRequest(new { error = "NETWORK_POLICY_REJECTED" });
        }

        tool.NetworkPolicy.ApprovedBy = userId;
        tool.NetworkPolicy.ApprovedAt = DateTime.UtcNow;
        await container.UpsertItemAsync(tool, new PartitionKey(tool.OwnerId));

        return Ok(new { devToolId, status = "building" });
    }

    [HttpPost("{devToolId}/promote")]
    public async Task<IActionResult> Promote(string devToolId, [FromBody] PromoteDevToolRequest req)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var container = GetContainer();

        DevTool? tool;
        try
        {
            var response = await container.ReadItemAsync<DevTool>(devToolId, new PartitionKey(userId));
            tool = response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return NotFound();
        }

        tool.Ephemeral = false;
        tool.Name = req.Name;
        tool.Description = req.Description;
        await container.UpsertItemAsync(tool, new PartitionKey(tool.OwnerId));

        return Ok(new { devToolId, ephemeral = false, routeUrl = tool.RouteUrl });
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var container = GetContainer();

        var query = container.GetItemLinqQueryable<DevTool>(allowSynchronousQueryExecution: false)
            .Where(t => t.OwnerId == userId && !t.Ephemeral);

        using var iterator = query.ToFeedIterator();
        var tools = new List<DevTool>();
        while (iterator.HasMoreResults)
        {
            var batch = await iterator.ReadNextAsync();
            tools.AddRange(batch);
        }

        return Ok(new { items = tools });
    }

    [HttpPost("{devToolId}/open")]
    public async Task<IActionResult> Open(string devToolId, [FromBody] OpenDevToolRequest req)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var container = GetContainer();

        DevTool? tool;
        try
        {
            var response = await container.ReadItemAsync<DevTool>(devToolId, new PartitionKey(userId));
            tool = response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return NotFound();
        }

        return Ok(new { devToolId, routeUrl = tool.RouteUrl, status = tool.PodStatus });
    }

    [HttpDelete("{devToolId}")]
    public async Task<IActionResult> Delete(string devToolId)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        await _devAgent.CleanupAsync(devToolId, userId);
        return NoContent();
    }
}

public class CreateDevToolRequest
{
    public string SubmissionId { get; set; } = string.Empty;
    public string TaskDescription { get; set; } = string.Empty;
}

public class ApproveNetworkPolicyRequest
{
    public bool Approved { get; set; }
}

public class PromoteDevToolRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class OpenDevToolRequest
{
    public string SubmissionId { get; set; } = string.Empty;
}
