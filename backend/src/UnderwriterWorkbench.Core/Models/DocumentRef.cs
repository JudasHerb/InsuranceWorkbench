using System.Text.Json.Serialization;

namespace UnderwriterWorkbench.Core.Models;

public class DocumentRef
{
    [JsonPropertyName("documentId")]
    public string DocumentId { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("mimeType")]
    public string MimeType { get; set; } = string.Empty;

    [JsonPropertyName("blobName")]
    public string BlobName { get; set; } = string.Empty;

    [JsonPropertyName("documentType")]
    public string DocumentType { get; set; } = "wording";

    [JsonPropertyName("uploadedAt")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("uploadedBy")]
    public string UploadedBy { get; set; } = string.Empty;

    [JsonPropertyName("sizeBytes")]
    public long SizeBytes { get; set; }
}
