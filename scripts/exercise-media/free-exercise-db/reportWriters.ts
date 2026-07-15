import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { mapProjectEquipment } from './equipmentMap.ts';
import { normalizeExerciseName } from './matcher.ts';
import { createReviewPage } from './reviewPage.ts';
import type { ManualOverrides, MatchRecord, SourceMetadata } from './types.ts';

export interface ReuseGroup {
  baseMovement: string;
  exerciseIds: string[];
  recommendedSourceId: string | null;
  textOnlyDifferences: string[];
  recommendSharing: boolean;
  risk: string;
}

export function createSummary(matches: MatchRecord[], freeDbCount: number, _mediaHint?: unknown) {
  const count = (tier: MatchRecord['tier']) => matches.filter((match) => match.tier === tier).length;
  const complete = matches.filter(({ exercise }) => exercise.mediaStatus === 'complete').length;
  const partial = matches.filter(({ exercise }) => exercise.mediaStatus === 'partial').length;
  const missing = matches.filter(({ exercise }) => exercise.mediaStatus === 'missing').length;
  const exact = count('exact');
  const highConfidence = count('high-confidence');
  const total = matches.length;
  const uncovered = partial + missing;
  return {
    visibleExerciseCount: total,
    freeDbExerciseCount: freeDbCount,
    media: { complete, partial, missing },
    tiers: {
      alreadyCovered: count('already-covered'), exact, highConfidence,
      manualReview: count('manual-review'), unmatched: count('unmatched')
    },
    rates: {
      localCompleteRate: ratio(complete, total),
      directCoverageRate: ratio(complete + exact, total),
      exactAndHighConfidenceRateOfAll: ratio(exact + highConfidence, total),
      exactAndHighConfidenceRateOfUncovered: ratio(exact + highConfidence, uncovered),
      theoreticalCoverageAfterAdoption: ratio(complete + exact + highConfidence, total),
      manualReviewRate: ratio(count('manual-review'), total),
      unmatchedRate: ratio(count('unmatched'), total)
    }
  };
}

export function createMatchesCsv(matches: MatchRecord[]) {
  const headers = ['exerciseId','name','nameEn','mediaStatus','tier','confidence','sourceId','sourceName','projectEquipment','sourceEquipment','primaryMuscleCompatibility','conflictSummary','recommendedAction','startImageUrl','peakImageUrl'];
  const rows = matches.map((match) => {
    const candidate = match.bestCandidate;
    return [
      match.exercise.exerciseId, match.exercise.name, match.exercise.nameEn, match.exercise.mediaStatus, match.tier,
      match.confidence.toFixed(3), candidate?.sourceId ?? '', candidate?.sourceName ?? '', match.exercise.equipment.join(' / '),
      candidate?.sourceEquipment ?? '', candidate?.score.primaryMuscleScore.toFixed(3) ?? '',
      candidate?.score.conflicts.map(({ message }) => message).join('；') ?? '', match.recommendedAction,
      candidate?.startImageUrl ?? '', candidate?.peakImageUrl ?? ''
    ].map(csvCell).join(',');
  });
  return `\ufeff${headers.join(',')}\n${rows.join('\n')}${rows.length ? '\n' : ''}`;
}

