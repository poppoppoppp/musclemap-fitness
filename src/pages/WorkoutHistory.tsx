import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import type { WorkoutLog } from '../types/workout';
import { countValidSets, formatDuration, getWorkoutSourceLabel, readWorkoutLogs } from '../utils/workoutHistory';

export default function WorkoutHistory() {
  const logs = readWorkoutLogs();

  return (
    <div className="pb-32 lg:pb-0">
      <PageHeader title="训练历史" description="查看已保存的训练记录，进入详情复盘动作、组数、重量、次数和备注。" />

      {logs.length === 0 ? (
        <Card variant="dashed">
          <div className="px-4 py-8 text-center">
            <h2 className="text-lg font-semibold text-app-text">暂无训练记录</h2>
            <p className="mt-2 text-sm text-app-muted">完成一次训练后会显示在这里</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
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
    <Card variant="interactive">
      <article data-testid="workout-history-card" data-log-id={log.id} className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold text-app-text">{log.date}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>动作：{log.exercises.length} 个</Badge>
              <Badge tone="accent">有效组数：{countValidSets(log)} 组</Badge>
              {duration ? <Badge>时长：{duration}</Badge> : null}
              <Badge>来源：{getWorkoutSourceLabel(log)}</Badge>
            </div>
            {notes ? <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-app-muted">{notes}</p> : null}
          </div>
          <Link
            to={`/workout-history/${log.id}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-app-line bg-app-surface px-4 py-2 text-sm font-semibold text-app-accent transition hover:border-app-accent/40 hover:bg-app-surfaceMuted focus:outline-none focus:ring-2 focus:ring-app-accent/30 sm:w-fit"
          >
            查看详情
          </Link>
        </div>
      </article>
    </Card>
  );
}
