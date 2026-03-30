using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using UnderwriterWorkbench.Core.Interfaces;
using UnderwriterWorkbench.Core.Models;

namespace UnderwriterWorkbench.Infrastructure.Agents;

public class B2BHostedService : BackgroundService
{
    private readonly B2BSessionQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IWorkbenchNotifier _notifier;
    private readonly IConfiguration _config;
    private readonly ILogger<B2BHostedService> _logger;

    public B2BHostedService(
        B2BSessionQueue queue,
        IServiceScopeFactory scopeFactory,
        IWorkbenchNotifier notifier,
        IConfiguration config,
        ILogger<B2BHostedService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _notifier = notifier;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (_queue.TryDequeue(out var request) && request is not null)
            {
                _ = Task.Run(() => ProcessSessionAsync(request, stoppingToken), stoppingToken);
            }
            await Task.Delay(500, stoppingToken);
        }
    }

    private async Task ProcessSessionAsync(B2BSessionRequest request, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<ISubmissionRepository>();

        var session = await repo.GetB2BSessionAsync(request.SubmissionId, request.SessionId);
        if (session is null) return;

        var hmacSecret = _config["B2B:HmacSecret"] ?? "dev-secret";
        int maxRounds = 5;

        for (int round = 0; round < maxRounds && session.Status == "active"; round++)
        {
            var proposalPayload = BuildProposal(session, round);
            var outboundMessage = CreateSignedMessage(session, "workbench", "counterparty", "proposal", proposalPayload, hmacSecret);
            session.Messages.Add(outboundMessage);
            await repo.UpdateB2BSessionAsync(session);

            await _notifier.SendB2BMessageReceivedAsync(session.SubmissionId, new
            {
                sessionId = session.Id, submissionId = session.SubmissionId,
                messageId = outboundMessage.MessageId, messageType = "proposal",
                from = new { firm = "Workbench" }, timestamp = outboundMessage.Timestamp,
                withinMandate = true, autoActioned = true, requiresUWDecision = false
            });

            await Task.Delay(1000, ct);

            var counterResponse = SimulateCounterpartyResponse(session, proposalPayload);
            var inboundMessage = CreateSignedMessage(session, "counterparty", "workbench", counterResponse.messageType, counterResponse.payload, hmacSecret);

            var evaluation = await EvaluateMandateAsync(session.Mandate, inboundMessage.Payload, counterResponse.messageType);
            inboundMessage.MandateEvaluation = evaluation;
            session.Messages.Add(inboundMessage);

            if (counterResponse.messageType == "accept" || (evaluation.WithinMandate && evaluation.SuggestedAction == "accept"))
            {
                session.Status = "agreed";
                session.FinalTerms = new AgreedTerms
                {
                    FinalCededPct = counterResponse.cessionPct,
                    ReinsurerLineSizePct = session.Mandate.MinReinsurerLineSizePct,
                    AgreedRate = (session.Mandate.RateRange.Min + session.Mandate.RateRange.Max) / 2,
                    SessionId = session.Id
                };
                session.ConcludedAt = DateTime.UtcNow;

                await repo.UpdateB2BSessionAsync(session);
                await UpdateFacriPanelAsync(repo, session);

                await repo.AppendAuditEntryAsync(session.SubmissionId, new AuditLogEntry
                {
                    Action = "b2b-terms-agreed",
                    Summary = $"B2B session {session.Id} concluded with agreement",
                    Actor = new AuditActor { Type = "agent", Id = "b2b-comms", DisplayName = "B2B Comms Agent" }
                });

                await _notifier.SendB2BMessageReceivedAsync(session.SubmissionId, new
                {
                    sessionId = session.Id, submissionId = session.SubmissionId,
                    messageId = inboundMessage.MessageId, messageType = "accept",
                    from = new { firm = session.Counterparty.Firm }, timestamp = inboundMessage.Timestamp,
                    withinMandate = true, autoActioned = true, requiresUWDecision = false
                });
                return;
            }

            if (!evaluation.WithinMandate && evaluation.SuggestedAction == "escalate")
            {
                session.Status = "escalated";
                session.ConcludedAt = DateTime.UtcNow;
                await repo.UpdateB2BSessionAsync(session);

                await _notifier.SendB2BMessageReceivedAsync(session.SubmissionId, new
                {
                    sessionId = session.Id, submissionId = session.SubmissionId,
                    messageId = inboundMessage.MessageId, messageType = inboundMessage.MessageType,
                    from = new { firm = session.Counterparty.Firm }, timestamp = inboundMessage.Timestamp,
                    withinMandate = false, autoActioned = false, requiresUWDecision = true
                });
                return;
            }

            await _notifier.SendB2BMessageReceivedAsync(session.SubmissionId, new
            {
                sessionId = session.Id, submissionId = session.SubmissionId,
                messageId = inboundMessage.MessageId, messageType = inboundMessage.MessageType,
                from = new { firm = session.Counterparty.Firm }, timestamp = inboundMessage.Timestamp,
                withinMandate = evaluation.WithinMandate, autoActioned = evaluation.WithinMandate,
                requiresUWDecision = !evaluation.WithinMandate
            });

            await repo.UpdateB2BSessionAsync(session);
            await Task.Delay(1500, ct);
        }

        if (session.Status == "active")
        {
            session.Status = "stalled";
            session.ConcludedAt = DateTime.UtcNow;
            await repo.UpdateB2BSessionAsync(session);
        }
    }

    private static Dictionary<string, object?> BuildProposal(B2BSession session, int round) => new()
    {
        ["cessionPct"] = session.Mandate.MaxCessionPct * 0.8m,
        ["reinsurerLineSizePct"] = session.Mandate.MinReinsurerLineSizePct,
        ["rate"] = (session.Mandate.RateRange.Min + session.Mandate.RateRange.Max) / 2,
        ["round"] = round
    };

    private static (string messageType, Dictionary<string, object?> payload, decimal cessionPct) SimulateCounterpartyResponse(B2BSession session, Dictionary<string, object?> proposal)
    {
        var proposedCession = proposal.TryGetValue("cessionPct", out var v) && v is decimal d ? d : 0.25m;
        if (proposedCession <= 0.30m)
        {
            return ("accept", new Dictionary<string, object?>
            {
                ["cessionPct"] = proposedCession,
                ["message"] = "Terms accepted"
            }, proposedCession);
        }

        var counterCession = 0.30m;
        return ("counter", new Dictionary<string, object?>
        {
            ["cessionPct"] = counterCession,
            ["message"] = "Counterproposal: max cession 30%"
        }, counterCession);
    }

    private async Task<MandateEvaluation> EvaluateMandateAsync(B2BMandate mandate, Dictionary<string, object?> payload, string messageType)
    {
        var apiKey = _config["Claude:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "test-key")
            return EvaluateMandateLocally(mandate, payload, messageType);

        try
        {
            var client = new AnthropicClient(apiKey);
            var prompt = $$"""
                Evaluate this B2B reinsurance negotiation response against the mandate.
                Mandate: {{JsonSerializer.Serialize(mandate)}}
                Response: {{JsonSerializer.Serialize(payload)}}
                Message type: {{messageType}}

                Return JSON: {"withinMandate": bool, "reasoning": "string", "suggestedAction": "accept|reject|counter|escalate"}
                """;

            var response = await client.Messages.GetClaudeMessageAsync(new MessageParameters
            {
                Model = _config["Claude:AgentModel"] ?? "claude-opus-4-6",
                MaxTokens = 256,
                Messages = [new() { Role = RoleType.User, Content = [new TextContent { Text = prompt }] }]
            });

            var text = response.Content.OfType<TextContent>().FirstOrDefault()?.Text ?? "{}";
            var doc = JsonDocument.Parse(text);
            return new MandateEvaluation
            {
                WithinMandate = doc.RootElement.GetProperty("withinMandate").GetBoolean(),
                Reasoning = doc.RootElement.GetProperty("reasoning").GetString() ?? "",
                SuggestedAction = doc.RootElement.GetProperty("suggestedAction").GetString() ?? "counter"
            };
        }
        catch
        {
            return EvaluateMandateLocally(mandate, payload, messageType);
        }
    }

    private static MandateEvaluation EvaluateMandateLocally(B2BMandate mandate, Dictionary<string, object?> payload, string messageType)
    {
        if (messageType == "accept")
            return new MandateEvaluation { WithinMandate = true, SuggestedAction = "accept", Reasoning = "Counterparty accepted" };

        var cession = payload.TryGetValue("cessionPct", out var v) && v is JsonElement je ? je.GetDecimal() : 0.25m;
        var within = cession <= mandate.MaxCessionPct;
        return new MandateEvaluation
        {
            WithinMandate = within,
            SuggestedAction = within ? "accept" : "counter",
            Reasoning = within ? "Cession within mandate" : "Cession exceeds mandate"
        };
    }

    private static B2BMessage CreateSignedMessage(B2BSession session, string fromFirm, string toFirm, string messageType, Dictionary<string, object?> payload, string secret)
    {
        var timestamp = DateTime.UtcNow;
        var payloadJson = JsonSerializer.Serialize(payload);
        var payloadHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payloadJson)));
        var sigInput = $"{session.Id}:{timestamp:O}:{messageType}:{payloadHash}";
        var signature = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(sigInput)));

        return new B2BMessage
        {
            SessionId = session.Id,
            From = new B2BCounterparty { Firm = fromFirm, AgentEndpoint = "" },
            To = new B2BCounterparty { Firm = toFirm, AgentEndpoint = "" },
            MessageType = messageType,
            Payload = payload,
            Timestamp = timestamp,
            Signature = signature
        };
    }

    private static async Task UpdateFacriPanelAsync(ISubmissionRepository repo, B2BSession session)
    {
        var submission = await repo.GetByIdAsync(session.SubmissionId);
        if (submission is null || session.FinalTerms is null) return;

        var layer = submission.Layers.FirstOrDefault(l => l.Id == session.LayerId);
        if (layer is null) return;

        var panel = layer.FacriPanels.FirstOrDefault(p => p.Id == session.FacriPanelId);
        if (panel is null) return;

        panel.AgreedTerms = session.FinalTerms;
        panel.Status = "agreed";
        await repo.UpdateAsync(submission);
    }
}
