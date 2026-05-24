import { exercises } from '../data/exercises';
import type {
  DaysPerWeek,
  EquipmentCategory,
  FocusBodyPart,
  GeneratedPlan,
  GeneratedPlanItem,
  GeneratedWorkoutDay,
  PlanGoal,
  PlanInput,
  TrainingLevel
} from '../types/workout';

export const PLAN_STORAGE_KEY = 'musclemap.latestGeneratedPlan.v0.2';

export const EQUIPMENT_SHORTAGE_NOTICE = '当前器械条件下可用动作较少，建议补充器械或切换到健身房完整器械。';
export const BODYWEIGHT_BACK_NOTICE = '当前徒手背部动作较少，如有条件可增加单杠、弹力带或选择健身房完整器械。';

export const planGoalOptions: { value: PlanGoal; label: string }[] = [
  { value: 'hypertrophy', label: '增肌' },
  { value: 'strength', label: '力量' },
  { value: 'beginner', label: '新手入门' },
  { value: 'posture', label: '体态改善' }
];

export const daysPerWeekOptions: { value: DaysPerWeek; label: string }[] = [
  { value: 2, label: '2 天' },
  { value: 3, label: '3 天' },
  { value: 4, label: '4 天' },
  { value: 5, label: '5 天' }
];

export const trainingLevelOptions: { value: TrainingLevel; label: string }[] = [
  { value: 'beginner', label: '新手' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '进阶' }
];

export const equipmentCategoryOptions: { value: EquipmentCategory; label: string }[] = [
  { value: 'bodyweight', label: '徒手' },
  { value: 'dumbbell', label: '哑铃' },
  { value: 'barbell', label: '杠铃' },
  { value: 'machine', label: '固定器械' },
  { value: 'cable', label: '龙门架' },
  { value: 'fullGym', label: '健身房完整器械' }
];

export const focusBodyPartOptions: { value: FocusBodyPart; label: string }[] = [
  { value: 'back', label: '背' },
  { value: 'chest', label: '胸' },
  { value: 'shoulders', label: '肩' },
  { value: 'legs', label: '腿' },
  { value: 'arms', label: '手臂' },
  { value: 'core', label: '核心' }
];

type DayKind = 'upper' | 'push' | 'pull' | 'legs' | 'legs-core' | 'chest' | 'back' | 'shoulders' | 'arms-core';

interface DayTemplate {
  id: string;
  name: string;
  focus: string;
  kind: DayKind;
  requiredPools: ExercisePool[];
}

type ExercisePool = 'chest' | 'shoulders' | 'triceps' | 'back' | 'biceps' | 'legs' | 'core' | 'posture';

