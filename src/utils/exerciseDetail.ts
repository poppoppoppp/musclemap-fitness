import { exercises, getExerciseById } from '../data/exercises';
import { getMuscleById } from '../data/muscles';
import type {
  Exercise,
  ExerciseAlternativeDetail,
  ExerciseInstructions,
  ExerciseLaterality,
  ExerciseTroubleshootingItem
} from '../types/exercise';

export type ExerciseMediaPhase = 'start' | 'peak';

export interface ResolvedExerciseAlternative extends ExerciseAlternativeDetail {
  muscleId?: string;
  matchType: 'primary' | 'secondary' | 'related';
}

export interface ResolvedExerciseDetail {
  primaryRegion: string;
  equipment: string;
  laterality: ExerciseLaterality;
  lateralityLabel: string;
  media: {
    startImage: string;
    peakImage: string;
    startCaption: string;
    peakCaption: string;
    returnCaption: string;
  };
  keyCues: string[];
  troubleshooting: ExerciseTroubleshootingItem[];
  instructions: ExerciseInstructions;
  breathing: string;
  primaryMuscleNames: string[];
  secondaryMuscleNames: string[];
  alternatives: ResolvedExerciseAlternative[];
}

const REGION_TAGS = ['胸部', '背部', '肩部', '手臂', '腿部', '核心', '全身'];

const DEFAULT_TROUBLESHOOTING: ExerciseTroubleshootingItem[] = [
  {
    id: 'unstable-position',
    title: '动作不稳定',
    quickFix: '减轻负荷，先固定姿势',
    causes: ['当前负荷过大', '起始姿势不稳定'],
    fixes: ['降低当前负荷', '放慢速度并缩小幅度'],
    image: null
  },
  {
    id: 'target-not-felt',
    title: '目标部位没感觉',
    quickFix: '放慢动作，关注发力部位',
    causes: ['动作速度过快', '辅助部位代偿'],
    fixes: ['降低重量', '在顶峰短暂停顿'],
    image: null
  },
  {
    id: 'breathing-disrupted',
    title: '呼吸不顺',
    quickFix: '降低强度，恢复均匀呼吸',
    causes: ['不自觉憋气', '动作节奏过快'],
    fixes: ['在发力阶段呼气', '每次重复保持稳定节奏'],
    image: null
  }
];

export function getExerciseMediaPath(exerciseId: string, phase: ExerciseMediaPhase) {
  return `/exercise-media/${exerciseId}/${phase}.webp`;
}

export function resolveExerciseDetail(exercise: Exercise, currentMuscleId?: string): ResolvedExerciseDetail {
  const laterality = exercise.laterality ?? inferLaterality(exercise);
  const primaryRegion = exercise.primaryRegion ?? resolvePrimaryRegion(exercise);
  const instructions = exercise.instructions ?? resolveInstructions(exercise);
  const troubleshooting = exercise.troubleshooting?.length
    ? exercise.troubleshooting.map(cloneTroubleshooting)
    : resolveTroubleshooting(exercise);

  return {
    primaryRegion,
    equipment: exercise.equipment[0] ?? '自重',
    laterality,
    lateralityLabel: formatLaterality(laterality),
    media: {
      startImage: exercise.media?.startImage ?? getExerciseMediaPath(exercise.id, 'start'),
      peakImage: exercise.media?.peakImage ?? getExerciseMediaPath(exercise.id, 'peak'),
      startCaption: exercise.media?.startCaption ?? exercise.steps[0] ?? '保持稳定，准备开始动作',
      peakCaption: exercise.media?.peakCaption ?? exercise.steps[1] ?? exercise.cues[0] ?? '以可控幅度完成发力',
      returnCaption: exercise.media?.returnCaption ?? exercise.steps[2] ?? '保持控制，缓慢返回起始位置'
    },
    keyCues: resolveKeyCues(exercise),
    troubleshooting,
    instructions,
    breathing: exercise.breathing ?? exercise.postureDetails?.breathing ?? '发力时呼气，还原时吸气，避免长时间憋气。',
    primaryMuscleNames: exercise.primaryMuscles.length ? exercise.primaryMuscles.map(formatMuscle) : [primaryRegion === '全身' ? '全身协调' : primaryRegion],
    secondaryMuscleNames: exercise.secondaryMuscles.map(formatMuscle),
    alternatives: resolveAlternatives(exercise, currentMuscleId)
  };
}

function resolvePrimaryRegion(exercise: Exercise) {
  return exercise.tags.find((tag) => REGION_TAGS.includes(tag)) ?? getMuscleById(exercise.primaryMuscles[0])?.bodyPart ?? '全身';
}

function inferLaterality(exercise: Exercise): ExerciseLaterality {
  const source = `${exercise.name} ${exercise.tags.join(' ')}`;
  if (/单臂|单侧|单手|单腿|单脚/.test(source)) return 'unilateral';
  if (/交替/.test(source)) return 'alternating';
  return 'bilateral';
}

function formatLaterality(laterality: ExerciseLaterality) {
  if (laterality === 'unilateral') return '单侧动作';
  if (laterality === 'alternating') return '交替动作';
  return '双侧动作';
}

