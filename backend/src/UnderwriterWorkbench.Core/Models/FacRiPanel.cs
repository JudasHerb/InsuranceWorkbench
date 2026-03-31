using System.Text.Json.Serialization;

namespace UnderwriterWorkbench.Core.Models;

public class FacRiPanel
{
    [JsonPropertyName("facriPanelId")]
    public string FacriPanelId { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("reinsurerName")]
    public string ReinsurerName { get; set; } = string.Empty;

    [JsonPropertyName("reinsurerAgentEndpoint")]
    public string? ReinsurerAgentEndpoint { get; set; }

    [JsonPropertyName("cededPct")]
    public decimal CededPct { get; set; }

    [JsonPropertyName("agreedTerms")]
    public AgreedTerms? AgreedTerms { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending";
}

public class AgreedTerms
{
    [JsonPropertyName("finalCededPct")]
    public decimal FinalCededPct { get; set; }

    [JsonPropertyName("reinsurerLineSizePct")]
    public decimal ReinsurerLineSizePct { get; set; }

    [JsonPropertyName("agreedRate")]
    public decimal AgreedRate { get; set; }

    [JsonPropertyName("sessionId")]
    public string? SessionId { get; set; }
}
