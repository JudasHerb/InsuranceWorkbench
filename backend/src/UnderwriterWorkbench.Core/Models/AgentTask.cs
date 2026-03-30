using System.Text.Json.Serialization;

namespace UnderwriterWorkbench.Core.Models;

public class AgentTask
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("_type")]
    public string Type { get; set; } = "agentTask";

    [JsonPropertyName("submissionId")]
    public string SubmissionId { get; set; } = string.Empty;

    [JsonPropertyName("agentType")]
    public string AgentType { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "queued";

    [JsonPropertyName("input")]
    public Dictionary<string, object?> Input { get; set; } = [];

    [JsonPropertyName("output")]
    public Dictionary<string, object?> Output { get; set; } = [];

    [JsonPropertyName("subTasks")]
    public List<AgentSubTask> SubTasks { get; set; } = [];

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("startedAt")]
    public DateTime? StartedAt { get; set; }

    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [JsonPropertyName("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;
}

public class AgentSubTask
{
    [JsonPropertyName("subTaskId")]
    public string SubTaskId { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "queued";

    [JsonPropertyName("startedAt")]
    public DateTime? StartedAt { get; set; }

    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [JsonPropertyName("detail")]
    public string? Detail { get; set; }
}
