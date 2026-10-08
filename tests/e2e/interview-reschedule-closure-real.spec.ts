import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const memberAccount = process.env.HSD_E2E_MEMBER_ACCOUNT ?? 'e2e-interview-member'
const memberPassword = process.env.HSD_E2E_MEMBER_PASSWORD
const ownerAccount = process.env.HSD_E2E_OWNER_ACCOUNT ?? 'e2e-interview-owner'
const ownerPassword = process.env.HSD_E2E_OWNER_PASSWORD
const batchId = process.env.HSD_E2E_INTERVIEW_BATCH_ID ?? '40000000-0000-4000-8000-000000000001'
const applicationId = process.env.HSD_E2E_INTERVIEW_APPLICATION_ID ?? '40000000-0000-4000-8000-000000000002'

if (!memberPassword || !ownerPassword) throw new Error('Synthetic isolated-stack member and owner passwords are required')

async function signIn(page: Page, account: string, password: string, redirect: string, admin = false) {
  const query = new URLSearchParams({ redirect, ...(admin ? { mode: 'admin' } : {}) })
  await page.goto(`/login?${query.toString()}`)
  await page.getByLabel('学号或成员账号').fill(account)
  await page.getByLabel('密码', { exact: true }).fill(password)
  await page.getByRole('button', { name: '登录并继续' }).click()
  await expect.poll(() => new URL(page.url()).pathname).toBe(redirect)
}

function shanghaiMinute(value: string) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}

test.describe('interview reschedule closure on an isolated live API and Web stack', () => {
  test.setTimeout(90_000)

  test('closed-batch reselection updates the member, open admin roster, detail and fresh CSV', async ({ browser, page }, testInfo) => {
    await signIn(page, memberAccount, memberPassword!, '/member/applications')
    await expect(page.getByText('E2E 已关闭待重选批次', { exact: true })).toBeVisible()
    await expect(page.getByText(/待重新选择/).first()).toBeVisible()

    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    try {
      await signIn(adminPage, ownerAccount, ownerPassword!, '/admin', true)
      const reselectLink = page.getByRole('link', { name: '重新选择面试时间' })
      const href = await reselectLink.getAttribute('href')
      if (!href) throw new Error('Interview reselection link is missing its destination')
      const interviewBatchToken = new URL(href, page.url()).searchParams.get('batchId')
      if (!interviewBatchToken) throw new Error('Interview reselection link is missing its batch token')
      const apiBase = process.env.NUXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:35101'
      const batchListResponse = await adminPage.request.get(`${apiBase}/api/v1/admin/recruitment/batches?page=1&pageSize=50`)
      expect(batchListResponse.status()).toBe(200)
      const batchList = await batchListResponse.json() as { items: Array<{ id: string; name: string }> }
      const matchingBatch = batchList.items.find((item) => item.name === 'E2E 已关闭待重选批次')
      if (!matchingBatch) throw new Error('The synthetic closed interview batch was not returned to its owner')
      await adminPage.goto(`/admin/recruitment/batches/${matchingBatch.id}/applications`)
      await expect(adminPage.getByRole('table', { name: '批次报名人员' })).toBeVisible({ timeout: 15_000 })
      const row = adminPage.getByRole('row').filter({ hasText: 'E2E 改期同学' })
      await expect(row).toContainText('待重新选择')

      await reselectLink.click()
      await expect(page.getByRole('heading', { name: '重新选择面试时间' })).toBeVisible()
      const targetSlot = page.getByRole('radio').nth(1)
      await expect(targetSlot).toBeEnabled()
      await targetSlot.check({ timeout: 5_000 })
      await expect(targetSlot).toBeChecked()
      const confirmButton = page.getByRole('button', { name: '确认面试时间' })
      await expect(confirmButton).toBeEnabled()
      await page.waitForTimeout(16_000)
      await expect(targetSlot).toBeChecked()
      await expect(confirmButton).toBeEnabled()
      const changeResponse = page.waitForResponse((response) => response.request().method() === 'PATCH'
        && new URL(response.url()).pathname.endsWith(`/applications/${applicationId}/interview-slot`), { timeout: 15_000 })
      await confirmButton.click({ timeout: 5_000 })
      const savedResponse = await changeResponse.catch((error) => { throw new Error(`No interview change response observed; current URL ${page.url()}: ${String(error)}`) })
      expect(savedResponse.status()).toBe(200)
      const saved = await savedResponse.json() as { id: string; interviewSelection: { status: string; startAt: string } }
      expect(saved).toMatchObject({ id: applicationId, interviewSelection: { status: 'CONFIRMED' } })
      const expectedTime = shanghaiMinute(saved.interviewSelection.startAt)
      await expect(page.getByRole('status').filter({ hasText: '面试时间已确认' })).toContainText(expectedTime)

      await expect.poll(async () => row.innerText(), { timeout: 17_000, intervals: [500, 1000, 1500] })
        .toContain(`${expectedTime} · 已确认`)

      const downloadPromise = adminPage.waitForEvent('download')
      await adminPage.getByRole('button', { name: '导出报名表' }).click()
      const download = await downloadPromise
      const downloadPath = testInfo.outputPath(download.suggestedFilename())
      await download.saveAs(downloadPath)
      const csv = await readFile(downloadPath, 'utf8')
      expect(csv).toContain(expectedTime)
      expect(csv).not.toContain(shanghaiMinute(new Date(Date.parse(saved.interviewSelection.startAt) - 86400000).toISOString()))

      const detailLink = row.getByRole('link', { name: /查看报名/ })
      const detailHref = await detailLink.getAttribute('href')
      if (!detailHref) throw new Error('Admin application detail link is missing its destination')
      const detailResponse = adminPage.waitForResponse((response) => response.request().method() === 'GET'
        && new URL(response.url()).pathname.endsWith(`/applications/${applicationId}`), { timeout: 15_000 })
      await detailLink.click()
      await expect(adminPage).toHaveURL(new RegExp(`/applications/${applicationId}$`))
      const loadedDetail = await detailResponse
      expect(loadedDetail.status()).toBe(200)
      await expect(adminPage.getByText(expectedTime, { exact: false })).toBeVisible()

      await page.getByRole('link', { name: '返回申请进度' }).click()
      const historyEntry = page.locator('article.member-progress-card').filter({ hasText: 'E2E 已关闭待重选批次' })
      await expect(historyEntry).toContainText(expectedTime)
      await expect(historyEntry).toContainText('已确认')
    } finally {
      await adminContext.close().catch(() => undefined)
    }
  })
})
