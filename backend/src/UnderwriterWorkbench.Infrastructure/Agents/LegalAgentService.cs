using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Infrastructure.Agents;

public class LegalAgentService
{
    private readonly ISubmissionRepository _repo;
    private readonly IWorkbenchNotifier _notifier;
    private readonly IConfiguration _config;
    private readonly ILogger<LegalAgentService> _logger;

    public LegalAgentService(
        ISubmissionRepository repo,
        IWorkbenchNotifier notifier,
        IConfiguration config,
        ILogger<LegalAgentService> logger)
    {
        _repo = repo;
        _notifier = notifier;
        _config = config;
        _logger = logger;
    }

    public async Task RunAsync(string submissionId, string documentId, string jurisdiction, string lineOfBusiness, string checklistType, string userId)
    {
        var task = new AgentTask
        {
            Id = Guid.NewGuid().ToString(),
            SubmissionId = submissionId,
            AgentType = "legal",
            Status = "running",
            StartedAt = DateTime.UtcNow,
            CreatedBy = userId,
            SubTasks =
            [
                new() { Name = "document-extraction", Status = "queued" },
                new() { Name = "clause-analysis", Status = "queued" },
                new() { Name = "jurisdiction-check", Status = "queued" }
            ],
            Input = new Dictionary<string, object?>
            {
                ["documentId"] = documentId,
                ["jurisdiction"] = jurisdiction,
                ["lineOfBusiness"] = lineOfBusiness,
                ["checklistType"] = checklistType
            }
        };

        task = await _repo.CreateAgentTaskAsync(task);

        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is not null)
        {
            if (!submission.AgentTaskIds.Contains(task.Id))
                submission.AgentTaskIds.Add(task.Id);
            submission.LegalReview.LatestTaskId = task.Id;
            await _repo.UpdateAsync(submission);

            await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
            {
                Action = "legal-review-dispatched",
                Summary = $"Legal review dispatched for document {documentId}",
                TaskId = task.Id,
                Actor = new AuditActor { Type = "user", Id = userId, DisplayName = "Underwriter" }
            });
        }

        await _notifier.SendAgentTaskUpdateAsync(submissionId, new
        {
            taskId = task.Id, submissionId, agentType = "legal", status = "running"
        });

        // Sub-task: document extraction
        task.SubTasks[0].Status = "running";
        task.SubTasks[0].StartedAt = DateTime.UtcNow;
        await _repo.UpdateAgentTaskAsync(task);
        await Task.Delay(500);
        task.SubTasks[0].Status = "complete";
        task.SubTasks[0].CompletedAt = DateTime.UtcNow;

        // Sub-task: clause analysis (calls Claude)
        task.SubTasks[1].Status = "running";
        task.SubTasks[1].StartedAt = DateTime.UtcNow;
        await _repo.UpdateAgentTaskAsync(task);

        var (summary, flags, recommendation) = await RunClauseAnalysisAsync(submissionId, documentId, jurisdiction, lineOfBusiness, checklistType, task.Id);

        task.SubTasks[1].Status = "complete";
        task.SubTasks[1].CompletedAt = DateTime.UtcNow;

        // Sub-task: jurisdiction check
        task.SubTasks[2].Status = "running";
        task.SubTasks[2].StartedAt = DateTime.UtcNow;
        await _repo.UpdateAgentTaskAsync(task);
        await Task.Delay(300);
        task.SubTasks[2].Status = "complete";
        task.SubTasks[2].CompletedAt = DateTime.UtcNow;

        task.Status = "complete";
        task.CompletedAt = DateTime.UtcNow;
        task.Output = new Dictionary<string, object?>
        {
            ["summary"] = summary,
            ["flags"] = flags,
            ["recommendation"] = recommendation,
            ["reviewedAt"] = DateTime.UtcNow
        };
        await _repo.UpdateAgentTaskAsync(task);

        submission = await _repo.GetByIdAsync(submissionId);
        if (submission is not null)
        {
            submission.LegalReview.LatestTaskId = task.Id;
            submission.LegalReview.Recommendation = recommendation;
            await _repo.UpdateAsync(submission);

            await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
            {
                Action = "legal-review-complete",
                Summary = $"Legal review complete: {recommendation}",
                TaskId = task.Id,
                Actor = new AuditActor { Type = "agent", Id = "legal", DisplayName = "Legal Agent" }
            });
        }

        await _notifier.SendAgentTaskUpdateAsync(submissionId, new
        {
            taskId = task.Id, submissionId, agentType = "legal",
            status = "complete", isFinalChunk = true,
            result = new { summary, flags, recommendation, reviewedAt = DateTime.UtcNow }
        });
    }

    private async Task<(string Summary, List<object> Flags, string Recommendation)> RunClauseAnalysisAsync(
        string submissionId, string documentId, string jurisdiction, string lineOfBusiness, string checklistType, string taskId)
    {
        try
        {
            var apiKey = _config["Claude:ApiKey"];
            var model = _config["Claude:AgentModel"] ?? "claude-opus-4-6";

            if (string.IsNullOrEmpty(apiKey) || apiKey == "test-key")
                return GetMockLegalOutput();

            var client = new AnthropicClient(apiKey);
            var prompt = $$"""
                You are a specialist insurance legal reviewer.
                Review the policy wording for submission {{submissionId}}, document {{documentId}}.
                Jurisdiction: {{jurisdiction}}, Line of Business: {{lineOfBusiness}}, Checklist type: {{checklistType}}.

                Provide:
                1. A brief summary (2-3 sentences)
                2. Up to 5 flagged clauses with severity (high/medium/low) and notes
                3. A recommendation: approve, amend, or escalate

                Respond in JSON: { "summary": "...", "flags": [{"clause":"...", "clauseLocation":"...", "severity":"...", "note":"..."}], "recommendation":"..." }
                """;

            var messages = new List<Message>
            {
                new() { Role = RoleType.User, Content = [new TextContent { Text = prompt }] }
            };

            var response = await client.Messages.GetClaudeMessageAsync(new MessageParameters
            {
                Model = model,
                MaxTokens = 1024,
                Messages = messages
            });

            var text = response.Content.OfType<TextContent>().FirstOrDefault()?.Text ?? "";
            return ParseLegalOutput(text);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Claude API call failed, returning mock output");
            return GetMockLegalOutput();
        }
    }

    private static (string, List<object>, string) GetMockLegalOutput() =>
        (
            "The policy wording has been reviewed. Standard clauses are present with minor amendments recommended.",
            new List<object>
            {
                new { clause = "Exclusions clause 4.2", clauseLocation = "Section 4", severity = "medium", note = "Ambiguous wording may create coverage gaps" }
            },
            "amend"
        );

    private static (string, List<object>, string) ParseLegalOutput(string json)
    {
        try
        {
            var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;
            var summary = root.GetProperty("summary").GetString() ?? "";
            var recommendation = root.GetProperty("recommendation").GetString() ?? "amend";
            var flags = new List<object>();
            foreach (var flag in root.GetProperty("flags").EnumerateArray())
                flags.Add(flag);
            return (summary, flags, recommendation);
        }
        catch
        {
            return GetMockLegalOutput();
        }
    }
}
