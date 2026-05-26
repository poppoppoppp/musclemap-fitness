import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import type { WorkoutLog } from '../types/workout';
import { countValidSets, formatDuration, getWorkoutSourceLabel, readWorkoutLogs } from '../utils/workoutHistory';

export default function WorkoutHistory() {
  const logs = readWorkoutLogs();

  return (
    <div className="pb-32 lg:pb-0">
      <PageHeader title="训练历史" description="查看已保存的训练记录，进入详情复盘动作、组数、重量、次数和备注。" />

      {logs.length === 0 ? (
        <Card>
          <div className="rounded-md border border-dashed border-line px-4 py-8 text-center">
            <h2 className="text-lg font-semibold text-white">暂无训练记录</h2>
            <p className="mt-2 text-sm text-slate-300">完成一次训练后会显示在这里</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <WorkoutHistoryCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutHistoryCard({ log }: { log: WorkoutLog }) {
  const duration = formatDuration(log.durationSeconds);
  const notes = log.notes?.trim();

  return (
    <Card>
      <article data-testid="workout-history-card" data-log-id={log.id} className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold text-white">{log.date}</h2>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-300">
              <span>动作：{log.exercises.length} 个</span>
              <span>有效组数：{countValidSets(log)} 组</span>
              {duration ? <span>时长：{duration}</span> : null}
              <span>来源：{getWorkoutSourceLabel(log)}</span>
            </div>
            {notes ? <p className="mt-3 line-clamp-2 break-words text-sm text-cyan-100">{notes}</p> : null}
          </div>
          <Link
            to={`/workout-history/${log.id}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-accent sm:w-fit"
          >
            查看详情
          </Link>
        </div>
      </article>
    </Card>
  );
}