function resolveKeyCues(exercise: Exercise) {
  const source = exercise.keyCues?.length ? exercise.keyCues : exercise.cues;
  const cues = source.slice(0, 3).map(compactCue).filter(Boolean);
  const defaults = ['保持稳定', '控制速度', '均匀呼吸'];
  while (cues.length < 3) cues.push(defaults[cues.length]);
  return cues;
}

function compactCue(value: string) {
  const clean = value.replace(/[。；，,.]/g, '').trim();
  return clean.length > 8 ? clean.slice(0, 8) : clean;
}

function resolveTroubleshooting(exercise: Exercise) {
  const problems = exercise.commonMistakes.slice(0, 3).map((mistake, index): ExerciseTroubleshootingItem => ({
    id: `common-mistake-${index + 1}`,
    title: compactTitle(mistake),
    quickFix: exercise.cues[index] ?? '降低负荷并放慢动作速度',
    causes: [mistake],
    fixes: [exercise.cues[index] ?? '降低当前负荷', '使用可控幅度完成动作'],
    image: null
  }));
  return [...problems, ...DEFAULT_TROUBLESHOOTING.map(cloneTroubleshooting)].slice(0, 3);
}

function compactTitle(value: string) {
  const clean = value.replace(/[。；，,.]/g, '').trim();
  return clean.length > 7 ? clean.slice(0, 7) : clean;
}

function resolveInstructions(exercise: Exercise): ExerciseInstructions {
  const postureNotes = exercise.postureDetails
    ? [exercise.postureDetails.regression, exercise.postureDetails.progression, ...exercise.postureDetails.stopConditions].filter((item): item is string => Boolean(item))
    : [];
  return {
    startPosition: exercise.postureDetails?.startPosition ?? exercise.steps[0] ?? '先建立稳定且舒适的起始姿势。',
    execution: exercise.steps[1] ?? exercise.cues[0] ?? '保持姿势稳定，以可控速度完成发力。',
    returnProcess: exercise.steps[2] ?? '沿原路径缓慢返回，不要突然卸力。',
    rangeOfMotion: '在无痛且能保持姿势稳定的范围内完成动作。',
    notes: [...exercise.cues.slice(0, 3), ...postureNotes]
  };
}

function resolveAlternatives(exercise: Exercise, currentMuscleId?: string): ResolvedExerciseAlternative[] {
  const detailed = exercise.alternativeDetails?.filter(({ exerciseId }) => Boolean(getExerciseById(exerciseId))) ?? [];
  const detailReasons = new Map(detailed.map((item) => [item.exerciseId, item.reason]));
  if (currentMuscleId) {
    const primaryMatches = exercises.filter((candidate) => candidate.id !== exercise.id && candidate.primaryMuscles.includes(currentMuscleId));
    const secondaryMatches = exercises.filter((candidate) => candidate.id !== exercise.id && !candidate.primaryMuscles.includes(currentMuscleId) && candidate.secondaryMuscles.includes(currentMuscleId));
    const contextual = [...primaryMatches.map((candidate) => ({ candidate, matchType: 'primary' as const })), ...secondaryMatches.map((candidate) => ({ candidate, matchType: 'secondary' as const }))];
    if (contextual.length) {
      const contextualById = new Map(contextual.map((item) => [item.candidate.id, item]));
      const preferredIds = [...detailed.map(({ exerciseId }) => exerciseId), ...exercise.alternatives];
      const preferred = preferredIds.flatMap((exerciseId) => {
        const item = contextualById.get(exerciseId);
        return item ? [item] : [];
      });
      const preferredIdSet = new Set(preferred.map(({ candidate }) => candidate.id));
      const ordered = [...preferred, ...contextual.filter(({ candidate }) => !preferredIdSet.has(candidate.id))];
      return ordered.slice(0, 6).map(({ candidate, matchType }) => ({
        exerciseId: candidate.id,
        reason: detailReasons.get(candidate.id) ?? (matchType === 'primary' ? '同一主练肌群' : '该肌群作为辅助参与'),
        muscleId: currentMuscleId,
        matchType
      }));
    }
  }
  if (detailed.length) return detailed.map((item) => ({ ...item, matchType: 'related' }));
  const explicit = exercise.alternatives
    .filter((exerciseId) => Boolean(getExerciseById(exerciseId)))
    .slice(0, 6)
    .map((exerciseId) => ({ exerciseId, reason: '训练目标相近，可按器械与舒适度替换', matchType: 'related' as const }));
  if (explicit.length) return explicit;
  const primaryMuscles = new Set(exercise.primaryMuscles);
  const related = exercises.filter((candidate) => candidate.id !== exercise.id && candidate.primaryMuscles.some((muscleId) => primaryMuscles.has(muscleId)));
  const candidates = related.length ? related : exercises.filter((candidate) => candidate.id !== exercise.id && candidate.category === exercise.category);
  return candidates.slice(0, 6).map((candidate) => ({ exerciseId: candidate.id, reason: '训练区域相近，可按器械与舒适度替换', matchType: 'related' }));
}

function formatMuscle(muscleId: string) {
  return getMuscleById(muscleId)?.nameZh ?? muscleId;
}

function cloneTroubleshooting(item: ExerciseTroubleshootingItem): ExerciseTroubleshootingItem {
  return { ...item, causes: [...item.causes], fixes: [...item.fixes] };
}
