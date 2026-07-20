import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const assets = [
  {
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
    output: 'public/models/posture/pose_landmarker_full.task',
    sha256: '5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1',
  },
  {
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    output: 'public/models/posture/pose_landmarker_lite.task',
    sha256: '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a',
  },
];

for (const asset of assets) {
  const outputPath = resolve(asset.output);
  const temporaryPath = `${outputPath}.download`;
  await mkdir(dirname(outputPath), { recursive: true });
  process.stdout.write(`Downloading ${asset.url}\n`);
  const response = await fetch(asset.url, { redirect: 'error' });
  if (!response.ok) throw new Error(`Model download failed (${response.status} ${response.statusText}): ${asset.url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Model download returned an empty file: ${asset.url}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== asset.sha256) throw new Error(`Model SHA-256 mismatch for ${asset.url}. Expected ${asset.sha256}, received ${sha256}.`);
  try {
    await writeFile(temporaryPath, bytes, { flag: 'wx' });
    await rm(outputPath, { force: true });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
  process.stdout.write(`Saved ${bytes.byteLength} bytes to ${asset.output}\n`);
}
