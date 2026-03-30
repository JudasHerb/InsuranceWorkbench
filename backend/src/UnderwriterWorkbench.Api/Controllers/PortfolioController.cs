using Microsoft.AspNetCore.Mvc;
using UnderwriterWorkbench.Infrastructure.Portfolio;

namespace UnderwriterWorkbench.Api.Controllers;

[ApiController]
[Route("api/v1/portfolio")]
public class PortfolioController : ControllerBase
{
    private readonly PortfolioSnapshotService _portfolio;

    public PortfolioController(PortfolioSnapshotService portfolio) => _portfolio = portfolio;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? territory,
        [FromQuery] string? lineOfBusiness,
        [FromQuery] string? status)
    {
        var snapshot = await _portfolio.GetLatestAsync(territory, lineOfBusiness, status);
        if (snapshot is null)
        {
            var userId = User.Identity?.Name ?? "anonymous";
            snapshot = await _portfolio.RefreshAsync(userId);
        }
        return Ok(snapshot);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var userId = User.Identity?.Name ?? "anonymous";
        var snapshot = await _portfolio.RefreshAsync(userId);
        return Accepted(new { snapshotId = snapshot.Id });
    }
}
