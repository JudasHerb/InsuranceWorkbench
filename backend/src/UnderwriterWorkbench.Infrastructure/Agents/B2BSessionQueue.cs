using System.Collections.Concurrent;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Infrastructure.Agents;

public class B2BSessionQueue
{
    private readonly ConcurrentQueue<B2BSessionRequest> _queue = new();

    public void Enqueue(B2BSessionRequest request) => _queue.Enqueue(request);

    public bool TryDequeue(out B2BSessionRequest? request) => _queue.TryDequeue(out request);
}

public class B2BSessionRequest
{
    public string SessionId { get; set; } = string.Empty;
    public string SubmissionId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}
