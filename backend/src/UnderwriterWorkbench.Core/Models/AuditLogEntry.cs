using System.Text.Json.Serialization;

namespace UnderwriterWorkbench.Core.Models;

public class AuditLogEntry
{
    [JsonPropertyName("entryId")]
    public string EntryId { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("actor")]
    public AuditActor Actor { get; set; } = new();

    [JsonPropertyName("action")]
    public string Action { get; set; } = string.Empty;

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("taskId")]
    public string? TaskId { get; set; }
}

public class AuditActor
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "user";

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;
}
