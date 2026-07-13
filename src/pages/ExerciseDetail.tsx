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
import type { PosturePrescription } from '../types/posture';
import {
  addExerciseToExistingActiveWorkout,
  isExerciseInActiveWorkout,
  readActiveWorkout,
  startWorkoutWithExercise
} from '../utils/activeWorkout';
import { getPostureProtocolById, isProtocolVisibleInApp, postureDataset } from '../utils/postureProtocols';

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
        <EmptyState title="未找到这个动作" description="请返回动作管理重新选择。" />
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
  const postureContext = getPostureContext(exercise.id, searchParams);
  const backTarget = getExerciseBackTarget(searchParams);

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
      <PageHeader
        title={exercise.name}
        description={exercise.nameEn}
        backTo={backTarget}
        backLabel={searchParams.get('from') === 'posture' ? '返回方案详情' : searchParams.get('from') === 'workout' ? '返回训练中' : '返回'}
        backTestId={searchParams.get('from') === 'posture' ? 'posture-detail-back' : undefined}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {exercise.category !== 'posture' ? <WorkoutEntryCard
            activeWorkout={activeWorkout}
            isInActiveWorkout={isInActiveWorkout}
            workoutStatus={workoutStatus}
            onStart={handleStartWorkoutWithExercise}
            onAdd={handleAddToActiveWorkout}
          /> : null}

          {postureContext ? <PostureProtocolContextCard context={postureContext} /> : null}

          {exercise.postureDetails ? <PostureExerciseOverview exercise={exercise} /> : <Card>
            {trajectory ? (
              <ExerciseTrajectoryViewer trajectory={trajectory} />
            ) : (
              <div data-testid="exercise-trajectory-fallback" className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-app-accent">3D 动作轨迹</p>
                <h2 className="text-lg font-semibold text-app-text">该动作暂未配置 3D 动作轨迹</h2>
                <p className="text-sm leading-6 text-app-muted">原动作详情和加入当前训练功能仍可正常使用。</p>
              </div>
            )}
          </Card>}

          <DetailList title="动作步骤" items={exercise.steps} ordered />
          <DetailList title="发力提示" items={exercise.cues} />
        </div>

        <div className="space-y-4">
          <DetailList title="常见错误" items={exercise.commonMistakes} />
          <Card>
            <dl className="grid gap-4 text-sm">
              {exercise.primaryMuscles.length ? <Meta title="主练肌群" values={exercise.primaryMuscles.map(formatMuscle)} /> : null}
              {exercise.secondaryMuscles.length ? <Meta title="次要肌群" values={exercise.secondaryMuscles.map(formatMuscle)} /> : null}
              <Meta title="器械" values={exercise.equipment} />
              <Meta title="难度" values={[difficultyLabel(exercise.difficulty)]} />
            </dl>
          </Card>
          {exercise.category !== 'posture' ? <Card>
            <h2 className="text-lg font-semibold text-app-text">替代动作</h2>
            <div data-testid="contextual-alternatives" className="mt-3 flex flex-wrap gap-2">
              {contextualAlternatives.map((alternative) => (
                <Link
                  key={alternative.exercise.id}
                  to={`/exercises/${alternative.exercise.id}?muscleId=${currentMuscleId}`}
                  data-testid={`alternative-link-${alternative.exercise.id}`}
                  className="inline-flex flex-col gap-1 rounded-xl border border-app-line bg-app-surfaceMuted px-3 py-2 text-sm hover:border-app-accent hover:text-app-accent"
                >
                  <span>{alternative.exercise.name}</span>
                  <span className="text-xs text-app-muted">{alternative.matchType === 'primary' ? '主练匹配' : '次要参与'}</span>
                </Link>
              ))}
            </div>
            {hasFewAlternatives ? <p className="mt-3 text-sm text-app-muted">当前肌群的替代动作较少，可到动作管理查看更多相关动作。</p> : null}
          </Card> : null}
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
    <Card className="border-app-accent/25">
      <div data-testid="exercise-active-workout-entry" className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-app-text">加入训练</h2>
          <p className="mt-1 text-sm text-app-muted">
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
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-app-line bg-app-surfaceMuted px-4 py-2 text-sm font-semibold text-app-text transition hover:border-app-accent hover:text-app-accent"
            >
              去记录
            </Link>
          </div>
        ) : (
          <Button type="button" className="min-h-11 w-full sm:w-fit" onClick={onStart} data-testid="start-workout-with-exercise">
            开始训练
          </Button>
        )}
        <p data-testid="exercise-active-workout-status" className="min-h-6 text-sm text-app-accent">
          {workoutStatus}
        </p>
      </div>
    </Card>
  );
}

