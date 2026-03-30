import { test, expect } from '@playwright/test'

test.describe('Cedant names clearance re-run', () => {
  // Assumes at least one submission exists at this URL; adjust in CI fixture setup
  const SUBMISSION_URL = /\/submissions\//

  test('adding cedant triggers names clearance re-run', async ({ page }) => {
    // Navigate to an existing submission (created by test fixture or prior test)
    await page.goto('/')
    // Click the first submission row
    await page.locator('tbody tr').first().click()
    await expect(page).toHaveURL(SUBMISSION_URL)

    // Go to Risk Summary tab (default)
    const editBtn = page.getByRole('button', { name: 'Edit' })
    await editBtn.click()

    // Enter cedant
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
    await page.goto('/')
    await page.locator('tbody tr').first().click()
    await expect(page).toHaveURL(SUBMISSION_URL)

    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Cedant').fill('Clearance Test Co')
    await page.getByRole('button', { name: 'Save' }).click()

    // Switch to Audit Log tab
    await page.getByRole('tab', { name: /Audit/i }).click()
    await expect(page.locator('text=names-clearance-complete')).toBeVisible({ timeout: 10_000 })
  })
})
