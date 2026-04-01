import type { APIRequestContext } from '@playwright/test'

// In CI the frontend (PLAYWRIGHT_BASE_URL) and backend (PLAYWRIGHT_API_BASE_URL)
// are on different origins. Locally both are relative (empty string → Vite proxy).
export const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL ?? ''

export interface SubmissionOptions {
  insuredName?: string
  broker?: string
  lineOfBusiness?: string
  territory?: string
  coverageTypes?: string[]
  inceptionDate?: string
  expiryDate?: string
}

export async function createSubmission(
  request: APIRequestContext,
  overrides: SubmissionOptions = {},
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)
  const nextYear = new Date()
  nextYear.setFullYear(nextYear.getFullYear() + 1)
  const expiry = nextYear.toISOString().slice(0, 10)

  const res = await request.post(`${API_BASE}/api/v1/submissions`, {
    data: {
      riskDetails: {
        insuredName: 'Test Corp',
        broker: 'Test Broker',
        lineOfBusiness: 'Casualty',
        territory: 'Austria',
        coverageTypes: ['Employers Liability'],
        inceptionDate: today,
        expiryDate: expiry,
        ...overrides,
      },
    },
  })
  if (!res.ok()) throw new Error(`createSubmission failed: ${res.status()} ${await res.text()}`)
  const body = await res.json()
  return body.submissionId
}

export async function addLayer(
  request: APIRequestContext,
  submissionId: string,
  overrides: {
    layerType?: string
    limit?: number
    attachmentPoint?: number
    lineSize?: number
    premium?: number
    currency?: string
  } = {},
): Promise<string> {
  const res = await request.post(`${API_BASE}/api/v1/submissions/${submissionId}/layers`, {
    data: {
      layerType: 'primary',
      limit: 1_000_000,
      attachmentPoint: 0,
      lineSize: 10,
      premium: 50_000,
      currency: 'USD',
      ...overrides,
    },
  })
  if (!res.ok()) throw new Error(`addLayer failed: ${res.status()} ${await res.text()}`)
  const body = await res.json()
  return body.id
}

export async function dispatchAndWaitForLegalReview(
  request: APIRequestContext,
  submissionId: string,
  maxMs = 30_000,
): Promise<void> {
  await request.post(`${API_BASE}/api/v1/submissions/${submissionId}/agent-tasks`, {
    data: { agentType: 'legal', input: {} },
  })
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const res = await request.get(`${API_BASE}/api/v1/submissions/${submissionId}`)
    const body = await res.json()
    if (body.legalReview?.recommendation != null) return
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Legal review did not complete within ${maxMs}ms`)
}

export async function waitForClearance(
  request: APIRequestContext,
  submissionId: string,
  expected: 'clear' | 'refer' | 'blocked',
  maxMs = 8_000,
): Promise<void> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    const res = await request.get(`${API_BASE}/api/v1/submissions/${submissionId}`)
    const body = await res.json()
    const status: string = body.namesClearance?.status ?? 'pending'
    if (status === expected) return
    if (status !== 'pending') throw new Error(`Expected clearance "${expected}" but got "${status}"`)
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Clearance did not reach "${expected}" within ${maxMs}ms`)
}
