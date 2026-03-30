using UnderwriterWorkbench.Core.Interfaces;

namespace UnderwriterWorkbench.Infrastructure.OpenShift;

public class MockOpenShiftApiClient : IOpenShiftApiClient
{
    private static readonly Dictionary<string, string> _pods = new();

    public Task CreatePodAsync(string podName, string imageRef, string @namespace)
    {
        _pods[podName] = "running";
        return Task.CompletedTask;
    }

    public Task DeletePodAsync(string podName, string @namespace)
    {
        _pods.Remove(podName);
        return Task.CompletedTask;
    }

    public Task<string> GetPodStatusAsync(string podName, string @namespace)
    {
        var status = _pods.TryGetValue(podName, out var s) ? s : "stopped";
        return Task.FromResult(status);
    }

    public Task<string> ProvisionRouteAsync(string podName, string @namespace)
    {
        var url = $"http://devtool-{podName}.apps.mock.local";
        return Task.FromResult(url);
    }
}
