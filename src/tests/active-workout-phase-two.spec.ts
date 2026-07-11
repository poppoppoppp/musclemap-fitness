import { expect, test, type Page } from '@playwright/test';

const ACTIVE_WORKOUT_KEY = 'musclemap.activeWorkout.v0.7';
const PLAYLIST_KEY = 'musclemap.neteasePlaylist.v1';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ activeKey, playlistKey }) => {
    window.localStorage.removeItem(activeKey);
    window.localStorage.removeItem(playlistKey);
  }, { activeKey: ACTIVE_WORKOUT_KEY, playlistKey: PLAYLIST_KEY });
});

test('renders the active hierarchy with real timers and a derived current exercise', async ({ page }) => {
  const now = Date.now();
  await seedActiveWorkout(page, {
    startedAt: new Date(now - 5 * 60_000).toISOString(),
    exercises: [
      activeExercise('bench-active', 'barbell-bench-press', 0, {
        startedAt: new Date(now - 4 * 60_000).toISOString(),
        endedAt: new Date(now - 2 * 60_000).toISOString(),
        sets: [activeSet('bench-set', 1, 60, 8)]
      }),
      activeExercise('pulldown-active', 'lat-pulldown', 1, {
        startedAt: new Date(now - 70_000).toISOString(),
        sets: [activeSet('pulldown-set', 1, 42.5, 10)]
      }),
      activeExercise('row-active', 'seated-row', 2)
    ]
  });

  await page.goto('/workout-log');

  await expect(page.getByTestId('active-workout-view')).toBeVisible();
  await expect(page.getByTestId('workout-log-overview')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '训练中', exact: true })).toBeVisible();
  await expect(page.locator('header').getByText('进行中', { exact: true })).toBeVisible();
  await expect(page.getByTestId('workout-duration')).toContainText(/00:0[45]:\d{2}/);
  await expect(page.getByTestId('workout-start-time')).not.toContainText('Invalid Date');
  await expect(page.getByTestId('active-workout-card')).not.toContainText('有效组');
  await expect(page.getByTestId('active-workout-card')).not.toContainText('训练容量');
  await expect(page.getByTestId('current-exercise-card')).toContainText('高位下拉');
  await expect(page.getByTestId('current-exercise-position')).toHaveText('2 / 3');
  await expect(page.getByTestId('current-exercise-card').getByTestId('current-exercise-timer')).toContainText(/01:\d{2}/);
  await expect(page.getByTestId('completed-exercises')).toContainText('已完成动作 1');
  await expect(page.getByTestId('completed-exercise-summary')).toContainText('杠铃卧推');
  await expect(page.getByTestId('completed-exercise-summary')).toContainText('60kg × 8');
});

test('supports compact set entry, set deletion, notes and completing the current exercise', async ({ page }) => {
  await seedActiveWorkout(page, {
    exercises: [activeExercise('pulldown-active', 'lat-pulldown', 0)]
  });
  await page.goto('/workout-log');

  const current = page.getByTestId('current-exercise-card');
  await expect(current.getByTestId('workout-set-row')).toHaveCount(1);
  await expect(current.getByTestId('set-weight-input')).toHaveAttribute('inputmode', 'decimal');
  await expect(current.getByTestId('set-reps-input')).toHaveAttribute('inputmode', 'numeric');
  await current.getByTestId('set-weight-input').fill('42.5');
  await current.getByTestId('set-reps-input').fill('10');
  await expect(current.getByTestId('set-completion-toggle')).toHaveAttribute('data-completed', 'true');

  await current.getByTestId('add-set').click();
  await expect(current.getByTestId('workout-set-row')).toHaveCount(2);
  await current.getByTestId('set-completion-toggle').last().click();
  await current.getByTestId('delete-set').last().click();
  await expect(current.getByTestId('workout-set-row')).toHaveCount(1);

  await current.getByTestId('toggle-exercise-notes').click();
  await current.getByTestId('exercise-notes-input').fill('肩胛先下沉');
  await current.getByTestId('end-current-exercise').click();

  await expect(page.getByTestId('current-exercise-card')).toHaveCount(0);
  await expect(page.getByTestId('completed-exercise-summary')).toContainText('高位下拉');
  await page.getByTestId('completed-exercise-summary').click();
  await expect(page.getByTestId('completed-exercise-details').getByTestId('exercise-notes-input')).toHaveValue('肩胛先下沉');
});

