import { test, expect } from '@playwright/test'
import { createSubmission, addLayer } from './helpers'

// ── Risk details view ──────────────────────────────────────────────────────────

test.describe('Submission detail page', () => {
  test('loads and displays risk details', async ({ page, request }) => {
    const id = await createSubmission(request, {
      insuredName: 'Lifecycle Corp',
      lineOfBusiness: 'Cyber',
      territory: 'France',
      coverageTypes: ['First-Party Data Breach'],
    })
    await page.goto(`/submissions/${id}`)
    // Scope to <main> to avoid matching the ContextPanel sidebar values
    await expect(page.getByRole('main').getByText('Lifecycle Corp').first()).toBeVisible()
    await expect(page.getByRole('main').getByText('Cyber').first()).toBeVisible()
    await expect(page.getByRole('main').getByText('France').first()).toBeVisible()
  })

  test('shows all five tabs', async ({ page, request }) => {
    const id = await createSubmission(request)
    await page.goto(`/submissions/${id}`)
    for (const tab of ['Risk Summary', 'Layers', 'Documents', 'Agents', 'Audit']) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible()
    }
  })
})

// ── Names clearance outcomes ───────────────────────────────────────────────────

test.describe('Names clearance', () => {
  test('shows CLEAR badge for a standard insured name', async ({ page, request }) => {
    const id = await createSubmission(request, { insuredName: 'Standard Corp' })
    await page.goto(`/submissions/${id}`)
    await expect(page.getByText('CLEAR', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('shows REFER badge when insured name contains TEST_REFER', async ({ page, request }) => {
    const id = await createSubmission(request, { insuredName: 'TEST_REFER Holdings' })
    await page.goto(`/submissions/${id}`)
    await expect(page.getByText('REFER', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('shows BLOCKED badge when insured name contains TEST_BLOCK', async ({ page, request }) => {
    const id = await createSubmission(request, { insuredName: 'TEST_BLOCK Ventures' })
    await page.goto(`/submissions/${id}`)
    await expect(page.getByText('BLOCKED', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('REFER outcome shows manual-review warning', async ({ page, request }) => {
    const id = await createSubmission(request, { insuredName: 'TEST_REFER Partners' })
    await page.goto(`/submissions/${id}`)
    await expect(page.getByText('REFER', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('One or more names require manual review.')).toBeVisible()
  })

  test('BLOCKED outcome shows blocked message', async ({ page, request }) => {
    const id = await createSubmission(request, { insuredName: 'TEST_BLOCK Corp' })
    await page.goto(`/submissions/${id}`)
    await expect(page.getByText('BLOCKED', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Names clearance blocked — submission cannot be bound.')).toBeVisible()
  })
})

// ── Layer management ───────────────────────────────────────────────────────────

test.describe('Layer management', () => {
  let submissionId: string

  test.beforeEach(async ({ request }) => {
    submissionId = await createSubmission(request)
  })

  test('shows "No layers yet" on a fresh submission', async ({ page }) => {
    await page.goto(`/submissions/${submissionId}`)
    await page.getByRole('button', { name: 'Layers' }).click()
    await expect(page.getByText('No layers yet')).toBeVisible()
  })

  test('can add a layer and it appears in the table', async ({ page }) => {
    await page.goto(`/submissions/${submissionId}`)
    await page.getByRole('button', { name: 'Layers' }).click()
    await page.getByRole('button', { name: '+ Add Layer' }).click()

    await page.getByLabel('Limit').fill('5000000')
    await page.getByLabel('Attachment Point').fill('500000')
    await page.getByLabel('Line Size').fill('15')
    await page.getByLabel('Premium').fill('75000')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('5,000,000')).toBeVisible()
    await expect(page.getByText('75,000')).toBeVisible()
  })

  test('total line exposure updates after adding a layer', async ({ page }) => {
    await page.goto(`/submissions/${submissionId}`)
    await page.getByRole('button', { name: 'Layers' }).click()
    await page.getByRole('button', { name: '+ Add Layer' }).click()

    await page.getByLabel('Limit').fill('1000000')
    await page.getByLabel('Attachment Point').fill('0')
    await page.getByLabel('Line Size').fill('20')
    await page.getByLabel('Premium').fill('10000')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText(/Total line exposure/)).toBeVisible()
    await expect(page.getByText(/Total line exposure/)).toContainText('20')
  })

  test('can delete a layer via UI', async ({ page, request }) => {
    await addLayer(request, submissionId)
    await page.goto(`/submissions/${submissionId}`)
    await page.getByRole('button', { name: 'Layers' }).click()
    await expect(page.getByText('1,000,000')).toBeVisible()

    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('No layers yet')).toBeVisible()
  })

  test('layer row shows type, limit, and status badge', async ({ page, request }) => {
    await addLayer(request, submissionId)
    await page.goto(`/submissions/${submissionId}`)
    await page.getByRole('button', { name: 'Layers' }).click()
    await expect(page.getByText('primary')).toBeVisible()
    await expect(page.getByText('1,000,000')).toBeVisible()
    await expect(page.getByText('quoted')).toBeVisible()
  })
})

// ── Document upload ────────────────────────────────────────────────────────────

test.describe('Document upload', () => {
  let submissionId: string

  test.beforeEach(async ({ request }) => {
    submissionId = await createSubmission(request)
  })

  test('shows "No documents uploaded" on a fresh submission', async ({ page }) => {
    await page.goto(`/submissions/${submissionId}`)
    await page.getByRole('button', { name: 'Documents' }).click()
    await expect(page.getByText('No documents uploaded')).toBeVisible()
  })

  test('can upload a PDF and it appears in the documents list', async ({ page }) => {
    await page.goto(`/submissions/${submissionId}`)
    await page.getByRole('button', { name: 'Documents' }).click()

    await page.locator('#doc-upload').setInputFiles({
      name: 'test-policy.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test policy document content'),
    })

    await expect(page.getByText('test-policy.pdf')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('cell', { name: 'wording', exact: true })).toBeVisible()
  })

  test('document type selection is respected', async ({ page }) => {
    await page.goto(`/submissions/${submissionId}`)
    await page.getByRole('button', { name: 'Documents' }).click()

    // Change type to "slip" before uploading
    await page.locator('select').filter({ hasText: 'Wording' }).selectOption('slip')

    await page.locator('#doc-upload').setInputFiles({
      name: 'slip.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 slip'),
    })

    await expect(page.getByText('slip.pdf')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('cell', { name: 'slip', exact: true })).toBeVisible()
  })
})

// ── Audit log ─────────────────────────────────────────────────────────────────

test.describe('Audit log', () => {
  test('shows submission-created entry immediately', async ({ page, request }) => {
    const id = await createSubmission(request, { insuredName: 'Audit Test Corp' })
    await page.goto(`/submissions/${id}`)
    await page.getByRole('button', { name: 'Audit' }).click()
    await expect(page.locator('text=submission-created')).toBeVisible()
    await expect(page.getByText(/Submission created for Audit Test Corp/)).toBeVisible()
  })

  test('shows names-clearance-complete entry after clearance runs', async ({ page, request }) => {
    const id = await createSubmission(request)
    await page.goto(`/submissions/${id}`)
    await page.getByRole('button', { name: 'Audit' }).click()
    await expect(page.locator('text=names-clearance-complete')).toBeVisible({ timeout: 15_000 })
  })

  test('audit entries show actor display name and timestamp', async ({ page, request }) => {
    const id = await createSubmission(request)
    await page.goto(`/submissions/${id}`)
    await page.getByRole('button', { name: 'Audit' }).click()
    await expect(page.getByText('Underwriter')).toBeVisible()
    await expect(page.locator('text=submission-created')).toBeVisible()
  })
})

// ── Agent tasks tab ────────────────────────────────────────────────────────────

test.describe('Agents tab', () => {
  test('shows Dispatch Legal Review button', async ({ page, request }) => {
    const id = await createSubmission(request)
    await page.goto(`/submissions/${id}`)
    await page.getByRole('button', { name: 'Agents' }).click()
    await expect(page.getByRole('button', { name: 'Dispatch Legal Review' })).toBeVisible()
  })

  test('dispatch modal opens with correct fields', async ({ page, request }) => {
    const id = await createSubmission(request)
    await page.goto(`/submissions/${id}`)
    await page.getByRole('button', { name: 'Agents' }).click()
    await page.getByRole('button', { name: 'Dispatch Legal Review' }).click()
    await expect(page.getByText('Dispatch Legal Review').last()).toBeVisible()
    await expect(page.getByLabel('Jurisdiction')).toHaveValue('UK')
    await expect(page.getByLabel('Checklist Type')).toBeVisible()
  })

  test('dispatching legal review creates a task entry', async ({ page, request }) => {
    const id = await createSubmission(request)
    await page.goto(`/submissions/${id}`)
    await page.getByRole('button', { name: 'Agents' }).click()
    await page.getByRole('button', { name: 'Dispatch Legal Review' }).click()
    await page.getByRole('button', { name: 'Dispatch', exact: true }).click()

    // Modal closes (the h2 heading disappears; the tab button remains but that's expected)
    await expect(page.getByRole('heading', { name: 'Dispatch Legal Review' })).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Legal', { exact: true })).toBeVisible({ timeout: 10_000 })
  })
})
