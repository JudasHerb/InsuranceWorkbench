using Microsoft.AspNetCore.Mvc;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Infrastructure.Agents;

namespace UnderwriterWorkbench.Api.Controllers;

[ApiController]
public class AgentTasksController : ControllerBase
{
    private readonly ISubmissionRepository _repo;
    private readonly LegalAgentService _legalAgent;

    public AgentTasksController(ISubmissionRepository repo, LegalAgentService legalAgent)
    {
        _repo = repo;
        _legalAgent = legalAgent;
    }

    [HttpPost("api/v1/submissions/{submissionId}/agent-tasks")]
    public async Task<IActionResult> Dispatch(string submissionId, [FromBody] DispatchAgentTaskRequest req)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        if (req.AgentType == "legal")
        {
            var input = req.Input ?? new Dictionary<string, object?>();
            var documentId = input.TryGetValue("documentId", out var d) ? d?.ToString() ?? "" : "";
            var jurisdiction = input.TryGetValue("jurisdiction", out var j) ? j?.ToString() ?? "UK" : "UK";
            var lob = input.TryGetValue("lineOfBusiness", out var l) ? l?.ToString() ?? submission.RiskDetails.LineOfBusiness : submission.RiskDetails.LineOfBusiness;
            var checklistType = input.TryGetValue("checklistType", out var c) ? c?.ToString() ?? "standard" : "standard";

            var taskId = Guid.NewGuid().ToString();
            _ = Task.Run(() => _legalAgent.RunAsync(submissionId, documentId, jurisdiction, lob, checklistType, userId));

            return Accepted(new { taskId, status = "queued" });
        }

        return BadRequest(new { error = "UNSUPPORTED_AGENT_TYPE", agentType = req.AgentType });
    }

    [HttpGet("api/v1/submissions/{submissionId}/agent-tasks")]
    public async Task<IActionResult> List(string submissionId)
    {
        var tasks = await _repo.ListAgentTasksAsync(submissionId);
        return Ok(new { items = tasks });
    }

    [HttpGet("api/v1/submissions/{submissionId}/agent-tasks/{taskId}")]
    public async Task<IActionResult> GetById(string submissionId, string taskId)
    {
        var task = await _repo.GetAgentTaskAsync(submissionId, taskId);
        if (task is null) return NotFound();
        return Ok(task);
    }

    [HttpPost("api/v1/agent-tasks/batch")]
    public async Task<IActionResult> DispatchBatch([FromBody] BatchAgentTaskRequest req)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var tasks = new List<object>();

        foreach (var submissionId in req.SubmissionIds)
        {
            var submission = await _repo.GetByIdAsync(submissionId);
            if (submission is null) continue;

            var input = req.Input ?? new Dictionary<string, object?>();
            var checklistType = input.TryGetValue("checklistType", out var c) ? c?.ToString() ?? "standard" : "standard";
            var taskId = Guid.NewGuid().ToString();

            _ = Task.Run(() => _legalAgent.RunAsync(submissionId, "", "UK", submission.RiskDetails.LineOfBusiness, checklistType, userId));
            tasks.Add(new { submissionId, taskId });
        }

        return Accepted(new { tasks });
    }
}

public class DispatchAgentTaskRequest
{
    public string AgentType { get; set; } = string.Empty;
    public Dictionary<string, object?>? Input { get; set; }
}

public class BatchAgentTaskRequest
{
    public List<string> SubmissionIds { get; set; } = [];
    public string AgentType { get; set; } = "legal";
    public Dictionary<string, object?>? Input { get; set; }
}
