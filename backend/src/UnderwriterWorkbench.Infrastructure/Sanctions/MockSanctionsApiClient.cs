using UnderwriterWorkbench.Core.Interfaces;

namespace UnderwriterWorkbench.Infrastructure.Sanctions;

public class MockSanctionsApiClient : ISanctionsApiClient
{
    public Task<SanctionsResult> CheckEntityAsync(string entityName, string entityType, string jurisdiction)
    {
        var status = entityName.Contains("TEST_BLOCK", StringComparison.OrdinalIgnoreCase) ? "blocked"
            : entityName.Contains("TEST_REFER", StringComparison.OrdinalIgnoreCase) ? "refer"
            : "clear";

        var result = new SanctionsResult
        {
            EntityName = entityName,
            EntityType = entityType,
            ClearanceStatus = status,
            AuditRef = $"MOCK-{Guid.NewGuid():N}"
        };

        if (status != "clear")
        {
            result.MatchedRecords.Add(new SanctionsMatch
            {
                Source = "MockSanctionsList",
                MatchScore = status == "blocked" ? 1.0 : 0.7,
                Detail = $"Mock match for {entityName}"
            });
        }

        return Task.FromResult(result);
    }
}
