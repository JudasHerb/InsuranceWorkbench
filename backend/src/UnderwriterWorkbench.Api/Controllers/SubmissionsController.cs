using Microsoft.AspNetCore.Mvc;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;
using UnderwriterWorkbench.Infrastructure.Agents;
using UnderwriterWorkbench.Infrastructure.Portfolio;

namespace UnderwriterWorkbench.Api.Controllers;

[ApiController]
[Route("api/v1/submissions")]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionRepository _repo;
    private readonly NamesClearanceService _namesClearance;
    private readonly PortfolioSnapshotService _portfolio;
    private readonly IWorkbenchNotifier _notifier;

    public SubmissionsController(
        ISubmissionRepository repo,
        NamesClearanceService namesClearance,
        PortfolioSnapshotService portfolio,
        IWorkbenchNotifier notifier)
    {
        _repo = repo;
        _namesClearance = namesClearance;
        _portfolio = portfolio;
        _notifier = notifier;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSubmissionRequest req)
    {
        if (!ReferenceData.EuropeanTerritories.Contains(req.RiskDetails.Territory))
            return BadRequest(new { error = "INVALID_TERRITORY" });

        if (!ReferenceData.LinesOfBusiness.Contains(req.RiskDetails.LineOfBusiness))
            return BadRequest(new { error = "INVALID_LINE_OF_BUSINESS" });

        if (req.RiskDetails.CoverageTypes.Count > 0 &&
            ReferenceData.CoverageByLob.TryGetValue(req.RiskDetails.LineOfBusiness, out var validCoverages))
        {
            var invalid = req.RiskDetails.CoverageTypes.Where(c => !validCoverages.Contains(c)).ToList();
            if (invalid.Count > 0)
                return BadRequest(new { error = "INVALID_COVERAGE_TYPES", invalid });
        }

        var userId = User.Identity?.Name ?? "anonymous";
        var submission = new Submission
        {
            Id = Guid.NewGuid().ToString(),
            SubmissionId = Guid.NewGuid().ToString(),
            Status = "draft",
            RiskDetails = req.RiskDetails,
            CreatedBy = userId
        };
        submission.Id = submission.SubmissionId;

        submission = await _repo.CreateAsync(submission);

        await _repo.AppendAuditEntryAsync(submission.SubmissionId, new AuditLogEntry
        {
            Action = "submission-created",
            Summary = $"Submission created for {submission.RiskDetails.InsuredName}",
            Actor = new AuditActor { Type = "user", Id = userId, DisplayName = "Underwriter" }
        });

        // Initial clearance: insured + broker only (cedant not yet assigned)
        var initialEntities = new List<ClearanceEntity>
        {
            new(submission.RiskDetails.InsuredName, "insured"),
            new(submission.RiskDetails.Broker, "broker"),
        };
        _ = Task.Run(() => _namesClearance.RunAsync(submission.SubmissionId, userId, initialEntities));

        return CreatedAtAction(nameof(GetById), new { submissionId = submission.SubmissionId }, new
        {
            submissionId = submission.SubmissionId,
            status = submission.Status,
            namesClearance = new { status = "pending", taskId = (string?)null }
        });
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? territory,
        [FromQuery] string? lineOfBusiness,
        [FromQuery] string? cedant,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        var (items, total) = await _repo.ListAsync(status, territory, lineOfBusiness, cedant, page, pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{submissionId}")]
    public async Task<IActionResult> GetById(string submissionId)
    {
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();
        return Ok(submission);
    }

    [HttpPatch("{submissionId}")]
    public async Task<IActionResult> Update(string submissionId, [FromBody] PatchSubmissionRequest req)
    {
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        var userId = User.Identity?.Name ?? "anonymous";
        var previousCedant = submission.RiskDetails.Cedant;

        if (req.RiskDetails is not null)
        {
            if (req.RiskDetails.InsuredName is not null) submission.RiskDetails.InsuredName = req.RiskDetails.InsuredName;
            if (req.RiskDetails.Cedant is not null) submission.RiskDetails.Cedant = req.RiskDetails.Cedant;
            if (req.RiskDetails.Broker is not null) submission.RiskDetails.Broker = req.RiskDetails.Broker;
            if (req.RiskDetails.LineOfBusiness is not null) submission.RiskDetails.LineOfBusiness = req.RiskDetails.LineOfBusiness;
            if (req.RiskDetails.Territory is not null) submission.RiskDetails.Territory = req.RiskDetails.Territory;
            if (req.RiskDetails.CoverageTypes is not null) submission.RiskDetails.CoverageTypes = req.RiskDetails.CoverageTypes;
            if (req.RiskDetails.InceptionDate is not null) submission.RiskDetails.InceptionDate = req.RiskDetails.InceptionDate;
            if (req.RiskDetails.ExpiryDate is not null) submission.RiskDetails.ExpiryDate = req.RiskDetails.ExpiryDate;
        }

        if (req.Status is not null)
            submission.Status = req.Status;

        submission.UpdatedAt = DateTime.UtcNow;
        submission = await _repo.UpdateAsync(submission);

        // Re-run names clearance when cedant is first assigned or changed
        var newCedant = submission.RiskDetails.Cedant;
        if (!string.IsNullOrWhiteSpace(newCedant) && newCedant != previousCedant)
        {
            var entities = new List<ClearanceEntity>
            {
                new(submission.RiskDetails.InsuredName, "insured"),
                new(newCedant, "cedant"),
                new(submission.RiskDetails.Broker, "broker"),
            };
            _ = Task.Run(() => _namesClearance.RunAsync(submissionId, userId, entities));
        }

        return Ok(submission);
    }

    [HttpPost("{submissionId}/bind")]
    public async Task<IActionResult> Bind(string submissionId)
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var submission = await _repo.GetByIdAsync(submissionId);
        if (submission is null) return NotFound();

        if (submission.NamesClearance.Status == "blocked")
            return UnprocessableEntity(new { error = "BIND_BLOCKED", reason = "names-clearance-blocked" });

        if (submission.LegalReview.Recommendation is null)
            return UnprocessableEntity(new { error = "BIND_BLOCKED", reason = "legal-review-required" });

        if (submission.LegalReview.Recommendation == "escalate")
            return UnprocessableEntity(new { error = "BIND_BLOCKED", reason = "legal-review-escalated" });

        if (!submission.Layers.Any())
            return UnprocessableEntity(new { error = "BIND_BLOCKED", reason = "no-layers" });

        submission.Status = "bound";
        submission.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(submission);

        await _repo.AppendAuditEntryAsync(submissionId, new AuditLogEntry
        {
            Action = "submission-bound",
            Summary = "Submission bound",
            Actor = new AuditActor { Type = "user", Id = userId, DisplayName = "Underwriter" }
        });

        await _notifier.SendSubmissionStatusChangedAsync(submissionId, new
        {
            submissionId, status = "bound", boundAt = DateTime.UtcNow
        });

        _ = Task.Run(() => _portfolio.RefreshAsync(userId));

        return Ok(new { submissionId, status = "bound", boundAt = DateTime.UtcNow });
    }
}

public class CreateSubmissionRequest
{
    public RiskDetails RiskDetails { get; set; } = new();
}

public class PatchSubmissionRequest
{
    public PatchRiskDetails? RiskDetails { get; set; }
    public string? Status { get; set; }
}

public class PatchRiskDetails
{
    public string? InsuredName { get; set; }
    public string? Cedant { get; set; }
    public string? Broker { get; set; }
    public string? LineOfBusiness { get; set; }
    public string? Territory { get; set; }
    public List<string>? CoverageTypes { get; set; }
    public string? InceptionDate { get; set; }
    public string? ExpiryDate { get; set; }
}
