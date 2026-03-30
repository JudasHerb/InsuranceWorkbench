using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Core.Interfaces;

public interface IDevAgentOrchestrator
{
    Task<DevTool> StartAsync(string submissionId, string taskDescription, object contextData, string connectionId);
    Task ApproveNetworkPolicyAsync(string devToolId, string approvedBy);
    Task RejectNetworkPolicyAsync(string devToolId);
    Task PromoteAsync(string devToolId, string name, string description);
    Task OpenOnSubmissionAsync(string devToolId, string submissionId);
    Task CleanupAsync(string devToolId);
}

public interface IOpenShiftApiClient
{
    Task CreatePodAsync(string podName, string imageRef, string @namespace);
    Task DeletePodAsync(string podName, string @namespace);
    Task<string> GetPodStatusAsync(string podName, string @namespace);
    Task<string> ProvisionRouteAsync(string podName, string @namespace);
}
