using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace UnderwriterWorkbench.Infrastructure.Cosmos;

public class CosmosDbInitializer
{
    private readonly CosmosClient _client;
    private readonly string _databaseName;
    private readonly ILogger<CosmosDbInitializer> _logger;

    public CosmosDbInitializer(CosmosClient client, IConfiguration configuration, ILogger<CosmosDbInitializer> logger)
    {
        _client = client;
        _databaseName = configuration["CosmosDb:DatabaseName"] ?? "underwriter-workbench";
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        _logger.LogInformation("Initializing Cosmos DB database '{Database}'", _databaseName);

        var response = await _client.CreateDatabaseIfNotExistsAsync(_databaseName);
        var database = response.Database;

        await database.CreateContainerIfNotExistsAsync(new ContainerProperties
        {
            Id = "submissions",
            PartitionKeyPath = "/submissionId"
        });

        await database.CreateContainerIfNotExistsAsync(new ContainerProperties
        {
            Id = "devtools",
            PartitionKeyPath = "/ownerId"
        });

        await database.CreateContainerIfNotExistsAsync(new ContainerProperties
        {
            Id = "portfolio",
            PartitionKeyPath = "/id"
        });

        _logger.LogInformation("Cosmos DB containers initialized");
    }
}