const dayTemplates: Record<DaysPerWeek, DayTemplate[]> = {
  2: [
    { id: 'upper', name: 'Day 1：上半身', focus: '胸、背、肩、手臂综合训练', kind: 'upper', requiredPools: ['chest', 'back', 'shoulders', 'triceps', 'biceps'] },
    { id: 'legs-core', name: 'Day 2：下半身 + 核心', focus: '腿部力量与核心稳定', kind: 'legs-core', requiredPools: ['legs', 'core'] }
  ],
  3: [
    { id: 'push', name: 'Day 1：推，胸肩三头', focus: '胸、肩、三头', kind: 'push', requiredPools: ['chest', 'shoulders', 'triceps'] },
    { id: 'pull', name: 'Day 2：拉，背二头', focus: '背、二头、肩胛稳定', kind: 'pull', requiredPools: ['back', 'biceps', 'posture'] },
    { id: 'legs-core', name: 'Day 3：腿 + 核心', focus: '腿部与核心控制', kind: 'legs-core', requiredPools: ['legs', 'core'] }
  ],
  4: [
    { id: 'chest', name: 'Day 1：胸 + 三头', focus: '胸部推力与三头辅助', kind: 'chest', requiredPools: ['chest', 'triceps'] },
    { id: 'back', name: 'Day 2：背 + 二头', focus: '背部拉力与二头辅助', kind: 'back', requiredPools: ['back', 'biceps', 'posture'] },
    { id: 'legs', name: 'Day 3：腿', focus: '腿部力量', kind: 'legs', requiredPools: ['legs'] },
    { id: 'shoulders', name: 'Day 4：肩 + 核心', focus: '肩部稳定与核心控制', kind: 'shoulders', requiredPools: ['shoulders', 'core'] }
  ],
  5: [
    { id: 'chest', name: 'Day 1：胸', focus: '胸部训练', kind: 'chest', requiredPools: ['chest'] },
    { id: 'back', name: 'Day 2：背', focus: '背部训练', kind: 'back', requiredPools: ['back', 'posture'] },
    { id: 'legs', name: 'Day 3：腿', focus: '腿部训练', kind: 'legs', requiredPools: ['legs'] },
    { id: 'shoulders', name: 'Day 4：肩', focus: '肩部训练', kind: 'shoulders', requiredPools: ['shoulders', 'posture'] },
    { id: 'arms-core', name: 'Day 5：手臂 + 核心', focus: '二头、三头与核心', kind: 'arms-core', requiredPools: ['biceps', 'triceps', 'core'] }
  ]
};

const exercisePools: Record<ExercisePool, string[]> = {
  chest: ['barbell-bench-press', 'dumbbell-bench-press', 'machine-chest-press', 'push-up', 'cable-chest-fly'],
  shoulders: ['dumbbell-shoulder-press', 'machine-shoulder-press', 'dumbbell-lateral-raise', 'cable-lateral-raise'],
  triceps: ['cable-triceps-pushdown', 'lying-triceps-extension', 'push-up'],
  back: ['lat-pulldown', 'pull-up', 'seated-row', 'one-arm-dumbbell-row', 'chest-supported-row', 'face-pull', 'inverted-row', 'towel-row', 'prone-w-raise'],
  biceps: ['dumbbell-curl', 'hammer-curl', 'pull-up'],
  legs: ['squat', 'leg-press', 'leg-extension', 'leg-curl', 'lunge', 'romanian-deadlift'],
  core: ['plank', 'crunch', 'dead-bug', 'hanging-leg-raise'],
  posture: ['face-pull', 'reverse-fly', 'bent-over-reverse-fly', 'y-raise', 'seated-row', 'chest-supported-row', 'romanian-deadlift', 'back-extension', 'dead-bug', 'plank', 'superman', 'prone-w-raise']
};

const posturePriority = [
  'face-pull',
  'reverse-fly',
  'bent-over-reverse-fly',
  'y-raise',
  'seated-row',
  'chest-supported-row',
  'romanian-deadlift',
  'back-extension',
  'dead-bug',
  'plank',
  'superman',
  'prone-w-raise',
  'inverted-row',
  'towel-row',
  'dumbbell-lateral-raise',
  'cable-lateral-raise',
  'lunge',
  'push-up'
];

const mainStrengthLifts = new Set([
  'squat',
  'deadlift',
  'romanian-deadlift',
  'barbell-bench-press',
  'barbell-row',
  'pull-up',
  't-bar-row'
]);

const equipmentByCategory: Record<EquipmentCategory, string[]> = {
  bodyweight: ['自重', '单杠'],
  dumbbell: ['自重', '单杠', '哑铃', '卧推凳'],
  barbell: ['自重', '单杠', '杠铃', '卧推凳', '深蹲架'],
  machine: ['自重', '单杠', '高位下拉器', '推胸器', '肩推器', '腿举机', '腿屈伸机', '腿弯举机', '坐姿划船器', '胸托划船机', '罗马椅'],
  cable: ['自重', '单杠', '绳索器械'],
  fullGym: [
    '自重',
    '单杠',
    '哑铃',
    '杠铃',
    '卧推凳',
    '深蹲架',
    '高位下拉器',
    '推胸器',
    '肩推器',
    '腿举机',
    '腿屈伸机',
    '腿弯举机',
    '坐姿划船器',
    '绳索器械',
    '胸托划船机',
    'T杠',
    '罗马椅',
    '弹力带'
  ]
};

