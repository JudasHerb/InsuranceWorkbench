using Microsoft.AspNetCore.Mvc;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Api.Controllers;

[ApiController]
[Route("api/v1/submissions/{submissionId}/layers/{layerId}/facri")]
public class FacRiController : ControllerBase
{
    private readonly ISubmissionRepository _repo;

    public FacRiController(ISubmissionRepository repo) => _repo = repo;

    [HttpPost]
    public async Task<IActionResult> AddFacriPanel(string submissionId, string layerId, [FromBody] AddFacriPanelRequest req)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        var layer = submission.Layers.FirstOrDefault(l => l.Id == layerId);
        if (layer is null) return NotFound();

        var panel = new FacRiPanel
        {
            FacriPanelId = Guid.NewGuid().ToString(),
            ReinsurerName = req.ReinsurerName,
            ReinsurerAgentEndpoint = req.ReinsurerAgentEndpoint,
            CededPct = req.CededPct,
            Status = "pending"
        };

        await _repo.AddFacriPanelAsync(submissionId, layerId, panel);
        await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
        {
            Action = "facri-panel-added",
            Summary = $"FacRi panel added: {req.ReinsurerName} ({req.CededPct:P0} cession)",
            Actor = new AuditActor { Type = "user", Id = userId, DisplayName = "Underwriter" }
        });

        return CreatedAtAction(nameof(AddFacriPanel), new { submissionId, layerId }, new
        {
            facriPanelId = panel.FacriPanelId,
            reinsurerName = panel.ReinsurerName,
            cededPct = panel.CededPct,
            status = panel.Status
        });
    }

    [HttpDelete("{facriPanelId}")]
    public async Task<IActionResult> DeleteFacriPanel(string submissionId, string layerId, string facriPanelId)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        await _repo.RemoveFacriPanelAsync(submissionId, layerId, facriPanelId);
        await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
        {
            Action = "facri-panel-removed",
            Summary = $"FacRi panel {facriPanelId} removed",
            Actor = new AuditActor { Type = "user", Id = userId, DisplayName = "Underwriter" }
        });

        return NoContent();
    }
}

public class AddFacriPanelRequest
{
    public string ReinsurerName { get; set; } = string.Empty;
    public string? ReinsurerAgentEndpoint { get; set; }
    public decimal CededPct { get; set; }
}
