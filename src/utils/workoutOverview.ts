import { getExerciseById } from '../data/exercises';
import { muscles } from '../data/muscles';
import type { GeneratedPlan, WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import { countValidSets, getDisplayableWorkoutExercises, sortWorkoutLogs } from './workoutHistory';

export interface WorkoutWeekDay {
  date: Date;
  dateKey: string;
  weekday: string;
  dayOfMonth: number;
  trained: boolean;
}

export interface WeeklyWorkoutSummary {
  start: Date;
  end: Date;
  dateRangeLabel: string;
  workoutCount: number;
  durationSeconds: number;
  validSetCount: number;
  days: WorkoutWeekDay[];
}

export interface RepresentativeWorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  nameEn: string | null;
  valueLabel: string;
}

export interface RecentWorkoutSummary {
  log: WorkoutLog;
  dateLabel: string;
  themeLabel: string;
  durationLabel: string;
  exerciseCount: number;
  validSetCount: number;
  exercises: RepresentativeWorkoutExercise[];
}

export interface WorkoutTrendPoint {
  logId: string;
  dateKey: string;
  value: number;
}

export interface WorkoutProgressSummary {
  exerciseId: string;
  exerciseName: string;
  metricLabel: string;
  previousValue: number;
  currentValue: number;
  percentageChange: number | null;
  points: WorkoutTrendPoint[];
}

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

export function getWeeklyWorkoutSummary(logs: WorkoutLog[], now = new Date()): WeeklyWorkoutSummary {
  const start = getLocalWeekStart(now);
  const end = addLocalDays(start, 6);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(start, index);
    return {
      date,
      dateKey: getLocalDateKey(date),
      weekday: weekdays[index],
      dayOfMonth: date.getDate(),
      trained: false
    };
  });
  const dayMap = new Map(days.map((day) => [day.dateKey, day]));
  const weeklyLogs = logs.filter((log) => dayMap.has(normalizeDateKey(log.date) ?? ''));

  weeklyLogs.forEach((log) => {
    const dateKey = normalizeDateKey(log.date);
    if (dateKey) dayMap.get(dateKey)!.trained = true;
  });

  return {
    start,
    end,
    dateRangeLabel: `${formatMonthDay(start)} - ${formatMonthDay(end)}`,
    workoutCount: weeklyLogs.length,
    durationSeconds: weeklyLogs.reduce((total, log) => total + getSafeDuration(log.durationSeconds), 0),
    validSetCount: weeklyLogs.reduce((total, log) => total + countValidSets(log), 0),
    days
  };
}

export function getRecentWorkoutSummary(logs: WorkoutLog[], plan: GeneratedPlan | null): RecentWorkoutSummary | null {
  const log = sortWorkoutLogs(logs)[0];
  if (!log) return null;
  const displayableExercises = getDisplayableWorkoutExercises(log).filter((exercise) => exercise.sets.length > 0);
  const matchingPlan = log.planId && plan?.id === log.planId ? plan : null;

  return {
    log,
    dateLabel: formatWorkoutDate(log.date),
    themeLabel: getWorkoutTheme(displayableExercises, matchingPlan),
    durationLabel: formatOverviewDuration(log.durationSeconds),
    exerciseCount: displayableExercises.length,
    validSetCount: countValidSets(log),
    exercises: displayableExercises.slice(0, 3).flatMap(toRepresentativeExercise)
  };
}

export function getWorkoutProgressSummary(logs: WorkoutLog[], limit = 5): WorkoutProgressSummary | null {
  const orderedLogs = sortWorkoutLogs(logs).reverse();
  const candidates = new Map<string, WorkoutTrendPoint[]>();

  orderedLogs.forEach((log) => {
    if (!normalizeDateKey(log.date)) return;
    getDisplayableWorkoutExercises(log).forEach((exercise) => {
      const maxWeight = getMaximumValidWeight(exercise.sets);
      if (maxWeight === null) return;
      const points = candidates.get(exercise.exerciseId) ?? [];
      points.push({ logId: log.id, dateKey: log.date, value: maxWeight });
      candidates.set(exercise.exerciseId, points);
    });
  });

  const selected = [...candidates.entries()]
    .filter(([, points]) => points.length >= 2)
    .sort((left, right) => {
      const frequencyDifference = right[1].length - left[1].length;
      if (frequencyDifference !== 0) return frequencyDifference;
      return right[1][right[1].length - 1].dateKey.localeCompare(left[1][left[1].length - 1].dateKey);
    })[0];

  if (!selected) return null;
  const [exerciseId, allPoints] = selected;
  const points = allPoints.slice(-Math.max(2, limit));
  const previousValue = points[points.length - 2].value;
  const currentValue = points[points.length - 1].value;
  const percentageChange = previousValue > 0 && Number.isFinite(previousValue)
    ? ((currentValue - previousValue) / previousValue) * 100
    : null;
  const exercise = getExerciseById(exerciseId);

  return {
    exerciseId,
    exerciseName: exercise?.name ?? exerciseId,
    metricLabel: '最大训练重量',
    previousValue,
    currentValue,
    percentageChange: Number.isFinite(percentageChange) ? percentageChange : null,
    points
  };
}

