import { access } from 'node:fs/promises';
import path from 'node:path';

import { findMatchedAlias } from './aliases.ts';
import { equipmentCompatibility, mapProjectEquipment } from './equipmentMap.ts';
import { mapProjectMuscles, muscleCompatibility } from './muscleMap.ts';
import type { AppExerciseRecord, CandidateMatch, FreeDbExercise, ManualOverrides, MatchConflict, MatchRecord, MatchTier, MediaStatus, ScoreBreakdown } from './types.ts';

const insignificantTokens = new Set(['exercise', 'movement']);
const movementTokens = new Set(['press', 'row', 'curl', 'raise', 'fly', 'pulldown', 'pullup', 'pushup', 'squat', 'lunge', 'deadlift', 'extension', 'flexion', 'crunch', 'plank', 'bridge', 'dip', 'shrug', 'rotation', 'stretch', 'roll']);
const positionModifiers = ['seated', 'standing', 'lying', 'prone', 'supine', 'kneeling'] as const;
const angleModifiers = ['incline', 'decline'] as const;
const variantModifiers = [
  'split', 'wide', 'narrow', 'neutral', 'reverse', 'close', 'rear', 'behind', 'deficit',
  'front', 'straight', 'overhead', 'rope', 'guillotine', 'military'
] as const;

export function normalizeExerciseName(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/(?:one|single)[\s_-]*arm/g, 'singlearm')
    .replace(/(?:one|single)[\s_-]*leg/g, 'singleleg')
    .replace(/pull[\s_-]*up/g, 'pullup')
    .replace(/push[\s_-]*up/g, 'pushup')
    .replace(/sit[\s_-]*up/g, 'situp')
    .replace(/\bdb\b/g, 'dumbbell')
    .replace(/\bbb\b/g, 'barbell')
    .replace(/body[\s_-]*weight/g, 'bodyweight')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token && !insignificantTokens.has(token))
    .join(' ');
}

