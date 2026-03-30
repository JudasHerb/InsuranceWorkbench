namespace UnderwriterWorkbench.Core.Interfaces;

public interface IWorkbenchNotifier
{
    Task SendAgentTaskUpdateAsync(string submissionId, object payload);
    Task SendB2BMessageReceivedAsync(string submissionId, object payload);
    Task SendDevToolBuildLogAsync(string connectionId, object payload);
    Task SendNetworkPolicyApprovalRequiredAsync(string connectionId, object payload);
    Task SendSubmissionStatusChangedAsync(string submissionId, object payload);
    Task SendPortfolioUpdatedAsync(string userId, object payload);
}