export function getRecentExerciseIds(logs: WorkoutLog[], limit = 3): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const log of sortWorkoutLogs(logs)) {
    for (const exercise of getDisplayableWorkoutExercises(log)) {
      if (seen.has(exercise.exerciseId) || !getExerciseById(exercise.exerciseId)) continue;
      seen.add(exercise.exerciseId);
      result.push(exercise.exerciseId);
      if (result.length === limit) return result;
    }
  }
  return result;
}

export function formatOverviewDuration(durationSeconds: unknown): string {
  const safeSeconds = getSafeDuration(durationSeconds);
  const totalMinutes = Math.round(safeSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} 分钟`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`;
}

export function formatWeight(value: number): string {
  return `${Number.isInteger(value) ? value : Number(value.toFixed(1))}kg`;
}

export function formatPercentage(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  const rounded = Math.abs(value) < 0.05 ? 0 : Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

function toRepresentativeExercise(exercise: WorkoutLogExercise): RepresentativeWorkoutExercise[] {
  const representativeSet = getRepresentativeSet(exercise.sets);
  const valueLabel = representativeSet ? formatRepresentativeSet(representativeSet) : null;
  if (!valueLabel) return [];
  const detail = getExerciseById(exercise.exerciseId);
  return [{
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    name: detail?.name ?? exercise.exerciseId,
    nameEn: detail?.nameEn ?? null,
    valueLabel
  }];
}

function getRepresentativeSet(sets: WorkoutSet[]): WorkoutSet | null {
  const validSets = sets.filter((set) => isFiniteNumber(set.weight) || isFiniteNumber(set.reps));
  return validSets.sort((left, right) => {
    const leftBoth = Number(isFiniteNumber(left.weight) && isFiniteNumber(left.reps));
    const rightBoth = Number(isFiniteNumber(right.weight) && isFiniteNumber(right.reps));
    if (leftBoth !== rightBoth) return rightBoth - leftBoth;
    return (isFiniteNumber(right.weight) ? right.weight : -1) - (isFiniteNumber(left.weight) ? left.weight : -1);
  })[0] ?? null;
}

function formatRepresentativeSet(set: WorkoutSet): string | null {
  if (isFiniteNumber(set.weight) && isFiniteNumber(set.reps)) return `${formatWeight(set.weight)} × ${set.reps}`;
  if (isFiniteNumber(set.weight)) return formatWeight(set.weight);
  if (isFiniteNumber(set.reps)) return `${set.reps} 次`;
  return null;
}

function getWorkoutTheme(workoutExercises: WorkoutLogExercise[], plan: GeneratedPlan | null): string {
  if (plan?.name.trim()) return plan.name.trim();
  const bodyPartCounts = new Map<string, number>();
  workoutExercises.forEach((workoutExercise) => {
    const exercise = getExerciseById(workoutExercise.exerciseId);
    exercise?.primaryMuscles.forEach((muscleId) => {
      const bodyPart = muscles.find((muscle) => muscle.id === muscleId)?.bodyPart;
      if (bodyPart) bodyPartCounts.set(bodyPart, (bodyPartCounts.get(bodyPart) ?? 0) + 1);
    });
  });
  const bodyParts = [...bodyPartCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([bodyPart]) => bodyPart);
  if (bodyParts.length > 0) return bodyParts.join(' / ');
  const firstExercise = workoutExercises[0] ? getExerciseById(workoutExercises[0].exerciseId) : null;
  return firstExercise?.name ?? '自由训练';
}

function getMaximumValidWeight(sets: WorkoutSet[]): number | null {
  const values = sets
    .map((set) => set.weight)
    .filter((value): value is number => isFiniteNumber(value) && value > 0);
  return values.length > 0 ? Math.max(...values) : null;
}

function getLocalWeekStart(date: Date): Date {
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date();
  const start = new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate());
  const weekday = start.getDay();
  start.setDate(start.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return start;
}

function addLocalDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return getLocalDateKey(date) === value ? value : null;
}

function formatWorkoutDate(value: string): string {
  const dateKey = normalizeDateKey(value);
  if (!dateKey) return '日期未知';
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}月${day}日`;
}

function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getSafeDuration(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
