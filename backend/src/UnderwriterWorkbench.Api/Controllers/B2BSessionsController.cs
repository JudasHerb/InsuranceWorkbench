using Microsoft.AspNetCore.Mvc;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;
using UnderwriterWorkbench.Infrastructure.Agents;

namespace UnderwriterWorkbench.Api.Controllers;

[ApiController]
[Route("api/v1/submissions/{submissionId}/b2b-sessions")]
public class B2BSessionsController : ControllerBase
{
    private readonly ISubmissionRepository _repo;
    private readonly B2BSessionQueue _queue;

    public B2BSessionsController(ISubmissionRepository repo, B2BSessionQueue queue)
    {
        _repo = repo;
        _queue = queue;
    }

    [HttpPost]
    public async Task<IActionResult> Initiate(string submissionId, [FromBody] InitiateB2BSessionRequest req)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        var layer = submission.Layers.FirstOrDefault(l => l.Id == req.LayerId);
        if (layer is null) return NotFound(new { error = "LAYER_NOT_FOUND" });

        var panel = layer.FacriPanels.FirstOrDefault(p => p.Id == req.FacriPanelId);
        if (panel is null) return NotFound(new { error = "FACRI_PANEL_NOT_FOUND" });

        var session = new B2BSession
        {
            Id = Guid.NewGuid().ToString(),
            SubmissionId = submissionId,
            LayerId = req.LayerId,
            FacriPanelId = req.FacriPanelId,
            Counterparty = new B2BCounterparty
            {
                Firm = panel.ReinsurerName,
                AgentEndpoint = panel.ReinsurerAgentEndpoint ?? ""
            },
            Mandate = req.Mandate,
            Status = "active"
        };

        session = await _repo.CreateB2BSessionAsync(session);

        await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
        {
            Action = "b2b-session-started",
            Summary = $"B2B session started with {panel.ReinsurerName}",
            Actor = new AuditActor { Type = "user", Id = userId, DisplayName = "Underwriter" }
        });

        _queue.Enqueue(new B2BSessionRequest
        {
            SessionId = session.Id,
            SubmissionId = submissionId,
            UserId = userId
        });

        return CreatedAtAction(nameof(GetSession), new { submissionId, sessionId = session.Id }, new
        {
            sessionId = session.Id,
            status = session.Status
        });
    }

    [HttpGet("{sessionId}")]
    public async Task<IActionResult> GetSession(string submissionId, string sessionId)
    {
        var session = await _repo.GetB2BSessionAsync(submissionId, sessionId);
        if (session is null) return NotFound();
        return Ok(session);
    }

    [HttpPost("{sessionId}/respond")]
    public async Task<IActionResult> Respond(string submissionId, string sessionId, [FromBody] B2BRespondRequest req)
    {
        var session = await _repo.GetB2BSessionAsync(submissionId, sessionId);
        if (session is null) return NotFound();

        if (req.Action == "accept")
        {
            session.Status = "agreed";
            session.ConcludedAt = DateTime.UtcNow;
        }
        else if (req.Action == "reject")
        {
            session.Status = "rejected";
            session.ConcludedAt = DateTime.UtcNow;
        }

        await _repo.UpdateB2BSessionAsync(session);
        return Ok(new { sessionId, status = session.Status });
    }
}

public class InitiateB2BSessionRequest
{
    public string LayerId { get; set; } = string.Empty;
    public string FacriPanelId { get; set; } = string.Empty;
    public B2BMandate Mandate { get; set; } = new();
}

public class B2BRespondRequest
{
    public string Action { get; set; } = string.Empty;
    public Dictionary<string, object?>? CounterPayload { get; set; }
}
