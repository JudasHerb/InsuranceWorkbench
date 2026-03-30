using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Infrastructure.OpenShift;

public class DevToolCleanupJob : BackgroundService
{
    private readonly CosmosClient _cosmos;
    private readonly IOpenShiftApiClient _openShift;
    private readonly IConfiguration _config;
    private readonly ILogger<DevToolCleanupJob> _logger;
    private const string Namespace = "uw-devtools";

    public DevToolCleanupJob(
        CosmosClient cosmos,
        IOpenShiftApiClient openShift,
        IConfiguration config,
        ILogger<DevToolCleanupJob> logger)
    {
        _cosmos = cosmos;
        _openShift = openShift;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
            await CleanupOrphanedToolsAsync();
        }
    }

    private async Task CleanupOrphanedToolsAsync()
    {
        try
        {
            var db = _config["CosmosDb:DatabaseName"] ?? "underwriter-workbench";
            var container = _cosmos.GetContainer(db, "devtools");
            var cutoff = DateTime.UtcNow.AddMinutes(-30);

            var query = container.GetItemLinqQueryable<DevTool>(allowSynchronousQueryExecution: false)
                .Where(t => t.Ephemeral && t.PodStatus == "running" && t.CreatedAt < cutoff);

            using var iterator = query.ToFeedIterator();
            while (iterator.HasMoreResults)
            {
                var batch = await iterator.ReadNextAsync();
                foreach (var tool in batch)
                {
                    await _openShift.DeletePodAsync(tool.PodName, Namespace);
                    tool.PodStatus = "stopped";
                    await container.UpsertItemAsync(tool, new PartitionKey(tool.OwnerId));
                    _logger.LogInformation("Cleaned up orphaned DevTool {ToolId}", tool.Id);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DevTool cleanup job failed");
        }
    }
}
