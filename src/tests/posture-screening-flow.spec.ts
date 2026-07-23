import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('musclemap.postureScreeningDraft.v1');
    localStorage.removeItem('musclemap.postureScreeningSessions.v1');
  });
});

async function passBoundary(page: import('@playwright/test').Page, age = '30') {
  await page.getByLabel('年龄').fill(age);
  await page.getByLabel('我理解这是体态与功能表现筛查，不是医疗诊断').check();
  await page.getByRole('button', { name: '继续安全检查' }).click();
}

async function passSafety(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '继续选择关注表现' }).click();
}

test('starts the adaptive route, moves focus, and restores the movement step after reload', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await expect(page.getByRole('link', { name: '返回体态改善' })).toHaveAttribute('href', '/growth/posture');
  await expect(page.getByRole('heading', { name: '体态表现筛查' })).toBeVisible();
  await expect(page.getByTestId('screening-progress')).toContainText('成人边界');
  await expect(page.getByTestId('screening-progress')).not.toContainText('/');

  await passBoundary(page);
  await expect(page.getByRole('heading', { name: '开始前安全检查' })).toBeFocused();
  await passSafety(page);
  await page.getByLabel('头颈与上段').check();
  await page.getByLabel(/自然站立或久坐时.*头部相对肩部明显前移/).check();
  await page.getByRole('button', { name: '继续引导观察' }).click();

  await expect(page.getByRole('heading', { name: '自然站立双臂慢速上举观察' })).toBeFocused();
  await expect(page.getByText('约 30 秒')).toBeVisible();
  await expect(page.getByText('出现眩晕、麻木或放射感、明显疼痛加重或突然无力时立即停止。')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '自然站立双臂慢速上举观察' })).toBeVisible();
});

test('browser back from screening restores the posture Growth tab', async ({ page }) => {
  await page.goto('/growth/posture');
  await page.getByRole('link', { name: '开始体态分析' }).click();
  await page.goBack();

  await expect(page).toHaveURL('/growth/posture');
  await expect(page.getByRole('tab', { name: '体态改善' })).toHaveAttribute('aria-selected', 'true');
});

test('discards a damaged draft and allows a fresh screening to continue', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('musclemap.postureScreeningDraft.v1', '{damaged'));
  await page.goto('/growth/posture/screening');

  await expect(page.getByRole('alert')).toContainText('上次未完成的筛查草稿已损坏');
  await passBoundary(page);
  await expect(page.getByRole('heading', { name: '开始前安全检查' })).toBeVisible();
});

test('stops under-18 users before movement or photo instructions and offers a return action', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await passBoundary(page, '17');

  await expect(page.getByTestId('screening-terminal')).toContainText('当前版本仅支持已满 18 岁');
  await expect(page.getByRole('link', { name: '返回体态主页' })).toHaveAttribute('href', '/growth/posture');
  await expect(page.getByText('双臂慢速上举')).toHaveCount(0);
  await expect(page.getByText(/照片测量/)).toHaveCount(0);
});

test('stops on a safety flag with a professional-review next action', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await passBoundary(page);
  await page.getByLabel('进行性麻木或无力').check();
  await page.getByRole('button', { name: '继续选择关注表现' }).click();

  await expect(page.getByTestId('screening-terminal')).toContainText('本次自测已暂停');
  await expect(page.getByText('先咨询合格医疗专业人员')).toBeVisible();
  await expect(page.getByText('自然站立双臂慢速上举观察')).toHaveCount(0);
});

test('changing the primary concern removes inapplicable follow-up answers', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await passBoundary(page);
  await passSafety(page);

  await page.getByLabel('头颈与上段').check();
  const neckFollowUp = page.getByLabel(/自然站立或久坐时.*头部相对肩部明显前移/);
  await neckFollowUp.check();
  await page.getByLabel('肩部左右差异').check();

  await expect(neckFollowUp).toHaveCount(0);
  await expect(page.getByLabel(/同一侧肩峰更高或更低/)).not.toBeChecked();
  await page.getByRole('button', { name: '继续引导观察' }).click();
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningDraft.v1') ?? 'null'));
  expect(draft.answers.subjectiveObservations).toEqual([]);
});

test('stops when symptoms arise during the guided observation', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await passBoundary(page);
  await passSafety(page);
  await page.getByLabel('胸廓与躯干').check();
  await page.getByRole('button', { name: '继续引导观察' }).click();
  await page.getByLabel('观察中出现眩晕').check();
  await page.getByRole('button', { name: '保存观察结果' }).click();

  await expect(page.getByTestId('screening-terminal')).toContainText('本次自测已终止');
  await expect(page.getByText('根据症状寻求专业评估')).toBeVisible();
});

test('completes a functional-only result once and preserves one session through browser history', async ({ page }) => {
  await page.goto('/growth/posture');
  await page.goto('/growth/posture/screening');
  await passBoundary(page);
  await passSafety(page);
  await page.getByLabel('头颈与上段').check();
  await page.getByLabel(/自然站立或久坐时.*头部相对肩部明显前移/).check();
  await page.getByRole('button', { name: '继续引导观察' }).click();
  await page.getByLabel('上举时头部会向前移动').check();
  await page.getByRole('button', { name: '保存观察结果' }).click();
  await expect(page.getByRole('heading', { name: '正面静态采集' })).toBeVisible();
  await page.getByRole('button', { name: '当前设备无法采集，暂不进行自动采集' }).click();

  await expect(page.getByRole('heading', { name: '本次筛查已完成' })).toBeFocused();
  await expect(page.getByTestId('screening-terminal')).toContainText('头位前移伴上段控制负担倾向');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'))).toHaveLength(1);
  await page.goBack();
  await page.goForward();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'))).toHaveLength(1);
});
