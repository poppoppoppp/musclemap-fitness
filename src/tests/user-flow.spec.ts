import { expect, test } from '@playwright/test';

import { exerciseTrajectories } from '../data/exerciseTrajectories';
import { threeModelRegions } from '../data/threeModelRegions';
import { upperBodyLocalMeshMappings } from '../data/upperBodyLocalMeshMappings';
import type { WorkoutLog } from '../types/workout';
import { getLatestBodySnapshot } from '../utils/bodySnapshots';
import { validateBackupText } from '../utils/backup';
import {
  calculateWorkoutExerciseCount,
  calculateWorkoutSetCount,
  calculateWorkoutVolume,
  estimateWorkoutCalories,
  getWorkedMusclesFromWorkout,
  normalizeMuscleId
} from '../utils/workoutSummary';

async function startFreeWorkout(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '开始记录训练' }).click();
  await page.getByTestId('start-active-workout').click();
}

async function addExerciseFromPicker(page: import('@playwright/test').Page, exerciseId: string) {
  await page.getByTestId('open-exercise-picker').click();
  await page.getByTestId(`add-exercise-${exerciseId}`).click();
  await expect(page.getByTestId('exercise-picker-sheet')).toBeHidden();
}

test('workout summary utilities calculate report metrics and normalized muscles', () => {
  const workout: WorkoutLog = {
    id: 'summary-unit',
    date: '2026-06-10',
    durationSeconds: 1860,
    exercises: [
      {
        id: 'exercise-a',
        exerciseId: 'barbell-bench-press',
        order: 0,
        sets: [
          { id: 'set-a1', setIndex: 1, weight: 20, reps: 18, completed: true },
          { id: 'set-a2', setIndex: 2, weight: 40, reps: 12, completed: true },
          { id: 'set-a3', setIndex: 3, weight: 60, completed: true }
        ]
      },
      {
        id: 'exercise-b',
        exerciseId: 'lat-pulldown',
        order: 1,
        sets: [{ id: 'set-b1', setIndex: 1, weight: 50, reps: 10, completed: true }]
      }
    ],
    createdAt: '2026-06-10T09:00:00.000Z'
  };

  expect(calculateWorkoutVolume(workout)).toBe(1340);
  expect(calculateWorkoutSetCount(workout)).toBe(4);
  expect(calculateWorkoutExerciseCount(workout)).toBe(2);
  expect(estimateWorkoutCalories(workout)).toBe(186);
  expect(normalizeMuscleId('pectoralis-major')).toBe('chest');
  expect(normalizeMuscleId('latissimus-dorsi')).toBe('back');

  const worked = getWorkedMusclesFromWorkout(workout, [
    { id: 'barbell-bench-press', primaryMuscles: ['pectoralis-major'], secondaryMuscles: ['triceps-brachii'] },
    { id: 'lat-pulldown', primaryMuscles: ['latissimus-dorsi'], secondaryMuscles: ['biceps-brachii', 'pectoralis-major'] }
  ]);

  expect(worked.primary).toEqual(['chest', 'back']);
  expect(worked.secondary).toEqual(['triceps', 'biceps']);
});

test('body snapshot utilities select the latest dated valid record', () => {
  expect(
    getLatestBodySnapshot([
      { id: 'older', date: '2026-06-01', bodyWeightKg: 71, createdAt: '2026-06-01T09:00:00.000Z' },
      { id: 'newer-created', date: '2026-06-08', waistCm: 78, createdAt: '2026-06-08T10:00:00.000Z' },
      { id: 'latest', date: '2026-06-08', bodyWeightKg: 70.5, waistCm: 77.5, createdAt: '2026-06-08T11:00:00.000Z' }
    ])
  ).toMatchObject({ id: 'latest', weightKg: 70.5, waistCm: 77.5 });
  expect(getLatestBodySnapshot([])).toBeNull();
});

test('backup v3 normalizes legacy body snapshots and keeps arm measurements', () => {
  const commonData = { latestGeneratedPlan: null, workoutLogs: [], latestWorkoutLog: null };
  const legacy = validateBackupText(JSON.stringify({
    app: 'MuscleMap Fitness',
    exportVersion: 1,
    exportedAt: '2026-06-08T12:00:00.000Z',
    data: commonData
  }));
  expect(legacy.ok).toBe(true);
  if (legacy.ok) expect(legacy.backup.data.bodySnapshots).toEqual([]);

  const current = validateBackupText(JSON.stringify({
    app: 'MuscleMap Fitness',
    exportVersion: 2,
    exportedAt: '2026-06-08T12:00:00.000Z',
    data: {
      ...commonData,
      bodySnapshots: [{ id: 'body-1', date: '2026-06-08', bodyWeightKg: 70.5, waistCm: 78, createdAt: '2026-06-08T12:00:00.000Z' }]
    }
  }));
  expect(current.ok).toBe(true);
  if (current.ok) expect(current.backup.data.bodySnapshots[0]).toMatchObject({ weightKg: 70.5, waistCm: 78 });

  const v3 = validateBackupText(JSON.stringify({
    app: 'MuscleMap Fitness', exportVersion: 3, exportedAt: '2026-06-08T12:00:00.000Z',
    data: { ...commonData, bodySnapshots: [{ id: 'body-v3', date: '2026-06-08', weightKg: 70, armCm: 35, createdAt: '2026-06-08T12:00:00.000Z', updatedAt: '2026-06-08T12:00:00.000Z' }] }
  }));
  expect(v3.ok).toBe(true);

  const damaged = validateBackupText(JSON.stringify({
    app: 'MuscleMap Fitness',
    exportVersion: 2,
    exportedAt: '2026-06-08T12:00:00.000Z',
    data: { ...commonData, bodySnapshots: [{ id: 'broken' }] }
  }));
  expect(damaged).toEqual({ ok: false, error: 'damaged-body-snapshots' });
});

