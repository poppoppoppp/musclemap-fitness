import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type { CandidateMatch, ManualOverrides, MatchRecord } from './types.ts';

type ReviewCurlExec = (file: string, args: string[], options: { encoding: null; maxBuffer: number; signal?: AbortSignal; windowsHide: boolean }, callback: (error: Error | null, stdout: Buffer) => void) => unknown;

export type ManualReviewDecision = 'proposed-accepted' | 'proposed-forced' | 'proposed-reuse' | 'proposed-rejected' | 'unresolved';
export type ManualReviewMode = 'codex-visual-review' | 'metadata-only' | 'unresolved';

export interface ManualReviewTriageRecord {
  exerciseId: string;
  sourceId: string | null;
  decision: ManualReviewDecision;
  confidence: number;
  visualEvidence: string[];
  metadataEvidence: string[];
  differences: string[];
  risks: string[];
  alternativeCandidates: Array<{ sourceId: string; reason: string }>;
  reviewerMode: ManualReviewMode;
  contactSheetPath: string;
  batchNumber: number;
  updatedAt: string;
  baseExerciseId: string | null;
  rejectedSourceIds: string[];
}

export interface ManualReviewDecisionInput {
  exerciseId: string;
  sourceId: string | null;
  decision: ManualReviewDecision;
  visualEvidence: string[];
  differences?: string[];
  risks?: string[];
  baseExerciseId?: string | null;
  confidence?: number;
}

export interface ManualReviewTriageProgress {
  version: 1;
  sourceManualReviewCount: number;
  sourceCommit: string;
  batchSize: number;
  processedExerciseIds: string[];
  records: Record<string, ManualReviewTriageRecord>;
  updatedAt: string;
  currentBatchNumber: number;
}

export interface ManualReviewProposal {
  version: 1;
  generatedAt: string;
  sourceManualReviewCount: number;
  processedCount: number;
  proposedAccepted: Record<string, ManualReviewTriageRecord>;
  proposedForced: Record<string, ManualReviewTriageRecord>;
  proposedReuse: Record<string, ManualReviewTriageRecord>;
  proposedRejected: Record<string, ManualReviewTriageRecord>;
  unresolved: Record<string, ManualReviewTriageRecord>;
  warnings: string[];
}

export interface PreparedContactSheetExercise {
  match: MatchRecord;
  candidates: Array<{ candidate: CandidateMatch; startFile: string; peakFile: string }>;
}

export interface ManualReviewTriageSummary {
  version: 1;
  generatedAt: string;
  sourceManualReviewCount: number;
  visuallyReviewedCount: number;
  proposedAccepted: number;
  proposedForced: number;
  proposedReuse: number;
  proposedRejected: number;
  unresolved: number;
  estimatedNewMediaExercises: number;
  estimatedReuseExercises: number;
  requiresUserReview: number;
  commonConflictReasons: Array<{ reason: string; count: number }>;
  commonReuseReasons: Array<{ reason: string; count: number }>;
  contactSheets: string[];
}

export function selectManualReviewRecords(matches: MatchRecord[], overrides: ManualOverrides) {
  const records: MatchRecord[] = [];
  const excluded = { finalDecision: 0, completeMedia: 0, otherTier: 0 };
  for (const item of matches) {
    if (item.tier !== 'manual-review') {
      excluded.otherTier += 1;
      continue;
    }
    const id = item.exercise.exerciseId;
    if (overrides.accepted[id] || overrides.forced[id] || overrides.reuse[id]) {
      excluded.finalDecision += 1;
      continue;
    }
    if (item.exercise.mediaStatus === 'complete') {
      excluded.completeMedia += 1;
      continue;
    }
    records.push(item);
  }
  records.sort((left, right) => left.exercise.exerciseId.localeCompare(right.exercise.exerciseId));
  return { records, excluded };
}

