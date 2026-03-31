import { test, expect } from '@playwright/test'

test.describe('Cedant names clearance re-run', () => {
  let submissionId: string

  test.beforeEach(async ({ request }) => {
    const today = new Date()
    const inception = today.toISOString().slice(0, 10)
    const expiry = new Date(today.setFullYear(today.getFullYear() + 1)).toISOString().slice(0, 10)

    const res = await request.post('/api/v1/submissions', {
      data: {
        riskDetails: {
          insuredName: 'Cedant Test Corp',
          broker: 'Test Broker Ltd',
          lineOfBusiness: 'Cyber',
          territory: 'Germany',
          coverageTypes: ['First-Party Data Breach'],
          inceptionDate: inception,
          expiryDate: expiry,
        },
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    submissionId = body.submissionId ?? body.id
  })

  test('adding cedant triggers names clearance re-run', async ({ page }) => {
    await page.goto(`/submissions/${submissionId}`)

    const editBtn = page.getByRole('button', { name: 'Edit' })
    await editBtn.click()

    const cedantInput = page.getByLabel('Cedant')
    await cedantInput.fill('Test Cedant Ltd')
    await page.getByRole('button', { name: 'Save' }).click()

    // Names clearance badge should transition to pending then resolve
    const badge = page.locator('text=/PENDING|CLEAR|REFER|BLOCKED/')
    await expect(badge).toBeVisible()

    // Wait up to 10s for clearance to complete
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 10_000 })
  })

  test('audit log shows names-clearance-complete entry after cedant save', async ({ page }) => {
    await page.goto(`/submissions/${submissionId}`)

    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Cedant').fill('Clearance Test Co')
    await page.getByRole('button', { name: 'Save' }).click()

    // Switch to Audit Log tab
    await page.getByRole('button', { name: 'Audit' }).click()
    await expect(page.locator('text=names-clearance-complete')).toBeVisible({ timeout: 10_000 })
  })
})