test('training entry homepage presents stored workout plan and music states', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.latestGeneratedPlan.v0.2',
      JSON.stringify({
        id: 'plan-home',
        name: '增肌四分化计划',
        input: {
          goal: 'hypertrophy',
          daysPerWeek: 4,
          level: 'intermediate',
          availableEquipment: 'fullGym',
          focusBodyParts: ['back']
        },
        createdAt: '2026-06-07T00:00:00.000Z',
        days: [
          {
            id: 'back-day',
            name: '背部日',
            focus: '背部',
            items: [{ exerciseId: 'lat-pulldown', sets: 3, repRange: '8-12', restSeconds: 90, targetMuscles: ['latissimus-dorsi'] }]
          }
        ]
      })
    );
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'home-log',
          date: '2026-06-07',
          planId: 'plan-home',
          durationSeconds: 1860,
          exercises: [
            { id: 'exercise-1', exerciseId: 'lat-pulldown', order: 0, sets: [{ id: 'set-1', setIndex: 1, weight: 45, reps: 10, completed: true }] },
            { id: 'exercise-2', exerciseId: 'seated-row', order: 1, sets: [{ id: 'set-2', setIndex: 1, reps: 12, completed: true }] }
          ],
          createdAt: '2026-06-07T10:00:00.000Z'
        }
      ])
    );
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const main = page.locator('main');
  await expect(page.getByRole('heading', { name: 'MuscleMap' })).toBeVisible();
  await expect(page.getByText('科学训练 · 精准进阶')).toHaveCount(0);
  await expect(page.getByTestId('dashboard-start-card')).toContainText('开始训练');
  await expect(page.getByTestId('dashboard-start-card')).toContainText('选择计划或自由训练');
  await expect(main.getByRole('link', { name: /开始训练/ })).toHaveAttribute('href', '/workout-log');
  await expect(page.getByTestId('dashboard-muscle-card')).toHaveCount(0);
  await expect(page.getByTestId('dashboard-recent-plan')).toContainText('增肌四分化计划');
  await expect(page.getByTestId('dashboard-recent-plan')).toContainText('100%');
  await expect(page.getByTestId('dashboard-recent-workout')).toContainText('2026-06-07');
  await expect(page.getByTestId('dashboard-recent-workout')).toContainText('31 分钟');
  await expect(page.getByTestId('dashboard-recent-workout')).toContainText('186 kcal');
  await expect(page.getByTestId('dashboard-recent-workout')).toContainText('2 组');
  await expect(page.getByTestId('dashboard-music-player')).toContainText('导入歌单后，训练时可快速播放音乐');
  await page.getByRole('button', { name: '更换歌单' }).click();
  await expect(page.getByPlaceholder('粘贴网易云歌单链接或 ID')).toBeVisible();
  await expect(page.getByRole('link', { name: '记录', exact: true })).toHaveAttribute('href', '/workout-log');
  await expect(page.getByRole('link', { name: '动作库', exact: true })).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('training entry homepage teaches empty states without fabricated data', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByTestId('dashboard-recent-workout')).toContainText('还没有训练记录，完成一次训练后会显示在这里');
  await expect(page.getByTestId('dashboard-recent-plan')).toContainText('还没有训练计划');
  await expect(page.getByTestId('dashboard-recent-plan')).toContainText('选择计划');
  await expect(page.getByTestId('dashboard-music-player')).toContainText('导入歌单后，训练时可快速播放音乐');
  await expect(page.getByTestId('dashboard-music-player').getByRole('button', { name: '更换歌单' })).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const navBox = await page.locator('nav').boundingBox();
  const musicBox = await page.getByTestId('dashboard-music-player').boundingBox();
  expect(navBox).not.toBeNull();
  expect(musicBox).not.toBeNull();
  expect(musicBox!.y + musicBox!.height).toBeLessThanOrEqual(navBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('homepage recent workouts carousel shows and selects the five newest logs', async ({ page }) => {
  await page.addInitScript(() => {
    const logs = Array.from({ length: 6 }, (_, index) => ({
      id: `carousel-log-${index + 1}`,
      date: `2026-07-0${6 - index}`,
      durationSeconds: (30 - index) * 60,
      exercises: [
        {
          id: `carousel-exercise-${index + 1}`,
          exerciseId: 'lat-pulldown',
          order: 0,
          sets: [{ id: `carousel-set-${index + 1}`, setIndex: 1, reps: 10, completed: true }]
        }
      ],
      createdAt: `2026-07-0${6 - index}T10:00:00.000Z`
    }));
    window.localStorage.setItem('musclemap.workoutLogs.v0.3', JSON.stringify(logs));
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const slides = page.getByTestId('dashboard-recent-workout-slide');
  await expect(slides).toHaveCount(5);
  await expect(slides.first()).toHaveAttribute('href', '/workout-history/carousel-log-1');
  await expect(slides.first()).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('dashboard-workout-position')).toHaveText('1/5');
  await expect(page.getByText('2026-07-01')).toHaveCount(0);

  await page.getByRole('button', { name: '查看第 3 次训练' }).click();
  await expect(slides.nth(2)).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('dashboard-workout-position')).toHaveText('3/5');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('homepage imports a NetEase official player as the only music player', async ({ page }) => {
  const playlistTracks = Array.from({ length: 8 }, (_, index) => ({
    id: String(1000 + index),
    name: `Track ${index + 1}`,
    artist: `Artist ${index + 1}`,
    albumName: `Album ${index + 1}`,
    coverUrl: `https://example.com/cover-${index + 1}.jpg`,
    duration: 180000 + index * 1000
  }));

  await page.route('**/api/netease-playlist?id=*', async (route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('id') ?? '';
    const tracks = id === '3778678' ? playlistTracks.slice(0, 7).map((track, index) => ({
      ...track,
      id: `200${index}`,
      name: `Replace Track ${index + 1}`,
      artist: `Replace Artist ${index + 1}`
    })) : playlistTracks;

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        playlist: { id, name: id === '3778678' ? 'Replacement Playlist' : 'Workout Playlist', source: 'netease', trackCount: id === '3778678' ? 9 : 10 },
        tracks
      })
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => window.localStorage.removeItem('musclemap.neteasePlaylist.v1'));
  await page.reload();

  await page.getByRole('button', { name: '更换歌单' }).click();
  const input = page.getByPlaceholder('粘贴网易云歌单链接或 ID');
  await input.fill('https://example.com/playlist?id=19723756');
  await page.getByRole('button', { name: '确认导入' }).click();
  await expect(page.getByRole('alert')).toHaveText('请输入有效的网易云歌单链接或 ID');

  await input.fill('分享歌单 https://music.163.com/#/playlist?id=19723756');
  await page.getByRole('button', { name: '确认导入' }).click();
  const officialPlayer = page.locator('iframe[title="网易云官方单曲播放器"]');
  await expect(officialPlayer).toHaveAttribute('src', 'https://music.163.com/outchain/player?type=2&id=1000&auto=0&height=66');
  await expect(page.getByText('来自网易云歌单 · Workout Playlist')).toBeVisible();
  await expect(page.getByTestId('music-track-count')).toHaveText('8 / 10 首');
  await expect(page.getByTestId('music-track-list-item')).toHaveCount(8);
  await expect(page.getByRole('button', { name: /播放 Track 1/ })).toBeVisible();
  await expect(page.getByText('Artist 1')).toBeVisible();
  await expect(page.getByRole('button', { name: /播放 Track 8/ })).toBeVisible();
  await expect(page.getByRole('link', { name: '在网易云打开' })).toHaveAttribute('href', 'https://music.163.com/#/playlist?id=19723756');
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.neteasePlaylist.v1') ?? 'null'))).toBe('19723756');

  await page.getByRole('button', { name: /播放 Track 8/ }).click();
  await expect(page.locator('iframe[title="网易云官方单曲播放器"]')).toHaveAttribute('src', 'https://music.163.com/outchain/player?type=2&id=1007&auto=1&height=66');
  await expect(page.getByText('正在播放 · Track 8')).toBeVisible();

  await page.reload();
  await expect(page.locator('iframe[title="网易云官方单曲播放器"]')).toHaveAttribute('src', 'https://music.163.com/outchain/player?type=2&id=1000&auto=0&height=66');
  await page.getByRole('button', { name: '更换歌单' }).click();
  await page.getByPlaceholder('粘贴网易云歌单链接或 ID').fill('3778678');
  await page.getByRole('button', { name: '确认导入' }).click();
  await expect(page.locator('iframe[title="网易云官方单曲播放器"]')).toHaveAttribute('src', 'https://music.163.com/outchain/player?type=2&id=2000&auto=0&height=66');
  await expect(page.getByText('来自网易云歌单 · Replacement Playlist')).toBeVisible();
  await expect(page.getByTestId('music-track-count')).toHaveText('7 / 9 首');

  await page.getByRole('button', { name: '管理' }).click();
  await page.getByRole('button', { name: '移除歌单' }).click();
  await expect(page.locator('iframe[title="网易云官方单曲播放器"]')).toHaveCount(0);
  await expect(page.getByText('导入歌单后，训练时可快速播放音乐')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('musclemap.neteasePlaylist.v1'))).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('netease playlist api returns all playlist tracks without audio url filtering', async () => {
  // @ts-expect-error Vercel API handlers live outside the TypeScript app source tree.
  const { default: handler } = await import('../../api/netease-playlist.js');
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];

  globalThis.fetch = (async (url: string | URL | Request) => {
    const requestUrl = String(url);
    requests.push(requestUrl);

    if (requestUrl.includes('/api/v6/playlist/detail')) {
      return new Response(JSON.stringify({
        code: 200,
        playlist: {
          name: '完整歌单',
          trackCount: 3,
          trackIds: [{ id: 11 }, { id: 22 }, { id: 33 }]
        }
      }), { status: 200 });
    }

    if (requestUrl.includes('/api/song/detail')) {
      return new Response(JSON.stringify({
        songs: [
          { id: 11, name: 'Song 1', ar: [{ name: 'Artist 1' }], al: { name: 'Album 1', picUrl: 'https://example.com/1.jpg' }, dt: 181000 },
          { id: 22, name: 'Song 2', ar: [{ name: 'Artist 2' }], al: { name: 'Album 2', picUrl: 'https://example.com/2.jpg' }, dt: 182000 },
          { id: 33, name: 'Song 3', ar: [{ name: 'Artist 3' }], al: { name: 'Album 3', picUrl: 'https://example.com/3.jpg' }, dt: 183000 }
        ]
      }), { status: 200 });
    }

    if (requestUrl.includes('/api/song/enhance/player/url')) {
      return new Response(JSON.stringify({ data: [{ id: 11, code: 200, url: 'https://example.com/1.mp3' }] }), { status: 200 });
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  const responseBody: { ok?: boolean; playlist?: { trackCount?: number }; tracks?: Array<{ id: string; audioUrl?: string }> } = {};
  const response = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    json(payload: typeof responseBody) {
      Object.assign(responseBody, payload);
      return this;
    }
  };

  try {
    await handler({ query: { id: '123' } }, response);
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(requests.some((url) => url.includes('/api/song/enhance/player/url'))).toBe(false);
  expect(response.statusCode).toBe(200);
  expect(responseBody.ok).toBe(true);
  expect(responseBody.playlist?.trackCount).toBe(3);
  expect(responseBody.tracks?.map((track) => track.id)).toEqual(['11', '22', '33']);
  expect(responseBody.tracks?.some((track) => track.audioUrl)).toBe(false);
});

test('dark homepage and profile content extend behind the floating navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ['/', '/data-management']) {
    await page.goto(path);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const seam = await page.evaluate(() => {
      const nav = document.querySelector('nav')?.getBoundingClientRect();
      const y = Math.max(0, Math.floor((nav?.top ?? window.innerHeight) - 10));
      const element = document.elementFromPoint(Math.floor(window.innerWidth / 2), y);
      let backgroundElement: Element | null = element;
      let backgroundColor = '';
      while (backgroundElement) {
        backgroundColor = getComputedStyle(backgroundElement).backgroundColor;
        if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') break;
        backgroundElement = backgroundElement.parentElement;
      }
      return {
        path: location.pathname,
        tag: element?.tagName ?? '',
        className: String((element as HTMLElement | null)?.className ?? ''),
        backgroundColor,
        bodyBackground: getComputedStyle(document.body).backgroundColor
      };
    });

    expect(seam.backgroundColor).not.toBe('rgb(246, 248, 252)');
    expect(seam.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(seam.bodyBackground).not.toBe('rgb(246, 248, 252)');
  }
});

test('bottom navigation uses the four requested destinations and highlights profile', async ({ page }) => {
  await page.goto('/data-management');

  const nav = page.locator('nav');
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav.getByRole('link', { name: '首页', exact: true })).toHaveAttribute('href', '/');
  await expect(nav.getByRole('link', { name: '记录', exact: true })).toHaveAttribute('href', '/workout-log');
  await expect(nav.getByRole('link', { name: '成长', exact: true })).toHaveAttribute('href', '/growth');
  await expect(nav.getByRole('link', { name: '动作库', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: '我的', exact: true })).toHaveAttribute('href', '/data-management');
  await expect(nav.getByRole('link', { name: '我的', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByText('计划', { exact: true })).toHaveCount(0);
  await expect(nav.getByText('统计', { exact: true })).toHaveCount(0);
});

test('profile opens exercise management with total, search, body-part filter and mobile-safe return flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/data-management');

  const managementEntry = page.getByRole('link', { name: '动作管理' });
  await expect(managementEntry).toHaveAttribute('href', '/exercises');
  await managementEntry.click();

  await expect(page).toHaveURL(/\/exercises$/);
  await expect(page.getByRole('heading', { name: '动作管理' })).toBeVisible();
  await expect(page.getByText('共 260 个动作')).toBeVisible();
  await expect(page.getByRole('link', { name: '返回' })).toHaveAttribute('href', '/data-management');
  await expect(page.getByRole('link', { name: '我的', exact: true })).toHaveAttribute('aria-current', 'page');

  await page.getByLabel('搜索动作').fill('上斜卧推');
  await expect(page.getByRole('link', { name: '上斜杠铃卧推 动作详情' })).toBeVisible();
  await page.getByLabel('搜索动作').fill('');
  await page.getByLabel('部位').selectOption('腿部');
  await expect(page.getByRole('link', { name: '器械髋内收 动作详情' })).toBeVisible();
  await page.getByLabel('部位').selectOption('全身');
  const fullBodyExercise = page.getByRole('link', { name: '壶铃摆动 动作详情' });
  await expect(fullBodyExercise).toContainText('臀大肌');
  await expect(fullBodyExercise).toContainText('壶铃');

  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.getByRole('link', { name: '返回' }).click();
  await expect(page).toHaveURL(/\/data-management$/);
});

test('homepage shows elapsed timer for active workout', async ({ page }) => {
  await page.addInitScript(() => {
    const startedAt = new Date(Date.now() - 125_000).toISOString();
    window.localStorage.setItem(
      'musclemap.activeWorkout.v0.7',
      JSON.stringify({
        id: 'active-home-timer',
        status: 'active',
        startedAt,
        trainingDate: '2026-06-13',
        source: 'manual',
        exercises: [],
        createdAt: startedAt,
        updatedAt: startedAt
      })
    );
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const timer = page.getByTestId('dashboard-active-workout-timer');
  await expect(timer).toBeVisible();

  const firstValue = parseTimerValue((await timer.textContent()) ?? '');
  await page.waitForTimeout(1100);
  const secondValue = parseTimerValue((await timer.textContent()) ?? '');

  expect(firstValue).toBeGreaterThanOrEqual(120);
  expect(secondValue).toBeGreaterThan(firstValue);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('homepage start record immediately creates an active workout timer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();
  await page.locator('main a[href="/workout-log"]').first().click();

  await expect(page).toHaveURL(/\/workout-log$/);
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(stored?.startedAt).toEqual(expect.any(String));
  expect(stored?.exercises).toEqual([]);

  await page.goto('/');
  await expect(page.getByTestId('dashboard-active-workout-timer')).toBeVisible();
});

function parseTimerValue(value: string) {
  const match = value.match(/(\d{1,2}:)?\d{1,2}:\d{2}/);
  const parts = (match?.[0] ?? value).split(':').map((part) => Number(part));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

test('three model region registry defines V0.10.0 regions and experimental back mapping', () => {
  expect(threeModelRegions.map((region) => region.id)).toEqual([
    'back-partial',
    'box-test',
    'front-upper',
    'chest',
    'legs',
    'shoulders-arms',
    'core'
  ]);

  const backPartial = threeModelRegions.find((region) => region.id === 'back-partial');
  expect(backPartial).toMatchObject({
    label: '背部局部模型',
    view: 'posterior',
    modelPath: '/models/private/local-anatomy.glb',
    isPrivateModel: true,
    isConfigured: true,
    isExperimental: true
  });
  expect(backPartial?.limitations).toContain('当前模型未包含 latissimus-dorsi / 背阔肌真实 mesh');
  expect(backPartial?.limitations).toContain('背阔肌当前使用简化 3D 示意区域补充选择入口');
  expect(backPartial?.mappings.Simplified_left_latissimus_dorsi).toBe('latissimus-dorsi');
  expect(backPartial?.mappings.Simplified_right_latissimus_dorsi).toBe('latissimus-dorsi');
  expect(backPartial?.mappings.Right_rhomboid_major).toBe('rhomboids');
  expect(backPartial?.mappings.Left_spinalis_thoracis).toBe('erector-spinae');

  const boxTest = threeModelRegions.find((region) => region.id === 'box-test');
  expect(boxTest).toMatchObject({
    modelPath: '/models/demo/BoxTextured.glb',
    isPrivateModel: false,
    isConfigured: true,
    isExperimental: false,
    mappings: {}
  });

  const frontUpper = threeModelRegions.find((region) => region.id === 'front-upper');
  expect(frontUpper).toMatchObject({
    label: '正面上半身',
    view: 'anterior',
    isPrivateModel: false,
    isConfigured: true,
    isExperimental: true
  });
  expect(frontUpper?.modelPath).toBeUndefined();
  expect(new Set(Object.values(frontUpper?.mappings ?? {}))).toEqual(
    new Set([
      'pectoralis-major',
      'anterior-deltoid',
      'lateral-deltoid',
      'biceps-brachii',
      'triceps-brachii',
      'rectus-abdominis',
      'obliques'
    ])
  );

  const legs = threeModelRegions.find((region) => region.id === 'legs');
  expect(legs).toMatchObject({
    view: 'anterior',
    modelPath: '/models/private/lower-body-local.glb',
    isPrivateModel: true,
    isConfigured: true,
    isExperimental: true
  });
  expect(new Set(Object.values(legs?.mappings ?? {}))).toEqual(
    new Set(['gluteus-maximus', 'quadriceps', 'hamstrings', 'calves'])
  );

  for (const id of ['chest', 'shoulders-arms', 'core']) {
    const placeholder = threeModelRegions.find((region) => region.id === id);
    expect(placeholder).toMatchObject({
      isConfigured: false,
      isPrivateModel: false,
      isExperimental: false,
      mappings: {}
    });
    expect(placeholder?.modelPath).toBeUndefined();
  }
});

test('three muscle selector exposes lower body real model or hotspot fallback grouped by muscle id', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-legs').click();

  await expect(page.getByTestId('three-muscle-canvas')).toBeVisible();

  for (const muscleId of ['gluteus-maximus', 'quadriceps', 'hamstrings', 'calves']) {
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveCount(1);
    await page.getByTestId(`select-three-muscle-option-${muscleId}`).click();
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('three-selected-muscle-id')).toContainText(muscleId);
    await expect(page.getByTestId('three-selected-muscle-name')).toBeVisible();
    await expect(page.getByTestId('three-selected-muscle-description')).toBeVisible();
    await expect(page.getByTestId('three-related-exercises')).toBeVisible();
    await expect(page.getByTestId('three-related-actions-link')).toBeVisible();
    await expect(page.getByTestId('three-muscle-detail-link')).toBeVisible();
    await expect(page.locator('[data-testid^="three-add-exercise-"]').first()).toBeVisible();
  }
});

test('three muscle selector adds lower body exercises to active workout without duplicates', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-gluteus-maximus').click();
  await page.getByTestId('three-add-exercise-squat').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=[^#]+$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('深蹲');

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-quadriceps').click();
  await page.getByTestId('three-add-exercise-leg-extension').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=[^#]+$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('腿屈伸');
  await expect(page.getByTestId('workout-log-exercise').nth(1)).toContainText('深蹲');

  let active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['squat', 'leg-extension']);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-gluteus-maximus').click();
  await page.getByTestId('three-add-exercise-squat').click();
  await expect(page.getByTestId('three-active-workout-status')).toContainText('Squat');

  active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['squat', 'leg-extension']);
});

test('three muscle selector lower body actions can open exercise detail and workout log inputs on mobile', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/three-muscle-selector');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-calves').click();
  await page.getByTestId('three-related-exercise-link-standing-calf-raise').click();
  await expect(page).toHaveURL(/\/exercises\/standing-calf-raise\?muscleId=calves$/);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-calves').click();
  await page.getByTestId('three-add-exercise-standing-calf-raise').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=[^#]+$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);
  await expect(page.getByTestId('set-weight-input').first()).toBeVisible();
  await expect(page.getByTestId('set-reps-input').first()).toBeVisible();
  await page.getByTestId('toggle-exercise-notes').click();
  await expect(page.getByTestId('exercise-notes-input').first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('three muscle selector focuses the newly added workout exercise', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const startedAt = new Date().toISOString();
    const existingExerciseIds = [
      'lat-pulldown',
      'pull-up',
      'one-arm-dumbbell-row',
      'seated-row',
      'barbell-row',
      'chest-supported-row',
      'straight-arm-pulldown',
      'face-pull'
    ];

    window.localStorage.setItem(
      'musclemap.activeWorkout.v0.7',
      JSON.stringify({
        id: 'active-focus-workout',
        status: 'active',
        startedAt,
        trainingDate: '2026-06-15',
        source: 'manual',
        exercises: existingExerciseIds.map((exerciseId, index) => ({
          id: `active-existing-${index}`,
          exerciseId,
          order: index,
          source: 'manual',
          sets: [{ id: `active-existing-set-${index}`, setIndex: 1, completed: false }]
        })),
        createdAt: startedAt,
        updatedAt: startedAt
      })
    );
  });

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-calves').click();
  await page.getByTestId('three-add-exercise-standing-calf-raise').click();

  await expect(page).toHaveURL(/\/workout-log\?focusExercise=[^#]+$/);
  const addedExercise = page.getByTestId('current-exercise-card');
  await expect(addedExercise).toContainText('站姿提踵');
  await expect(addedExercise).toBeInViewport({ ratio: 0.5 });
});

test('three muscle selector presents a product entry for choosing training muscles', async ({ page }) => {
  await page.goto('/three-muscle-selector');

  await expect(page.getByRole('heading', { name: '2D 肌群选择' })).toBeVisible();
  await expect(page.getByText('选择肌群，查看动作，加入当前训练。')).toBeVisible();
  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await expect(page.getByTestId('select-three-region-chest')).toContainText('胸部');
  await expect(page.getByTestId('select-three-region-shoulders-arms')).toContainText('肩部');
  await expect(page.getByTestId('select-three-region-back-partial')).toContainText('背部');
  await expect(page.getByTestId('select-three-region-legs')).toContainText('腿部');
  await expect(page.getByTestId('select-three-region-arms')).toContainText('手臂');
  await expect(page.getByTestId('select-three-region-core')).toContainText('核心');
  await expect(page.getByTestId('select-three-region-front-upper')).toHaveCount(0);
  await expect(page.getByTestId('select-three-region-box-test')).toHaveCount(0);
  await expect(page.getByTestId('three-region-selector')).not.toContainText('暂未配置');
  await expect(page.getByTestId('three-region-selector')).not.toContainText('GLB 管线');

  await expect(page.getByTestId('three-current-region-label')).toContainText('背部');
  await expect(page.getByText('mesh.name')).not.toBeVisible();
});

test('three muscle selector exposes front upper body simplified hotspots grouped by muscle id', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-chest').click();

  await expect(page.getByTestId('three-current-region-label')).toContainText('胸部');
  await expect(page.getByTestId('glb-load-status')).toContainText(/简化示意可用|加载成功/, { timeout: 15000 });

  for (const muscleId of ['pectoralis-major']) {
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveCount(1);
  }
  await expect(page.getByTestId('select-three-muscle-option-biceps-brachii')).toHaveCount(0);
  await expect(page.getByTestId('select-three-muscle-option-rectus-abdominis')).toHaveCount(0);

  await page.getByTestId('select-three-region-shoulders-arms').click();
  await expect(page.getByTestId('three-current-region-label')).toContainText('肩部');
  for (const muscleId of ['anterior-deltoid', 'lateral-deltoid']) {
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveCount(1);
  }

  await page.getByTestId('select-three-region-arms').click();
  await expect(page.getByTestId('three-current-region-label')).toContainText('手臂');
  for (const muscleId of ['biceps-brachii', 'triceps-brachii']) {
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveCount(1);
  }

  await page.getByTestId('select-three-region-core').click();
  await expect(page.getByTestId('three-current-region-label')).toContainText('核心');
  for (const muscleId of ['rectus-abdominis', 'obliques']) {
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveCount(1);
    await page.getByTestId(`select-three-muscle-option-${muscleId}`).click();
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('three-selected-muscle-id')).toContainText(muscleId);
    await expect(page.getByTestId('three-selected-muscle-name')).not.toContainText('未映射');
    await expect(page.getByTestId('three-selected-muscle-description')).toBeVisible();
    await expect(page.getByTestId('three-related-exercises')).toBeVisible();
    await expect(page.getByTestId('three-related-actions-link')).toBeVisible();
    await expect(page.getByTestId('three-muscle-detail-link')).toBeVisible();
    await expect(page.locator('[data-testid^="three-add-exercise-"]').first()).toBeVisible();
  }
});

test('upper body local mesh mapping uses only V0.19 reported mesh names', () => {
  expect(upperBodyLocalMeshMappings).toMatchObject({
    right_clavicular_part_of_pectoralis_major: 'pectoralis-major',
    left_clavicular_part_of_pectoralis_major: 'pectoralis-major',
    right_sternocostal_part_of_pectoralis_major: 'pectoralis-major',
    left_sternocostal_part_of_pectoralis_major: 'pectoralis-major',
    right_abdominal_part_of_pectoralis_major: 'pectoralis-major',
    left_abdominal_part_of_pectoralis_major: 'pectoralis-major',
    right_clavicular_part_of_deltoid: 'anterior-deltoid',
    left_clavicular_part_of_deltoid: 'anterior-deltoid',
    right_acromial_part_of_deltoid: 'lateral-deltoid',
    left_acromial_part_of_deltoid: 'lateral-deltoid',
    right_short_head_of_biceps_brachii: 'biceps-brachii',
    left_short_head_of_biceps_brachii: 'biceps-brachii',
    right_long_head_of_biceps_brachii: 'biceps-brachii',
    left_long_head_of_biceps_brachii: 'biceps-brachii',
    right_lateral_head_of_triceps_brachii: 'triceps-brachii',
    left_lateral_head_of_triceps_brachii: 'triceps-brachii',
    right_long_head_of_triceps_brachii: 'triceps-brachii',
    left_long_head_of_triceps_brachii: 'triceps-brachii',
    right_medial_head_of_triceps_brachii: 'triceps-brachii',
    left_medial_head_of_triceps_brachii: 'triceps-brachii',
    right_external_oblique: 'obliques',
    left_external_oblique: 'obliques'
  });
  expect(new Set(Object.values(upperBodyLocalMeshMappings))).toEqual(
    new Set(['pectoralis-major', 'anterior-deltoid', 'lateral-deltoid', 'biceps-brachii', 'triceps-brachii', 'obliques'])
  );
  expect(Object.values(upperBodyLocalMeshMappings)).not.toContain('rectus-abdominis');
});

test('three muscle selector uses front upper local model and hotspot hybrid when local model exists', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-chest').click();

  await expect(page.getByTestId('glb-load-status')).toContainText(/简化示意可用|加载成功/, { timeout: 15000 });

  if ((await page.getByTestId('glb-load-status').textContent())?.includes('加载成功')) {
    await expect(page.getByTestId('glb-load-status')).toContainText('加载成功');
    await expect(page.getByTestId('glb-mesh-count')).toContainText(/2[3-9]|3[0-9]/);
    await page.getByTestId('select-three-muscle-option-pectoralis-major').click();
    await expect(page.getByTestId('glb-selected-mesh-name')).toContainText('pectoralis_major');
    await expect(page.getByTestId('three-selected-muscle-id')).toContainText('pectoralis-major');
    await expect(page.getByTestId('three-mapping-source')).toContainText('real-mesh');
  }

  await page.getByTestId('select-three-region-core').click();
  await page.getByTestId('select-three-muscle-option-rectus-abdominis').click();
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('rectus-abdominis');
  await expect(page.getByTestId('three-mapping-source')).toContainText('hotspot');
});

test('three muscle selector falls back to front upper hotspots when local model is missing', async ({ page }) => {
  await page.route('**/models/private/upper-body-local.glb', async (route) => {
    await route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing in deployed environment' });
  });

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-chest').click();

  await expect(page.getByTestId('glb-load-status')).toContainText('简化示意可用');
  await expect(page.getByTestId('select-three-muscle-option-pectoralis-major')).toHaveCount(1);
  await page.getByTestId('select-three-region-core').click();
  await expect(page.getByTestId('select-three-muscle-option-rectus-abdominis')).toHaveCount(1);
  await page.getByTestId('select-three-muscle-option-rectus-abdominis').click();
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('rectus-abdominis');
  await expect(page.getByTestId('three-mapping-source')).toContainText('hotspot');
});

test('three muscle selector adds front upper body exercises to active workout without duplicates', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await page.getByTestId('select-three-region-chest').click();
  await page.getByTestId('select-three-muscle-option-pectoralis-major').click();
  await page.getByTestId('three-add-exercise-push-up').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=[^#]+$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('俯卧撑');

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-arms').click();
  await page.getByTestId('select-three-muscle-option-biceps-brachii').click();
  await page.getByTestId('three-add-exercise-dumbbell-curl').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=[^#]+$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('哑铃弯举');
  await expect(page.getByTestId('workout-log-exercise').nth(1)).toContainText('俯卧撑');

  let active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['push-up', 'dumbbell-curl']);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-chest').click();
  await page.getByTestId('select-three-muscle-option-pectoralis-major').click();
  await page.getByTestId('three-add-exercise-push-up').click();
  await expect(page.getByTestId('three-active-workout-status')).toContainText('Push-up');

  active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['push-up', 'dumbbell-curl']);
});

test('three muscle selector bridges mapped back meshes to muscle and exercise entry points', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-teres-major').click();

  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('大圆肌');
  await expect(page.getByTestId('three-selected-muscle-description')).toContainText('位于肩胛骨外侧缘附近');
  await expect(page.getByTestId('three-related-exercises')).toContainText('直臂下拉');
  await expect(page.getByTestId('three-related-exercises')).toContainText('高位下拉');
  await expect(page.getByTestId('three-selected-unmapped-state')).toHaveCount(0);

  await page.getByTestId('three-related-exercise-link-straight-arm-pulldown').click();
  await expect(page).toHaveURL(/\/exercises\/straight-arm-pulldown\?muscleId=teres-major$/);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-teres-major').click();
  await page.getByTestId('three-muscle-detail-link').click();
  await expect(page).toHaveURL(/\/muscle-map$/);
  await expect(page.getByRole('heading', { name: '大圆肌' })).toBeVisible();
});

