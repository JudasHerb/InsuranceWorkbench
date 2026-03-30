using System.Text.Json.Serialization;

namespace UnderwriterWorkbench.Core.Models;

public class B2BSession
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("_type")]
    public string Type { get; set; } = "b2bSession";

    [JsonPropertyName("submissionId")]
    public string SubmissionId { get; set; } = string.Empty;

    [JsonPropertyName("layerId")]
    public string LayerId { get; set; } = string.Empty;

    [JsonPropertyName("facriPanelId")]
    public string FacriPanelId { get; set; } = string.Empty;

    [JsonPropertyName("counterparty")]
    public B2BCounterparty Counterparty { get; set; } = new();

    [JsonPropertyName("mandate")]
    public B2BMandate Mandate { get; set; } = new();

    [JsonPropertyName("messages")]
    public List<B2BMessage> Messages { get; set; } = [];

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("finalTerms")]
    public AgreedTerms? FinalTerms { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("concludedAt")]
    public DateTime? ConcludedAt { get; set; }
}

public class B2BCounterparty
{
    [JsonPropertyName("firm")]
    public string Firm { get; set; } = string.Empty;

    [JsonPropertyName("agentEndpoint")]
    public string AgentEndpoint { get; set; } = string.Empty;
}

public class B2BMandate
{
    [JsonPropertyName("maxCessionPct")]
    public decimal MaxCessionPct { get; set; }

    [JsonPropertyName("minReinsurerLineSizePct")]
    public decimal MinReinsurerLineSizePct { get; set; }

    [JsonPropertyName("rateRange")]
    public RateRange RateRange { get; set; } = new();

    [JsonPropertyName("escalationNote")]
    public string? EscalationNote { get; set; }
}

public class RateRange
{
    [JsonPropertyName("min")]
    public decimal Min { get; set; }

    [JsonPropertyName("max")]
    public decimal Max { get; set; }
}

public class B2BMessage
{
    [JsonPropertyName("messageId")]
    public string MessageId { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("from")]
    public B2BCounterparty From { get; set; } = new();

    [JsonPropertyName("to")]
    public B2BCounterparty To { get; set; } = new();

    [JsonPropertyName("messageType")]
    public string MessageType { get; set; } = "proposal";

    [JsonPropertyName("payload")]
    public Dictionary<string, object?> Payload { get; set; } = [];

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("signature")]
    public string Signature { get; set; } = string.Empty;

    [JsonPropertyName("mandateEvaluation")]
    public MandateEvaluation? MandateEvaluation { get; set; }
}

public class MandateEvaluation
{
    [JsonPropertyName("withinMandate")]
    public bool WithinMandate { get; set; }

    [JsonPropertyName("reasoning")]
    public string Reasoning { get; set; } = string.Empty;

    [JsonPropertyName("suggestedAction")]
    public string SuggestedAction { get; set; } = "accept";
}