const focusPoolMap: Partial<Record<FocusBodyPart, ExercisePool[]>> = {
  back: ['back', 'posture'],
  chest: ['chest'],
  shoulders: ['shoulders', 'posture'],
  legs: ['legs'],
  arms: ['biceps', 'triceps'],
  core: ['core']
};

export function generatePlan(input: PlanInput): GeneratedPlan {
  const templates = dayTemplates[input.daysPerWeek];
  const days = templates.map((template, index) => buildDay(template, input, index));
  const goalLabel = planGoalOptions.find((option) => option.value === input.goal)?.label ?? '基础';

  return {
    id: `plan-${Date.now()}`,
    name: `${goalLabel} ${input.daysPerWeek} 天训练计划`,
    input,
    days,
    createdAt: new Date().toISOString()
  };
}

function buildDay(template: DayTemplate, input: PlanInput, index: number): GeneratedWorkoutDay {
  const pools = prioritizePools(getPoolsForTemplate(template, input), input.focusBodyParts);
  const used = new Set<string>();
  const itemExerciseIds: string[] = [];

  for (const pool of pools) {
    const exerciseId = pickExerciseFromPool(pool, input, used);
    if (exerciseId) {
      itemExerciseIds.push(exerciseId);
      used.add(exerciseId);
    }
  }

  const maxItems = input.goal === 'beginner' || input.level === 'beginner' ? 4 : 5;
  for (const pool of pools) {
    if (itemExerciseIds.length >= maxItems) break;
    for (const exerciseId of sortedPool(pool, input)) {
      if (itemExerciseIds.length >= maxItems) break;
      if (used.has(exerciseId)) continue;
      if (!isExerciseAllowed(exerciseId, input)) continue;
      itemExerciseIds.push(exerciseId);
      used.add(exerciseId);
    }
  }

  const notice = getDayNotice(template, input, itemExerciseIds.length);

  return {
    id: `${template.id}-${index + 1}`,
    name: template.name,
    focus: template.focus,
    items: itemExerciseIds.map((exerciseId) => buildPlanItem(exerciseId, input)),
    notice
  };
}

function getPoolsForTemplate(template: DayTemplate, input: PlanInput): ExercisePool[] {
  if (input.goal !== 'posture') return template.requiredPools;

  if (template.kind === 'push' || template.kind === 'chest') return ['posture', 'shoulders', 'core'];
  if (template.kind === 'pull' || template.kind === 'back') return ['posture', 'back', 'core'];
  if (template.kind === 'legs' || template.kind === 'legs-core') return ['posture', 'legs', 'core'];
  if (template.kind === 'shoulders') return ['posture', 'shoulders', 'core'];
  if (template.kind === 'arms-core') return ['posture', 'core', 'biceps', 'triceps'];
  return ['posture', 'back', 'core', 'legs'];
}

function getDayNotice(template: DayTemplate, input: PlanInput, itemCount: number) {
  if (input.availableEquipment === 'bodyweight' && (template.kind === 'pull' || template.kind === 'back' || template.kind === 'upper')) {
    return BODYWEIGHT_BACK_NOTICE;
  }

  return itemCount < 3 ? EQUIPMENT_SHORTAGE_NOTICE : undefined;
}

function prioritizePools(pools: ExercisePool[], focusBodyParts: FocusBodyPart[]) {
  const focusPools = focusBodyParts.flatMap((part) => focusPoolMap[part] ?? []);
  const matching = pools.filter((pool) => focusPools.includes(pool));
  const rest = pools.filter((pool) => !focusPools.includes(pool));
  return [...matching, ...rest];
}