test('three muscle selector exposes simplified latissimus dorsi 3d targets', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();

  await expect(page.getByTestId('select-three-muscle-option-latissimus-dorsi')).toContainText('背阔肌');
  await expect(page.getByTestId('select-three-mapped-mesh-Simplified_left_latissimus_dorsi')).toHaveCount(0);
  await expect(page.getByTestId('select-three-mapped-mesh-Simplified_right_latissimus_dorsi')).toHaveCount(0);

  await page.getByTestId('select-three-muscle-option-latissimus-dorsi').click();
  await expect(page.getByTestId('glb-selected-mesh-name')).toContainText('Simplified_left_latissimus_dorsi');
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('latissimus-dorsi');
  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('背阔肌');
  await expect(page.getByTestId('three-selected-muscle-description')).toContainText('肩关节伸展、内收、内旋');
  await expect(page.getByTestId('three-related-exercises')).toContainText('高位下拉');

  await page.getByTestId('three-related-exercise-link-lat-pulldown').click();
  await expect(page).toHaveURL(/\/exercises\/lat-pulldown\?muscleId=latissimus-dorsi$/);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-muscle-option-latissimus-dorsi').click();
  await page.getByTestId('three-muscle-detail-link').click();
  await expect(page).toHaveURL(/\/muscle-map$/);
  await expect(page.getByRole('heading', { name: '背阔肌' })).toBeVisible();
});

