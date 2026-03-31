import * as signalR from '@microsoft/signalr'
import type {
  AgentTaskUpdatePayload,
  B2BMessageReceivedPayload,
  DevToolBuildLogPayload,
  NetworkPolicyApprovalPayload,
  PortfolioUpdatedPayload,
  SubmissionStatusChangedPayload,
} from '../../types'

type EventHandler<T> = (payload: T) => void

class WorkbenchHubClient {
  private connection: signalR.HubConnection
  private startPromise: Promise<void> | null = null

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_BASE_URL ?? ''}/hubs/workbench`, {
        // Bearer token injected here in T059 via MSAL
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()
  }

  async start(): Promise<void> {
    if (this.connection.state === signalR.HubConnectionState.Connected) return
    if (!this.startPromise) {
      this.startPromise = this.connection.start().finally(() => {
        this.startPromise = null
      })
    }
    return this.startPromise
  }

  async stop(): Promise<void> {
    await this.connection.stop()
  }

  get state(): signalR.HubConnectionState {
    return this.connection.state
  }

  // ---- Client → Server ----

  private async ensureConnected(): Promise<void> {
    if (this.connection.state === signalR.HubConnectionState.Connected) return
    await this.start()
  }

  async joinSubmission(submissionId: string): Promise<void> {
    await this.ensureConnected()
    return this.connection.invoke('JoinSubmission', submissionId)
  }

  async leaveSubmission(submissionId: string): Promise<void> {
    await this.ensureConnected()
    return this.connection.invoke('LeaveSubmission', submissionId)
  }

  async joinPortfolio(): Promise<void> {
    await this.ensureConnected()
    return this.connection.invoke('JoinPortfolio')
  }

  async leavePortfolio(): Promise<void> {
    await this.ensureConnected()
    return this.connection.invoke('LeavePortfolio')
  }

  async closeTool(devToolId: string): Promise<void> {
    await this.ensureConnected()
    return this.connection.invoke('CloseTool', devToolId)
  }

  // ---- Server → Client event subscriptions ----

  onAgentTaskUpdate(handler: EventHandler<AgentTaskUpdatePayload>): void {
    this.connection.on('AgentTaskUpdate', handler)
  }

  offAgentTaskUpdate(handler: EventHandler<AgentTaskUpdatePayload>): void {
    this.connection.off('AgentTaskUpdate', handler)
  }

  onB2BMessageReceived(handler: EventHandler<B2BMessageReceivedPayload>): void {
    this.connection.on('B2BMessageReceived', handler)
  }

  offB2BMessageReceived(handler: EventHandler<B2BMessageReceivedPayload>): void {
    this.connection.off('B2BMessageReceived', handler)
  }

  onDevToolBuildLog(handler: EventHandler<DevToolBuildLogPayload>): void {
    this.connection.on('DevToolBuildLog', handler)
  }

  offDevToolBuildLog(handler: EventHandler<DevToolBuildLogPayload>): void {
    this.connection.off('DevToolBuildLog', handler)
  }

  onNetworkPolicyApprovalRequired(handler: EventHandler<NetworkPolicyApprovalPayload>): void {
    this.connection.on('NetworkPolicyApprovalRequired', handler)
  }

  offNetworkPolicyApprovalRequired(handler: EventHandler<NetworkPolicyApprovalPayload>): void {
    this.connection.off('NetworkPolicyApprovalRequired', handler)
  }

  onSubmissionStatusChanged(handler: EventHandler<SubmissionStatusChangedPayload>): void {
    this.connection.on('SubmissionStatusChanged', handler)
  }

  offSubmissionStatusChanged(handler: EventHandler<SubmissionStatusChangedPayload>): void {
    this.connection.off('SubmissionStatusChanged', handler)
  }

  onPortfolioUpdated(handler: EventHandler<PortfolioUpdatedPayload>): void {
    this.connection.on('PortfolioUpdated', handler)
  }

  offPortfolioUpdated(handler: EventHandler<PortfolioUpdatedPayload>): void {
    this.connection.off('PortfolioUpdated', handler)
  }

  onReconnecting(handler: (error?: Error) => void): void {
    this.connection.onreconnecting(handler)
  }

  onReconnected(handler: (connectionId?: string) => void): void {
    this.connection.onreconnected(handler)
  }

  onClose(handler: (error?: Error) => void): void {
    this.connection.onclose(handler)
  }
}

export const workbenchHub = new WorkbenchHubClient()
