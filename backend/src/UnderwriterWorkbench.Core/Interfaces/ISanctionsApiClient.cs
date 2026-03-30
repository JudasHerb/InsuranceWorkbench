namespace UnderwriterWorkbench.Core.Interfaces;

public interface ISanctionsApiClient
{
    Task<SanctionsResult> CheckEntityAsync(string entityName, string entityType, string jurisdiction);
}

public class SanctionsResult
{
    public string EntityName { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string ClearanceStatus { get; set; } = "clear";
    public List<SanctionsMatch> MatchedRecords { get; set; } = [];
    public string AuditRef { get; set; } = string.Empty;
}

public class SanctionsMatch
{
    public string Source { get; set; } = string.Empty;
    public double MatchScore { get; set; }
    public string Detail { get; set; } = string.Empty;
}