test('three muscle selector can add related exercises to the active workout without duplicates', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-latissimus-dorsi').click();

  await expect(page.getByTestId('three-related-exercise-card-lat-pulldown')).toBeVisible();
  await expect(page.getByTestId('three-related-exercise-link-lat-pulldown')).toBeVisible();
  await expect(page.getByTestId('three-add-exercise-lat-pulldown')).toBeVisible();

  await page.getByTestId('three-add-exercise-lat-pulldown').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=[^#]+$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('高位下拉');

  let active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['lat-pulldown']);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-teres-major').click();
  await page.getByTestId('three-add-exercise-straight-arm-pulldown').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=[^#]+$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('直臂下拉');
  await expect(page.getByTestId('workout-log-exercise').nth(1)).toContainText('高位下拉');

  active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual([
    'lat-pulldown',
    'straight-arm-pulldown'
  ]);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-latissimus-dorsi').click();
  await page.getByTestId('three-add-exercise-lat-pulldown').click();
  await expect(page.getByTestId('three-active-workout-status')).toContainText('Lat Pulldown');
  await expect(page.getByTestId('three-go-active-workout')).toBeVisible();

  active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual([
    'lat-pulldown',
    'straight-arm-pulldown'
  ]);

  await page.getByTestId('three-go-active-workout').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
});

test('three muscle selector groups the visible back muscle list by muscle id', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();

  for (const muscleId of [
    'latissimus-dorsi',
    'rhomboids',
    'middle-lower-trapezius',
    'teres-major',
    'rear-deltoid',
    'erector-spinae'
  ]) {
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveCount(1);
  }

  await expect(page.getByTestId('three-muscle-options')).toContainText('背阔肌');
  await expect(page.getByTestId('three-muscle-options')).toContainText('菱形肌');
  await expect(page.getByTestId('three-muscle-options')).toContainText('斜方肌中下束');
  await page.getByTestId('select-three-muscle-option-rhomboids').click();
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('rhomboids');
  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('菱形肌');
});

test('three muscle selector handles unmapped and unconfigured regions without fake data', async ({ page }) => {
  await page.goto('/three-muscle-selector');

  await expect(page.getByTestId('select-three-region-box-test')).toHaveCount(0);
  await expect(page.getByTestId('select-three-region-front-upper')).toHaveCount(0);
  await expect(page.getByTestId('three-region-selector')).not.toContainText('暂未配置');
  await expect(page.getByTestId('three-region-selector')).not.toContainText('GLB 管线测试');

  for (const regionId of ['chest', 'shoulders-arms', 'arms', 'core']) {
    await page.getByTestId(`select-three-region-${regionId}`).click();
    await expect(page.getByTestId('three-region-placeholder')).toHaveCount(0);
    await expect(page.locator('[data-testid^="select-three-muscle-option-"]')).not.toHaveCount(0);
  }
});

test('three muscle selector is usable on 390px mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/three-muscle-selector');

  await expect(page.getByRole('heading', { name: '2D 肌群选择' })).toBeVisible();
  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-teres-major').click();
  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('大圆肌');

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test.skip('legacy three muscle demo exposes registered model regions and placeholder fallback', async ({ page }) => {
  await page.goto('/three-muscle-demo');

  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await expect(page.getByTestId('select-three-region-back-partial')).toContainText('背部局部模型');
  await expect(page.getByTestId('select-three-region-box-test')).toContainText('GLB 管线测试');
  await expect(page.getByTestId('select-three-region-chest')).toContainText('胸部');
  await expect(page.getByTestId('select-three-region-legs')).toContainText('臀腿');
  await expect(page.getByTestId('select-three-region-shoulders-arms')).toContainText('肩臂');
  await expect(page.getByTestId('select-three-region-core')).toContainText('核心');

  await page.getByTestId('select-three-region-back-partial').click();
  await expect(page.getByTestId('three-current-region-label')).toContainText('背部局部模型');
  await expect(page.getByTestId('three-current-region-path')).toContainText('/models/private/local-anatomy.glb');
  await expect(page.getByTestId('three-current-region-private')).toContainText('private');
  await expect(page.getByTestId('three-current-region-experimental')).toContainText('experimental');
  await expect(page.getByTestId('three-region-limitations')).toContainText('当前模型未包含 latissimus-dorsi / 背阔肌');
  await expect(page.getByTestId('three-region-limitations')).toContainText('模型来源为 BodyParts3D');
  await expect(page.getByTestId('three-region-limitations')).toContainText('随 App 发布时需要保留署名');
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('未映射');

  await page.getByTestId('select-three-region-chest').click();
  await expect(page.getByTestId('three-current-region-label')).toContainText('胸部');
  await expect(page.getByTestId('three-region-placeholder')).toContainText('暂未配置模型资源');
  await expect(page.getByTestId('three-current-region-path')).toContainText('未配置');
});

test('user can discover latissimus dorsi and open lat pulldown detail', async ({ page }) => {
  await page.goto('/muscle-map');
  await expect(page.getByRole('heading', { name: '肌群地图' })).toBeVisible();
  await expect(page.getByRole('button', { name: '背面视图' })).toBeVisible();
  await expect(page.getByText('背面视图包含背部肌群，也包含肩后侧相关肌群，例如后束三角肌。')).toBeVisible();

  await page.getByRole('button', { name: /左背阔肌/ }).click();
  await expect(page.getByTestId('muscle-region-latissimus-dorsi-left')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: '背阔肌' })).toBeVisible();
  await expect(page.getByText('Latissimus Dorsi')).toBeVisible();

  await page.getByRole('link', { name: '高位下拉' }).click();
  await expect(page).toHaveURL(/\/exercises\/lat-pulldown\?muscleId=latissimus-dorsi$/);
  await expect(page.getByRole('heading', { name: '高位下拉' })).toBeVisible();
  await page.getByRole('button', { name: /训练部位/ }).click();
  await expect(page.getByTestId('exercise-muscles-sheet')).toContainText('主练肌群');
  await expect(page.getByTestId('exercise-muscles-sheet')).toContainText('背阔肌');
});

test('app exposes pwa metadata for installation', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0f172a');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/musclemap-192.png');
});

test.skip('legacy three muscle demo renders the model region registry controls', async ({ page }) => {
  await page.goto('/three-muscle-demo');

  await expect(page.getByRole('heading', { name: '3D 肌群模型技术预研' })).toBeVisible();
  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await expect(page.getByTestId('select-three-region-back-partial')).toBeVisible();
  await expect(page.getByTestId('select-three-region-box-test')).toBeVisible();
  await expect(page.getByTestId('select-three-region-core')).toContainText('未配置');
});

test.skip('legacy three muscle demo loads the GLB pipeline test model', async ({ page }) => {
  await page.goto('/three-muscle-demo');
  await page.getByTestId('select-three-region-box-test').click();

  await expect(page.getByTestId('region-model-experiment')).toBeVisible();
  await expect(page.getByTestId('three-current-region-label')).toContainText('GLB 管线测试');
  await expect(page.getByTestId('three-current-region-path')).toContainText('/models/demo/BoxTextured.glb');
  await expect(page.getByTestId('glb-load-status')).toContainText('加载成功');
  await expect(page.getByTestId('glb-mesh-count')).toContainText(/[1-9]/);

  await page.getByTestId('select-glb-test-mesh').click();
  await expect(page.getByTestId('glb-selected-mesh-name')).not.toContainText('未选择');
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('未映射');
});

