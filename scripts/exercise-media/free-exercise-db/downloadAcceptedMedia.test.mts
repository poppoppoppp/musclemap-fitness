import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import {
  FIXED_SOURCE_COMMIT,
  buildAcceptedJobs,
  createCurlFetch,
  ensureCachedImage,
  processAcceptedMedia,
  publishAcceptedMedia,
  validateDistinctImages
} from './acceptedMedia.ts';

const source = {
  id: 'Source_One',
  name: 'Source One',
  equipment: 'barbell',
  primaryMuscles: ['chest'],
  secondaryMuscles: [],
  category: 'strength',
  force: 'push',
  mechanic: 'compound',
  instructions: [],
  images: ['Source_One/0.jpg', 'Source_One/1.jpg']
};

const match = {
  exercise: { exerciseId: 'accepted-exercise' },
  bestCandidate: {
    sourceId: 'Source_One',
    startImageUrl: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${FIXED_SOURCE_COMMIT}/exercises/Source_One/0.jpg`,
    peakImageUrl: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${FIXED_SOURCE_COMMIT}/exercises/Source_One/1.jpg`
  },
  topCandidates: []
};

function overrides() {
  return {
    version: 1 as const,
    updatedAt: null,
    accepted: { 'accepted-exercise': 'Source_One' },
    rejected: { 'rejected-exercise': ['Rejected_Source'] },
    forced: { 'forced-exercise': 'Forced_Source' },
    reuse: {},
    notes: {}
  };
}

test('buildAcceptedJobs dynamically processes every accepted decision without a fixed count', () => {
  const secondSource = { ...source, id: 'Source_Two', images: ['Source_Two/0.jpg', 'Source_Two/1.jpg'] };
  const secondMatch = {
    exercise: { exerciseId: 'second-exercise' },
    bestCandidate: {
      sourceId: 'Source_Two',
      startImageUrl: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${FIXED_SOURCE_COMMIT}/exercises/Source_Two/0.jpg`,
      peakImageUrl: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${FIXED_SOURCE_COMMIT}/exercises/Source_Two/1.jpg`
    },
    topCandidates: []
  };
  const dynamicOverrides = overrides();
  dynamicOverrides.accepted['second-exercise'] = 'Source_Two';

  const result = buildAcceptedJobs({
    overrides: dynamicOverrides,
    appExerciseIds: new Set(['accepted-exercise', 'second-exercise']),
    sourceExercises: [source, secondSource],
    matches: [match, secondMatch]
  });

  assert.equal(result.failures.length, 0);
  assert.deepEqual(result.jobs.map((job) => job.exerciseId), ['accepted-exercise', 'second-exercise']);
});

test('buildAcceptedJobs only creates jobs from accepted decisions and pins both URLs to the fixed commit', () => {
  const result = buildAcceptedJobs({
    overrides: overrides(),
    appExerciseIds: new Set(['accepted-exercise', 'forced-exercise', 'rejected-exercise']),
    sourceExercises: [source],
    matches: [match],
    expectedAcceptedCount: 1
  });

  assert.equal(result.failures.length, 0);
  assert.deepEqual(result.jobs.map((job) => job.exerciseId), ['accepted-exercise']);
  assert.equal(result.jobs[0].sourceId, 'Source_One');
  assert.match(result.jobs[0].start.sourceUrl, new RegExp(`/${FIXED_SOURCE_COMMIT}/`));
  assert.match(result.jobs[0].peak.sourceUrl, new RegExp(`/${FIXED_SOURCE_COMMIT}/`));
  assert.equal(result.jobs[0].start.sourcePath, 'Source_One/0.jpg');
  assert.equal(result.jobs[0].peak.sourcePath, 'Source_One/1.jpg');
});

test('buildAcceptedJobs reports invalid app, source, image, and matches references without rematching by name', () => {
  const invalidOverrides = overrides();
  invalidOverrides.accepted = {
    'missing-app': 'Source_One',
    'missing-source': 'Unknown_Source',
    'short-images': 'Short_Source',
    'missing-match': 'No_Match_Source'
  };
  const shortSource = { ...source, id: 'Short_Source', images: ['Short_Source/0.jpg'] };
  const noMatchSource = { ...source, id: 'No_Match_Source', images: ['No_Match_Source/0.jpg', 'No_Match_Source/1.jpg'] };

  const result = buildAcceptedJobs({
    overrides: invalidOverrides,
    appExerciseIds: new Set(['missing-source', 'short-images', 'missing-match']),
    sourceExercises: [source, shortSource, noMatchSource],
    matches: [],
    expectedAcceptedCount: 4
  });

  assert.equal(result.jobs.length, 0);
  assert.deepEqual(result.failures.map((failure) => failure.exerciseId), [
    'missing-app',
    'missing-match',
    'missing-source',
    'short-images'
  ]);
  assert.match(result.failures.find((failure) => failure.exerciseId === 'missing-app')?.reason ?? '', /App 可见动作/);
  assert.match(result.failures.find((failure) => failure.exerciseId === 'missing-source')?.reason ?? '', /sourceId/);
  assert.match(result.failures.find((failure) => failure.exerciseId === 'short-images')?.reason ?? '', /至少两张图片/);
  assert.match(result.failures.find((failure) => failure.exerciseId === 'missing-match')?.reason ?? '', /matches\.json/);
});

