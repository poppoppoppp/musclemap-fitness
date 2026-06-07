import { useEffect, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ExerciseTrajectoryViewer from '../components/three/ExerciseTrajectoryViewer';
import { exercises, getExerciseById } from '../data/exercises';
import { getExerciseTrajectoryByExerciseId } from '../data/exerciseTrajectories';
import { getMuscleById } from '../data/muscles';
import type { ActiveWorkout } from '../types/activeWorkout';
import type { Exercise } from '../types/exercise';
import {
  addExerciseToExistingActiveWorkout,
  isExerciseInActiveWorkout,
  readActiveWorkout,
  startWorkoutWithExercise
} from '../utils/activeWorkout';

type AlternativeMatch = {
  exercise: Exercise;
  matchType: 'primary' | 'secondary';
};

const MAX_CONTEXTUAL_ALTERNATIVES = 6;

export default function ExerciseDetail() {
  const { exerciseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [workoutStatus, setWorkoutStatus] = useState('');
  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;

  useEffect(() => {
    setActiveWorkout(readActiveWorkout());
    setWorkoutStatus('');
  }, [exerciseId]);

  if (!exercise) {
    return (
      <div>
        <PageHeader title="动作详情" backTo="/exercises" />
        <EmptyState title="未找到这个动作" description="请返回动作库重新选择。" />
      </div>
    );
  }

  const queryMuscleId = searchParams.get('muscleId');
  const fallbackMuscleId = exercise.primaryMuscles[0];
  const currentMuscleId = queryMuscleId && getMuscleById(queryMuscleId) ? queryMuscleId : fallbackMuscleId;
  const contextualAlternatives = getContextualAlternatives(exercise, currentMuscleId);
  const hasFewAlternatives = contextualAlternatives.length < 3;
  const isInActiveWorkout = activeWorkout ? isExerciseInActiveWorkout(activeWorkout, exercise.id) : false;
  const trajectory = getExerciseTrajectoryByExerciseId(exercise.id);

  const handleStartWorkoutWithExercise = () => {
    startWorkoutWithExercise(exercise.id);
    setWorkoutStatus('已开始训练并加入当前动作');
    navigate('/workout-log');
  };

  const handleAddToActiveWorkout = () => {
    const result = addExerciseToExistingActiveWorkout(exercise.id);
    setActiveWorkout(result.workout);

    if (result.status === 'duplicate') {
      setWorkoutStatus('该动作已在当前训练中');
      return;
    }

    if (result.status === 'missing') {
      startWorkoutWithExercise(exercise.id);
      setWorkoutStatus('已开始训练并加入当前动作');
      navigate('/workout-log');
      return;
    }

    setWorkoutStatus('已加入当前训练');
  };

  return (
    <div>
      <PageHeader title={exercise.name} description={exercise.nameEn} backTo="/exercises" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <WorkoutEntryCard
            activeWorkout={activeWorkout}
            isInActiveWorkout={isInActiveWorkout}
            workoutStatus={workoutStatus}
            onStart={handleStartWorkoutWithExercise}
            onAdd={handleAddToActiveWorkout}
          />

          <Card>
            {trajectory ? (
              <ExerciseTrajectoryViewer trajectory={trajectory} />
            ) : (
              <div data-testid="exercise-trajectory-fallback" className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">3D 动作轨迹</p>
                <h2 className="text-lg font-semibold text-white">该动作暂未配置 3D 动作轨迹</h2>
                <p className="text-sm leading-6 text-slate-300">原动作详情和加入当前训练功能仍可正常使用。</p>
              </div>
            )}
          </Card>

          <DetailList title="动作步骤" items={exercise.steps} ordered />
          <DetailList title="发力提示" items={exercise.cues} />
        </div>

        <div className="space-y-4">
          <DetailList title="常见错误" items={exercise.commonMistakes} />
          <Card>
            <dl className="grid gap-4 text-sm">
              <Meta title="主练肌群" values={exercise.primaryMuscles.map(formatMuscle)} />
              <Meta title="次要肌群" values={exercise.secondaryMuscles.map(formatMuscle)} />
              <Meta title="器械" values={exercise.equipment} />
              <Meta title="难度" values={[difficultyLabel(exercise.difficulty)]} />
            </dl>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-white">替代动作</h2>
            <div data-testid="contextual-alternatives" className="mt-3 flex flex-wrap gap-2">
              {contextualAlternatives.map((alternative) => (
                <Link
                  key={alternative.exercise.id}
                  to={`/exercises/${alternative.exercise.id}?muscleId=${currentMuscleId}`}
                  data-testid={`alternative-link-${alternative.exercise.id}`}
                  className="inline-flex flex-col gap-1 rounded-md border border-line bg-slate-950 px-3 py-2 text-sm hover:border-accent hover:text-accent"
                >
                  <span>{alternative.exercise.name}</span>
                  <span className="text-xs text-slate-400">{alternative.matchType === 'primary' ? '主练匹配' : '次要参与'}</span>
                </Link>
              ))}
            </div>
            {hasFewAlternatives ? <p className="mt-3 text-sm text-slate-300">当前肌群的替代动作较少，可到动作库查看更多相关动作。</p> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function WorkoutEntryCard({
  activeWorkout,
  isInActiveWorkout,
  workoutStatus,
  onStart,
  onAdd
}: {
  activeWorkout: ActiveWorkout | null;
  isInActiveWorkout: boolean;
  workoutStatus: string;
  onStart: () => void;
  onAdd: () => void;
}) {
  return (
    <Card className="border-cyan-400/50">
      <div data-testid="exercise-active-workout-entry" className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-white">加入训练</h2>
          <p className="mt-1 text-sm text-slate-300">
            {activeWorkout ? (isInActiveWorkout ? '该动作已在当前训练中' : '当前训练进行中') : '从这个动作开始一组训练'}
          </p>
        </div>
        {activeWorkout ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" className="min-h-11" onClick={onAdd} data-testid="add-exercise-to-active-workout">
              加入当前训练
            </Button>
            <Link
              to="/workout-log"
              data-testid="go-to-active-workout"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:border-accent hover:text-accent"
            >
              去记录
            </Link>
          </div>
        ) : (
          <Button type="button" className="min-h-11 w-full sm:w-fit" onClick={onStart} data-testid="start-workout-with-exercise">
            开始训练
          </Button>
        )}
        <p data-testid="exercise-active-workout-status" className="min-h-6 text-sm text-cyan-100">
          {workoutStatus}
        </p>
      </div>
    </Card>
  );
}

function Meta({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <dt className="font-semibold text-white">{title}</dt>
      <dd className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded-md bg-slate-950 px-2 py-1 text-slate-300">
            {value}
          </span>
        ))}
      </dd>
    </div>
  );
}

function getContextualAlternatives(exercise: Exercise, currentMuscleId: string): AlternativeMatch[] {
  const primaryMatches = exercises
    .filter((candidate) => candidate.id !== exercise.id && candidate.primaryMuscles.includes(currentMuscleId))
    .map((candidate) => ({ exercise: candidate, matchType: 'primary' as const }));

  const secondaryMatches = exercises
    .filter(
      (candidate) =>
        candidate.id !== exercise.id &&
        !candidate.primaryMuscles.includes(currentMuscleId) &&
        candidate.secondaryMuscles.includes(currentMuscleId)
    )
    .map((candidate) => ({ exercise: candidate, matchType: 'secondary' as const }));

  return [...primaryMatches, ...secondaryMatches].slice(0, MAX_CONTEXTUAL_ALTERNATIVES);
}

function DetailList({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  const ListTag = ordered ? 'ol' : 'ul';
  return (
    <Card>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <ListTag className={`mt-3 space-y-2 text-sm leading-6 text-slate-300 ${ordered ? 'list-decimal' : 'list-disc'} pl-5`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </Card>
  );
}

function formatMuscle(muscleId: string) {
  return getMuscleById(muscleId)?.nameZh ?? muscleId;
}

function difficultyLabel(difficulty: string) {
  if (difficulty === 'beginner') return '新手';
  if (difficulty === 'intermediate') return '进阶';
  return '高级';
}