function pickExerciseFromPool(pool: ExercisePool, input: PlanInput, used: Set<string>) {
  return sortedPool(pool, input).find((exerciseId) => !used.has(exerciseId) && isExerciseAllowed(exerciseId, input));
}

function sortedPool(pool: ExercisePool, input: PlanInput) {
  const ids = [...exercisePools[pool]];
  if (input.goal === 'posture') {
    return ids.sort((a, b) => priorityIndex(posturePriority, a) - priorityIndex(posturePriority, b));
  }

  if (input.focusBodyParts.includes('back') && (pool === 'back' || pool === 'posture')) {
    const priority = ['lat-pulldown', 'pull-up', 'seated-row', 'one-arm-dumbbell-row', 'chest-supported-row', 'face-pull'];
    return ids.sort((a, b) => priorityIndex(priority, a) - priorityIndex(priority, b));
  }
  return ids;
}

function priorityIndex(priority: string[], id: string) {
  const index = priority.indexOf(id);
  return index === -1 ? priority.length : index;
}

function isExerciseAllowed(exerciseId: string, input: PlanInput) {
  if (exerciseId === 'pull-up' && input.availableEquipment === 'bodyweight' && (input.goal === 'beginner' || input.level === 'beginner')) {
    return false;
  }

  const exercise = exercises.find((item) => item.id === exerciseId);
  if (!exercise) return false;
  const allowed = equipmentByCategory[input.availableEquipment];
  return exercise.equipment.every((item) => allowed.includes(item));
}

function buildPlanItem(exerciseId: string, input: PlanInput): GeneratedPlanItem {
  const exercise = exercises.find((item) => item.id === exerciseId);
  const isCore = isCoreStability(exerciseId);
  const prescription = getPrescription(input.goal, input.level, isMainStrengthLift(exerciseId), isCore, exercise?.mechanic === 'compound');

  return {
    exerciseId,
    sets: prescription.sets,
    repRange: isCore ? prescription.holdRange : prescription.repRange,
    restSeconds: prescription.restSeconds,
    targetMuscles: exercise?.primaryMuscles ?? [],
    note: input.goal === 'posture' && exercise?.category === 'activation' ? '控制动作质量，优先保持肩胛和核心稳定。' : undefined
  };
}

function isMainStrengthLift(exerciseId: string) {
  return mainStrengthLifts.has(exerciseId);
}

function isCoreStability(exerciseId: string) {
  return ['plank', 'dead-bug', 'superman', 'prone-w-raise'].includes(exerciseId);
}

function getPrescription(goal: PlanGoal, level: TrainingLevel, isMainLift: boolean, isCore: boolean, isCompound: boolean) {
  if (goal === 'strength') {
    if (isCore) {
      return {
        sets: 2,
        repRange: '10-15',
        holdRange: '20-40秒',
        restSeconds: 60
      };
    }

    if (!isMainLift) {
      return {
        sets: level === 'advanced' ? 4 : 3,
        repRange: '8-12',
        holdRange: '20-40秒',
        restSeconds: 75
      };
    }

    return {
      sets: level === 'beginner' ? 3 : level === 'advanced' ? 5 : 4,
      repRange: '3-6',
      holdRange: '20-30秒',
      restSeconds: level === 'advanced' ? 180 : 150
    };
  }

  if (goal === 'beginner') {
    return {
      sets: 2,
      repRange: '10-12',
      holdRange: '20-30秒',
      restSeconds: 75
    };
  }

  if (goal === 'posture') {
    return {
      sets: level === 'advanced' ? 3 : 2,
      repRange: '10-15',
      holdRange: '20-40秒',
      restSeconds: 60
    };
  }

  return {
    sets: level === 'beginner' ? 3 : 4,
    repRange: isCompound ? '8-12' : '8-15',
    holdRange: '30-45秒',
    restSeconds: isCompound ? 90 : 75
  };
}
