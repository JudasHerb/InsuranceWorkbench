using System.Text.Json.Serialization;

namespace UnderwriterWorkbench.Core.Models;

public class PortfolioSnapshot
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("_type")]
    public string Type { get; set; } = "portfolioSnapshot";

    [JsonPropertyName("generatedAt")]
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("kpis")]
    public PortfolioKpis Kpis { get; set; } = new();

    [JsonPropertyName("exposureMatrix")]
    public List<ExposureMatrixRow> ExposureMatrix { get; set; } = [];

    [JsonPropertyName("activeSubmissionCount")]
    public int ActiveSubmissionCount { get; set; }

    [JsonPropertyName("boundSubmissionCount")]
    public int BoundSubmissionCount { get; set; }
}

public class PortfolioKpis
{
    [JsonPropertyName("totalGWP")]
    public decimal TotalGwp { get; set; }

    [JsonPropertyName("aggregateLimit")]
    public decimal AggregateLimit { get; set; }

    [JsonPropertyName("largestSingleRisk")]
    public decimal LargestSingleRisk { get; set; }

    [JsonPropertyName("ytdLossRatio")]
    public decimal YtdLossRatio { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";
}

public class ExposureMatrixRow
{
    [JsonPropertyName("territory")]
    public string Territory { get; set; } = string.Empty;

    [JsonPropertyName("lineOfBusiness")]
    public string LineOfBusiness { get; set; } = string.Empty;

    [JsonPropertyName("totalLimit")]
    public decimal TotalLimit { get; set; }

    [JsonPropertyName("submissionCount")]
    public int SubmissionCount { get; set; }
}
