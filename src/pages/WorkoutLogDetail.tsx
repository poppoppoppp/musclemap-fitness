import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import WorkoutExerciseDetailList from '../components/workout/WorkoutExerciseDetailList';
import WorkoutSummaryCard from '../components/workout/WorkoutSummaryCard';
import { exercises } from '../data/exercises';
import { getWorkoutLogById, readWorkoutLogs } from '../utils/workoutHistory';

export default function WorkoutLogDetail() {
  const { logId } = useParams();
  const log = getWorkoutLogById(readWorkoutLogs(), logId);

  if (!log) {
    return (
      <div className="pb-32 lg:pb-0">
        <PageHeader title="训练详情" />
        <Card>
          <p className="text-sm text-app-muted">未找到这次训练记录</p>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-app-line bg-app-surfaceMuted px-5 py-2 text-sm font-semibold text-app-text transition hover:bg-app-surface" to="/workout-history">
            返回训练历史
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-32 lg:pb-0">
      <PageHeader title="训练详情" />
      <div data-testid="workout-log-detail" className="space-y-4">
        <Link className="inline-flex min-h-11 items-center rounded-xl border border-app-line bg-app-surfaceMuted px-5 py-2 text-sm font-semibold text-app-text transition hover:bg-app-surface focus:outline-none focus:ring-2 focus:ring-app-accent" to="/workout-history">
          返回训练历史
        </Link>

        <WorkoutSummaryCard workout={log} exercises={exercises} />
        <WorkoutExerciseDetailList workout={log} exercises={exercises} />
      </div>
    </div>
  );
}