export function partitionManualReview(records: MatchRecord[], batchSize = 8) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 12) throw new Error('batchSize 必须是 1 到 12 之间的整数');
  const sorted = [...records].sort((left, right) => left.exercise.exerciseId.localeCompare(right.exercise.exerciseId));
  const batches: MatchRecord[][] = [];
  for (let index = 0; index < sorted.length; index += batchSize) batches.push(sorted.slice(index, index + batchSize));
  return batches;
}

export function validateCandidateImageUrls(candidate: CandidateMatch, sourceCommit: string) {
  const expectedRoot = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${sourceCommit}/exercises/${candidate.sourceId}/`;
  if (!candidate.startImageUrl?.startsWith(expectedRoot) || !candidate.peakImageUrl?.startsWith(expectedRoot)) {
    throw new Error(`${candidate.sourceId}: 候选图片没有使用报告固定 commit`);
  }
  if (!candidate.startImageUrl.endsWith('/0.jpg')) throw new Error(`${candidate.sourceId}: start URL 必须指向 0.jpg`);
  if (!candidate.peakImageUrl.endsWith('/1.jpg')) throw new Error(`${candidate.sourceId}: peak URL 必须指向 1.jpg`);
  return { startImageUrl: candidate.startImageUrl, peakImageUrl: candidate.peakImageUrl };
}

export function createManualReviewCurlRunner(execute: ReviewCurlExec = execFile as unknown as ReviewCurlExec) {
  return (url: string, signal?: AbortSignal) => new Promise<Buffer>((resolve, reject) => {
    execute('curl.exe', [
      '--silent',
      '--show-error',
      '--fail',
      '--location',
      '--connect-timeout', '15',
      '--max-time', '120',
      url
    ], {
      encoding: null,
      maxBuffer: 25 * 1024 * 1024,
      signal,
      windowsHide: true
    }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

export async function recoverManualReviewCacheEntry(file: string, sourceUrl: string) {
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height || !metadata.format || metadata.width < 100 || metadata.height < 100) {
    throw new Error(`${file}: 缓存文件不是可用图片`);
  }
  return {
    sourceUrl,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: (await stat(file)).size,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format
  };
}

export async function seedManualReviewCacheFromMirror(sourceFile: string, cacheFile: string, sourceUrl: string) {
  const sourceRecord = await recoverManualReviewCacheEntry(sourceFile, sourceUrl);
  await mkdir(path.dirname(cacheFile), { recursive: true });
  const temporaryFile = `${cacheFile}.tmp-${randomUUID()}`;
  try {
    await writeFile(temporaryFile, await readFile(sourceFile), { flag: 'wx' });
    await rename(temporaryFile, cacheFile);
    return sourceRecord;
  } catch (error) {
    await rm(temporaryFile, { force: true }).catch(() => undefined);
    throw error;
  }
}

export function validateTriageRecord(match: MatchRecord, record: ManualReviewTriageRecord, context: { hardConflictSourceIds?: Set<string> } = {}) {
  if (record.exerciseId !== match.exercise.exerciseId) throw new Error(`${record.exerciseId} 不匹配处理范围记录`);
  if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) throw new Error(`${record.exerciseId} confidence 无效`);
  if (!record.contactSheetPath || !Number.isInteger(record.batchNumber) || record.batchNumber < 1) throw new Error(`${record.exerciseId} 缺少联系表或批次`);
  if (!record.metadataEvidence.length) throw new Error(`${record.exerciseId} 缺少 metadataEvidence`);
  const positive = record.decision === 'proposed-accepted' || record.decision === 'proposed-forced';
  if (positive && record.reviewerMode === 'metadata-only') throw new Error(`${record.exerciseId}: metadata-only 不能进入 accepted 或 forced 建议`);
  if (positive && record.reviewerMode !== 'codex-visual-review') throw new Error(`${record.exerciseId}: 正向建议必须经过 codex-visual-review`);
  if (positive && record.visualEvidence.length === 0) throw new Error(`${record.exerciseId}: 正向建议缺少视觉证据`);
  if ((positive || record.decision === 'proposed-reuse') && !record.sourceId) throw new Error(`${record.exerciseId}: 建议缺少 sourceId`);
  if (record.decision === 'proposed-reuse' && !record.baseExerciseId) throw new Error(`${record.exerciseId}: 共图建议缺少 baseExerciseId`);
  const candidate = record.sourceId ? match.topCandidates.find(({ sourceId }) => sourceId === record.sourceId) : null;
  if (positive && !candidate) throw new Error(`${record.exerciseId}: sourceId 不在前 3 候选中`);
  const hardConflict = Boolean(record.sourceId && (context.hardConflictSourceIds?.has(record.sourceId) || candidate?.score.conflicts.length));
  if (record.decision === 'proposed-accepted' && hardConflict) throw new Error(`${record.exerciseId}: 存在硬冲突，不能进入 accepted 建议`);
  if (record.decision === 'proposed-forced' && hardConflict && record.risks.length === 0) throw new Error(`${record.exerciseId}: forced 必须解释算法硬冲突为何是误报`);
  return record;
}

export function expandManualReviewDecision(match: MatchRecord, input: ManualReviewDecisionInput, batchNumber: number, contactSheetPath: string, updatedAt = new Date().toISOString()): ManualReviewTriageRecord {
  const selected = input.sourceId ? match.topCandidates.find(({ sourceId }) => sourceId === input.sourceId) ?? null : null;
  const metadataEvidence = [
    `MuscleMap: ${match.exercise.nameEn}; 器械 ${match.exercise.equipment.join(' / ') || '未标注'}; 主练 ${match.exercise.primaryMuscles.join(' / ') || '未标注'}`,
    selected ? `候选: ${selected.sourceName}; 器械 ${selected.sourceEquipment ?? '未标注'}; 主练 ${selected.sourcePrimaryMuscles.join(' / ') || '未标注'}` : '未选择单一候选',
    ...(selected?.score.keyMatches ?? [])
  ];
  const alternativeCandidates = match.topCandidates.slice(0, 3).filter(({ sourceId }) => sourceId !== input.sourceId).map((candidate) => ({
    sourceId: candidate.sourceId,
    reason: [...candidate.score.keyDifferences, ...candidate.score.conflicts.map(({ message }) => message)].join('；') || '视觉上不如选中候选贴合'
  }));
  return {
    exerciseId: input.exerciseId,
    sourceId: input.sourceId,
    decision: input.decision,
    confidence: input.confidence ?? selected?.score.finalConfidence ?? match.confidence,
    visualEvidence: [...input.visualEvidence],
    metadataEvidence,
    differences: [...(input.differences ?? selected?.score.keyDifferences ?? [])],
    risks: [...(input.risks ?? selected?.score.conflicts.map(({ message }) => message) ?? [])],
    alternativeCandidates,
    reviewerMode: input.decision === 'unresolved' ? 'unresolved' : 'codex-visual-review',
    contactSheetPath,
    batchNumber,
    updatedAt,
    baseExerciseId: input.baseExerciseId ?? null,
    rejectedSourceIds: input.decision === 'proposed-rejected' ? match.topCandidates.slice(0, 3).map(({ sourceId }) => sourceId) : []
  };
}

export function mergeTriageBatch(
  current: ManualReviewTriageProgress | null,
  scope: MatchRecord[],
  decisions: ManualReviewTriageRecord[],
  batchNumber: number,
  sourceCommit: string,
  batchSize = 8
) {
  const byId = new Map(scope.map((item) => [item.exercise.exerciseId, item]));
  const progress: ManualReviewTriageProgress = current ? structuredClone(current) : {
    version: 1,
    sourceManualReviewCount: scope.length,
    sourceCommit,
    batchSize,
    processedExerciseIds: [],
    records: {},
    updatedAt: new Date().toISOString(),
    currentBatchNumber: batchNumber
  };
  if (progress.sourceManualReviewCount !== scope.length || progress.sourceCommit !== sourceCommit) throw new Error('现有进度与当前处理范围或数据源 commit 不一致');
  for (const decision of decisions) {
    const match = byId.get(decision.exerciseId);
    if (!match) throw new Error(`${decision.exerciseId} 不在当前处理范围`);
    if (progress.records[decision.exerciseId]) throw new Error(`${decision.exerciseId} 的处理记录已存在`);
    const hardConflictSourceIds = new Set(match.topCandidates.filter(({ score }) => score.conflicts.length > 0).map(({ sourceId }) => sourceId));
    validateTriageRecord(match, { ...decision, batchNumber }, { hardConflictSourceIds });
    progress.records[decision.exerciseId] = { ...decision, batchNumber };
  }
  progress.processedExerciseIds = Object.keys(progress.records).sort();
  progress.updatedAt = new Date().toISOString();
  progress.currentBatchNumber = batchNumber;
  return progress;
}

export function buildManualReviewProposal(progress: ManualReviewTriageProgress): ManualReviewProposal {
  const proposal: ManualReviewProposal = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceManualReviewCount: progress.sourceManualReviewCount,
    processedCount: Object.keys(progress.records).length,
    proposedAccepted: {},
    proposedForced: {},
    proposedReuse: {},
    proposedRejected: {},
    unresolved: {},
    warnings: []
  };
  const bucketByDecision: Record<ManualReviewDecision, keyof Pick<ManualReviewProposal, 'proposedAccepted' | 'proposedForced' | 'proposedReuse' | 'proposedRejected' | 'unresolved'>> = {
    'proposed-accepted': 'proposedAccepted',
    'proposed-forced': 'proposedForced',
    'proposed-reuse': 'proposedReuse',
    'proposed-rejected': 'proposedRejected',
    unresolved: 'unresolved'
  };
  for (const [exerciseId, record] of Object.entries(progress.records).sort(([left], [right]) => left.localeCompare(right))) {
    proposal[bucketByDecision[record.decision]][exerciseId] = record;
  }
  if (proposal.processedCount !== proposal.sourceManualReviewCount) proposal.warnings.push(`尚有 ${proposal.sourceManualReviewCount - proposal.processedCount} 条未完成视觉复核`);
  return proposal;
}

export function buildManualReviewTriageSummary(proposal: ManualReviewProposal, contactSheets: string[]): ManualReviewTriageSummary {
  const proposedAccepted = Object.keys(proposal.proposedAccepted).length;
  const proposedForced = Object.keys(proposal.proposedForced).length;
  const proposedReuse = Object.keys(proposal.proposedReuse).length;
  const proposedRejected = Object.keys(proposal.proposedRejected).length;
  const unresolved = Object.keys(proposal.unresolved).length;
  const allRecords = Object.values({ ...proposal.proposedAccepted, ...proposal.proposedForced, ...proposal.proposedReuse, ...proposal.proposedRejected, ...proposal.unresolved });
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceManualReviewCount: proposal.sourceManualReviewCount,
    visuallyReviewedCount: allRecords.filter(({ reviewerMode }) => reviewerMode === 'codex-visual-review' || reviewerMode === 'unresolved').length,
    proposedAccepted,
    proposedForced,
    proposedReuse,
    proposedRejected,
    unresolved,
    estimatedNewMediaExercises: proposedAccepted + proposedForced,
    estimatedReuseExercises: proposedReuse,
    requiresUserReview: proposedAccepted + proposedForced + proposedReuse + unresolved,
    commonConflictReasons: mostCommon(allRecords.flatMap(({ risks, differences }) => [...risks, ...differences])),
    commonReuseReasons: mostCommon(Object.values(proposal.proposedReuse).flatMap(({ visualEvidence, differences }) => [...visualEvidence, ...differences])),
    contactSheets: [...contactSheets]
  };
}

export async function createManualReviewContactSheet(outputFile: string, exercises: PreparedContactSheetExercise[], batchNumber: number) {
  const width = 2400;
  const headerHeight = 120;
  const rowHeight = 1020;
  const height = headerHeight + Math.max(1, exercises.length) * rowHeight;
  const composites: sharp.OverlayOptions[] = [{ input: svgText(width, height, exercises, batchNumber), top: 0, left: 0 }];
  for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
    const top = headerHeight + exerciseIndex * rowHeight + 320;
    for (let candidateIndex = 0; candidateIndex < exercises[exerciseIndex].candidates.length; candidateIndex += 1) {
      const prepared = exercises[exerciseIndex].candidates[candidateIndex];
      const left = 40 + candidateIndex * 780;
      const [start, peak] = await Promise.all([
        imageTile(prepared.startFile, 350, 360),
        imageTile(prepared.peakFile, 350, 360)
      ]);
      composites.push({ input: start, top, left });
      composites.push({ input: peak, top, left: left + 370 });
    }
  }
  await mkdir(path.dirname(outputFile), { recursive: true });
  await sharp({ create: { width, height, channels: 3, background: '#f4f5f7' } })
    .composite(composites)
    .webp({ quality: 90 })
    .toFile(outputFile);
  return { width, height, exerciseCount: exercises.length };
}

export function createManualReviewFinalCheckPage(proposal: ManualReviewProposal, matches: MatchRecord[], imageDataUrls: Record<string, string>) {
  const byId = Object.fromEntries(matches.map((item) => [item.exercise.exerciseId, item]));
  const records = Object.values({ ...proposal.proposedAccepted, ...proposal.proposedForced, ...proposal.proposedReuse, ...proposal.proposedRejected, ...proposal.unresolved }).map((record) => {
    const match = byId[record.exerciseId];
    const candidate = match?.topCandidates.find(({ sourceId }) => sourceId === record.sourceId) ?? null;
    return {
      ...record,
      exercise: match?.exercise ?? null,
      candidate,
      startDataUrl: record.sourceId ? imageDataUrls[`${record.exerciseId}/${record.sourceId}/0`] ?? candidate?.startImageUrl ?? null : null,
      peakDataUrl: record.sourceId ? imageDataUrls[`${record.exerciseId}/${record.sourceId}/1`] ?? candidate?.peakImageUrl ?? null : null
    };
  });
  const payload = jsonForHtml({ records, proposalGeneratedAt: proposal.generatedAt });
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manual Review Final Check</title><style>
  :root{font-family:Inter,"Microsoft YaHei",system-ui,sans-serif;color:#182133;background:#eef1f5}*{box-sizing:border-box}body{margin:0}.bar{position:sticky;top:0;z-index:2;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:12px 20px;background:#182133;color:#fff}.actions,.filters{display:flex;gap:8px;flex-wrap:wrap}button,label{font:inherit}button{border:1px solid #b8c0ce;border-radius:8px;background:#fff;padding:8px 11px;cursor:pointer}.page{max-width:1500px;margin:auto;padding:18px}.card{background:#fff;border:1px solid #ccd3df;border-radius:14px;overflow:hidden}.head{display:grid;grid-template-columns:1.2fr 1fr;gap:18px;padding:18px}.head h1{margin:0 0 6px;font-size:1.35rem}.muted{color:#657084;font-size:.82rem}.images{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#ccd3df}.stage{background:#f7f8fa;padding:12px}.stage img{display:block;width:100%;height:520px;object-fit:contain;background:#fff}.stage b{display:block;margin-bottom:8px}.evidence{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px}.box{background:#f4f6f9;border-radius:9px;padding:10px;font-size:.8rem;line-height:1.5}.nav{display:flex;justify-content:space-between;margin-top:12px}.pill{display:inline-block;border-radius:999px;padding:4px 8px;background:#e8edf7;font-size:.75rem;font-weight:700}.empty{padding:80px;text-align:center;color:#657084}@media(max-width:700px){.head,.images,.evidence{grid-template-columns:1fr}.stage img{height:360px}}
  </style></head><body data-page="manual-review-final-check"><div class="bar"><div><b>人工复核精简包</b> <span id="position"></span></div><div class="filters"><label><input type="checkbox" value="proposed-accepted" checked> accepted</label><label><input type="checkbox" value="proposed-forced" checked> forced</label><label><input type="checkbox" value="proposed-reuse" checked> reuse</label><label><input type="checkbox" value="proposed-rejected"> rejected</label><label><input type="checkbox" value="unresolved"> unresolved</label></div><div class="actions"><button id="confirm">确认建议</button><button id="reject">改为拒绝</button><button id="unresolved">标记 unresolved</button><button id="export">导出审核结果</button></div></div><main class="page"><section id="record"></section><div class="nav"><button id="previous">上一条</button><button id="next">下一条</button></div></main><script>
  const payload=${payload};const STORAGE='musclemap.manualReviewFinalCheck.v1';let decisions=JSON.parse(localStorage.getItem(STORAGE)||'{}');let current=0;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const selected=()=>new Set([...document.querySelectorAll('.filters input:checked')].map(x=>x.value));const visible=()=>payload.records.filter(x=>selected().has(x.decision));
  function render(){const list=visible();if(!list.length){record.innerHTML='<div class="empty">当前筛选没有记录</div>';position.textContent='0 / 0';return}current=Math.min(current,list.length-1);const x=list[current],e=x.exercise||{},c=x.candidate||{};position.textContent=(current+1)+' / '+list.length;record.innerHTML='<article class="card"><div class="head"><div><span class="pill">'+esc(x.decision)+'</span><h1>'+esc(e.name)+'</h1><div class="muted">'+esc(x.exerciseId)+' · '+esc(e.nameEn)+'<br>器械：'+esc((e.equipment||[]).join(' / '))+' · 主练：'+esc((e.primaryMuscles||[]).join(' / '))+'</div></div><div><b>'+esc(c.sourceName||x.sourceId||'无选中候选')+'</b><div class="muted">'+esc(x.sourceId||'')+'<br>Codex 建议仅供复核，不会写入 manual-overrides.json<br>当前用户决定：'+esc(decisions[x.exerciseId]||'未处理')+'</div></div></div><div class="images"><div class="stage"><b>start</b>'+(x.startDataUrl?'<img src="'+esc(x.startDataUrl)+'">':'无图')+'</div><div class="stage"><b>peak</b>'+(x.peakDataUrl?'<img src="'+esc(x.peakDataUrl)+'">':'无图')+'</div></div><div class="evidence"><div class="box"><b>视觉证据</b><br>'+esc(x.visualEvidence.join('；'))+'</div><div class="box"><b>差异</b><br>'+esc(x.differences.join('；')||'无')+'</div><div class="box"><b>风险</b><br>'+esc(x.risks.join('；')||'无')+'</div></div></article>'}
  function decide(value){const x=visible()[current];if(!x)return;decisions[x.exerciseId]=value;localStorage.setItem(STORAGE,JSON.stringify(decisions));render();move(1)}function move(delta){const n=visible().length;if(!n)return;current=(current+delta+n)%n;render()}
  confirm.onclick=()=>decide('confirmed');reject.onclick=()=>decide('rejected');unresolved.onclick=()=>decide('unresolved');previous.onclick=()=>move(-1);next.onclick=()=>move(1);document.querySelectorAll('.filters input').forEach(x=>x.onchange=()=>{current=0;render()});export.onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),decisions},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='manual-review-final-check-results.json';a.click();URL.revokeObjectURL(a.href)};addEventListener('keydown',e=>{if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1)});render();
  </script></body></html>`;
}

