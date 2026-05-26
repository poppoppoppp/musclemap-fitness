import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import { getExerciseById } from '../data/exercises';
import type { WorkoutLogExercise } from '../types/workout';
import {
  formatDuration,
  formatWorkoutSet,
  getDisplayableWorkoutExercises,
  getWorkoutLogById,
  getWorkoutSourceLabel,
  readWorkoutLogs
} from '../utils/workoutHistory';

export default function WorkoutLogDetail() {
  const { logId } = useParams();
  const log = getWorkoutLogById(readWorkoutLogs(), logId);

  if (!log) {
    return (
      <div className="pb-32 lg:pb-0">
        <PageHeader title="训练详情" />
        <Card>
          <p className="text-sm text-slate-300">未找到这次训练记录</p>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" to="/workout-history">
            返回训练历史
          </Link>
        </Card>
      </div>
    );
  }

  const duration = formatDuration(log.durationSeconds);
  const exercises = getDisplayableWorkoutExercises(log);

  return (
    <div className="pb-32 lg:pb-0">
      <PageHeader title="训练详情" />
      <div data-testid="workout-log-detail" className="space-y-4">
        <Link className="inline-flex min-h-11 items-center rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" to="/workout-history">
          返回训练历史
        </Link>

        <Card>
          <dl className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">日期</dt>
              <dd className="mt-1 break-words font-semibold text-white">{log.date}</dd>
            </div>
            {duration ? (
              <div>
                <dt className="text-slate-400">时长</dt>
                <dd className="mt-1 font-semibold text-white">{duration}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-slate-400">来源</dt>
              <dd className="mt-1 font-semibold text-white">{getWorkoutSourceLabel(log)}</dd>
            </div>
            {log.planId ? (
              <div>
                <dt className="text-slate-400">planId</dt>
                <dd className="mt-1 break-words font-semibold text-white">{log.planId}</dd>
              </div>
            ) : null}
          </dl>
          {log.notes ? (
            <div className="mt-4 border-t border-line pt-4">
              <h2 className="text-sm font-semibold text-white">本次训练备注</h2>
              <p className="mt-2 break-words text-sm leading-6 text-cyan-100">{log.notes}</p>
            </div>
          ) : null}
        </Card>

        <div className="space-y-3">
          {exercises.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-300">这次训练没有可展示的有效组。</p>
            </Card>
          ) : (
            exercises.map((exercise) => <WorkoutDetailExercise key={exercise.id} exercise={exercise} />)
          )}
        </div>
      </div>
    </div>
  );
}

function WorkoutDetailExercise({ exercise }: { exercise: WorkoutLogExercise }) {
  const detail = getExerciseById(exercise.exerciseId);
  const setLabels = exercise.sets.map(formatWorkoutSet).filter((label): label is string => label !== null);

  return (
    <Card>
      <article data-testid="workout-detail-exercise" className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold text-white">{detail?.name ?? '未知动作'}</h2>
            <p className="mt-1 break-words text-sm text-slate-400">{detail?.nameEn ?? exercise.exerciseId}</p>
          </div>
          <p className="text-sm font-semibold text-cyan-100">组数：{setLabels.length} 组</p>
        </div>

        {exercise.notes ? <p className="mt-3 break-words text-sm leading-6 text-cyan-100">{exercise.notes}</p> : null}

        <div className="mt-4 space-y-2">
          {setLabels.map((label, index) => (
            <p key={`${exercise.id}-set-${index}`} className="break-words rounded-md bg-slate-950 px-3 py-2 text-sm text-slate-200">
              {label}
            </p>
          ))}
        </div>
      </article>
    </Card>
  );
}
