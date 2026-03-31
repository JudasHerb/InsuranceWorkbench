import { test, expect } from '@playwright/test'

test.describe('New Submission modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('territory filter is a dropdown with European countries', async ({ page }) => {
    const select = page.locator('select').filter({ hasText: 'All territories' })
    await expect(select).toBeVisible()
    await expect(select.locator('option', { hasText: 'Germany' })).toBeAttached()
    await expect(select.locator('option', { hasText: 'United Kingdom' })).toBeAttached()
  })

  test('LOB filter is a dropdown with 4 lines', async ({ page }) => {
    const select = page.locator('select').filter({ hasText: 'All lines' })
    await expect(select).toBeVisible()
    for (const lob of ['Casualty', 'Property', 'IFL', 'Cyber']) {
      await expect(select.locator(`option[value="${lob}"]`)).toBeAttached()
    }
  })

  test('modal has no cedant field', async ({ page }) => {
    await page.getByText('+ New Submission').click()
    await expect(page.getByLabel('Cedant')).not.toBeVisible()
  })

  test('coverage options update when LOB changes', async ({ page }) => {
    await page.getByText('+ New Submission').click()
    await page.getByLabel('Line of Business').selectOption('Casualty')
    await expect(page.getByText('Employers Liability')).toBeVisible()
    await page.getByLabel('Line of Business').selectOption('Cyber')
    await expect(page.getByText('Ransomware & Extortion')).toBeVisible()
    await expect(page.getByText('Employers Liability')).not.toBeVisible()
  })

  test('expiry auto-fills to inception + 1 year', async ({ page }) => {
    await page.getByText('+ New Submission').click()
    await page.getByLabel('Inception Date').fill('2026-06-01')
    await expect(page.getByLabel('Expiry Date')).toHaveValue('2027-06-01')
  })

  test('manual expiry override is preserved after inception change', async ({ page }) => {
    await page.getByText('+ New Submission').click()
    await page.getByLabel('Inception Date').fill('2026-06-01')
    await page.getByLabel('Expiry Date').fill('2026-12-31')
    // inception change should NOT override manual expiry
    await page.getByLabel('Inception Date').fill('2027-01-01')
    await expect(page.getByLabel('Expiry Date')).toHaveValue('2026-12-31')
  })

  test('creates a submission and navigates to it', async ({ page }) => {
    await page.getByText('+ New Submission').click()
    await page.getByLabel('Insured Name').fill('Acme Corp')
    await page.getByLabel('Broker').fill('Willis Towers Watson')
    await page.getByLabel('Territory').selectOption('Germany')
    await page.getByLabel('Line of Business').selectOption('Cyber')
    await page.getByLabel('First-Party Data Breach').check()
    await page.getByLabel('Inception Date').fill('2026-07-01')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page).toHaveURL(/\/submissions\//)
  })
})