test('mini player degrades without music and uses real shared NetEase playback state', async ({ page }) => {
  await seedActiveWorkout(page, { exercises: [] });
  await page.goto('/workout-log');
  await expect(page.getByTestId('workout-mini-player')).toContainText('选择训练音乐');
  await expect(page.getByTestId('workout-mini-player')).toContainText('暂未播放');

  await page.addInitScript((key) => window.localStorage.setItem(key, JSON.stringify('19723756')), PLAYLIST_KEY);
  await page.route('**/api/netease-playlist?id=*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        playlist: { id: '19723756', name: '训练歌单', source: 'netease', trackCount: 2 },
        tracks: [
          { id: 'track-one', name: '真实歌曲一', artist: '真实歌手', coverUrl: 'https://example.com/cover.jpg' },
          { id: 'track-two', name: '真实歌曲二', artist: '另一位歌手' }
        ]
      })
    });
  });
  await page.route('**/api/music/song-url?id=*', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, audioUrl: 'https://example.com/song.mp3' }) });
  });
  await page.reload();

  const miniPlayer = page.getByTestId('workout-mini-player');
  await expect(miniPlayer).toContainText('真实歌曲一');
  await expect(miniPlayer).toContainText('真实歌手');
  await expect(page.locator('audio[data-testid="persistent-music-audio"]')).toHaveCount(1);
  await page.locator('audio[data-testid="persistent-music-audio"]').evaluate((audio) => { (audio as HTMLAudioElement & { mountMarker?: string }).mountMarker = 'same-node'; });
  await page.waitForTimeout(1_100);
  expect(await page.locator('audio[data-testid="persistent-music-audio"]').evaluate((audio) => (audio as HTMLAudioElement & { mountMarker?: string }).mountMarker)).toBe('same-node');
  await miniPlayer.getByRole('button', { name: '下一首' }).click();
  await expect(miniPlayer).toContainText('真实歌曲二');
});

test('fits a 320px viewport and keeps content above BottomNav', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await seedActiveWorkout(page, {
    exercises: [activeExercise('bench-active', 'barbell-bench-press', 0, {
      sets: Array.from({ length: 8 }, (_, index) => activeSet(`set-${index}`, index + 1))
    })]
  });
  await page.goto('/workout-log');

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  const miniPlayer = page.getByTestId('workout-mini-player');
  await miniPlayer.scrollIntoViewIfNeeded();
  const playerBox = await miniPlayer.boundingBox();
  const navBox = await page.locator('nav').boundingBox();
  expect(playerBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(playerBox!.y + playerBox!.height).toBeLessThanOrEqual(navBox!.y);
});

async function seedActiveWorkout(page: Page, options: { startedAt?: string; exercises: ReturnType<typeof activeExercise>[] }) {
  const timestamp = options.startedAt ?? new Date(Date.now() - 60_000).toISOString();
  await page.addInitScript(({ key, workout }) => {
    window.localStorage.setItem(key, JSON.stringify(workout));
  }, {
    key: ACTIVE_WORKOUT_KEY,
    workout: {
      id: 'phase-two-workout',
      status: 'active',
      startedAt: timestamp,
      trainingDate: timestamp.slice(0, 10),
      source: 'manual',
      exercises: options.exercises,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  });
}

function activeExercise(id: string, exerciseId: string, order: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    exerciseId,
    order,
    source: 'manual',
    sets: [activeSet(`${id}-set`, 1)],
    ...overrides
  };
}

function activeSet(id: string, setIndex: number, weight?: number, reps?: number) {
  return { id, setIndex, weight, reps, completed: weight !== undefined || reps !== undefined };
}
