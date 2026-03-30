using Microsoft.AspNetCore.Mvc;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Api.Controllers;

[ApiController]
[Route("api/v1/submissions/{submissionId}/layers")]
public class LayersController : ControllerBase
{
    private readonly ISubmissionRepository _repo;

    public LayersController(ISubmissionRepository repo) => _repo = repo;

    [HttpPost]
    public async Task<IActionResult> AddLayer(string submissionId, [FromBody] AddLayerRequest req)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        var layer = new Layer
        {
            Id = Guid.NewGuid().ToString(),
            LayerNo = submission.Layers.Count + 1,
            LayerType = req.LayerType,
            Limit = req.Limit,
            AttachmentPoint = req.AttachmentPoint,
            LineSize = req.LineSize,
            Premium = req.Premium,
            Currency = req.Currency
        };

        await _repo.AddLayerAsync(submissionId, layer);
        await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
        {
            Action = "layer-added",
            Summary = $"Layer {layer.LayerNo} added ({layer.LayerType}, limit {layer.Limit} {layer.Currency})",
            Actor = new AuditActor { Type = "user", Id = userId, DisplayName = "Underwriter" }
        });

        return CreatedAtAction(nameof(AddLayer), new { submissionId }, new
        {
            id = layer.Id,
            layerNo = layer.LayerNo,
            layerType = layer.LayerType,
            limit = layer.Limit,
            attachmentPoint = layer.AttachmentPoint,
            lineSize = layer.LineSize,
            premium = layer.Premium,
            currency = layer.Currency,
            status = layer.Status,
            facriPanels = layer.FacriPanels
        });
    }

    [HttpPut("{layerId}")]
    public async Task<IActionResult> UpdateLayer(string submissionId, string layerId, [FromBody] AddLayerRequest req)
    {
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        var existing = submission.Layers.FirstOrDefault(l => l.Id == layerId);
        if (existing is null) return NotFound();

        existing.LayerType = req.LayerType;
        existing.Limit = req.Limit;
        existing.AttachmentPoint = req.AttachmentPoint;
        existing.LineSize = req.LineSize;
        existing.Premium = req.Premium;
        existing.Currency = req.Currency;

        await _repo.UpdateLayerAsync(submissionId, existing);
        return Ok(existing);
    }

    [HttpDelete("{layerId}")]
    public async Task<IActionResult> DeleteLayer(string submissionId, string layerId)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        if (submission.Status == "bound")
            return UnprocessableEntity(new { error = "LAYER_LOCKED", reason = "Submission is bound" });

        await _repo.RemoveLayerAsync(submissionId, layerId);
        await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
        {
            Action = "layer-removed",
            Summary = $"Layer {layerId} removed",
            Actor = new AuditActor { Type = "user", Id = userId, DisplayName = "Underwriter" }
        });

        return NoContent();
    }
}

public class AddLayerRequest
{
    public string LayerType { get; set; } = "primary";
    public decimal Limit { get; set; }
    public decimal AttachmentPoint { get; set; }
    public decimal LineSize { get; set; }
    public decimal Premium { get; set; }
    public string Currency { get; set; } = "USD";
}