test('buildAcceptedJobs rejects matches URLs that are not pinned to the accepted source and fixed commit', () => {
  const result = buildAcceptedJobs({
    overrides: overrides(),
    appExerciseIds: new Set(['accepted-exercise']),
    sourceExercises: [source],
    matches: [{
      ...match,
      bestCandidate: {
        ...match.bestCandidate,
        startImageUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Other/0.jpg'
      }
    }],
    expectedAcceptedCount: 1
  });

  assert.equal(result.jobs.length, 0);
  assert.match(result.failures[0].reason, /固定 commit|accepted sourceId/);
});

async function jpegBuffer(colour: string, width = 320, height = 480) {
  return sharp({ create: { width, height, channels: 3, background: colour } }).jpeg().toBuffer();
}

test('ensureCachedImage downloads through a temporary file and later reuses a hash-verified cache', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-cache-'));
  const cacheFile = path.join(root, 'Source_One', '0.jpg');
  const body = await jpegBuffer('#cc3344');
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    return new Response(body, { status: 200, headers: { 'content-type': 'image/jpeg' } });
  };

  const downloaded = await ensureCachedImage({
    sourceUrl: match.bestCandidate.startImageUrl,
    cacheFile,
    fetchImpl: fetchImpl as typeof fetch
  });
  const reused = await ensureCachedImage({
    sourceUrl: match.bestCandidate.startImageUrl,
    cacheFile,
    known: downloaded,
    fetchImpl: (async () => { throw new Error('cache reuse should not fetch'); }) as typeof fetch
  });

  assert.equal(downloaded.status, 'downloaded');
  assert.equal(reused.status, 'reused');
  assert.equal(requests, 1);
  assert.equal(reused.sha256, downloaded.sha256);
  assert.equal(reused.bytes, (await stat(cacheFile)).size);
  assert.deepEqual(await readdir(path.dirname(cacheFile)), ['0.jpg']);
});

test('ensureCachedImage retries transient failures and never leaves a bad cache or temporary file', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-retry-'));
  const cacheFile = path.join(root, 'Source_One', '0.jpg');
  const body = await jpegBuffer('#2255aa');
  let attempts = 0;
  const result = await ensureCachedImage({
    sourceUrl: match.bestCandidate.startImageUrl,
    cacheFile,
    retries: 3,
    fetchImpl: (async () => {
      attempts += 1;
      return attempts < 3 ? new Response('temporary failure', { status: 503 }) : new Response(body, { status: 200 });
    }) as typeof fetch
  });

  assert.equal(result.status, 'downloaded');
  assert.equal(attempts, 3);
  assert.deepEqual(await readdir(path.dirname(cacheFile)), ['0.jpg']);

  const invalidCache = path.join(root, 'Source_One', '1.jpg');
  await assert.rejects(() => ensureCachedImage({
    sourceUrl: match.bestCandidate.peakImageUrl,
    cacheFile: invalidCache,
    retries: 1,
    fetchImpl: (async () => new Response('<html>not an image</html>', { status: 200, headers: { 'content-type': 'text/html' } })) as typeof fetch
  }), /图片|解码|HTML/);
  assert.deepEqual(await readdir(path.dirname(invalidCache)), ['0.jpg']);
});

test('ensureCachedImage aborts a stalled request and applies the timeout to every retry', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-timeout-'));
  const cacheFile = path.join(root, 'Source_One', '0.jpg');
  let attempts = 0;
  const stalledFetch = ((_: string | URL | Request, init?: RequestInit) => {
    attempts += 1;
    return new Promise<Response>((_resolve, reject) => {
      const fallback = setTimeout(() => reject(new Error('request was not aborted')), 100);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(fallback);
        reject(new Error('aborted by timeout'));
      }, { once: true });
    });
  }) as typeof fetch;

  await assert.rejects(() => ensureCachedImage({
    sourceUrl: match.bestCandidate.startImageUrl,
    cacheFile,
    retries: 2,
    requestTimeoutMs: 10,
    fetchImpl: stalledFetch
  }), /aborted by timeout/);
  assert.equal(attempts, 2);
  assert.deepEqual(await readdir(path.dirname(cacheFile)), []);
});