function Meta({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <dt className="font-semibold text-app-text">{title}</dt>
      <dd className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded-full bg-app-surfaceMuted px-2 py-1 text-app-muted">
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
      <h2 className="text-lg font-semibold text-app-text">{title}</h2>
      <ListTag className={`mt-3 space-y-2 text-sm leading-6 text-app-muted ${ordered ? 'list-decimal' : 'list-disc'} pl-5`}>
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

type ResolvedPostureContext = {
  protocolName: string;
  issueNames: string[];
  order: number;
  prescription: PosturePrescription;
  roleExplanation: string;
  specialCues: string[];
};

function getExerciseBackTarget(searchParams: URLSearchParams) {
  if (searchParams.get('from') === 'workout') return '/workout-log';
  if (searchParams.get('from') !== 'posture') return '/exercises';
  const query = new URLSearchParams({ picker: 'posture' });
  for (const key of ['postureProtocolId', 'postureIssueId', 'postureScroll']) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }
  return `/workout-log?${query.toString()}`;
}

function getPostureContext(exerciseId: string, searchParams: URLSearchParams): ResolvedPostureContext | null {
  const protocolId = searchParams.get('postureProtocolId');
  if (protocolId) {
    const protocol = getPostureProtocolById(protocolId);
    const item = protocol?.exerciseItems.find((candidate) => candidate.exerciseId === exerciseId);
    if (!protocol || !isProtocolVisibleInApp(protocol) || !item) return null;
    return {
      protocolName: protocol.name,
      issueNames: protocol.targetIssueIds.flatMap((issueId) => {
        const issue = postureDataset.postureIssues.find(({ id }) => id === issueId);
        return issue ? [issue.name] : [];
      }),
      order: item.order,
      prescription: { ...item.prescription },
      roleExplanation: item.roleExplanation,
      specialCues: [...item.specialCues]
    };
  }

  const protocolInstanceId = searchParams.get('postureProtocolInstanceId');
  if (!protocolInstanceId) return null;
  const group = readActiveWorkout()?.postureProtocolGroups?.find(({ instanceId }) => instanceId === protocolInstanceId);
  const activeExerciseId = searchParams.get('activeExerciseId');
  const snapshot = group?.exerciseSnapshots.find((item) =>
    activeExerciseId ? item.instanceId === activeExerciseId : item.exerciseId === exerciseId
  );
  if (!group || !snapshot) return null;
  return {
    protocolName: group.nameSnapshot,
    issueNames: [...group.targetIssueNamesSnapshot],
    order: snapshot.order,
    prescription: { ...snapshot.prescription },
    roleExplanation: snapshot.roleExplanation,
    specialCues: [...snapshot.specialCues]
  };
}

function PostureProtocolContextCard({ context }: { context: ResolvedPostureContext }) {
  return (
    <Card className="border-lime-300/25">
      <section data-testid="posture-protocol-context">
        <p className="text-xs font-bold text-lime-300">本方案中的安排</p>
        <h2 className="mt-1 text-lg font-semibold text-app-text">{context.protocolName}</h2>
        <p className="mt-2 text-sm text-app-muted">{context.issueNames.join(' · ')}</p>
        <dl className="mt-4 grid gap-3 text-sm">
          <div><dt className="font-semibold text-app-text">当前顺序</dt><dd className="mt-1 text-app-muted">第 {context.order} 个动作</dd></div>
          <div><dt className="font-semibold text-app-text">本次处方</dt><dd className="mt-1 text-app-muted">{formatPosturePrescription(context.prescription)}</dd></div>
          <div><dt className="font-semibold text-app-text">方案作用</dt><dd className="mt-1 text-app-muted">{context.roleExplanation}</dd></div>
          {context.specialCues.length ? <div><dt className="font-semibold text-app-text">专项提示</dt><dd className="mt-1 text-app-muted">{context.specialCues.join(' · ')}</dd></div> : null}
        </dl>
      </section>
    </Card>
  );
}

function PostureExerciseOverview({ exercise }: { exercise: Exercise }) {
  const details = exercise.postureDetails!;
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold text-app-text">起始姿势</h2>
        <p className="mt-3 text-sm leading-6 text-app-muted">{details.startPosition}</p>
        <h2 className="mt-5 text-lg font-semibold text-app-text">呼吸</h2>
        <p className="mt-3 text-sm leading-6 text-app-muted">{details.breathing}</p>
      </Card>
      <Card>
        <details>
          <summary className="cursor-pointer text-lg font-semibold text-app-text">降阶、进阶与停止条件</summary>
          <div className="mt-3 space-y-3 text-sm leading-6 text-app-muted">
            {details.regression ? <p><strong className="text-app-text">降阶：</strong>{details.regression}</p> : null}
            {details.progression ? <p><strong className="text-app-text">进阶：</strong>{details.progression}</p> : null}
            {details.stopConditions.length ? <p><strong className="text-app-text">停止条件：</strong>{details.stopConditions.join(' · ')}</p> : null}
          </div>
        </details>
      </Card>
      <Card>
        <details>
          <summary className="cursor-pointer text-lg font-semibold text-app-text">来源与核验状态</summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-app-muted">
            <p><strong className="text-app-text">来源原始说明：</strong>{details.sourceSummary}</p>
            {details.sourceTimestamp ? <p><strong className="text-app-text">时间：</strong>{details.sourceTimestamp}</p> : null}
            <p><strong className="text-app-text">标准化状态：</strong>{details.verificationStatus}</p>
            <p><strong className="text-app-text">数据置信度：</strong>{details.dataConfidence}</p>
          </div>
        </details>
      </Card>
    </div>
  );
}

function formatPosturePrescription(prescription: PosturePrescription) {
  const parts = [
    prescription.sets !== null ? `${prescription.sets} 组` : '',
    prescription.reps !== null ? `${prescription.reps} 次` : '',
    prescription.durationSeconds !== null ? `${prescription.durationSeconds} 秒` : '',
    prescription.restSeconds !== null ? `休息 ${prescription.restSeconds} 秒` : '',
    prescription.frequencyText ?? ''
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : prescription.rawText || '视频未说明';
}