function svgText(width: number, height: number, exercises: PreparedContactSheetExercise[], batchNumber: number) {
  const lines: string[] = [`<rect width="${width}" height="${height}" fill="#f4f5f7"/>`, `<text x="40" y="74" class="title">Manual Review Batch ${String(batchNumber).padStart(2, '0')} · ${exercises.length} exercises</text>`];
  exercises.forEach(({ match, candidates }, exerciseIndex) => {
    const y = 120 + exerciseIndex * 1020;
    const exercise = match.exercise;
    lines.push(`<rect x="20" y="${y + 10}" width="2360" height="990" rx="16" fill="#fff" stroke="#c8ced8"/>`);
    lines.push(`<text x="42" y="${y + 58}" class="exercise">${escapeXml(exercise.exerciseId)} · ${escapeXml(exercise.name)} · ${escapeXml(exercise.nameEn)}</text>`);
    lines.push(`<text x="42" y="${y + 94}" class="meta">器械 ${escapeXml(exercise.equipment.join(' / ') || '未标注')}　主练 ${escapeXml(exercise.primaryMuscles.join(' / ') || '未标注')}　次要 ${escapeXml(exercise.secondaryMuscles.join(' / ') || '未标注')}</text>`);
    candidates.forEach(({ candidate }, candidateIndex) => {
      const x = 40 + candidateIndex * 780;
      lines.push(`<rect x="${x}" y="${y + 120}" width="740" height="850" rx="12" fill="#f8f9fb" stroke="#d8dde5"/>`);
      lines.push(`<text x="${x + 18}" y="${y + 158}" class="candidate">#${candidateIndex + 1} ${escapeXml(candidate.sourceName)}</text>`);
      lines.push(`<text x="${x + 18}" y="${y + 190}" class="small">${escapeXml(candidate.sourceId)} · ${escapeXml(candidate.sourceEquipment ?? '未标注')} · confidence ${candidate.score.finalConfidence.toFixed(3)}</text>`);
      addWrapped(lines, `一致：${candidate.score.keyMatches.join('；') || '无'}`, x + 18, y + 224, 54, 'match');
      addWrapped(lines, `差异：${candidate.score.keyDifferences.join('；') || '无'}`, x + 18, y + 270, 54, 'difference');
      addWrapped(lines, `硬冲突：${candidate.score.conflicts.map(({ message }) => message).join('；') || '无'}`, x + 18, y + 316, 54, candidate.score.conflicts.length ? 'conflict' : 'small');
      lines.push(`<text x="${x + 18}" y="${y + 720}" class="label">start</text><text x="${x + 388}" y="${y + 720}" class="label">peak</text>`);
      addWrapped(lines, `主练 ${candidate.sourcePrimaryMuscles.join(' / ')}　次要 ${candidate.sourceSecondaryMuscles.join(' / ') || '无'}`, x + 18, y + 764, 58, 'small');
    });
  });
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><style>.title{font:700 36px "Microsoft YaHei",sans-serif;fill:#172033}.exercise{font:700 27px "Microsoft YaHei",sans-serif;fill:#172033}.meta{font:22px "Microsoft YaHei",sans-serif;fill:#536074}.candidate{font:700 24px "Microsoft YaHei",sans-serif;fill:#24334a}.small{font:19px "Microsoft YaHei",sans-serif;fill:#5d6879}.match{font:19px "Microsoft YaHei",sans-serif;fill:#176445}.difference{font:19px "Microsoft YaHei",sans-serif;fill:#7a5514}.conflict{font:700 19px "Microsoft YaHei",sans-serif;fill:#9a3038}.label{font:700 20px "Microsoft YaHei",sans-serif;fill:#24334a}</style>${lines.join('')}</svg>`);
}

function addWrapped(lines: string[], value: string, x: number, y: number, maxCharacters: number, className: string) {
  const chunks = wrapText(value, maxCharacters).slice(0, 2);
  lines.push(`<text x="${x}" y="${y}" class="${className}">${chunks.map((chunk, index) => `<tspan x="${x}" dy="${index ? 24 : 0}">${escapeXml(chunk)}</tspan>`).join('')}</text>`);
}

function wrapText(value: string, maxCharacters: number) {
  const result: string[] = [];
  for (let index = 0; index < value.length; index += maxCharacters) result.push(value.slice(index, index + maxCharacters));
  return result.length ? result : [''];
}

function imageTile(file: string, width: number, height: number) {
  return sharp(file).rotate().resize({ width, height, fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).png().toBuffer();
}

function escapeXml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character] ?? character));
}

function jsonForHtml(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason)).slice(0, 10);
}
