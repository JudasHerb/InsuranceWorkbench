import { test, expect } from '@playwright/test'
import { createSubmission } from './helpers'

test.describe('Portfolio view', () => {
  test('loads with risk register table headers', async ({ page }) => {
    await page.goto('/')
    for (const header of ['Insured', 'LOB', 'Territory', 'Expiry']) {
      await expect(page.getByText(header)).toBeVisible()
    }
    // 'Status' appears in both the column header and the filter option text; use role selector
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
  })

  test('shows + New Submission button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('+ New Submission')).toBeVisible()
  })

  test('territory filter is a dropdown containing European countries', async ({ page }) => {
    await page.goto('/')
    const select = page.locator('select').filter({ hasText: 'All territories' })
    await expect(select).toBeVisible()
    for (const country of ['Germany', 'France', 'Spain', 'Italy', 'Poland']) {
      await expect(select.locator(`option[value="${country}"]`)).toBeAttached()
    }
  })

  test('LOB filter is a dropdown with the four lines of business', async ({ page }) => {
    await page.goto('/')
    const select = page.locator('select').filter({ hasText: 'All lines' })
    await expect(select).toBeVisible()
    for (const lob of ['Casualty', 'Property', 'IFL', 'Cyber']) {
      await expect(select.locator(`option[value="${lob}"]`)).toBeAttached()
    }
  })

  test('status filter has expected options', async ({ page }) => {
    await page.goto('/')
    const select = page.locator('select').filter({ hasText: 'All statuses' })
    await expect(select).toBeVisible()
    for (const status of ['draft', 'in-review', 'bound', 'declined']) {
      await expect(select.locator(`option[value="${status}"]`)).toBeAttached()
    }
  })

  test('newly created submission appears in the risk register', async ({ page, request }) => {
    const id = await createSubmission(request, { insuredName: 'Portfolio Visibility Corp' })
    await page.goto('/')
    // Use .first() in case the same company exists from a previous test run
    await expect(page.getByRole('cell', { name: 'Portfolio Visibility Corp' }).first()).toBeVisible({ timeout: 5_000 })
    // Clicking the row navigates to the submission
    await page.getByRole('cell', { name: 'Portfolio Visibility Corp' }).first().click()
    await expect(page).toHaveURL(`/submissions/${id}`)
  })

  test('territory filter narrows visible submissions', async ({ page, request }) => {
    await createSubmission(request, {
      insuredName: 'Iceland Filter Corp',
      territory: 'Iceland',
      lineOfBusiness: 'Property',
      coverageTypes: ['Material Damage'],
    })

    await page.goto('/')
    await page.locator('select').filter({ hasText: 'All territories' }).selectOption('Iceland')
    await expect(page.getByRole('cell', { name: 'Iceland Filter Corp' }).first()).toBeVisible({ timeout: 5_000 })

    // Switching away should hide Iceland submissions
    await page.locator('select').filter({ hasText: 'Iceland' }).selectOption('Germany')
    await expect(page.getByRole('cell', { name: 'Iceland Filter Corp' }).first()).not.toBeVisible()
  })

  test('LOB filter narrows visible submissions', async ({ page, request }) => {
    await createSubmission(request, {
      insuredName: 'IFL Filter Corp',
      lineOfBusiness: 'IFL',
      territory: 'Belgium',
      coverageTypes: ['Trade Credit'],
    })

    await page.goto('/')
    await page.locator('select').filter({ hasText: 'All lines' }).selectOption('IFL')
    await expect(page.getByRole('cell', { name: 'IFL Filter Corp' }).first()).toBeVisible({ timeout: 5_000 })

    // Switching to a different LOB should hide it
    await page.locator('select').filter({ hasText: 'IFL' }).selectOption('Cyber')
    await expect(page.getByRole('cell', { name: 'IFL Filter Corp' }).first()).not.toBeVisible()
  })

  test('status filter shows only submissions with matching status', async ({ page, request }) => {
    // Create a draft submission with a unique name
    await createSubmission(request, { insuredName: 'Draft Status Corp' })

    await page.goto('/')
    await page.locator('select').filter({ hasText: 'All statuses' }).selectOption('draft')
    await expect(page.getByRole('cell', { name: 'Draft Status Corp' }).first()).toBeVisible({ timeout: 5_000 })

    // Filtering for "bound" should hide our draft
    await page.locator('select').filter({ hasText: 'draft' }).selectOption('bound')
    await expect(page.getByRole('cell', { name: 'Draft Status Corp' }).first()).not.toBeVisible()
  })

  test('combining territory and LOB filters narrows results further', async ({ page, request }) => {
    await createSubmission(request, {
      insuredName: 'Malta Cyber Corp',
      territory: 'Malta',
      lineOfBusiness: 'Cyber',
      coverageTypes: ['Ransomware & Extortion'],
    })
    await createSubmission(request, {
      insuredName: 'Malta Casualty Corp',
      territory: 'Malta',
      lineOfBusiness: 'Casualty',
      coverageTypes: ['Employers Liability'],
    })

    await page.goto('/')
    await page.locator('select').filter({ hasText: 'All territories' }).selectOption('Malta')
    await page.locator('select').filter({ hasText: 'All lines' }).selectOption('Cyber')

    await expect(page.getByRole('cell', { name: 'Malta Cyber Corp' }).first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('cell', { name: 'Malta Casualty Corp' }).first()).not.toBeVisible()
  })
})