test.skip('legacy three muscle demo shows local anatomy fallback when private model is missing', async ({ page }) => {
  await page.goto('/three-muscle-demo');
  await page.getByTestId('select-three-region-back-partial').click();

  await expect(page.getByTestId('region-model-experiment')).toBeVisible();
  await expect(page.getByTestId('three-current-region-label')).toContainText('背部局部模型');
  await expect(page.getByTestId('three-current-region-path')).toContainText('/models/private/local-anatomy.glb');
  await expect(page.getByTestId('three-region-limitations')).toContainText('当前模型未包含 latissimus-dorsi / 背阔肌');
  await expect(page.getByTestId('three-region-limitations')).toContainText('模型来源为 BodyParts3D');
  await expect(page.getByTestId('three-region-limitations')).toContainText('随 App 发布时需要保留署名');
  await expect(page.getByTestId('region-model-experiment').getByText(/未检测到模型文件|加载成功/)).toBeVisible();
});

test.skip('legacy three muscle demo exposes upper body local model sandbox state', async ({ page }) => {
  await page.goto('/three-muscle-demo');

  await expect(page.getByTestId('upper-body-local-sandbox')).toBeVisible();
  await expect(page.getByTestId('upper-body-local-title')).toContainText('上身真实模型实验区');
  await expect(page.getByTestId('upper-body-local-path')).toContainText('/models/private/upper-body-local.glb');
  const upperBodyFallback = page.getByTestId('upper-body-local-fallback');
  if ((await upperBodyFallback.count()) > 0) {
    await expect(upperBodyFallback).toContainText(
      '未检测到上身真实模型。请将成品 GLB 放入 public/models/private/upper-body-local.glb。原始模型仍保留本地忽略，成品 GLB 会随 App 发布。'
    );
  }
  await expect(page.getByTestId('upper-body-local-status')).toContainText(/未检测到模型文件|加载成功/, { timeout: 15000 });
  await expect(page.getByTestId('upper-body-local-mesh-count')).toContainText(/0|[1-9]/);
  await expect(page.getByTestId('upper-body-local-selected-mesh')).toContainText('未选择');
  await expect(page.getByTestId('upper-body-local-selected-muscle')).toContainText('未映射');
  await expect(page.getByTestId('upper-body-local-mapping-note')).toContainText('没有手工 mapping');
});

test.skip('legacy three muscle demo bridges mapped mesh selections to muscle and exercise data', async ({ page }) => {
  await page.goto('/three-muscle-demo');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-mapped-mesh-Right_teres_major').click();

  await expect(page.getByTestId('glb-selected-mesh-name')).toContainText('Right_teres_major');
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('teres-major');
  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('大圆肌');
  await expect(page.getByTestId('three-selected-muscle-description')).toContainText('位于肩胛骨外侧缘附近');
  await expect(page.getByTestId('three-related-exercises')).toContainText('直臂下拉');
  await expect(page.getByTestId('three-related-exercises')).toContainText('主练');
  await expect(page.getByTestId('three-related-exercises')).toContainText('高位下拉');
  await expect(page.getByTestId('three-related-exercises')).toContainText('次要参与');

  await page.getByTestId('three-muscle-detail-link').click();
  await expect(page).toHaveURL(/\/muscle-map$/);
  await expect(page.getByRole('heading', { name: '大圆肌' })).toBeVisible();

  await page.goto('/three-muscle-demo');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-mapped-mesh-Right_teres_major').click();
  await page.getByTestId('three-related-exercise-link-straight-arm-pulldown').click();
  await expect(page).toHaveURL(/\/exercises\/straight-arm-pulldown\?muscleId=teres-major$/);
});

test.skip('legacy three muscle demo does not overflow at 390px mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/three-muscle-demo');

  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await expect(page.getByTestId('region-model-experiment')).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('workout log hides invalid legacy sets instead of rendering undefined values', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([{
        id: 'legacy-log',
        date: '2026-05-23',
        exercises: [
          {
            id: 'legacy-valid',
            exerciseId: 'lat-pulldown',
            order: 0,
            sets: [
              { id: 'set-valid', setIndex: 1, weight: 35.5, reps: 12, completed: true },
              { id: 'set-invalid', setIndex: 2, completed: true }
            ]
          },
          {
            id: 'legacy-invalid',
            exerciseId: 'seated-row',
            order: 1,
            sets: [{ id: 'set-empty', setIndex: 1, completed: true }]
          }
        ],
        createdAt: '2026-05-23T00:00:00.000Z'
      }])
    );
  });

  await page.goto('/workout-history/legacy-log');

  const detail = page.getByTestId('workout-log-detail');
  await expect(detail).toContainText('高位下拉');
  await expect(detail).toContainText('35.5kg');
  await expect(detail).toContainText('12 次');
  await expect(detail).not.toContainText('undefined');
  await expect(detail).toContainText('坐姿划船');
  await expect(detail).toContainText('暂无有效组');
});

test('workout history shows an empty state when there are no archived logs', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
  });

  await page.goto('/workout-history');

  await expect(page.getByRole('heading', { name: '训练历史' })).toBeVisible();
  await expect(page.getByText('暂无训练记录')).toBeVisible();
  await expect(page.getByText('完成一次训练后会显示在这里')).toBeVisible();
});

test('workout history lists logs by date and created time with summary details', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'older-log',
          date: '2026-05-24',
          exercises: [{ id: 'older-exercise', exerciseId: 'seated-row', order: 0, sets: [{ id: 'older-set', setIndex: 1, weight: 40, completed: true }] }],
          createdAt: '2026-05-24T08:00:00.000Z'
        },
        {
          id: 'same-day-later-log',
          date: '2026-05-25',
          planId: 'plan-v08',
          durationSeconds: 2700,
          notes: 'Back session note',
          exercises: [
            {
              id: 'later-exercise',
              exerciseId: 'lat-pulldown',
              order: 0,
              sets: [
                { id: 'later-set-1', setIndex: 1, weight: 42.5, reps: 10, completed: true },
                { id: 'later-set-empty', setIndex: 2, completed: true }
              ]
            }
          ],
          createdAt: '2026-05-25T09:00:00.000Z'
        },
        {
          id: 'same-day-earlier-log',
          date: '2026-05-25',
          exercises: [{ id: 'earlier-exercise', exerciseId: 'pull-up', order: 0, sets: [{ id: 'earlier-set', setIndex: 1, reps: 8, completed: true }] }],
          createdAt: '2026-05-25T07:00:00.000Z'
        }
      ])
    );
  });

  await page.goto('/workout-history');

  const cards = page.getByTestId('workout-history-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('2026-05-25');
  await expect(cards.nth(0)).toContainText('动作：1 个');
  await expect(cards.nth(0)).toContainText('有效组数：1 组');
  await expect(cards.nth(0)).toContainText('时长：45 分钟');
  await expect(cards.nth(0)).toContainText('来源：计划');
  await expect(cards.nth(0)).toContainText('Back session note');
  await expect(cards.nth(1)).toHaveAttribute('data-log-id', 'same-day-earlier-log');
  await expect(cards.nth(2)).toContainText('2026-05-24');
});

test('workout history opens a read only workout log detail page', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'detail-log',
          date: '2026-05-25',
          planId: 'plan-v08',
          durationSeconds: 2700,
          notes: 'Keep tempo controlled',
          exercises: [
            {
              id: 'detail-exercise',
              exerciseId: 'lat-pulldown',
              order: 0,
              notes: 'No swinging',
              sets: [
                { id: 'set-1', setIndex: 1, weight: 42.5, reps: 10, completed: true },
                { id: 'set-2', setIndex: 2, weight: 35, completed: true },
                { id: 'set-3', setIndex: 3, reps: 12, completed: true },
                { id: 'set-4', setIndex: 4, completed: true }
              ]
            },
            {
              id: 'detail-exercise-2',
              exerciseId: 'barbell-bench-press',
              order: 1,
              sets: [{ id: 'set-5', setIndex: 1, weight: 20, reps: 10, completed: true }]
            }
          ],
          createdAt: '2026-05-25T09:00:00.000Z'
        }
      ])
    );
  });

  await page.goto('/workout-history');
  await page.getByTestId('workout-history-card').first().getByRole('link', { name: '查看详情' }).click();

  await expect(page).toHaveURL(/\/workout-history\/detail-log$/);
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible();
  await expect(page.getByTestId('workout-log-detail')).toContainText('2026-05-25');
  await expect(page.getByTestId('workout-detail-duration')).toHaveText('45:00');
  await expect(page.getByTestId('workout-detail-calories')).toContainText('约 270 kcal');
  await expect(page.getByTestId('workout-detail-valid-sets')).toContainText('4 组');
  await expect(page.getByTestId('workout-detail-exercise-count')).toContainText('2 个');
  await expect(page.getByTestId('workout-log-detail')).not.toContainText('总训练容量');
  await expect(page.getByTestId('workout-muscle-back')).toHaveAttribute('data-highlight', 'primary');
  await expect(page.getByTestId('workout-muscle-chest').first()).toHaveAttribute('data-highlight', 'primary');
  await expect(page.getByTestId('workout-muscle-triceps').first()).toHaveAttribute('data-highlight', 'secondary');
  await expect(page.getByTestId('workout-log-detail')).toContainText('Keep tempo controlled');
  const firstExercise = page.getByTestId('workout-detail-exercise-row').first();
  await expect(firstExercise).toContainText('高位下拉');
  await expect(firstExercise).toContainText('高位下拉');
  await expect(firstExercise).toContainText('No swinging');
  await expect(firstExercise).toContainText('3 组 · 最高 42.5kg · 10–12 次');
  await expect(firstExercise).toContainText('第 1 组 · 42.5kg · 10 次');
  await expect(firstExercise).toContainText('第 3 组 · 12 次');
  await expect(page.getByRole('link', { name: '返回记录概览' })).toHaveAttribute('href', '/workout-log');
  await expect(page.locator('input, textarea')).toHaveCount(0);
});

test('workout history detail handles missing logs and unknown exercises without crashing', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'unknown-exercise-log',
          date: '2026-05-25',
          exercises: [{ id: 'unknown-exercise', exerciseId: 'not-real-exercise', order: 0, sets: [{ id: 'set-1', setIndex: 1, reps: 9, completed: true }] }],
          createdAt: '2026-05-25T09:00:00.000Z'
        }
      ])
    );
  });

  await page.goto('/workout-history/not-found');
  await expect(page.getByText('未找到这次训练记录')).toBeVisible();

  await page.goto('/workout-history/unknown-exercise-log');
  await expect(page.getByTestId('workout-detail-exercise-row')).toContainText('未知动作');
  await expect(page.getByTestId('workout-detail-exercise-row')).toContainText('not-real-exercise');
  await expect(page.getByTestId('workout-detail-exercise-row')).toContainText('1 组 · 9 次');
});