test('createCurlFetch adapts a binary curl runner to the fetch contract without changing the URL', async () => {
  const body = await jpegBuffer('#335577');
  let receivedUrl = '';
  const curlFetch = createCurlFetch(async (url) => {
    receivedUrl = url;
    return body;
  });

  const response = await curlFetch(match.bestCandidate.startImageUrl);
  assert.equal(response.status, 200);
  assert.equal(receivedUrl, match.bestCandidate.startImageUrl);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), body);
});

test('validateDistinctImages rejects identical start and peak files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-distinct-'));
  const startFile = path.join(root, '0.jpg');
  const peakFile = path.join(root, '1.jpg');
  const body = await jpegBuffer('#118855');
  await writeFile(startFile, body);
  await writeFile(peakFile, body);

  await assert.rejects(() => validateDistinctImages(startFile, peakFile), /完全相同/);
});

test('publishAcceptedMedia atomically writes a complete 640x800 WebP pair without stretching', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-publish-'));
  const cacheDirectory = path.join(root, 'cache');
  const mediaRoot = path.join(root, 'public', 'exercise-media');
  const startFile = path.join(cacheDirectory, '0.jpg');
  const peakFile = path.join(cacheDirectory, '1.jpg');
  await mkdir(cacheDirectory);
  await writeFile(startFile, await jpegBuffer('#bb2233', 300, 500));
  await writeFile(peakFile, await jpegBuffer('#2244bb', 500, 300));

  const result = await publishAcceptedMedia({ exerciseId: 'accepted-exercise', startFile, peakFile, mediaRoot });
  const startOutput = path.join(mediaRoot, 'accepted-exercise', 'start.webp');
  const peakOutput = path.join(mediaRoot, 'accepted-exercise', 'peak.webp');
  const [startMetadata, peakMetadata] = await Promise.all([sharp(startOutput).metadata(), sharp(peakOutput).metadata()]);

  assert.equal(result.status, 'created');
  assert.deepEqual([startMetadata.format, startMetadata.width, startMetadata.height], ['webp', 640, 800]);
  assert.deepEqual([peakMetadata.format, peakMetadata.width, peakMetadata.height], ['webp', 640, 800]);
  assert.notEqual(result.start.sha256, result.peak.sha256);
  assert.equal(result.start.bytes, (await readFile(startOutput)).byteLength);
  assert.deepEqual((await readdir(mediaRoot)).sort(), ['accepted-exercise']);
});

test('publishAcceptedMedia reports conflicts and conversion failures never leave a target directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-atomic-'));
  const mediaRoot = path.join(root, 'media');
  const startFile = path.join(root, '0.jpg');
  const peakFile = path.join(root, '1.jpg');
  await writeFile(startFile, await jpegBuffer('#993311'));
  await writeFile(peakFile, await jpegBuffer('#116699'));
  await publishAcceptedMedia({ exerciseId: 'existing', startFile, peakFile, mediaRoot });

  const conflict = await publishAcceptedMedia({ exerciseId: 'existing', startFile, peakFile, mediaRoot });
  assert.equal(conflict.status, 'conflict');

  const invalidPeak = path.join(root, 'invalid.jpg');
  await writeFile(invalidPeak, 'not an image');
  await assert.rejects(() => publishAcceptedMedia({ exerciseId: 'failed', startFile, peakFile: invalidPeak, mediaRoot }));
  await assert.rejects(() => stat(path.join(mediaRoot, 'failed')));
  assert.deepEqual((await readdir(mediaRoot)).filter((name) => name.includes('.tmp-')), []);
});

function processFixture(root: string, fetchImpl: typeof fetch) {
  return {
    projectRoot: root,
    cacheDir: path.join(root, 'external-cache'),
    overrides: overrides(),
    appExerciseIds: new Set(['accepted-exercise', 'forced-exercise', 'rejected-exercise']),
    sourceExercises: [source],
    matches: [match],
    expectedAcceptedCount: 1,
    fetchImpl,
    now: () => new Date('2026-07-15T08:00:00.000Z')
  };
}

