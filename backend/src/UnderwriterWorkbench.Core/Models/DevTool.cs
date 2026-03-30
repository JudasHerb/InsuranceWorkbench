using System.Text.Json.Serialization;

namespace UnderwriterWorkbench.Core.Models;

public class DevTool
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("_type")]
    public string Type { get; set; } = "devTool";

    [JsonPropertyName("ownerId")]
    public string OwnerId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("ephemeral")]
    public bool Ephemeral { get; set; } = true;

    [JsonPropertyName("imageRef")]
    public string ImageRef { get; set; } = string.Empty;

    [JsonPropertyName("networkPolicy")]
    public DevToolNetworkPolicy NetworkPolicy { get; set; } = new();

    [JsonPropertyName("sourceCode")]
    public string SourceCode { get; set; } = string.Empty;

    [JsonPropertyName("podName")]
    public string PodName { get; set; } = string.Empty;

    [JsonPropertyName("routeUrl")]
    public string? RouteUrl { get; set; }

    [JsonPropertyName("podStatus")]
    public string PodStatus { get; set; } = "building";

    [JsonPropertyName("submissionContextSchema")]
    public SubmissionContextSchema SubmissionContextSchema { get; set; } = new();

    [JsonPropertyName("lastUsedAt")]
    public DateTime? LastUsedAt { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("agentTaskId")]
    public string AgentTaskId { get; set; } = string.Empty;

    [JsonPropertyName("sessionConnectionId")]
    public string SessionConnectionId { get; set; } = string.Empty;
}

public class DevToolNetworkPolicy
{
    [JsonPropertyName("allowedEgress")]
    public List<string> AllowedEgress { get; set; } = [];

    [JsonPropertyName("reasoning")]
    public string Reasoning { get; set; } = string.Empty;

    [JsonPropertyName("approvedBy")]
    public string? ApprovedBy { get; set; }

    [JsonPropertyName("approvedAt")]
    public DateTime? ApprovedAt { get; set; }
}

public class SubmissionContextSchema
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0";

    [JsonPropertyName("fields")]
    public List<string> Fields { get; set; } = ["submissionId", "riskDetails", "layers", "currency"];
}
