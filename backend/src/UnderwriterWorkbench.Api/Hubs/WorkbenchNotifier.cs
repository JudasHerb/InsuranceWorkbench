using Microsoft.AspNetCore.SignalR;
using UnderwriterWorkbench.Core.Interfaces;

namespace UnderwriterWorkbench.Api.Hubs;

public class WorkbenchNotifier : IWorkbenchNotifier
{
    private readonly IHubContext<WorkbenchHub> _hub;

    public WorkbenchNotifier(IHubContext<WorkbenchHub> hub) => _hub = hub;

    public Task SendAgentTaskUpdateAsync(string submissionId, object payload)
        => WorkbenchHub.SendAgentTaskUpdateAsync(_hub, submissionId, payload);

    public Task SendB2BMessageReceivedAsync(string submissionId, object payload)
        => WorkbenchHub.SendB2BMessageReceivedAsync(_hub, submissionId, payload);

    public Task SendDevToolBuildLogAsync(string connectionId, object payload)
        => WorkbenchHub.SendDevToolBuildLogAsync(_hub, connectionId, payload);

    public Task SendNetworkPolicyApprovalRequiredAsync(string connectionId, object payload)
        => WorkbenchHub.SendNetworkPolicyApprovalRequiredAsync(_hub, connectionId, payload);

    public Task SendSubmissionStatusChangedAsync(string submissionId, object payload)
        => WorkbenchHub.SendSubmissionStatusChangedAsync(_hub, submissionId, payload);

    public Task SendPortfolioUpdatedAsync(string userId, object payload)
        => WorkbenchHub.SendPortfolioUpdatedAsync(_hub, userId, payload);
}