test('processAcceptedMedia creates both outputs, manifest hashes, cache index, and execution reports', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-process-'));
  const bodies = new Map([
    [match.bestCandidate.startImageUrl, await jpegBuffer('#aa2233', 300, 500)],
    [match.bestCandidate.peakImageUrl, await jpegBuffer('#2255aa', 500, 300)]
  ]);
  const result = await processAcceptedMedia(processFixture(root, (async (url) => {
    const body = bodies.get(String(url));
    return body ? new Response(body, { status: 200 }) : new Response('missing', { status: 404 });
  }) as typeof fetch));

  const manifestPath = path.join(root, 'public', 'exercise-media', 'source-manifest.json');
  const reportPath = path.join(root, 'reports', 'exercise-media', 'free-exercise-db', 'download-summary.json');
  const markdownPath = path.join(root, 'reports', 'exercise-media', 'free-exercise-db', 'download-summary.md');
  const cacheIndexPath = path.join(root, 'external-cache', 'images-manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const cacheIndex = JSON.parse(await readFile(cacheIndexPath, 'utf8'));
  const startOutput = path.join(root, 'public', 'exercise-media', 'accepted-exercise', 'start.webp');
  const peakOutput = path.join(root, 'public', 'exercise-media', 'accepted-exercise', 'peak.webp');

  assert.equal(result.acceptedTotal, 1);
  assert.equal(result.downloadedImages, 2);
  assert.equal(result.convertedImages, 2);
  assert.equal(result.newlyCompletedExercises, 1);
  assert.equal(result.integratedAcceptedExercises, 1);
  assert.equal(result.cachedAcceptedImages, 2);
  assert.equal(result.integratedWebpImages, 2);
  assert.equal(result.conflictSkippedExercises, 0);
  assert.equal(manifest.source.commit, FIXED_SOURCE_COMMIT);
  assert.equal(manifest.exercises['accepted-exercise'].sourceId, 'Source_One');
  assert.equal(manifest.exercises['accepted-exercise'].start.outputSha256, result.exercises[0].start?.outputSha256);
  assert.equal(manifest.exercises['accepted-exercise'].start.outputSha256, await hashFileForTest(startOutput));
  assert.equal(manifest.exercises['accepted-exercise'].peak.outputSha256, await hashFileForTest(peakOutput));
  assert.equal(Object.keys(cacheIndex.images).length, 2);
  assert.equal(report.newlyCompletedExercises, 1);
  assert.match(await readFile(markdownPath, 'utf8'), /新增完整图片动作数.*1/);
});

test('processAcceptedMedia is idempotent and skips a manifest-verified complete output without fetching or converting', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-idempotent-'));
  const bodies = new Map([
    [match.bestCandidate.startImageUrl, await jpegBuffer('#772233')],
    [match.bestCandidate.peakImageUrl, await jpegBuffer('#227755')]
  ]);
  await processAcceptedMedia(processFixture(root, (async (url) => new Response(bodies.get(String(url))!, { status: 200 })) as typeof fetch));
  const second = await processAcceptedMedia(processFixture(root, (async () => { throw new Error('repeat run must not fetch'); }) as typeof fetch));

  assert.equal(second.downloadedImages, 0);
  assert.equal(second.convertedImages, 0);
  assert.equal(second.existingSkippedExercises, 1);
  assert.equal(second.newlyCompletedExercises, 0);
  assert.equal(second.integratedAcceptedExercises, 1);
  assert.equal(second.cachedAcceptedImages, 2);
  assert.equal(second.integratedWebpImages, 2);
  assert.equal(second.failures.length, 0);
});

test('processAcceptedMedia treats pre-existing output as a conflict and does not overwrite or fetch', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-conflict-'));
  const target = path.join(root, 'public', 'exercise-media', 'accepted-exercise');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'start.webp'), 'keep-me');

  const result = await processAcceptedMedia(processFixture(root, (async () => { throw new Error('conflict must not fetch'); }) as typeof fetch));

  assert.equal(result.conflictSkippedExercises, 1);
  assert.equal(result.downloadedImages, 0);
  assert.equal(await readFile(path.join(target, 'start.webp'), 'utf8'), 'keep-me');
  assert.equal(result.exercises[0].status, 'conflict');
});

test('processAcceptedMedia skips any pre-existing complete pair without requiring a manifest and never fetches', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-existing-pair-'));
  const target = path.join(root, 'public', 'exercise-media', 'accepted-exercise');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'start.webp'), 'existing-start');
  await writeFile(path.join(target, 'peak.webp'), 'existing-peak');

  const result = await processAcceptedMedia(processFixture(root, (async () => { throw new Error('complete pair must not fetch'); }) as typeof fetch));

  assert.equal(result.existingSkippedExercises, 1);
  assert.equal(result.conflictSkippedExercises, 0);
  assert.equal(result.downloadedImages, 0);
  assert.equal(result.newlyCompletedExercises, 0);
  assert.equal(await readFile(path.join(target, 'start.webp'), 'utf8'), 'existing-start');
  assert.equal(await readFile(path.join(target, 'peak.webp'), 'utf8'), 'existing-peak');
  assert.equal(result.exercises[0].status, 'existing');
});

async function hashFileForTest(filePath: string) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}
