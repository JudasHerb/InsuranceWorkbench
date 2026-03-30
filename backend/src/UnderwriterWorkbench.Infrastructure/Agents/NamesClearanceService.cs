using Microsoft.Extensions.Logging;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Infrastructure.Agents;

public class NamesClearanceService
{
    private readonly ISubmissionRepository _repo;
    private readonly ISanctionsApiClient _sanctions;
    private readonly IWorkbenchNotifier _notifier;
    private readonly ILogger<NamesClearanceService> _logger;

    public NamesClearanceService(
        ISubmissionRepository repo,
        ISanctionsApiClient sanctions,
        IWorkbenchNotifier notifier,
        ILogger<NamesClearanceService> logger)
    {
        _repo = repo;
        _sanctions = sanctions;
        _notifier = notifier;
        _logger = logger;
    }

    public async Task RunAsync(string submissionId, string userId)
    {
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return;

        var task = new AgentTask
        {
            Id = Guid.NewGuid().ToString(),
            SubmissionId = submissionId,
            AgentType = "names-clearance",
            Status = "running",
            StartedAt = DateTime.UtcNow,
            CreatedBy = userId,
            SubTasks =
            [
                new() { Name = "insured-check", Status = "queued" },
                new() { Name = "cedant-check", Status = "queued" },
                new() { Name = "broker-check", Status = "queued" }
            ],
            Input = new Dictionary<string, object?>
            {
                ["submissionId"] = submissionId,
                ["entities"] = new[]
                {
                    new { entityName = submission.RiskDetails.InsuredName, entityType = "insured", jurisdiction = submission.RiskDetails.Territory },
                    new { entityName = submission.RiskDetails.Cedant, entityType = "cedant", jurisdiction = submission.RiskDetails.Territory },
                    new { entityName = submission.RiskDetails.Broker, entityType = "broker", jurisdiction = submission.RiskDetails.Territory }
                }
            }
        };

        task = await _repo.CreateAgentTaskAsync(task);

        await _notifier.SendAgentTaskUpdateAsync(submissionId, new
        {
            taskId = task.Id, submissionId, agentType = "names-clearance", status = "running"
        });

        var entityChecks = new[]
        {
            (submission.RiskDetails.InsuredName, "insured", 0),
            (submission.RiskDetails.Cedant, "cedant", 1),
            (submission.RiskDetails.Broker, "broker", 2)
        };

        var results = new List<SanctionsResult>();
        foreach (var (name, entityType, idx) in entityChecks)
        {
            task.SubTasks[idx].Status = "running";
            task.SubTasks[idx].StartedAt = DateTime.UtcNow;
            await _repo.UpdateAgentTaskAsync(task);

            var result = await _sanctions.CheckEntityAsync(name, entityType, submission.RiskDetails.Territory);
            results.Add(result);

            task.SubTasks[idx].Status = "complete";
            task.SubTasks[idx].CompletedAt = DateTime.UtcNow;
            await _repo.UpdateAgentTaskAsync(task);
        }

        var overallStatus = results.Any(r => r.ClearanceStatus == "blocked") ? "blocked"
            : results.Any(r => r.ClearanceStatus == "refer") ? "refer"
            : "clear";

        task.Status = "complete";
        task.CompletedAt = DateTime.UtcNow;
        task.Output = new Dictionary<string, object?>
        {
            ["overallStatus"] = overallStatus,
            ["results"] = results,
            ["completedAt"] = DateTime.UtcNow
        };
        await _repo.UpdateAgentTaskAsync(task);

        submission = await _repo.GetByIdAsync(submissionId);
        if (submission is not null)
        {
            submission.NamesClearance.Status = overallStatus;
            submission.NamesClearance.TaskId = task.Id;
            submission.NamesClearance.CompletedAt = DateTime.UtcNow;
            if (!submission.AgentTaskIds.Contains(task.Id))
                submission.AgentTaskIds.Add(task.Id);
            await _repo.UpdateAsync(submission);

            await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
            {
                Action = "names-clearance-complete",
                Summary = $"Names clearance completed: {overallStatus}",
                TaskId = task.Id,
                Actor = new AuditActor { Type = "agent", Id = "names-clearance", DisplayName = "Names Clearance Agent" }
            });
        }

        await _notifier.SendAgentTaskUpdateAsync(submissionId, new
        {
            taskId = task.Id, submissionId, agentType = "names-clearance",
            status = "complete", isFinalChunk = true,
            result = new { overallStatus, completedAt = DateTime.UtcNow }
        });

        _logger.LogInformation("Names clearance for submission {SubmissionId}: {Status}", submissionId, overallStatus);
    }
}
