using System.Text.Json.Serialization;

namespace UnderwriterWorkbench.Core.Models;

public class Submission
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("_type")]
    public string Type { get; set; } = "submission";

    [JsonPropertyName("submissionId")]
    public string SubmissionId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "draft";

    [JsonPropertyName("riskDetails")]
    public RiskDetails RiskDetails { get; set; } = new();

    [JsonPropertyName("namesClearance")]
    public NamesClearanceStatus NamesClearance { get; set; } = new();

    [JsonPropertyName("legalReview")]
    public LegalReviewStatus LegalReview { get; set; } = new();

    [JsonPropertyName("layers")]
    public List<Layer> Layers { get; set; } = [];

    [JsonPropertyName("documents")]
    public List<DocumentRef> Documents { get; set; } = [];

    [JsonPropertyName("agentTaskIds")]
    public List<string> AgentTaskIds { get; set; } = [];

    [JsonPropertyName("auditLog")]
    public List<AuditLogEntry> AuditLog { get; set; } = [];

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class RiskDetails
{
    [JsonPropertyName("insuredName")]
    public string InsuredName { get; set; } = string.Empty;

    [JsonPropertyName("cedant")]
    public string Cedant { get; set; } = string.Empty;

    [JsonPropertyName("broker")]
    public string Broker { get; set; } = string.Empty;

    [JsonPropertyName("lineOfBusiness")]
    public string LineOfBusiness { get; set; } = string.Empty;

    [JsonPropertyName("territory")]
    public string Territory { get; set; } = string.Empty;

    [JsonPropertyName("coverageType")]
    public string CoverageType { get; set; } = string.Empty;

    [JsonPropertyName("inceptionDate")]
    public string InceptionDate { get; set; } = string.Empty;

    [JsonPropertyName("expiryDate")]
    public string ExpiryDate { get; set; } = string.Empty;
}

public class NamesClearanceStatus
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending";

    [JsonPropertyName("taskId")]
    public string? TaskId { get; set; }

    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; set; }
}

public class LegalReviewStatus
{
    [JsonPropertyName("latestTaskId")]
    public string? LatestTaskId { get; set; }

    [JsonPropertyName("recommendation")]
    public string? Recommendation { get; set; }
}