test('workout history has an entry from workout log and does not overflow at 390px mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'mobile-log',
          date: '2026-05-25',
          exercises: [{ id: 'mobile-exercise', exerciseId: 'lat-pulldown', order: 0, sets: [{ id: 'mobile-set', setIndex: 1, weight: 42.5, reps: 10, completed: true }] }],
          createdAt: '2026-05-25T09:00:00.000Z'
        }
      ])
    );
  });

  await page.goto('/workout-log');
  await page.getByRole('link', { name: '查看训练日历与历史' }).click();
  await expect(page).toHaveURL(/\/workout-history$/);
  await expect(page.getByRole('heading', { name: '训练历史' })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('rhomboids exercise detail keeps muscle context across alternatives', async ({ page }) => {
  await page.goto('/muscle-map');
  await page.getByTestId('muscle-region-rhomboids-center').click();

  const rowLink = page.locator('a[href="/exercises/seated-row?muscleId=rhomboids"]');
  await expect(rowLink).toHaveCount(1);
  await rowLink.click();

  await expect(page).toHaveURL(/\/exercises\/seated-row\?muscleId=rhomboids$/);
  await page.getByRole('button', { name: /替代动作/ }).click();
  const alternatives = page.getByTestId('contextual-alternatives');
  await expect(alternatives).toContainText('主练匹配');
  await expect(alternatives).not.toContainText('滑草科键归屎');
  await expect(alternatives).not.toContainText('Deadlift');
  await expect(alternatives).not.toContainText('Back Extension');
  await expect(alternatives).not.toContainText('Romanian Deadlift');
  await expect(alternatives).not.toContainText('Lat Pulldown');

  await page.getByTestId('alternative-link-chest-supported-row').click();
  await expect(page).toHaveURL(/\/exercises\/chest-supported-row\?muscleId=rhomboids$/);
  await page.getByRole('button', { name: /替代动作/ }).click();
  await page.getByTestId('alternative-link-barbell-row').click();
  await expect(page).toHaveURL(/\/exercises\/barbell-row\?muscleId=rhomboids$/);
});

test('exercise detail falls back to primary muscle when muscleId is missing or invalid', async ({ page }) => {
  await page.goto('/exercises/lat-pulldown');
  await page.getByRole('button', { name: /替代动作/ }).click();
  await expect(page.getByTestId('alternative-link-pull-up')).toBeVisible();
  await expect(page.getByTestId('contextual-alternatives')).toContainText('主练匹配');
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('滑草科键归屎');

  await page.goto('/exercises/lat-pulldown?muscleId=not-a-real-muscle');
  await page.getByRole('button', { name: /替代动作/ }).click();
  await expect(page.getByTestId('alternative-link-pull-up')).toBeVisible();
  await expect(page.getByTestId('contextual-alternatives')).toContainText('主练匹配');
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('滑草科键归屎');
});

test('exercise detail removes misleading alternative relationships', async ({ page }) => {
  await page.goto('/exercises/dumbbell-shrug?muscleId=upper-trapezius');
  await page.getByRole('button', { name: /替代动作/ }).click();
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('Deadlift');

  await page.goto('/exercises/barbell-shrug?muscleId=upper-trapezius');
  await page.getByRole('button', { name: /替代动作/ }).click();
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('Deadlift');

  await page.goto('/exercises/deadlift');
  await page.getByRole('button', { name: /替代动作/ }).click();
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('T-bar Row');

  await page.goto('/exercises/prone-w-raise?muscleId=middle-lower-trapezius');
  await page.getByRole('button', { name: /替代动作/ }).click();
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('Superman');
});

test('exercise trajectory config covers the V0.21 first batch of existing exercise ids', () => {
  expect(exerciseTrajectories.map((trajectory) => trajectory.exerciseId)).toEqual([
    'lat-pulldown',
    'seated-row',
    'machine-chest-press',
    'dumbbell-shoulder-press',
    'dumbbell-curl',
    'squat'
  ]);

  for (const trajectory of exerciseTrajectories) {
    expect(trajectory.points.length).toBeGreaterThanOrEqual(2);
    expect(trajectory.points.length).toBeLessThanOrEqual(4);
    expect(trajectory.targetMuscleIds.length).toBeGreaterThan(0);
  }
});

test('exercise detail replaces the legacy trajectory with the two-stage media guide', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/exercises/plank');

  await expect(page.getByTestId('exercise-media-stage')).toHaveCount(2);
  await expect(page.getByText('3D 动作轨迹')).toHaveCount(0);
  await expect(page.getByTestId('exercise-primary-action')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('exercise detail can start an active workout with the current exercise', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.goto('/exercises/lat-pulldown');
  await expect(page.getByTestId('exercise-primary-action')).toHaveText('添加到训练');

  await page.getByTestId('exercise-primary-action').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=/);
  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');
  await expect(page.getByTestId('workout-log-exercise')).toContainText('高位下拉');

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(stored.exercises).toHaveLength(1);
  expect(stored.exercises[0].exerciseId).toBe('lat-pulldown');
  expect(stored.exercises[0].source).toBe('exercise-detail');
});

test('exercise detail adds exercises to an existing active workout without duplicates', async ({ page }) => {
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();
  await startFreeWorkout(page);
  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');
  await addExerciseFromPicker(page, 'lat-pulldown');
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);

  await page.goto('/exercises/seated-row');
  await expect(page.getByTestId('exercise-primary-action')).toHaveText('加入当前训练');
  await page.getByTestId('exercise-primary-action').click();
  await expect(page.getByRole('status')).toContainText('已加入当前训练');
  await page.getByTestId('exercise-primary-action').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await expect(page.getByTestId('workout-log-exercise').filter({ hasText: '高位下拉' })).toHaveCount(1);
  await expect(page.getByTestId('workout-log-exercise').filter({ hasText: '坐姿划船' })).toHaveCount(1);

  await page.goto('/exercises/seated-row');
  await expect(page.getByTestId('exercise-primary-action')).toHaveText('返回当前训练');
  await page.getByTestId('exercise-primary-action').click();
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
});

test('exercise detail active workout entry does not overflow at 390px mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.goto('/exercises/lat-pulldown');
  await expect(page.getByTestId('exercise-primary-action')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('user can search and filter rowing exercises', async ({ page }) => {
  await page.goto('/exercises');
  await expect(page.getByText('结果包含主练该肌群的动作，也包含该肌群作为次要参与的动作。')).toBeVisible();
  await page.getByRole('textbox', { name: '搜索动作' }).fill('划船');
  await expect(page.getByRole('link', { name: /单臂哑铃划船/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /坐姿划船/ })).toBeVisible();
  await expect(page.getByRole('link', { name: '杠铃划船 动作详情', exact: true })).toBeVisible();

  await page.getByLabel('涉及肌群').selectOption('latissimus-dorsi');
  await expect(page.getByRole('link', { name: /单臂哑铃划船/ })).toContainText('主练匹配');
  await expect(page.getByRole('link', { name: /坐姿划船/ })).toContainText('主练匹配');
  await expect(page.getByRole('link', { name: /哑铃耸肩/ })).toHaveCount(0);
});

test('latissimus dorsi filter distinguishes primary and secondary matches', async ({ page }) => {
  await page.goto('/exercises');
  await page.getByLabel('涉及肌群').selectOption('latissimus-dorsi');

  await expect(page.getByRole('link', { name: '高位下拉 动作详情', exact: true })).toContainText('主练匹配');
  await expect(page.getByRole('link', { name: '硬拉 动作详情', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /山羊挺身/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /罗马尼亚硬拉/ })).toHaveCount(0);
});

test.skip('plan builder generates a persisted 3 day back focused gym plan', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('hypertrophy');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('checkbox', { name: '背' }).check();
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByText('当前计划由本地规则生成，仅作为基础训练安排参考，不替代专业教练指导。')).toBeVisible();
  await expect(page.getByTestId('generated-workout-day')).toHaveCount(3);

  const pullDay = page.getByTestId('workout-day-pull');
  await expect(pullDay).toBeVisible();
  await expect(pullDay).toContainText(/高位下拉|引体向上|坐姿划船/);

  await page.getByRole('link', { name: /高位下拉|引体向上|坐姿划船/ }).first().click();
  await expect(page).toHaveURL(/\/exercises\/(lat-pulldown|pull-up|seated-row)$/);
  await expect(page.getByRole('heading', { name: /高位下拉|引体向上|坐姿划船/ })).toBeVisible();

  await page.goto('/plan-builder');
  await page.reload();
  await expect(page.getByText('最近生成计划')).toBeVisible();
  await expect(page.getByTestId('generated-workout-day')).toHaveCount(3);
});

test.skip('bodyweight plan does not recommend unavailable equipment and shows shortage notice', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('beginner');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('bodyweight');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('generated-workout-day')).toHaveCount(3);
  await expect(page.getByText('当前器械条件下可用动作较少，建议补充器械或切换到健身房完整器械。').first()).toBeVisible();
  await expect(page.getByTestId('generated-plan-result')).not.toContainText(/杠铃卧推|哑铃卧推|器械推胸|绳索夹胸|腿举|坐姿划船/);
});

test.skip('3 day gym plan keeps push pull legs and core structure', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('hypertrophy');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('intermediate');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('workout-day-push')).toContainText(/杠铃卧推|哑铃卧推|器械推胸|俯卧撑/);
  await expect(page.getByTestId('workout-day-push')).toContainText(/哑铃推举|器械肩推|绳索下压|仰卧臂屈伸/);
  await expect(page.getByTestId('workout-day-pull')).toContainText(/高位下拉|引体向上|坐姿划船|单臂哑铃划船/);
  await expect(page.getByTestId('workout-day-pull')).toContainText(/哑铃弯举|锤式弯举/);
  await expect(page.getByTestId('workout-day-legs-core')).toContainText(/深蹲|腿举|腿屈伸|弓步蹲/);
  await expect(page.getByTestId('workout-day-legs-core')).toContainText(/平板支撑|卷腹|死虫|悬垂举腿/);

  const dayItems = page.getByTestId('generated-workout-day');
  for (let index = 0; index < 3; index += 1) {
    const count = await dayItems.nth(index).getByTestId('generated-plan-item').count();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(5);
  }
});

test.skip('posture plan prioritizes scapular stability posterior chain and core control', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('posture');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('generated-plan-result')).toContainText(/面拉|反向飞鸟|俯身飞鸟|Y Raise|坐姿划船|胸托划船/);
  await expect(page.getByTestId('generated-plan-result')).toContainText(/罗马尼亚硬拉|山羊挺身|死虫|平板支撑|超人式/);
  await expect(page.getByTestId('workout-day-push')).not.toContainText(/杠铃卧推|器械推胸|器械肩推|绳索下压|仰卧臂屈伸/);
});

test.skip('bodyweight beginner plan avoids unrealistic pull up prescription', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('beginner');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('bodyweight');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('workout-day-pull')).not.toContainText('引体向上');
  await expect(page.getByTestId('workout-day-pull')).toContainText(/反向划船|毛巾划船|俯卧 W Raise|当前徒手背部动作较少/);
});

test.skip('strength plan separates main lifts and assistance prescriptions', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('strength');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('intermediate');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('generated-plan-result').getByText('3-6').first()).toBeVisible();
  await expect(page.getByTestId('generated-plan-result').getByText(/8-12|10-15/).first()).toBeVisible();
  await expect(page.getByTestId('generated-plan-result').getByText(/休息 150 秒|休息 180 秒/).first()).toBeVisible();
  await expect(page.getByTestId('generated-plan-result').getByText(/休息 60 秒|休息 75 秒|休息 90 秒/).first()).toBeVisible();
});

test.skip('plan builder keeps mobile bottom content above navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('hypertrophy');
  await page.getByLabel('每周训练天数').selectOption('5');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('button', { name: '生成计划' }).click();

  const lastDay = page.getByTestId('generated-workout-day').last();
  await lastDay.scrollIntoViewIfNeeded();
  const lastDayBox = await lastDay.boundingBox();
  const navBox = await page.locator('nav').boundingBox();

  expect(lastDayBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(lastDayBox!.y + lastDayBox!.height).toBeLessThanOrEqual(navBox!.y);
});