export async function getMediaStatus(projectRoot: string, exerciseId: string): Promise<MediaStatus> {
  const base = path.join(projectRoot, 'public', 'exercise-media', exerciseId);
  const [hasStart, hasPeak] = await Promise.all([
    fileExists(path.join(base, 'start.webp')),
    fileExists(path.join(base, 'peak.webp'))
  ]);
  if (hasStart && hasPeak) return 'complete';
  if (hasStart || hasPeak) return 'partial';
  return 'missing';
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function detectHardConflicts(project: Pick<AppExerciseRecord, 'nameEn' | 'equipment' | 'primaryMuscles' | 'category' | 'force' | 'laterality'>, source: FreeDbExercise): MatchConflict[] {
  const conflicts: MatchConflict[] = [];
  const projectName = normalizeExerciseName(project.nameEn);
  const sourceName = normalizeExerciseName(`${source.name} ${source.id}`);
  const projectEquipment = mapProjectEquipment(project.equipment, project.nameEn);
  if (equipmentCompatibility(projectEquipment, source.equipment) === 0) {
    conflicts.push({ code: 'equipment', message: `器械冲突：${[...projectEquipment].join('/')} ≠ ${source.equipment ?? 'unknown'}` });
  }

  const projectLaterality = inferLaterality(projectName, project.laterality);
  const sourceLaterality = inferLaterality(sourceName, null);
  if (projectLaterality !== sourceLaterality && (projectLaterality !== null || sourceLaterality !== null)) {
    conflicts.push({ code: 'laterality', message: `侧别/交替方式不一致：${projectLaterality ?? '未注明'} ≠ ${sourceLaterality ?? '未注明'}` });
  }

  addModifierSetConflict(conflicts, 'position', '身体姿态', projectName, sourceName, positionModifiers);
  addModifierSetConflict(conflicts, 'angle', '凳面角度', projectName, sourceName, angleModifiers);
  addModifierSetConflict(conflicts, 'variant', '关键变式', projectName, sourceName, variantModifiers);

  const projectPrimary = mapProjectMuscles(project.primaryMuscles);
  if (projectPrimary.size > 0 && source.primaryMuscles.length > 0 && muscleCompatibility(projectPrimary, source.primaryMuscles) === 0) {
    conflicts.push({ code: 'primary-muscle', message: `主练肌群冲突：${[...projectPrimary].join('/')} ≠ ${source.primaryMuscles.join('/')}` });
  }
  if ((project.force === 'push' || project.force === 'pull') && source.force && project.force !== source.force) {
    conflicts.push({ code: 'force', message: `发力方向冲突：${project.force} ≠ ${source.force}` });
  }
  const projectIsSquat = projectName.includes('squat');
  const sourceIsSquat = sourceName.includes('squat');
  const projectIsHinge = projectName.includes('deadlift') || projectName.includes('good morning');
  const sourceIsHinge = sourceName.includes('deadlift') || sourceName.includes('good morning');
  if ((projectIsSquat && sourceIsHinge) || (projectIsHinge && sourceIsSquat)) {
    conflicts.push({ code: 'movement-pattern', message: '深蹲与髋铰链动作模式冲突' });
  }
  if (project.category === 'posture') {
    conflicts.push({ code: 'posture-context', message: '体态/康复动作不能自动映射为普通训练动作' });
  }
  if (source.images.length < 2) {
    conflicts.push({ code: 'images', message: `候选图片不足两张：${source.images.length}` });
  }
  return conflicts;
}

function inferLaterality(name: string, explicit: string | null): 'unilateral' | 'bilateral' | 'alternating' | null {
  if (explicit === 'unilateral' || name.includes('singlearm') || name.includes('singleleg') || hasPhrase(name, 'one hand')) return 'unilateral';
  if (explicit === 'alternating' || hasToken(name, 'alternating')) return 'alternating';
  if (explicit === 'bilateral') return 'bilateral';
  return null;
}

function addModifierSetConflict(
  conflicts: MatchConflict[],
  code: 'position' | 'angle' | 'variant',
  label: string,
  projectName: string,
  sourceName: string,
  modifiers: readonly string[]
) {
  const projectValues = modifiers.filter((modifier) => hasToken(projectName, modifier));
  const sourceValues = modifiers.filter((modifier) => hasToken(sourceName, modifier));
  if (projectValues.join('|') !== sourceValues.join('|')) {
    conflicts.push({ code, message: `${label}不一致：${projectValues.join('/') || '未注明'} ≠ ${sourceValues.join('/') || '未注明'}` });
  }
}

function hasToken(name: string, token: string) {
  return name.split(' ').includes(token);
}

function hasPhrase(name: string, phrase: string) {
  return ` ${name} `.includes(` ${phrase} `);
}

export function scoreCandidate(project: Pick<AppExerciseRecord, 'exerciseId' | 'nameEn' | 'equipment' | 'primaryMuscles' | 'secondaryMuscles' | 'category' | 'force' | 'mechanic' | 'laterality'>, source: FreeDbExercise): ScoreBreakdown {
  const projectNames = [normalizeExerciseName(project.nameEn), normalizeExerciseName(project.exerciseId)];
  const sourceNames = [normalizeExerciseName(source.name), normalizeExerciseName(source.id)];
  const matchedAlias = projectNames.flatMap((left) => sourceNames.map((right) => findMatchedAlias(left, right))).find(Boolean) ?? null;
  const nameScore = projectNames.some((name) => sourceNames.includes(name)) ? 1 : matchedAlias ? 0.97 : Math.max(...projectNames.flatMap((left) => sourceNames.map((right) => tokenSimilarity(left, right))));
  const projectEquipment = mapProjectEquipment(project.equipment, project.nameEn);
  const equipmentScore = equipmentCompatibility(projectEquipment, source.equipment);
  const primaryMuscleScore = muscleCompatibility(mapProjectMuscles(project.primaryMuscles), source.primaryMuscles);
  const secondaryMuscleScore = muscleCompatibility(mapProjectMuscles(project.secondaryMuscles), source.secondaryMuscles);
  const attributeParts = [
    project.force && source.force ? Number(project.force === source.force) : 0.5,
    project.mechanic && source.mechanic ? Number(project.mechanic === source.mechanic) : 0.5,
    categoryCompatibility(project.category, source.category)
  ];
  const attributeScore = average(attributeParts);
  const conflicts = detectHardConflicts(project, source);
  const conflictPenalty = Math.min(0.65, conflicts.length * 0.18);
  const weighted = nameScore * 0.45 + equipmentScore * 0.2 + primaryMuscleScore * 0.2 + secondaryMuscleScore * 0.05 + attributeScore * 0.1;
  const finalConfidence = clamp(round(weighted - conflictPenalty));
  const keyMatches = [
    ...(nameScore >= 0.95 ? ['名称或明确别名一致'] : []),
    ...(equipmentScore === 1 ? ['器械一致'] : []),
    ...(primaryMuscleScore > 0 ? ['主练肌群兼容'] : []),
    ...(attributeScore >= 0.8 ? ['动作属性兼容'] : [])
  ];
  const keyDifferences = [
    ...(nameScore < 0.95 ? ['名称不是精确或明确别名匹配'] : []),
    ...(equipmentScore < 1 ? ['器械分类不完全一致'] : []),
    ...(primaryMuscleScore < 1 ? ['主练肌群映射不完全一致'] : []),
    ...(attributeScore < 0.8 ? ['动作属性存在差异'] : [])
  ];

  return {
    nameScore: round(nameScore), equipmentScore: round(equipmentScore), primaryMuscleScore: round(primaryMuscleScore),
    secondaryMuscleScore: round(secondaryMuscleScore), attributeScore: round(attributeScore), conflictPenalty: round(conflictPenalty),
    finalConfidence, matchedAlias, keyMatches, keyDifferences, conflicts
  };
}

export function determineTier(mediaStatus: MediaStatus, candidates: CandidateMatch[]): { tier: MatchTier; confidence: number; reason: string } {
  if (mediaStatus === 'complete') return { tier: 'already-covered', confidence: 1, reason: '本地 start.webp 和 peak.webp 均已存在' };
  const best = candidates[0];
  if (!best) return { tier: 'unmatched', confidence: 0, reason: '没有合理候选' };
  const confidence = best.score.finalConfidence;
  const margin = confidence - (candidates[1]?.score.finalConfidence ?? 0);
  const hasHardConflict = best.score.conflicts.length > 0;

  if (!hasHardConflict && margin >= 0.04 && confidence >= 0.95 && best.score.nameScore >= 0.95) {
    return { tier: 'exact', confidence, reason: '名称或明确别名、器械、主练肌群和动作属性一致，且候选唯一领先' };
  }
  if (!hasHardConflict && margin >= 0.04 && confidence >= 0.85) {
    return { tier: 'high-confidence', confidence, reason: '多项匹配信号一致，无硬性冲突，且候选领先' };
  }
  if (confidence >= 0.6 || margin < 0.04 && confidence >= 0.55) {
    const reason = hasHardConflict
      ? `存在硬性冲突，需要人工确认：${best.score.conflicts.map(({ message }) => message).join('；')}`
      : margin < 0.04 ? '前两名候选得分过于接近，需要人工确认' : '候选相似但不足以自动通过';
    return { tier: 'manual-review', confidence, reason };
  }
  return { tier: 'unmatched', confidence, reason: hasHardConflict ? '所有合理候选均存在硬性冲突或置信度不足' : '最佳候选置信度低于 0.60' };
}

export function buildMatchRecord(project: AppExerciseRecord, sources: FreeDbExercise[], commit: string, overrides: ManualOverrides): MatchRecord {
  const rejected = new Set(overrides.rejected[project.exerciseId] ?? []);
  const reuseDecision = overrides.reuse?.[project.exerciseId] ?? null;
  const overrideStatus = overrides.forced[project.exerciseId]
    ? 'forced'
    : overrides.accepted[project.exerciseId] ? 'accepted' : reuseDecision ? 'reuse' : null;
  const preferredSourceId = overrides.forced[project.exerciseId] ?? overrides.accepted[project.exerciseId] ?? reuseDecision?.sourceId ?? null;
  const activeSources = sources.filter((source) => !rejected.has(source.id) || source.id === preferredSourceId);
  const ranked = activeSources
    .map((source) => toCandidate(project, source, commit))
    .sort((left, right) => {
      if (preferredSourceId) {
        if (left.sourceId === preferredSourceId) return -1;
        if (right.sourceId === preferredSourceId) return 1;
      }
      return right.score.finalConfidence - left.score.finalConfidence || left.sourceId.localeCompare(right.sourceId);
    });
  const topCandidates = ranked.slice(0, 3);
  const rejectedCandidates = sources
    .filter((source) => rejected.has(source.id) && source.id !== preferredSourceId)
    .map((source) => toCandidate(project, source, commit, true))
    .sort((left, right) => right.score.finalConfidence - left.score.finalConfidence || left.sourceId.localeCompare(right.sourceId));
  const appliedOverride = overrideStatus && preferredSourceId ? `${overrideStatus}:${preferredSourceId}` : null;
  let classification = determineTier(project.mediaStatus, topCandidates);
  if (overrideStatus === 'accepted' && topCandidates[0]?.sourceId === preferredSourceId) {
    classification = { ...classification, reason: `人工 accepted：${preferredSourceId}；原判定 ${classification.tier}` };
  } else if (overrideStatus === 'forced' && topCandidates[0]?.sourceId === preferredSourceId) {
    classification = { tier: 'manual-review', confidence: topCandidates[0].score.finalConfidence, reason: `人工 forced 指定：${preferredSourceId}` };
  } else if (overrideStatus === 'reuse' && topCandidates[0]?.sourceId === preferredSourceId) {
    classification = { tier: 'manual-review', confidence: topCandidates[0].score.finalConfidence, reason: `人工标记使用 ${reuseDecision?.baseExerciseId} 的基础动作图片：${reuseDecision?.differences || '未填写差异说明'}` };
  }

  return {
    exercise: project,
    tier: classification.tier,
    confidence: classification.confidence,
    tierReason: classification.reason,
    bestCandidate: topCandidates[0] ?? null,
    topCandidates,
    rejectedCandidates,
    recommendedAction: overrideStatus === 'accepted'
      ? '按人工接受结果进入后续接入清单'
      : overrideStatus === 'forced' ? '按人工强制结果处理，但保留全部冲突与风险'
        : overrideStatus === 'reuse' ? `复用 ${reuseDecision?.baseExerciseId} 的基础图片并保留文字差异说明`
          : recommendedAction(classification.tier),
    appliedOverride,
    overrideStatus,
    reuseDecision,
    note: overrides.notes?.[project.exerciseId] ?? null
  };
}

function toCandidate(project: AppExerciseRecord, source: FreeDbExercise, commit: string, humanRejected = false): CandidateMatch {
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceEquipment: source.equipment,
    sourcePrimaryMuscles: [...source.primaryMuscles],
    sourceSecondaryMuscles: [...source.secondaryMuscles],
    sourceCategory: source.category,
    sourceForce: source.force,
    sourceMechanic: source.mechanic,
    imageCount: source.images.length,
    startImageUrl: source.images[0] ? rawImageUrl(commit, source.images[0]) : null,
    peakImageUrl: source.images[1] ? rawImageUrl(commit, source.images[1]) : null,
    humanRejected,
    score: scoreCandidate(project, source)
  };
}

