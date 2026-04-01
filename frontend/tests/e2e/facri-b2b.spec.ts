import { test, expect } from '@playwright/test'
import { createSubmission, addLayer, waitForClearance, API_BASE } from './helpers'

const mandate = {
  maxCessionPct: 30,
  minReinsurerLineSizePct: 5,
  rateRange: { min: 0.01, max: 0.05 },
}

// ── FacRi panel CRUD ───────────────────────────────────────────────────────────

test.describe('FacRi panel management', () => {
  let submissionId: string
  let layerId: string

  test.beforeEach(async ({ request }) => {
    submissionId = await createSubmission(request)
    await waitForClearance(request, submissionId, 'clear')
    layerId = await addLayer(request, submissionId)
  })

  test('can add a FacRi panel to a layer', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/layers/${layerId}/facri`,
      { data: { reinsurerName: 'Alpha Re', cededPct: 20 } },
    )
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.facriPanelId).toBeTruthy()
    expect(body.reinsurerName).toBe('Alpha Re')
    expect(body.cededPct).toBe(20)
    expect(body.status).toBe('pending')
  })

  test('FacRi panel appears in submission.layers after creation', async ({ request }) => {
    await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/layers/${layerId}/facri`,
      { data: { reinsurerName: 'Beta Re', cededPct: 15 } },
    )

    const subRes = await request.get(`${API_BASE}/api/v1/submissions/${submissionId}`)
    const body = await subRes.json()
    const layer = body.layers.find((l: { id: string }) => l.id === layerId)
    expect(layer.facriPanels).toHaveLength(1)
    expect(layer.facriPanels[0].reinsurerName).toBe('Beta Re')
    expect(layer.facriPanels[0].cededPct).toBe(15)
  })

  test('can add multiple FacRi panels to the same layer', async ({ request }) => {
    await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/layers/${layerId}/facri`,
      { data: { reinsurerName: 'Gamma Re', cededPct: 10 } },
    )
    await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/layers/${layerId}/facri`,
      { data: { reinsurerName: 'Delta Re', cededPct: 10 } },
    )

    const subRes = await request.get(`${API_BASE}/api/v1/submissions/${submissionId}`)
    const body = await subRes.json()
    const layer = body.layers.find((l: { id: string }) => l.id === layerId)
    expect(layer.facriPanels).toHaveLength(2)
  })

  test('can delete a FacRi panel', async ({ request }) => {
    const addRes = await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/layers/${layerId}/facri`,
      { data: { reinsurerName: 'Epsilon Re', cededPct: 25 } },
    )
    const { facriPanelId } = await addRes.json()

    const delRes = await request.delete(
      `${API_BASE}/api/v1/submissions/${submissionId}/layers/${layerId}/facri/${facriPanelId}`,
    )
    expect(delRes.status()).toBe(204)

    const subRes = await request.get(`${API_BASE}/api/v1/submissions/${submissionId}`)
    const body = await subRes.json()
    const layer = body.layers.find((l: { id: string }) => l.id === layerId)
    expect(layer.facriPanels).toHaveLength(0)
  })

  test('FacRi panel shows in LayerStructureTab UI after creation', async ({ page, request }) => {
    await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/layers/${layerId}/facri`,
      { data: { reinsurerName: 'UI Check Re', cededPct: 30 } },
    )

    await page.goto(`/submissions/${submissionId}`)
    await page.getByRole('button', { name: 'Layers' }).click()
    await expect(page.getByText('UI Check Re')).toBeVisible()
    await expect(page.getByText('30')).toBeVisible()
  })
})

// ── B2B session management ─────────────────────────────────────────────────────

test.describe('B2B session management', () => {
  let submissionId: string
  let layerId: string
  let facriPanelId: string

  test.beforeEach(async ({ request }) => {
    submissionId = await createSubmission(request)
    await waitForClearance(request, submissionId, 'clear')
    layerId = await addLayer(request, submissionId)

    const res = await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/layers/${layerId}/facri`,
      { data: { reinsurerName: 'Session Re', cededPct: 25 } },
    )
    facriPanelId = (await res.json()).facriPanelId
  })

  test('can initiate a B2B session and it is created as active', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/b2b-sessions`,
      { data: { layerId, facriPanelId, mandate } },
    )
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.sessionId).toBeTruthy()
    expect(body.status).toBe('active')
  })

  test('can retrieve a B2B session by id', async ({ request }) => {
    const initRes = await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/b2b-sessions`,
      { data: { layerId, facriPanelId, mandate } },
    )
    const { sessionId } = await initRes.json()

    const getRes = await request.get(
      `${API_BASE}/api/v1/submissions/${submissionId}/b2b-sessions/${sessionId}`,
    )
    expect(getRes.status()).toBe(200)
    const body = await getRes.json()
    expect(body.id ?? body.sessionId).toBeTruthy()
    expect(['active', 'agreed', 'rejected', 'stalled']).toContain(body.status)
  })

  test('returns 404 when layerId does not exist', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/b2b-sessions`,
      { data: { layerId: 'non-existent-id', facriPanelId, mandate } },
    )
    expect(res.status()).toBe(404)
    expect((await res.json()).error).toBe('LAYER_NOT_FOUND')
  })

  test('returns 404 when facriPanelId does not exist on the layer', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/b2b-sessions`,
      { data: { layerId, facriPanelId: 'non-existent-panel', mandate } },
    )
    expect(res.status()).toBe(404)
    expect((await res.json()).error).toBe('FACRI_PANEL_NOT_FOUND')
  })

  test('can manually reject a B2B session', async ({ request }) => {
    const initRes = await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/b2b-sessions`,
      { data: { layerId, facriPanelId, mandate } },
    )
    const { sessionId } = await initRes.json()

    const rejectRes = await request.post(
      `${API_BASE}/api/v1/submissions/${submissionId}/b2b-sessions/${sessionId}/respond`,
      { data: { action: 'reject', counterPayload: null } },
    )
    expect(rejectRes.status()).toBe(200)
    const body = await rejectRes.json()
    expect(body.status).toBe('rejected')
  })
})