test('training templates start empty and open the new template page', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('musclemap.trainingTemplates.v1'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/plan-builder');

  await expect(page.getByRole('heading', { name: '训练模板', exact: true })).toBeVisible();
  await expect(page.getByText('还没有训练模板')).toBeVisible();
  await expect(page.getByText(/Pull Day|Push Day|Leg Day/)).toHaveCount(0);
  await page.getByRole('link', { name: /新建模板/ }).click();
  await expect(page).toHaveURL(/\/templates\/new$/);
});

test('new template validates and saves an empty user template', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('musclemap.trainingTemplates.v1'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/templates/new');

  for (const text of ['新建模板', '模板名称', '训练重点', '动作列表', '添加方式', '还没有添加动作', '+ 添加动作', '搜索动作', '从肌群地图添加', '从动作库', '保存模板']) {
    await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByPlaceholder('请输入模板名称')).toBeVisible();
  for (const tag of ['胸部', '背部', '肩部', '手臂', '腿部', '核心', '+']) {
    await expect(page.getByRole('button', { name: tag, exact: true })).toBeVisible();
  }
  await expect(page.getByText('想专门练某块肌肉？')).toHaveCount(0);
  await expect(page.getByText('打开肌群地图')).toHaveCount(0);

  await page.getByRole('button', { name: '保存模板' }).click();
  await expect(page.getByRole('alert')).toHaveText('请输入模板名称');

  await page.getByPlaceholder('请输入模板名称').fill('我的背部训练');
  await page.getByRole('button', { name: '背部', exact: true }).click();
  await page.getByRole('button', { name: '手臂', exact: true }).click();
  await page.getByRole('button', { name: '保存模板' }).click();

  await expect(page).toHaveURL(/\/plan-builder$/);
  await expect(page.getByRole('status')).toHaveText('模板已保存');
  await expect(page.getByRole('heading', { name: '我的背部训练' })).toBeVisible();
  await expect(page.getByText('0 个动作')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.trainingTemplates.v1') ?? '[]'));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ name: '我的背部训练', focusTags: ['背部', '手臂'], items: [] });
});

test('new template add methods route correctly and clear mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/templates/new');

  await expect(page.getByRole('link', { name: '从肌群地图添加' })).toHaveAttribute('href', '/three-muscle-selector?mode=template');
  await expect(page.getByRole('link', { name: '从动作库' })).toHaveAttribute('href', '/exercises?mode=template');
  await expect(page.getByRole('link', { name: '我的', exact: true })).toHaveClass(/text-lime-300/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.getByRole('button', { name: '保存模板' }).scrollIntoViewIfNeeded();
  const saveBox = await page.getByRole('button', { name: '保存模板' }).boundingBox();
  const navBox = await page.locator('nav').boundingBox();
  expect(saveBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(navBox!.y);
});

test('workout log starts active workout from latest plan day and archives plan id', async ({ page }) => {
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'musclemap.latestGeneratedPlan.v0.2',
      JSON.stringify({
        id: 'plan-v072',
        name: 'V0.7.2 Test Plan',
        input: {
          goal: 'hypertrophy',
          daysPerWeek: 3,
          level: 'beginner',
          availableEquipment: 'fullGym',
          focusBodyParts: ['back']
        },
        createdAt: '2026-05-25T00:00:00.000Z',
        days: [
          {
            id: 'pull-day',
            name: 'Pull Day',
            focus: 'Back',
            items: [
              {
                exerciseId: 'lat-pulldown',
                sets: 3,
                repRange: '8-12',
                restSeconds: 90,
                targetMuscles: ['latissimus-dorsi'],
                note: 'Keep shoulders down'
              },
              {
                exerciseId: 'seated-row',
                sets: 2,
                repRange: '10-12',
                restSeconds: 75,
                targetMuscles: ['rhomboids']
              }
            ]
          }
        ]
      })
    );
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.reload();
  await page.getByRole('button', { name: '开始记录训练' }).click();
  await expect(page.getByTestId('latest-plan-start')).toContainText('从计划开始');
  await expect(page.getByTestId('latest-plan-start')).toContainText('V0.7.2 Test Plan');
  await page.getByTestId('start-plan-day-pull-day').click();

  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  const firstExercise = page.getByTestId('workout-log-exercise').first();
  await expect(firstExercise).toContainText('高位下拉');
  await expect(firstExercise).toContainText('计划建议');
  await expect(firstExercise).toContainText('8-12');
  await expect(firstExercise).toContainText('90');
  await expect(firstExercise).toContainText('Keep shoulders down');
  await expect(firstExercise.getByTestId('workout-set-row')).toHaveCount(3);
  await expect(firstExercise.getByTestId('set-reps-input').first()).toHaveValue('');

  const active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.source).toBe('plan');
  expect(active.planId).toBe('plan-v072');
  expect(active.planDayId).toBe('pull-day');
  expect(active.exercises[0].planned.repRange).toBe('8-12');
  expect(active.exercises[0].sets[0].reps).toBeUndefined();

  await page.reload();
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await page.getByTestId('workout-log-exercise').first().getByTestId('set-weight-input').first().fill('40');
  await page.getByTestId('workout-log-exercise').first().getByTestId('set-reps-input').first().fill('10');
  await page.getByTestId('end-active-workout').click();

  const latest = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3') ?? 'null'));
  expect(latest.planId).toBe('plan-v072');
  expect(latest.exercises).toHaveLength(1);
  expect(await page.evaluate(() => window.localStorage.getItem('musclemap.activeWorkout.v0.7'))).toBeNull();
});

test('workout log blocks starting a plan day when active workout already exists on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.latestGeneratedPlan.v0.2',
      JSON.stringify({
        id: 'plan-existing-active',
        name: 'Existing Active Plan',
        input: {
          goal: 'hypertrophy',
          daysPerWeek: 3,
          level: 'beginner',
          availableEquipment: 'fullGym',
          focusBodyParts: ['back']
        },
        createdAt: '2026-05-25T00:00:00.000Z',
        days: [
          {
            id: 'blocked-day',
            name: 'Blocked Day',
            focus: 'Back',
            items: [{ exerciseId: 'seated-row', sets: 2, repRange: '10-12', restSeconds: 75, targetMuscles: ['rhomboids'] }]
          }
        ]
      })
    );
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await startFreeWorkout(page);
  await expect(page.getByTestId('workout-log-overview')).toHaveCount(0);
  await expect(page.getByTestId('start-plan-day-blocked-day')).toHaveCount(0);
  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});









test('workout log active workout flow persists edits archives and clears', async ({ page }) => {
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await expect(page.getByTestId('workout-log-overview')).toBeVisible();
  await startFreeWorkout(page);
  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');

  await page.reload();
  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');

  await addExerciseFromPicker(page, 'lat-pulldown');

  const exercise = page.getByTestId('workout-log-exercise').first();
  await expect(exercise).toBeVisible();
  await exercise.getByTestId('set-weight-input').fill('42.5');
  await exercise.getByTestId('set-reps-input').fill('10');
  await exercise.getByTestId('toggle-exercise-notes').click();
  await exercise.getByTestId('exercise-notes-input').fill('controlled first working set');
  await page.getByTestId('end-active-workout').click();

  await expect(page).toHaveURL(/\/workout-history\/workout-log-/);
  await expect(page.getByTestId('workout-completed-notice')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('musclemap.activeWorkout.v0.7'))).toBeNull();
  await page.reload();
  await expect(page.getByTestId('workout-completed-notice')).toHaveCount(0);
  await page.getByRole('link', { name: '返回记录概览' }).click();
  await expect(page.getByTestId('recent-workout-card')).toHaveCount(0);
  await page.goto('/workout-history');
  await page.getByTestId('workout-history-card').first().getByRole('link', { name: '查看详情' }).click();
  await expect(page.getByTestId('workout-log-detail')).toContainText('高位下拉');
  await expect(page.getByTestId('workout-log-detail')).toContainText('42.5kg');
  await expect(page.getByTestId('workout-log-detail')).toContainText('10 次');
});

test('workout log tracks current exercise elapsed time after first set entry', async ({ page }) => {
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await page.setViewportSize({ width: 390, height: 844 });
  await startFreeWorkout(page);
  await addExerciseFromPicker(page, 'lat-pulldown');

  const exercise = page.getByTestId('workout-log-exercise').first();
  await expect(exercise.getByTestId('current-exercise-timer')).toHaveCount(0);
  await exercise.getByTestId('set-weight-input').fill('42.5');

  const timer = exercise.getByTestId('current-exercise-timer');
  await expect(timer).toBeVisible();
  await expect(exercise.getByTestId('end-current-exercise')).toBeVisible();
  await expect(exercise.getByTestId('toggle-exercise-notes')).toBeVisible();

  await exercise.getByTestId('toggle-exercise-notes').click();
  await expect(exercise.getByTestId('exercise-notes-input')).toBeVisible();
  await exercise.getByTestId('toggle-exercise-notes').click();
  await expect(exercise.getByTestId('exercise-notes-input')).toBeHidden();
  await expect(exercise).toContainText('高位下拉');

  const firstValue = parseTimerValue((await timer.textContent()) ?? '');
  await page.waitForTimeout(1100);
  const secondValue = parseTimerValue((await timer.textContent()) ?? '');
  expect(secondValue).toBeGreaterThanOrEqual(firstValue);

  await exercise.getByTestId('end-current-exercise').click();
  await expect(exercise.getByTestId('set-weight-input')).toBeHidden();
  await expect(exercise.getByTestId('set-reps-input')).toBeHidden();
  await expect(exercise.getByTestId('exercise-notes-input')).toBeHidden();
  await expect(timer).toContainText('用时');

  const endedValue = parseTimerValue((await timer.textContent()) ?? '');
  await page.waitForTimeout(1100);
  expect(parseTimerValue((await timer.textContent()) ?? '')).toBe(endedValue);

  await page.reload();
  const reloadedExercise = page.getByTestId('workout-log-exercise').first();
  await expect(reloadedExercise.getByTestId('current-exercise-timer')).toContainText('用时');
  await expect(reloadedExercise.getByTestId('end-current-exercise')).toHaveCount(0);
  await expect(reloadedExercise.getByTestId('set-weight-input')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('workout log rejects empty active workout before archiving', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await startFreeWorkout(page);
  await page.getByTestId('end-active-workout').click();

  await expect(page.getByTestId('save-status')).toContainText('请先添加至少一个动作');
  const stored = await page.evaluate(() => window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3'));
  expect(stored).toBeNull();
});

test('workout log rejects empty sets and invalid reps in active workout', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await startFreeWorkout(page);
  await addExerciseFromPicker(page, 'lat-pulldown');
  await page.getByTestId('end-active-workout').click();
  await expect(page.getByTestId('save-status')).toContainText('请至少填写一组重量或次数');

  const exercise = page.getByTestId('workout-log-exercise').first();
  await exercise.getByTestId('set-reps-input').fill('10.5');
  await page.getByTestId('end-active-workout').click();
  await expect(page.getByTestId('save-status')).toContainText('次数必须是整数');
});

test('workout log can discard active workout after confirmation', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await startFreeWorkout(page);
  await addExerciseFromPicker(page, 'lat-pulldown');

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.dismiss();
  });
  await page.getByLabel('更多训练操作').click();
  await page.getByTestId('discard-active-workout').click();
  await expect(page.getByTestId('active-workout-card')).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.accept();
  });
  await page.getByTestId('discard-active-workout').click();
  await expect(page.getByTestId('workout-log-overview')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('musclemap.activeWorkout.v0.7'))).toBeNull();
});

