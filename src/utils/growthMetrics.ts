import { getExerciseById } from '../data/exercises';
import { muscles } from '../data/muscles';
import type { BodySnapshot } from '../types/body';
import type {
  BodyMetricId,
  GrowthTimeRange,
  GrowthTrendPoint,
  TrainingDistributionItem,
  TrainingOverviewMetrics
} from '../types/growth';
import type { WorkoutLog } from '../types/workout';
import { getDisplayableWorkoutExercises, isValidWorkoutSet } from './workoutHistory';

const distributionGroups: TrainingDistributionItem[] = [
  { id: 'chest', label: '胸部', sets: 0 },
  { id: 'back', label: '背部', sets: 0 },
  { id: 'shoulders', label: '肩部', sets: 0 },
  { id: 'legs', label: '腿部', sets: 0 },
  { id: 'arms', label: '手臂', sets: 0 }
];

const bodyPartToDistributionId = new Map<string, TrainingDistributionItem['id']>([
  ['胸部', 'chest'],
  ['背部', 'back'],
  ['肩部', 'shoulders'],
  ['腿部', 'legs'],
  ['手臂', 'arms']
]);

export function filterWorkoutLogsByRange(logs: WorkoutLog[], range: GrowthTimeRange, now = new Date()): WorkoutLog[] {
  if (range === 'all') return [...logs];
  const start = getRangeStart(range, now);
  return logs.filter((log) => {
    const date = parseLocalDate(log.date);
    return date !== null && date >= start && date <= endOfLocalDay(now);
  });
}

export function deriveTrainingOverview(logs: WorkoutLog[], range: GrowthTimeRange, now = new Date()): TrainingOverviewMetrics {
  const filtered = filterWorkoutLogsByRange(logs, range, now);
  const activeWeeks = new Set(filtered.flatMap((log) => {
    const date = parseLocalDate(log.date);
    return date ? [getLocalWeekKey(date)] : [];
  })).size;

  return {
    completedWorkouts: filtered.length,
    activeWeeks,
    averagePerActiveWeek: activeWeeks === 0 ? 0 : roundToOneDecimal(filtered.length / activeWeeks)
  };
}

export function deriveTrainingDistribution(logs: WorkoutLog[], range: GrowthTimeRange, now = new Date()): TrainingDistributionItem[] {
  const totals = new Map(distributionGroups.map(({ id }) => [id, 0]));

  filterWorkoutLogsByRange(logs, range, now).forEach((log) => {
    getDisplayableWorkoutExercises(log).forEach((workoutExercise) => {
      const exercise = getExerciseById(workoutExercise.exerciseId);
      if (!exercise) return;
      const setCount = workoutExercise.sets.filter(isValidWorkoutSet).length;
      const groupIds = new Set(exercise.primaryMuscles.flatMap((muscleId) => {
        const bodyPart = muscles.find((muscle) => muscle.id === muscleId)?.bodyPart;
        const groupId = bodyPart ? bodyPartToDistributionId.get(bodyPart) : undefined;
        return groupId ? [groupId] : [];
      }));
      groupIds.forEach((groupId) => totals.set(groupId, (totals.get(groupId) ?? 0) + setCount));
    });
  });

  return distributionGroups.map((group) => ({ ...group, sets: totals.get(group.id) ?? 0 }));
}

export function deriveBodyMetricSeries(
  snapshots: BodySnapshot[],
  metric: BodyMetricId,
  range: GrowthTimeRange,
  now: Date,
  fallbackPoints: GrowthTrendPoint[]
): { source: 'real' | 'mock'; points: GrowthTrendPoint[] } {
  const start = range === 'all' ? null : getRangeStart(range, now);
  const points = snapshots
    .flatMap((snapshot) => {
      const date = parseLocalDate(snapshot.date);
      const value = metric === 'weight'
        ? snapshot.bodyWeightKg
        : metric === 'waist'
          ? snapshot.waistCm
          : undefined;
      if (!date || value === undefined || !Number.isFinite(value)) return [];
      if (start && date < start) return [];
      if (date > endOfLocalDay(now)) return [];
      return [{ date, label: `${date.getMonth() + 1}/${date.getDate()}`, value }];
    })
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .map(({ label, value }) => ({ label, value }));

  return points.length >= 2 ? { source: 'real', points } : { source: 'mock', points: fallbackPoints };
}

function getRangeStart(range: Exclude<GrowthTimeRange, 'all'>, now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === '4w') start.setDate(start.getDate() - 28);
  if (range === '3m') start.setMonth(start.getMonth() - 3);
  if (range === '6m') start.setMonth(start.getMonth() - 6);
  return start;
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(date.getTime()) ? date : null;
}

function endOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function getLocalWeekKey(date: Date): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = monday.getDay();
  monday.setDate(monday.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