function rawImageUrl(commit: string, imagePath: string) {
  const encodedPath = imagePath.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${commit}/exercises/${encodedPath}`;
}

function recommendedAction(tier: MatchTier) {
  if (tier === 'already-covered') return '保留现有本地 start/peak，无需下载';
  if (tier === 'exact') return '可列入后续高优先级图片接入清单';
  if (tier === 'high-confidence') return '接入前快速人工复核动作细节';
  if (tier === 'manual-review') return '在 review.html 对比前三候选后再决定';
  return '保留为独立制图或补充其他数据源';
}

function tokenSimilarity(left: string, right: string) {
  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  if (union === 0) return 0;
  const jaccard = intersection / union;
  const leftMovements = [...leftTokens].filter((token) => movementTokens.has(token));
  const rightMovements = new Set([...rightTokens].filter((token) => movementTokens.has(token)));
  const movementMatch = leftMovements.length === 0 || leftMovements.some((token) => rightMovements.has(token));
  return movementMatch ? Math.min(0.94, 0.15 + jaccard * 0.85) : jaccard * 0.45;
}

function categoryCompatibility(projectCategory: string, sourceCategory: string) {
  if (projectCategory === 'posture') return sourceCategory === 'stretching' ? 0.55 : 0.2;
  if (projectCategory === sourceCategory) return 1;
  if (projectCategory === 'bodyweight' && sourceCategory === 'strength') return 0.9;
  if (projectCategory === 'activation' && ['strength', 'stretching'].includes(sourceCategory)) return 0.7;
  return 0.5;
}

function average(values: number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function round(value: number) { return Math.round(value * 1000) / 1000; }
function clamp(value: number) { return Math.max(0, Math.min(1, value)); }
