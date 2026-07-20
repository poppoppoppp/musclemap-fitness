import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve('public/models/posture/manifest.json');
const publicRoot = resolve(process.env.POSTURE_ASSET_PUBLIC_DIR ?? 'public');
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (error) {
  fail(`MediaPipe asset manifest is missing or invalid at ${manifestPath}. Run npm run posture:assets:download.`, error);
}

const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(resolve('package-lock.json'), 'utf8'));
const lockedPackage = packageLock.packages?.['node_modules/@mediapipe/tasks-vision'];
if (packageJson.dependencies?.['@mediapipe/tasks-vision'] !== manifest.package.version) {
  fail(`package.json must pin @mediapipe/tasks-vision to ${manifest.package.version}.`);
}
if (lockedPackage?.version !== manifest.package.version || lockedPackage?.integrity !== manifest.package.lockfileIntegrity) {
  fail('MediaPipe npm lockfile version or integrity does not match the reviewed manifest.');
}

for (const asset of [...manifest.models, ...manifest.wasm]) {
  const assetName = asset.publicPath ?? asset.packagePath;
  const path = asset.publicPath
    ? resolve(publicRoot, asset.publicPath.replace(/^\//, ''))
    : resolve('node_modules/@mediapipe/tasks-vision/wasm', asset.packagePath);
  let fileStats;
  try {
    fileStats = await stat(path);
  } catch (error) {
    fail(`Required MediaPipe asset is missing: ${assetName}. Run npm install and npm run posture:assets:download.`, error);
  }
  if (fileStats.size !== asset.bytes) fail(`MediaPipe asset size mismatch: ${assetName}. Expected ${asset.bytes}, received ${fileStats.size}.`);
  const sha256 = createHash('sha256').update(await readFile(path)).digest('hex');
  if (sha256 !== asset.sha256) fail(`MediaPipe asset SHA-256 mismatch: ${assetName}. Expected ${asset.sha256}, received ${sha256}.`);
}

process.stdout.write(`Verified ${manifest.models.length} model files and ${manifest.wasm.length} WASM assets for @mediapipe/tasks-vision ${manifest.package.version}.\n`);

function fail(message, cause) {
  const suffix = cause instanceof Error ? ` ${cause.message}` : '';
  process.stderr.write(`Posture asset verification failed: ${message}${suffix}\n`);
  process.exit(1);
}
