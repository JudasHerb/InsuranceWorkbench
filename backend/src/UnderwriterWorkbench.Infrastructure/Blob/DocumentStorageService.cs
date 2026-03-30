using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace UnderwriterWorkbench.Infrastructure.Blob;

public class DocumentStorageService
{
    private readonly BlobContainerClient _container;
    private readonly ILogger<DocumentStorageService> _logger;

    public DocumentStorageService(IConfiguration configuration, ILogger<DocumentStorageService> logger)
    {
        var connectionString = configuration["BlobStorage:ConnectionString"] ?? "UseDevelopmentStorage=true";
        var containerName = configuration["BlobStorage:DocumentContainer"] ?? "uw-documents";
        _container = new BlobContainerClient(connectionString, containerName);
        _logger = logger;
    }

    public async Task EnsureContainerExistsAsync()
    {
        await _container.CreateIfNotExistsAsync(PublicAccessType.None);
    }

    public async Task<string> UploadAsync(Stream content, string blobName, string contentType)
    {
        await EnsureContainerExistsAsync();
        var blob = _container.GetBlobClient(blobName);
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType });
        _logger.LogInformation("Uploaded blob {BlobName}", blobName);
        return blobName;
    }

    public async Task<string> GenerateSasUrlAsync(string blobName, TimeSpan ttl)
    {
        await EnsureContainerExistsAsync();
        var blob = _container.GetBlobClient(blobName);

        if (_container.CanGenerateSasUri)
        {
            var sasBuilder = new BlobSasBuilder
            {
                BlobContainerName = _container.Name,
                BlobName = blobName,
                Resource = "b",
                ExpiresOn = DateTimeOffset.UtcNow.Add(ttl)
            };
            sasBuilder.SetPermissions(BlobSasPermissions.Read);
            return blob.GenerateSasUri(sasBuilder).ToString();
        }

        // Fallback for Azurite without SAS support
        return blob.Uri.ToString();
    }

    public async Task DeleteAsync(string blobName)
    {
        var blob = _container.GetBlobClient(blobName);
        await blob.DeleteIfExistsAsync();
    }
}
