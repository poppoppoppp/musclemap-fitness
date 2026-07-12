import { getExerciseById } from '../data/exercises';
import { muscles } from '../data/muscles';
import type { BodyMetricRecord } from '../types/body';
import type { GrowthTimeRange, StrengthTrend, StrengthTrendPoint, TrainingDistributionItem, TrainingOverviewMetrics, TrainingOverviewResult } from '../types/growth';
import type { WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import { getDisplayableWorkoutExercises, isValidWorkoutSet } from './workoutHistory';

const distributionGroups: Array<Pick<TrainingDistributionItem, 'id' | 'label'>> = [
  { id: 'chest', label: '胸部' }, { id: 'back', label: '背部' }, { id: 'shoulders', label: '肩部' },
  { id: 'legs', label: '腿部' }, { id: 'arms', label: '手臂' }, { id: 'core', label: '核心' }
];

const bodyPartToDistributionId = new Map<string, TrainingDistributionItem['id']>([
  ['胸部', 'chest'], ['背部', 'back'], ['肩部', 'shoulders'], ['腿部', 'legs'], ['手臂', 'arms'], ['核心', 'core']
]);

export function filterWorkoutLogsByRange(logs: WorkoutLog[], range: GrowthTimeRange, now = new Date()): WorkoutLog[] {
  if (range === 'all') return logs.filter((log) => parseLocalDate(log.date) !== null && parseLocalDate(log.date)! <= endOfLocalDay(now));
  const start = getRangeStart(range, now);
  return logs.filter((log) => {
    const date = parseLocalDate(log.date);
    return date !== null && date >= start && date <= endOfLocalDay(now);
  });
}

export function deriveTrainingOverview(logs: WorkoutLog[], range: GrowthTimeRange, now = new Date()): TrainingOverviewResult {
  const currentLogs = filterWorkoutLogsByRange(logs, range, now);
  const current = summarizeOverview(currentLogs);
  if (range === 'all') return { current, previous: null, changes: null };
  const currentStart = getRangeStart(range, now);
  const duration = endOfLocalDay(now).getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  const previous = summarizeOverview(logs.filter((log) => {
    const date = parseLocalDate(log.date);
    return date !== null && date >= previousStart && date <= previousEnd;
  }));
  return {
    current,
    previous,
    changes: {
      completedWorkouts: current.completedWorkouts - previous.completedWorkouts,
      activeWeeks: current.activeWeeks - previous.activeWeeks,
      averagePerActiveWeek: roundToOneDecimal(current.averagePerActiveWeek - previous.averagePerActiveWeek)
    }
  };
}

export function findNearestBodyWeight(records: BodyMetricRecord[], trainingDate: string): BodyMetricRecord | null {
  const target = parseLocalDate(trainingDate);
  if (!target) return null;
  return records
    .filter((record) => record.weightKg !== undefined && Number.isFinite(record.weightKg) && parseLocalDate(record.date))
    .sort((left, right) => {
      const leftTime = parseLocalDate(left.date)!.getTime();
      const rightTime = parseLocalDate(right.date)!.getTime();
      const difference = Math.abs(leftTime - target.getTime()) - Math.abs(rightTime - target.getTime());
      if (difference !== 0) return difference;
      const leftBefore = leftTime <= target.getTime();
      const rightBefore = rightTime <= target.getTime();
      if (leftBefore !== rightBefore) return leftBefore ? -1 : 1;
      return rightTime - leftTime;
    })[0] ?? null;
}

export function deriveStrengthTrends(logs: WorkoutLog[], bodyRecords: BodyMetricRecord[], range: GrowthTimeRange, now = new Date()): StrengthTrend[] {
  const grouped = new Map<string, { lastRecordedAt: string; points: StrengthTrendPoint[]; missingBodyWeightCount: number }>();
  filterWorkoutLogsByRange(logs, range, now).forEach((log) => {
    getDisplayableWorkoutExercises(log).forEach((workoutExercise) => {
      const exercise = getExerciseById(workoutExercise.exerciseId);
      if (!exercise) return;
      const existing = grouped.get(exercise.id) ?? { lastRecordedAt: log.date, points: [], missingBodyWeightCount: 0 };
      if (log.date > existing.lastRecordedAt) existing.lastRecordedAt = log.date;
      const point = createStrengthPoint(log.date, workoutExercise, exercise.weightType, bodyRecords);
      if (point === 'missing-body-weight') existing.missingBodyWeightCount += 1;
      else if (point) existing.points.push(point);
      grouped.set(exercise.id, existing);
    });
  });

  return [...grouped.entries()].map(([exerciseId, value]) => {
    const exercise = getExerciseById(exerciseId)!;
    const points = value.points.sort((left, right) => left.date.localeCompare(right.date));
    const status: StrengthTrend['status'] = points.length === 0 ? 'empty' : points.length === 1 ? 'single' : 'trend';
    return {
      exerciseId,
      label: exercise.name,
      weightType: exercise.weightType,
      lastRecordedAt: value.lastRecordedAt,
      points,
      status,
      missingBodyWeightCount: value.missingBodyWeightCount
    };
  }).sort((left, right) => right.lastRecordedAt.localeCompare(left.lastRecordedAt));
}

export function deriveTrainingDistributionDetails(logs: WorkoutLog[], range: GrowthTimeRange, now = new Date()): TrainingDistributionItem[] {
  const groups = new Map(distributionGroups.map((group) => [group.id, new Map<string, number>()]));
  filterWorkoutLogsByRange(logs, range, now).forEach((log) => {
    getDisplayableWorkoutExercises(log).forEach((workoutExercise) => {
      const exercise = getExerciseById(workoutExercise.exerciseId);
      if (!exercise) return;
      const setCount = workoutExercise.sets.filter(isValidWorkoutSet).length;
      const ids = new Set(exercise.primaryMuscles.flatMap((muscleId) => {
        const bodyPart = muscles.find((muscle) => muscle.id === muscleId)?.bodyPart;
        const id = bodyPart ? bodyPartToDistributionId.get(bodyPart) : undefined;
        return id ? [id] : [];
      }));
      ids.forEach((id) => {
        const exerciseTotals = groups.get(id)!;
        exerciseTotals.set(exercise.id, (exerciseTotals.get(exercise.id) ?? 0) + setCount);
      });
    });
  });
  return distributionGroups.map((group) => {
    const exercises = [...groups.get(group.id)!.entries()]
      .map(([exerciseId, sets]) => ({ exerciseId, label: getExerciseById(exerciseId)?.name ?? exerciseId, sets }))
      .sort((left, right) => right.sets - left.sets || left.label.localeCompare(right.label, 'zh-CN'));
    return { ...group, sets: exercises.reduce((sum, item) => sum + item.sets, 0), exercises };
  });
}

export const deriveTrainingDistribution = deriveTrainingDistributionDetails;

export function deriveBodyMetricSeries(records: BodyMetricRecord[], metric: 'weight' | 'waist' | 'arm', range: GrowthTimeRange, now = new Date()) {
  const field = metric === 'weight' ? 'weightKg' : metric === 'waist' ? 'waistCm' : 'armCm';
  const start = range === 'all' ? null : getRangeStart(range, now);
  const points = records.flatMap((record) => {
    const date = parseLocalDate(record.date);
    const value = record[field];
    if (!date || value === undefined || !Number.isFinite(value) || (start && date < start) || date > endOfLocalDay(now)) return [];
    return [{ date: record.date, label: `${date.getMonth() + 1}/${date.getDate()}`, value }];
  }).sort((left, right) => left.date.localeCompare(right.date));
  return { points, status: points.length === 0 ? 'empty' as const : points.length === 1 ? 'single' as const : 'trend' as const };
}

function createStrengthPoint(date: string, workoutExercise: WorkoutLogExercise, weightType: import('../types/exercise').ExerciseWeightType, records: BodyMetricRecord[]): StrengthTrendPoint | 'missing-body-weight' | null {
  const sets = workoutExercise.sets.filter(isValidWorkoutSet);
  if (sets.length === 0) return null;
  if (weightType === 'external_weight') {
    const selected = maxWeightSet(sets);
    return selected ? { date, value: selected.weight!, reps: selected.reps, setIndex: selected.setIndex, sourceWeight: selected.weight } : null;
  }
  const bodyRecord = findNearestBodyWeight(records, date);
  if (!bodyRecord?.weightKg) return 'missing-body-weight';
  const selected = weightType === 'bodyweight_assisted'
    ? maxEffectiveSet(sets.filter((set) => set.weight !== undefined), bodyRecord.weightKg, -1)
    : weightType === 'bodyweight_added'
      ? maxEffectiveSet(sets, bodyRecord.weightKg, 1)
      : sets[0];
  if (!selected) return null;
  const modifierWeight = weightType === 'bodyweight' ? undefined : selected.weight ?? 0;
  const value = weightType === 'bodyweight_assisted'
    ? Math.max(bodyRecord.weightKg - (modifierWeight ?? 0), 0)
    : bodyRecord.weightKg + (modifierWeight ?? 0);
  return { date, value, reps: selected.reps, setIndex: selected.setIndex, bodyWeight: bodyRecord.weightKg, modifierWeight };
}

function maxWeightSet(sets: WorkoutSet[]) {
  return sets.filter((set) => set.weight !== undefined && Number.isFinite(set.weight)).sort((left, right) => right.weight! - left.weight!)[0] ?? null;
}

function maxEffectiveSet(sets: WorkoutSet[], bodyWeight: number, direction: 1 | -1) {
  return [...sets].sort((left, right) => (bodyWeight + direction * (right.weight ?? 0)) - (bodyWeight + direction * (left.weight ?? 0)))[0] ?? null;
}

function summarizeOverview(logs: WorkoutLog[]): TrainingOverviewMetrics {
  const activeWeeks = new Set(logs.flatMap((log) => {
    const date = parseLocalDate(log.date);
    return date ? [getLocalWeekKey(date)] : [];
  })).size;
  return { completedWorkouts: logs.length, activeWeeks, averagePerActiveWeek: activeWeeks === 0 ? 0 : roundToOneDecimal(logs.length / activeWeeks) };
}

function getRangeStart(range: Exclude<GrowthTimeRange, 'all'>, now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === '4w') start.setDate(start.getDate() - 28);
  if (range === '3m') start.setMonth(start.getMonth() - 3);
  if (range === '6m') start.setMonth(start.getMonth() - 6);
  return start;
}

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(date.getTime()) ? date : null;
}

function endOfLocalDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999); }
function getLocalWeekKey(date: Date) { const monday = new Date(date); const day = monday.getDay(); monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1)); return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`; }
function roundToOneDecimal(value: number) { return Math.round(value * 10) / 10; }