export function createReuseGroups(matches: MatchRecord[]): ReuseGroup[] {
  const groups = new Map<string, MatchRecord[]>();
  for (const match of matches) {
    const baseMovement = reuseBase(match.exercise.nameEn);
    const equipment = [...mapProjectEquipment(match.exercise.equipment, match.exercise.nameEn)].sort().join('|');
    const key = [baseMovement, equipment, match.exercise.laterality ?? 'unspecified', positionSignature(match.exercise.nameEn)].join('::');
    const current = groups.get(key) ?? [];
    current.push(match);
    groups.set(key, current);
  }
  return [...groups.entries()].flatMap(([key, items]) => {
    if (items.length < 2) return [];
    const baseMovement = key.split('::')[0];
    const sourceCounts = new Map<string, number>();
    for (const { bestCandidate } of items) if (bestCandidate) sourceCounts.set(bestCandidate.sourceId, (sourceCounts.get(bestCandidate.sourceId) ?? 0) + 1);
    const recommendedSourceId = [...sourceCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null;
    return [{
      baseMovement,
      exerciseIds: items.map(({ exercise }) => exercise.exerciseId).sort(),
      recommendedSourceId,
      textOnlyDifferences: unique(items.flatMap(({ exercise }) => variantDifferences(exercise.nameEn))),
      recommendSharing: true,
      risk: '仅建议用于握距、把手或轻微站距变式；接入前仍需确认画面没有器械、姿态或单侧差异。'
    }];
  }).sort((left, right) => left.baseMovement.localeCompare(right.baseMovement));
}

export async function writeReports(outputDirectory: string, matches: MatchRecord[], source: SourceMetadata, overrides?: ManualOverrides) {
  await mkdir(outputDirectory, { recursive: true });
  const reuseGroups = createReuseGroups(matches);
  const summary = createSummary(matches, source.recordCount);
  const independentImageSetEstimate = estimateIndependentImageSets(matches, reuseGroups);
  const fullSummary = {
    reportVersion: '0.1', generatedAt: source.downloadedAt, source,
    thresholds: { exact: 0.95, highConfidence: 0.85, manualReview: 0.6, minimumCandidateMargin: 0.04 },
    ...summary, reuseGroupCount: reuseGroups.length, independentImageSetEstimate
  };
  const outputs: Array<[string, string]> = [
    ['summary.json', json(fullSummary)],
    ['matches.json', json(matches)],
    ['matches.csv', createMatchesCsv(matches)],
    ['reuse-groups.json', json(reuseGroups)],
    ['summary.md', createSummaryMarkdown(matches, fullSummary)],
    ['unmatched.md', createUnmatchedMarkdown(matches)],
    ['review.html', createReviewPage(matches, summary, source, overrides)]
  ];
  await Promise.all(outputs.map(([fileName, contents]) => writeFile(path.join(outputDirectory, fileName), contents, 'utf8')));
  return { summary: fullSummary, reuseGroups, outputFiles: outputs.map(([fileName]) => path.join(outputDirectory, fileName)) };
}

function createSummaryMarkdown(matches: MatchRecord[], summary: ReturnType<typeof createSummary> & { source: SourceMetadata; reuseGroupCount: number; independentImageSetEstimate: number; thresholds: Record<string, number> }) {
  const failures = conflictCounts(matches).slice(0, 5);
  const deficient = categoryCounts(matches.filter(({ tier }) => tier === 'unmatched')).slice(0, 5);
  const strong = summary.tiers.exact + summary.tiers.highConfidence;
  return `# Free Exercise DB 动作图片覆盖率与匹配报告 V0.1

## 技术摘要

MuscleMap 当前实际可见动作共 **${summary.visibleExerciseCount}** 个，其中 **${summary.media.complete}** 个已有完整本地 start/peak。对其余动作进行保守匹配后，得到 exact **${summary.tiers.exact}** 个、high-confidence **${summary.tiers.highConfidence}** 个、manual-review **${summary.tiers.manualReview}** 个、unmatched **${summary.tiers.unmatched}** 个。

exact + high-confidence 共 **${strong}** 个，占全部可见动作 **${percent(summary.rates.exactAndHighConfidenceRateOfAll)}**，占未完整覆盖动作 **${percent(summary.rates.exactAndHighConfidenceRateOfUncovered)}**。若后续复核并采用这些候选，含已有本地图的理论覆盖率为 **${percent(summary.rates.theoreticalCoverageAfterAdoption)}**。

## 覆盖与工作量

| 指标 | 数量/比例 |
| --- | ---: |
| 可见动作 | ${summary.visibleExerciseCount} |
| 本地 complete / partial / missing | ${summary.media.complete} / ${summary.media.partial} / ${summary.media.missing} |
| already-covered / exact / high-confidence | ${summary.tiers.alreadyCovered} / ${summary.tiers.exact} / ${summary.tiers.highConfidence} |
| manual-review / unmatched | ${summary.tiers.manualReview} / ${summary.tiers.unmatched} |
| 可直接覆盖比例（已有 + exact） | ${percent(summary.rates.directCoverageRate)} |
| 人工确认比例 | ${percent(summary.rates.manualReviewRate)} |
| 无候选比例 | ${percent(summary.rates.unmatchedRate)} |
| 建议共图组 | ${summary.reuseGroupCount} |
| 保守估计仍需独立图片集 | ${summary.independentImageSetEstimate} |

## 匹配方法与阈值

名称、exerciseId、明确别名、器械、主次肌群、category、force、mechanic、姿态、关键变式和单/双侧共同参与评分。exact 阈值 0.95，high-confidence 阈值 0.85，manual-review 阈值 0.60；前两名差距小于 0.04 时不能自动通过。器械、单侧、姿态、角度、关键变式、主肌群、推拉方向、深蹲/髋铰链、体态场景和图片数量冲突会阻止自动通过。

## 最常见的自动匹配阻断原因

${failures.length ? failures.map(([label, count]) => `- ${label}：${count} 条候选记录`).join('\n') : '- 没有记录到硬冲突。'}

## 最缺图的动作类别

${deficient.length ? deficient.map(([label, count]) => `- ${label}：${count} 个 unmatched`).join('\n') : '- 当前没有 unmatched 动作。'}

## 是否值得使用 Free Exercise DB

${strong > 0 ? `值得作为候选图片来源，但不适合无审核批量接入。可靠候选集中在名称、器械和肌群定义较标准的力量训练动作；体态康复、呼吸、特殊器械和细分变式仍需人工或独立制作。` : `当前自动匹配没有产生足够的可靠候选，不建议直接使用。`}

## 局限与风险

- Free Exercise DB 的 force、mechanic 和 equipment 存在空值，图片也可能存在重复或动作阶段含义差异。
- 自动评分不能判断图片中的握距、把手、身体角度和动作阶段是否完全符合 MuscleMap 文案。
- 共图分组只表示基础动作接近，不表示动作完全相同。
- 独立图片集数量是保守估计，会随 manual-review 的人工接受或拒绝而变化。

## 来源与复现

- 数据源：${summary.source.sourceUrl}
- commit：${summary.source.commit}
- SHA-256：${summary.source.sha256}
- 数据条数：${summary.source.recordCount}
- 许可证：${summary.source.license}
- 下载时间：${summary.source.downloadedAt}
- 运行命令：\`npm run media:free-db:report\`

## 下一步

先在 \`review.html\` 中审核 exact 和 high-confidence 的 start/peak 阶段是否适合，再处理 manual-review 的候选分歧；确认前不要把远程图片写入 App。
`;
}

function createUnmatchedMarkdown(matches: MatchRecord[]) {
  const categories = new Map<string, MatchRecord[]>();
  for (const match of matches.filter(({ tier }) => tier === 'unmatched')) {
    const category = unmatchedCategory(match);
    const items = categories.get(category) ?? [];
    items.push(match);
    categories.set(category, items);
  }
  const order = ['普通力量动作','自重动作','器械特殊动作','核心动作','体态康复动作','呼吸或神经类动作','其他'];
  return `# Unmatched 动作\n\n${order.map((category) => {
    const items = categories.get(category) ?? [];
    return `## ${category}（${items.length}）\n\n${items.length ? items.map(({ exercise, tierReason }) => `- **${exercise.exerciseId}** · ${exercise.name} · ${exercise.nameEn}\n  - 器械：${exercise.equipment.join(' / ') || '未标注'}\n  - 主练肌群：${exercise.primaryMuscles.join(' / ') || '未标注'}\n  - 原因：${tierReason}`).join('\n') : '- 无'}`;
  }).join('\n\n')}\n`;
}

function unmatchedCategory({ exercise }: MatchRecord) {
  const text = `${exercise.name} ${exercise.nameEn} ${exercise.tags.join(' ')}`.toLowerCase();
  if (/呼吸|神经|breath|nerve|颈椎|咀嚼|颞肌/.test(text)) return '呼吸或神经类动作';
  if (exercise.sourceType === 'posture' || exercise.category === 'posture') return '体态康复动作';
  if (exercise.primaryMuscles.some((muscle) => ['rectus-abdominis','transverse-abdominis','obliques'].includes(muscle))) return '核心动作';
  if (exercise.category === 'bodyweight' || exercise.equipment.includes('自重')) return '自重动作';
  if ([...mapProjectEquipment(exercise.equipment, exercise.nameEn)].some((item) => ['other','machine'].includes(item))) return '器械特殊动作';
  if (exercise.category === 'strength') return '普通力量动作';
  return '其他';
}

function estimateIndependentImageSets(matches: MatchRecord[], groups: ReuseGroup[]) {
  const needs = new Set(matches.filter(({ tier }) => tier === 'manual-review' || tier === 'unmatched').map(({ exercise }) => exercise.exerciseId));
  let estimate = needs.size;
  for (const group of groups.filter(({ recommendSharing }) => recommendSharing)) {
    const members = group.exerciseIds.filter((exerciseId) => needs.has(exerciseId));
    if (members.length > 1) estimate -= members.length - 1;
  }
  return estimate;
}

function conflictCounts(matches: MatchRecord[]) {
  const counts = new Map<string, number>();
  for (const match of matches) for (const conflict of match.bestCandidate?.score.conflicts ?? []) counts.set(conflict.message, (counts.get(conflict.message) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function categoryCounts(matches: MatchRecord[]) {
  const counts = new Map<string, number>();
  for (const { exercise } of matches) counts.set(exercise.category, (counts.get(exercise.category) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function reuseBase(name: string) {
  return normalizeExerciseName(name).replace(/\b(?:wide|narrow|neutral|close|reverse|underhand|overhand) grip\b/g, '').replace(/\s+/g, ' ').trim();
}
function positionSignature(name: string) { const normalized = normalizeExerciseName(name); return ['seated','standing','lying','prone','supine','kneeling','incline','decline'].filter((token) => normalized.includes(token)).join('|'); }
function variantDifferences(name: string) { const normalized = normalizeExerciseName(name); return [...normalized.matchAll(/\b(wide|narrow|neutral|close|reverse|underhand|overhand) grip\b/g)].map((match) => `${match[0]} 变式`); }
function unique(values: string[]) { return [...new Set(values)].sort(); }
function ratio(numerator: number, denominator: number) { return denominator ? Math.round(numerator / denominator * 10000) / 10000 : 0; }
function percent(value: number) { return `${(value * 100).toFixed(1)}%`; }
function json(value: unknown) { return `${JSON.stringify(value, null, 2)}\n`; }
function csvCell(value: unknown) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
