using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using Microsoft.Extensions.Configuration;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Infrastructure.Cosmos;

public class SubmissionRepository : ISubmissionRepository
{
    private readonly Container _submissions;
    private readonly Container _devtools;

    public SubmissionRepository(CosmosClient client, IConfiguration configuration)
    {
        var db = configuration["CosmosDb:DatabaseName"] ?? "underwriter-workbench";
        _submissions = client.GetContainer(db, "submissions");
        _devtools = client.GetContainer(db, "devtools");
    }

    public async Task<Submission> CreateAsync(Submission submission)
    {
        submission.UpdatedAt = DateTime.UtcNow;
        var response = await _submissions.CreateItemAsync(submission, new PartitionKey(submission.SubmissionId));
        return response.Resource;
    }

    public async Task<Submission?> GetByIdAsync(string submissionId)
    {
        try
        {
            var response = await _submissions.ReadItemAsync<Submission>(submissionId, new PartitionKey(submissionId));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<(List<Submission> Items, int Total)> ListAsync(string? status, string? territory, string? lineOfBusiness, string? cedant, int page, int pageSize)
    {
        var query = _submissions.GetItemLinqQueryable<Submission>(allowSynchronousQueryExecution: false)
            .Where(s => s.Type == "submission");

        if (!string.IsNullOrEmpty(status))
            query = query.Where(s => s.Status == status);
        if (!string.IsNullOrEmpty(territory))
            query = query.Where(s => s.RiskDetails.Territory == territory);
        if (!string.IsNullOrEmpty(lineOfBusiness))
            query = query.Where(s => s.RiskDetails.LineOfBusiness == lineOfBusiness);
        if (!string.IsNullOrEmpty(cedant))
            query = query.Where(s => s.RiskDetails.Cedant == cedant);

        var all = new List<Submission>();
        using var iterator = query.ToFeedIterator();
        while (iterator.HasMoreResults)
        {
            var batch = await iterator.ReadNextAsync();
            all.AddRange(batch);
        }

        var total = all.Count;
        var items = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return (items, total);
    }

    public async Task<Submission> UpdateAsync(Submission submission)
    {
        submission.UpdatedAt = DateTime.UtcNow;
        var response = await _submissions.UpsertItemAsync(submission, new PartitionKey(submission.SubmissionId));
        return response.Resource;
    }

    public async Task<Submission> AddLayerAsync(string submissionId, Layer layer)
    {
        var submission = await GetByIdAsync(submissionId) ?? throw new KeyNotFoundException(submissionId);
        submission.Layers.Add(layer);
        return await UpdateAsync(submission);
    }

    public async Task<Submission> UpdateLayerAsync(string submissionId, Layer layer)
    {
        var submission = await GetByIdAsync(submissionId) ?? throw new KeyNotFoundException(submissionId);
        var idx = submission.Layers.FindIndex(l => l.Id == layer.Id);
        if (idx >= 0) submission.Layers[idx] = layer;
        return await UpdateAsync(submission);
    }

    public async Task<Submission> RemoveLayerAsync(string submissionId, string layerId)
    {
        var submission = await GetByIdAsync(submissionId) ?? throw new KeyNotFoundException(submissionId);
        submission.Layers.RemoveAll(l => l.Id == layerId);
        return await UpdateAsync(submission);
    }

    public async Task<Submission> AddFacriPanelAsync(string submissionId, string layerId, FacRiPanel panel)
    {
        var submission = await GetByIdAsync(submissionId) ?? throw new KeyNotFoundException(submissionId);
        var layer = submission.Layers.FirstOrDefault(l => l.Id == layerId) ?? throw new KeyNotFoundException(layerId);
        layer.FacriPanels.Add(panel);
        return await UpdateAsync(submission);
    }

    public async Task<Submission> RemoveFacriPanelAsync(string submissionId, string layerId, string panelId)
    {
        var submission = await GetByIdAsync(submissionId) ?? throw new KeyNotFoundException(submissionId);
        var layer = submission.Layers.FirstOrDefault(l => l.Id == layerId) ?? throw new KeyNotFoundException(layerId);
        layer.FacriPanels.RemoveAll(p => p.Id == panelId);
        return await UpdateAsync(submission);
    }

    public async Task<Submission> AddDocumentRefAsync(string submissionId, DocumentRef doc)
    {
        var submission = await GetByIdAsync(submissionId) ?? throw new KeyNotFoundException(submissionId);
        submission.Documents.Add(doc);
        return await UpdateAsync(submission);
    }

    public async Task<Submission> AppendAuditEntryAsync(string submissionId, AuditLogEntry entry)
    {
        var submission = await GetByIdAsync(submissionId) ?? throw new KeyNotFoundException(submissionId);
        submission.AuditLog.Add(entry);
        return await UpdateAsync(submission);
    }

    public async Task<AgentTask> CreateAgentTaskAsync(AgentTask task)
    {
        var response = await _submissions.CreateItemAsync(task, new PartitionKey(task.SubmissionId));
        return response.Resource;
    }

    public async Task<AgentTask?> GetAgentTaskAsync(string submissionId, string taskId)
    {
        try
        {
            var response = await _submissions.ReadItemAsync<AgentTask>(taskId, new PartitionKey(submissionId));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<AgentTask> UpdateAgentTaskAsync(AgentTask task)
    {
        var response = await _submissions.UpsertItemAsync(task, new PartitionKey(task.SubmissionId));
        return response.Resource;
    }

    public async Task<List<AgentTask>> ListAgentTasksAsync(string submissionId)
    {
        var query = _submissions.GetItemLinqQueryable<AgentTask>(allowSynchronousQueryExecution: false)
            .Where(t => t.Type == "agentTask" && t.SubmissionId == submissionId);

        var results = new List<AgentTask>();
        using var iterator = query.ToFeedIterator();
        while (iterator.HasMoreResults)
        {
            var batch = await iterator.ReadNextAsync();
            results.AddRange(batch);
        }
        return results;
    }

    public async Task<B2BSession> CreateB2BSessionAsync(B2BSession session)
    {
        var response = await _submissions.CreateItemAsync(session, new PartitionKey(session.SubmissionId));
        return response.Resource;
    }

    public async Task<B2BSession?> GetB2BSessionAsync(string submissionId, string sessionId)
    {
        try
        {
            var response = await _submissions.ReadItemAsync<B2BSession>(sessionId, new PartitionKey(submissionId));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<B2BSession> UpdateB2BSessionAsync(B2BSession session)
    {
        var response = await _submissions.UpsertItemAsync(session, new PartitionKey(session.SubmissionId));
        return response.Resource;
    }

    public async Task<List<Submission>> GetAllActiveAsync()
    {
        var query = _submissions.GetItemLinqQueryable<Submission>(allowSynchronousQueryExecution: false)
            .Where(s => s.Type == "submission" && (s.Status == "in-review" || s.Status == "bound"));

        var results = new List<Submission>();
        using var iterator = query.ToFeedIterator();
        while (iterator.HasMoreResults)
        {
            var batch = await iterator.ReadNextAsync();
            results.AddRange(batch);
        }
        return results;
    }
}
