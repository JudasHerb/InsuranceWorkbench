using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Infrastructure.Portfolio;

public class PortfolioSnapshotService
{
    private readonly ISubmissionRepository _repo;
    private readonly CosmosClient _cosmos;
    private readonly IWorkbenchNotifier _notifier;
    private readonly IConfiguration _config;
    private readonly ILogger<PortfolioSnapshotService> _logger;

    public PortfolioSnapshotService(
        ISubmissionRepository repo,
        CosmosClient cosmos,
        IWorkbenchNotifier notifier,
        IConfiguration config,
        ILogger<PortfolioSnapshotService> logger)
    {
        _repo = repo;
        _cosmos = cosmos;
        _notifier = notifier;
        _config = config;
        _logger = logger;
    }

    public async Task<PortfolioSnapshot> RefreshAsync(string userId)
    {
        var submissions = await _repo.GetAllActiveAsync();

        var bound = submissions.Where(s => s.Status == "bound").ToList();
        var active = submissions.Where(s => s.Status is "in-review" or "bound").ToList();

        var snapshot = new PortfolioSnapshot
        {
            Id = Guid.NewGuid().ToString(),
            GeneratedAt = DateTime.UtcNow,
            ActiveSubmissionCount = active.Count,
            BoundSubmissionCount = bound.Count,
            Kpis = ComputeKpis(bound),
            ExposureMatrix = ComputeExposureMatrix(bound)
        };

        var db = _config["CosmosDb:DatabaseName"] ?? "underwriter-workbench";
        var container = _cosmos.GetContainer(db, "portfolio");
        await container.UpsertItemAsync(snapshot, new PartitionKey(snapshot.Id));

        await _notifier.SendPortfolioUpdatedAsync(userId, new
        {
            snapshotId = snapshot.Id,
            generatedAt = snapshot.GeneratedAt,
            kpis = new
            {
                totalGWP = snapshot.Kpis.TotalGwp,
                aggregateLimit = snapshot.Kpis.AggregateLimit,
                largestSingleRisk = snapshot.Kpis.LargestSingleRisk,
                ytdLossRatio = snapshot.Kpis.YtdLossRatio
            }
        });

        _logger.LogInformation("Portfolio snapshot {SnapshotId} generated for user {UserId}", snapshot.Id, userId);
        return snapshot;
    }

    public async Task<PortfolioSnapshot?> GetLatestAsync(string? territory, string? lineOfBusiness, string? status)
    {
        var db = _config["CosmosDb:DatabaseName"] ?? "underwriter-workbench";
        var container = _cosmos.GetContainer(db, "portfolio");

        var query = container.GetItemLinqQueryable<PortfolioSnapshot>(allowSynchronousQueryExecution: false)
            .OrderByDescending(s => s.GeneratedAt);

        var results = new List<PortfolioSnapshot>();
        using var iterator = query.ToFeedIterator();
        if (iterator.HasMoreResults)
        {
            var batch = await iterator.ReadNextAsync();
            results.AddRange(batch);
        }

        var snapshot = results.FirstOrDefault();
        if (snapshot is null) return null;

        if (!string.IsNullOrEmpty(territory) || !string.IsNullOrEmpty(lineOfBusiness))
        {
            snapshot.ExposureMatrix = snapshot.ExposureMatrix
                .Where(e =>
                    (string.IsNullOrEmpty(territory) || e.Territory == territory) &&
                    (string.IsNullOrEmpty(lineOfBusiness) || e.LineOfBusiness == lineOfBusiness))
                .ToList();
        }

        return snapshot;
    }

    private static PortfolioKpis ComputeKpis(IReadOnlyList<Submission> boundSubmissions)
    {
        if (boundSubmissions.Count == 0)
            return new PortfolioKpis();

        var allLayers = boundSubmissions.SelectMany(s => s.Layers).ToList();
        var totalGwp = allLayers.Sum(l => l.Premium);
        var aggregateLimit = allLayers.Sum(l => l.Limit);
        var largestSingleRisk = allLayers.Max(l => l.Limit);

        return new PortfolioKpis
        {
            TotalGwp = totalGwp,
            AggregateLimit = aggregateLimit,
            LargestSingleRisk = largestSingleRisk,
            YtdLossRatio = 0m
        };
    }

    private static List<ExposureMatrixRow> ComputeExposureMatrix(IReadOnlyList<Submission> boundSubmissions)
    {
        return boundSubmissions
            .GroupBy(s => (s.RiskDetails.Territory, s.RiskDetails.LineOfBusiness))
            .Select(g => new ExposureMatrixRow
            {
                Territory = g.Key.Territory,
                LineOfBusiness = g.Key.LineOfBusiness,
                TotalLimit = g.SelectMany(s => s.Layers).Sum(l => l.Limit),
                SubmissionCount = g.Count()
            })
            .ToList();
    }
}
