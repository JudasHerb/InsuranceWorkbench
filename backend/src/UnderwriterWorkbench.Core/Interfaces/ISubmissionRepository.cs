using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Core.Interfaces;

public interface ISubmissionRepository
{
    Task<Submission> CreateAsync(Submission submission);
    Task<Submission?> GetByIdAsync(string submissionId);
    Task<(List<Submission> Items, int Total)> ListAsync(string? status, string? territory, string? lineOfBusiness, string? cedant, int page, int pageSize);
    Task<Submission> UpdateAsync(Submission submission);
    Task<Submission> AddLayerAsync(string submissionId, Layer layer);
    Task<Submission> UpdateLayerAsync(string submissionId, Layer layer);
    Task<Submission> RemoveLayerAsync(string submissionId, string layerId);
    Task<Submission> AddFacriPanelAsync(string submissionId, string layerId, FacRiPanel panel);
    Task<Submission> RemoveFacriPanelAsync(string submissionId, string layerId, string panelId);
    Task<Submission> AddDocumentRefAsync(string submissionId, DocumentRef doc);
    Task<Submission> AppendAuditEntryAsync(string submissionId, AuditLogEntry entry);
    Task<AgentTask> CreateAgentTaskAsync(AgentTask task);
    Task<AgentTask?> GetAgentTaskAsync(string submissionId, string taskId);
    Task<AgentTask> UpdateAgentTaskAsync(AgentTask task);
    Task<List<AgentTask>> ListAgentTasksAsync(string submissionId);
    Task<B2BSession> CreateB2BSessionAsync(B2BSession session);
    Task<B2BSession?> GetB2BSessionAsync(string submissionId, string sessionId);
    Task<B2BSession> UpdateB2BSessionAsync(B2BSession session);
    Task<List<Submission>> GetAllActiveAsync();
}
