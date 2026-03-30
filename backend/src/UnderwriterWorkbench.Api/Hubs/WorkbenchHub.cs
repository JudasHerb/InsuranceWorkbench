using Microsoft.AspNetCore.SignalR;

namespace UnderwriterWorkbench.Api.Hubs;

public class WorkbenchHub : Hub
{
    private static readonly Dictionary<string, string> _connectionDevTools = new();

    public async Task JoinSubmission(string submissionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"submission:{submissionId}");
    }

    public async Task LeaveSubmission(string submissionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"submission:{submissionId}");
    }

    public async Task JoinPortfolio()
    {
        var userId = Context.UserIdentifier ?? Context.ConnectionId;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
    }

    public async Task LeavePortfolio()
    {
        var userId = Context.UserIdentifier ?? Context.ConnectionId;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user:{userId}");
    }

    public async Task CloseTool(string devToolId)
    {
        _connectionDevTools.Remove(Context.ConnectionId);
        await Clients.Caller.SendAsync("ToolClosed", new { devToolId });
    }

    public void RegisterDevToolConnection(string devToolId, string connectionId)
    {
        _connectionDevTools[connectionId] = devToolId;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_connectionDevTools.TryGetValue(Context.ConnectionId, out var devToolId))
        {
            _connectionDevTools.Remove(Context.ConnectionId);
            // Grace period handled by DevToolCleanupJob — just log here
        }
        await base.OnDisconnectedAsync(exception);
    }

    // --- Static helper methods called by backend services ---

    public static Task SendAgentTaskUpdateAsync(IHubContext<WorkbenchHub> hub, string submissionId, object payload)
        => hub.Clients.Group($"submission:{submissionId}").SendAsync("AgentTaskUpdate", payload);

    public static Task SendB2BMessageReceivedAsync(IHubContext<WorkbenchHub> hub, string submissionId, object payload)
        => hub.Clients.Group($"submission:{submissionId}").SendAsync("B2BMessageReceived", payload);

    public static Task SendDevToolBuildLogAsync(IHubContext<WorkbenchHub> hub, string connectionId, object payload)
        => hub.Clients.Client(connectionId).SendAsync("DevToolBuildLog", payload);

    public static Task SendNetworkPolicyApprovalRequiredAsync(IHubContext<WorkbenchHub> hub, string connectionId, object payload)
        => hub.Clients.Client(connectionId).SendAsync("NetworkPolicyApprovalRequired", payload);

    public static Task SendSubmissionStatusChangedAsync(IHubContext<WorkbenchHub> hub, string submissionId, object payload)
        => hub.Clients.Group($"submission:{submissionId}").SendAsync("SubmissionStatusChanged", payload);

    public static Task SendPortfolioUpdatedAsync(IHubContext<WorkbenchHub> hub, string userId, object payload)
        => hub.Clients.Group($"user:{userId}").SendAsync("PortfolioUpdated", payload);
}