test('workout log can add and delete sets and exercises in active workout', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await startFreeWorkout(page);
  await addExerciseFromPicker(page, 'lat-pulldown');

  const exercise = page.getByTestId('workout-log-exercise').first();
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(1);
  await exercise.getByTestId('add-set').click();
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(2);
  await exercise.getByTestId('set-completion-toggle').last().click();
  await exercise.getByTestId('delete-set').last().click();
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(1);
  await exercise.getByLabel('当前动作更多设置').click();
  await exercise.getByTestId('delete-workout-exercise').click();
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(0);
});

test('workout log active controls are available above mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();
  await startFreeWorkout(page);
  await addExerciseFromPicker(page, 'lat-pulldown');

  const miniPlayer = page.getByTestId('workout-mini-player');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const buttonBox = await miniPlayer.boundingBox();
  const navBox = await page.locator('nav').boundingBox();

  expect(buttonBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(navBox!.y);
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('core pages are usable on mobile viewport and static data survives refresh', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/muscle-map');
  await page.getByRole('button', { name: /左背阔肌/ }).click();
  await expect(page.getByRole('heading', { name: '背阔肌' })).toBeVisible();

  await page.goto('/exercises/lat-pulldown');
  await page.reload();
  await expect(page.getByRole('heading', { name: '高位下拉' })).toBeVisible();

  await page.goto('/exercises');
  await expect(page.getByRole('textbox', { name: '搜索动作' })).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});

test('profile page shows the dark training profile, management entries and latest real metrics', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        { id: 'profile-log-1', date: '2026-07-01', exercises: [], createdAt: '2026-07-01T09:00:00.000Z' },
        { id: 'profile-log-2', date: '2026-07-02', exercises: [], createdAt: '2026-07-02T09:00:00.000Z' }
      ])
    );
    window.localStorage.setItem(
      'musclemap.bodySnapshots.v0.1',
      JSON.stringify([
        { id: 'profile-body-old', date: '2026-07-01', bodyWeightKg: 71, waistCm: 79, createdAt: '2026-07-01T09:00:00.000Z' },
        { id: 'profile-body-new', date: '2026-07-06', bodyWeightKg: 70.5, waistCm: 78, createdAt: '2026-07-06T09:00:00.000Z' }
      ])
    );
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/data-management');

  await expect(page.getByRole('heading', { name: '我的', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '我的训练档案' })).toBeVisible();
  await expect(page.getByTestId('profile-metric')).toHaveCount(3);
  await expect(page.getByTestId('profile-training-count')).toHaveText('2次');
  await expect(page.getByTestId('profile-current-weight')).toHaveText('70.5kg');
  await expect(page.getByTestId('profile-current-waist')).toHaveText('78cm');
  await expect(page.getByText('数据来自最近一次身体记录')).toHaveCount(0);

  for (const label of ['训练模板', '训练历史', '动作进步', '身体变化', '数据备份', '偏好设置']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: '训练模板' })).toHaveAttribute('href', '/plan-builder');
  await expect(page.getByRole('link', { name: '训练历史' })).toHaveAttribute('href', '/workout-history');

  await page.getByRole('button', { name: '记录身体数据' }).click();
  await expect(page.getByRole('status')).toContainText('身体数据记录功能开发中');
  await page.getByRole('button', { name: '动作进步' }).click();
  await expect(page.getByRole('status')).toContainText('动作进步功能开发中');
  await page.getByRole('button', { name: '偏好设置' }).click();
  await expect(page.getByRole('status')).toContainText('偏好设置功能开发中');

  await expect(page.getByTestId('backup-panel')).toHaveCount(0);
  await page.getByRole('button', { name: '数据备份' }).click();
  await expect(page.getByTestId('backup-panel')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('profile page uses honest empty body metrics and clears the floating navigation', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.bodySnapshots.v0.1');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/data-management');

  await expect(page.getByTestId('profile-training-count')).toHaveText('0次');
  await expect(page.getByTestId('profile-current-weight')).toHaveText('未记录');
  await expect(page.getByTestId('profile-current-waist')).toHaveText('未记录');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const navBox = await page.locator('nav').boundingBox();
  const endBox = await page.getByTestId('profile-content-end').boundingBox();
  expect(navBox).not.toBeNull();
  expect(endBox).not.toBeNull();
  expect(endBox!.y + endBox!.height).toBeLessThanOrEqual(navBox!.y);
});
test('data management exports current local backup data', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.latestGeneratedPlan.v0.2',
      JSON.stringify({
        id: 'plan-backup',
        name: 'Backup Plan',
        input: {
          goal: 'hypertrophy',
          daysPerWeek: 3,
          level: 'beginner',
          availableEquipment: 'fullGym',
          focusBodyParts: []
        },
        days: [],
        createdAt: '2026-05-25T00:00:00.000Z'
      })
    );
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'log-1',
          date: '2026-05-25',
          exercises: [{ id: 'exercise-1', exerciseId: 'lat-pulldown', order: 0, sets: [{ id: 'set-1', setIndex: 1, reps: 12, completed: true }] }],
          createdAt: '2026-05-25T00:00:00.000Z'
        },
        {
          id: 'log-2',
          date: '2026-05-24',
          exercises: [{ id: 'exercise-2', exerciseId: 'seated-row', order: 0, sets: [{ id: 'set-2', setIndex: 1, weight: 40, completed: true }] }],
          createdAt: '2026-05-24T00:00:00.000Z'
        }
      ])
    );
    window.localStorage.setItem(
      'musclemap.latestWorkoutLog.v0.3',
      JSON.stringify({
        id: 'log-1',
        date: '2026-05-25',
        exercises: [{ id: 'exercise-1', exerciseId: 'lat-pulldown', order: 0, sets: [{ id: 'set-1', setIndex: 1, reps: 12, completed: true }] }],
        createdAt: '2026-05-25T00:00:00.000Z'
      })
    );
    window.localStorage.setItem(
      'musclemap.bodySnapshots.v0.1',
      JSON.stringify([{ id: 'body-export', date: '2026-05-25', bodyWeightKg: 70.5, waistCm: 78, createdAt: '2026-05-25T09:00:00.000Z' }])
    );
  });

  await page.goto('/');
  await page.getByRole('link', { name: '我的', exact: true }).click();
  await expect(page).toHaveURL(/\/data-management$/);
  await expect(page.getByRole('heading', { name: '我的', exact: true })).toBeVisible();
  await expect(page.getByTestId('backup-panel')).toHaveCount(0);
  await page.getByTestId('open-backup-panel').click();
  await expect(page.getByText('进行中的训练不会导出，请先结束训练后再备份。')).toBeVisible();
  await expect(page.getByTestId('backup-workout-log-count')).toContainText('2 条');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-backup-json').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream?.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream?.on('end', resolve);
    stream?.on('error', reject);
  });
  const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));

  expect(download.suggestedFilename()).toMatch(/^musclemap-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(exported.app).toBe('MuscleMap Fitness');
  expect(exported.exportVersion).toBe(4);
  expect(typeof exported.exportedAt).toBe('string');
  expect(exported.data.workoutLogs).toHaveLength(2);
  expect(exported.data.bodySnapshots).toEqual([
    { id: 'body-export', date: '2026-05-25', weightKg: 70.5, waistCm: 78, createdAt: '2026-05-25T09:00:00.000Z', updatedAt: '2026-05-25T09:00:00.000Z' }
  ]);
});

test('data management validates imported backup files before overwriting storage', async ({ page }) => {
  await page.goto('/data-management');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'musclemap.latestWorkoutLog.v0.3',
      JSON.stringify({
        id: 'existing-log',
        date: '2026-05-20',
        exercises: [{ id: 'existing-exercise', exerciseId: 'lat-pulldown', order: 0, sets: [{ id: 'existing-set', setIndex: 1, reps: 8, completed: true }] }],
        createdAt: '2026-05-20T00:00:00.000Z'
      })
    );
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: '我的', exact: true })).toBeVisible();
  await page.getByTestId('open-backup-panel').click();

  await page.setInputFiles('input[data-testid="import-backup-file"]', {
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad json')
  });
  await expect(page.getByTestId('backup-status')).toContainText('文件内容不是有效 JSON。');

  await page.setInputFiles('input[data-testid="import-backup-file"]', {
    name: 'other.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ app: 'Other App', exportVersion: 1, exportedAt: '2026-05-25T00:00:00.000Z', data: {} }))
  });
  await expect(page.getByTestId('backup-status')).toContainText('这不是 MuscleMap Fitness 的导出文件。');

  await page.setInputFiles('input[data-testid="import-backup-file"]', {
    name: 'future.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ app: 'MuscleMap Fitness', exportVersion: 99, exportedAt: '2026-05-25T00:00:00.000Z', data: {} }))
  });
  await expect(page.getByTestId('backup-status')).toContainText('当前版本不支持该备份文件。');

  const validBackup = {
    app: 'MuscleMap Fitness',
    exportVersion: 2,
    exportedAt: '2026-05-25T08:00:00.000Z',
    data: {
      latestGeneratedPlan: null,
      workoutLogs: [
        {
          id: 'imported-log',
          date: '2026-05-25',
          exercises: [{ id: 'imported-exercise', exerciseId: 'seated-row', order: 0, sets: [{ id: 'imported-set', setIndex: 1, weight: 42.5, reps: 10, completed: true }] }],
          createdAt: '2026-05-25T08:00:00.000Z'
        }
      ],
      latestWorkoutLog: {
        id: 'imported-log',
        date: '2026-05-25',
        exercises: [{ id: 'imported-exercise', exerciseId: 'seated-row', order: 0, sets: [{ id: 'imported-set', setIndex: 1, weight: 42.5, reps: 10, completed: true }] }],
        createdAt: '2026-05-25T08:00:00.000Z'
      },
      bodySnapshots: [
        { id: 'imported-body', date: '2026-05-25', bodyWeightKg: 69.8, waistCm: 77, createdAt: '2026-05-25T08:00:00.000Z' }
      ]
    }
  };

  await page.setInputFiles('input[data-testid="import-backup-file"]', {
    name: 'musclemap.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(validBackup))
  });

  await expect(page.getByTestId('import-summary')).toContainText('训练记录：1 条');
  await expect(page.getByTestId('import-summary')).toContainText('最近训练记录：有');
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3') ?? 'null').id)).toBe('existing-log');

  await page.getByTestId('confirm-overwrite-import').click();
  await expect(page.getByTestId('backup-status')).toContainText('导入成功，当前本地数据已更新。');
  expect(await page.evaluate(() => window.localStorage.getItem('musclemap.latestGeneratedPlan.v0.2'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.workoutLogs.v0.3') ?? '[]'))).toHaveLength(1);
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3') ?? 'null').id)).toBe('imported-log');
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.bodySnapshots.v0.1') ?? '[]'))).toEqual([
    { id: 'imported-body', date: '2026-05-25', weightKg: 69.8, waistCm: 77, createdAt: '2026-05-25T08:00:00.000Z', updatedAt: '2026-05-25T08:00:00.000Z' }
  ]);

  await page.reload();
  await page.getByTestId('open-backup-panel').click();
  await expect(page.getByTestId('backup-workout-log-count')).toContainText('1 条');
  await page.goto('/workout-history/imported-log');
  await expect(page.getByTestId('workout-log-detail')).toContainText('坐姿划船');
});

test('data management remains usable on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/data-management');
  await expect(page.getByRole('heading', { name: '我的', exact: true })).toBeVisible();
  await page.getByTestId('open-backup-panel').click();
  await expect(page.getByTestId('backup-panel')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
