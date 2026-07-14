import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ExerciseDetailActionBar from '../components/exercise/detail/ExerciseDetailActionBar';
import ExerciseDetailLinks, { type ExerciseDetailSheetType } from '../components/exercise/detail/ExerciseDetailLinks';
import ExerciseDetailSheets, { type OpenExerciseSheet } from '../components/exercise/detail/ExerciseDetailSheets';
import ExerciseKeyCues from '../components/exercise/detail/ExerciseKeyCues';
import ExerciseMediaPanel from '../components/exercise/detail/ExerciseMediaPanel';
import ExerciseTroubleshooting from '../components/exercise/detail/ExerciseTroubleshooting';
import { getExerciseById } from '../data/exercises';
import { getMuscleById } from '../data/muscles';
import type { ActiveWorkout } from '../types/activeWorkout';
import type { PostureDose, PostureDoseConfidence, PosturePrescription } from '../types/posture';
import {
  addExerciseToExistingActiveWorkout,
  isExerciseInActiveWorkout,
  readActiveWorkout,
  startWorkoutWithExercise
} from '../utils/activeWorkout';
import { resolveExerciseDetail } from '../utils/exerciseDetail';
import { readExerciseFavorites, toggleExerciseFavorite } from '../utils/exerciseFavorites';
import { formatDose, getPostureProtocolById, getPostureStandardExerciseById, isProtocolVisibleInApp, postureDataset } from '../utils/postureProtocols';

export default function ExerciseDetail() {
  const { exerciseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(() => readActiveWorkout());
  const [status, setStatus] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [openSheet, setOpenSheet] = useState<OpenExerciseSheet>(null);

  useEffect(() => {
    setActiveWorkout(readActiveWorkout());
    setStatus('');
    setOpenSheet(null);
    setFavorite(exerciseId ? readExerciseFavorites().has(exerciseId) : false);
  }, [exerciseId]);

  if (!exercise) {
    return (
      <div className="exercise-detail-dark -mx-4 -mt-5 min-h-screen bg-[#080a08] px-4 py-8 text-white sm:-mx-6 sm:px-6">
        <Link to="/exercises" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">← 返回动作管理</Link>
        <div className="mx-auto mt-20 max-w-sm text-center"><h1 className="text-2xl font-black">未找到这个动作</h1><p className="mt-2 text-sm text-zinc-400">请返回动作管理重新选择。</p></div>
      </div>
    );
  }

  const queryMuscleId = searchParams.get('muscleId');
  const fallbackMuscleId = exercise.primaryMuscles[0];
  const currentMuscleId = queryMuscleId && getMuscleById(queryMuscleId) ? queryMuscleId : fallbackMuscleId;
  const detail = resolveExerciseDetail(exercise, currentMuscleId);
  const isInActiveWorkout = activeWorkout ? isExerciseInActiveWorkout(activeWorkout, exercise.id) : false;
  const primaryLabel = activeWorkout ? (isInActiveWorkout ? '返回当前训练' : '加入当前训练') : '添加到训练';
  const postureContext = getPostureContext(exercise.id, searchParams);
  const backTarget = getExerciseBackTarget(searchParams);

  const navigateToWorkout = (workout: ActiveWorkout) => {
    const activeExercise = workout.exercises.find((item) => item.exerciseId === exercise.id);
    navigate(activeExercise ? `/workout-log?focusExercise=${activeExercise.id}` : '/workout-log');
  };

  const addToWorkout = () => {
    const result = addExerciseToExistingActiveWorkout(exercise.id);
    if (result.status === 'missing' || !result.workout) {
      const workout = startWorkoutWithExercise(exercise.id);
      setActiveWorkout(workout);
      return workout;
    }
    setActiveWorkout(result.workout);
    if (result.status === 'added') setStatus('已加入当前训练');
    return result.workout;
  };

  const handlePrimary = () => {
    if (!activeWorkout) {
      navigateToWorkout(addToWorkout());
      return;
    }
    if (isInActiveWorkout) {
      navigateToWorkout(activeWorkout);
      return;
    }
    addToWorkout();
  };

  const handleRecord = () => {
    const workout = activeWorkout && isInActiveWorkout ? activeWorkout : addToWorkout();
    navigateToWorkout(workout);
  };

  const handleFavorite = () => {
    setFavorite(toggleExerciseFavorite(exercise.id));
  };

  const handleOpenDetailSheet = (type: ExerciseDetailSheetType) => setOpenSheet(type);

  return (
    <div className="exercise-detail-dark -mx-4 -mt-5 min-h-screen bg-[#080a08] text-white sm:-mx-6">
      <ExerciseDetailHeader backTo={backTarget} backTestId={searchParams.get('from') === 'posture' ? 'posture-detail-back' : undefined} favorite={favorite} onFavorite={handleFavorite} />

      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-[calc(9.75rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-7 md:pb-4">
        <section data-exercise-section="title">
          <h1 className="text-[2rem] font-black leading-tight tracking-[-0.035em] text-zinc-50 sm:text-4xl">{exercise.name}</h1>
          <div data-testid="exercise-detail-tags" className="mt-4 flex flex-wrap gap-2">
            <ExerciseTag type="region" label={detail.primaryRegion} />
            <ExerciseTag type="equipment" label={detail.equipment} />
            <ExerciseTag type="laterality" label={detail.lateralityLabel} />
          </div>
        </section>

        <ExerciseMediaPanel media={detail.media} exerciseName={exercise.name} />
        <ExerciseKeyCues cues={detail.keyCues} />
        <ExerciseTroubleshooting items={detail.troubleshooting} onSelect={setOpenSheet} onViewAll={() => setOpenSheet('troubleshooting-all')} />
        <ExerciseDetailLinks onOpen={handleOpenDetailSheet} />
      </main>

      <ExerciseDetailActionBar primaryLabel={primaryLabel} status={status} onRecord={handleRecord} onPrimary={handlePrimary} />
      <ExerciseDetailSheets
        openSheet={openSheet}
        detail={detail}
        postureContent={postureContext ? <PostureContextContent context={postureContext} /> : undefined}
        onClose={() => setOpenSheet(null)}
        onSelectIssue={setOpenSheet}
      />
    </div>
  );
}

function ExerciseDetailHeader({ backTo, backTestId, favorite, onFavorite }: { backTo: string; backTestId?: string; favorite: boolean; onFavorite: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#080a08] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto grid max-w-3xl grid-cols-[44px_minmax(0,1fr)_44px] items-center">
        <Link to={backTo} aria-label="返回" data-testid={backTestId} className="grid h-11 w-11 place-items-center rounded-xl text-zinc-100 transition hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-lime-300/60">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <p className="truncate text-center text-base font-bold text-zinc-100">动作详情</p>
        <button type="button" aria-label={favorite ? '取消收藏' : '收藏动作'} aria-pressed={favorite} onClick={onFavorite} className={`grid h-11 w-11 place-items-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-lime-300/60 ${favorite ? 'text-lime-300' : 'text-zinc-300 hover:bg-white/[0.05]'}`}>
          <svg viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} className="h-6 w-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9z" /></svg>
        </button>
      </div>
    </header>
  );
}

function ExerciseTag({ type, label }: { type: 'region' | 'equipment' | 'laterality'; label: string }) {
  const paths = {
    region: <><circle cx="12" cy="5" r="2.5" /><path d="M8 21v-8a4 4 0 0 1 8 0v8M5 11l3-2m11 2-3-2" /></>,
    equipment: <><path d="M7 9v6M4 10v4M17 9v6M20 10v4M7 12h10" /></>,
    laterality: <><circle cx="12" cy="5" r="2.5" /><path d="M9 21v-8a3 3 0 0 1 6 0v8M9 11l-4 3m10-3 4 3" /></>
  };
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-zinc-300">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-lime-300" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>
      {label}
    </span>
  );
}

type ResolvedPostureContext = {
  protocolName: string;
  issueNames: string[];
  order: number;
  prescription: PosturePrescription;
  dose?: PostureDose;
  doseConfidence?: PostureDoseConfidence;
  groupLabel?: string;
  roleExplanation: string;
  specialCues: string[];
  limitations: string[];
  visualReviewRequired?: boolean;
  visualReviewNote?: string;
};

function getExerciseBackTarget(searchParams: URLSearchParams) {
  if (searchParams.get('from') === 'workout') return '/workout-log';
  if (searchParams.get('from') !== 'posture') return '/exercises';
  const query = new URLSearchParams({ picker: 'posture' });
  for (const key of ['postureProtocolId', 'postureCategoryId', 'postureIssueId', 'postureScroll']) {
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
    const step = protocol?.steps.find((candidate) => candidate.kind === 'exercise' && candidate.exerciseId === exerciseId);
    if (!protocol || !isProtocolVisibleInApp(protocol) || !item) return null;
    const standardExercise = getPostureStandardExerciseById(exerciseId);
    return {
      protocolName: protocol.name,
      issueNames: protocol.targetIssueIds.flatMap((issueId) => {
        const issue = postureDataset.postureIssues.find(({ id }) => id === issueId);
        return issue ? [issue.name] : [];
      }),
      order: item.order,
      prescription: { ...item.prescription },
      dose: step?.dose ? { ...step.dose, durationRangeSeconds: step.dose.durationRangeSeconds ? [...step.dose.durationRangeSeconds] : undefined } : undefined,
      doseConfidence: step?.dose?.confidence,
      groupLabel: step?.groupLabel,
      roleExplanation: item.roleExplanation,
      specialCues: [...item.specialCues],
      limitations: [...protocol.limitations],
      visualReviewRequired: standardExercise?.visualReviewRequired,
      visualReviewNote: standardExercise?.visualReviewNote
    };
  }

  const protocolInstanceId = searchParams.get('postureProtocolInstanceId');
  if (!protocolInstanceId) return null;
  const group = readActiveWorkout()?.postureProtocolGroups?.find(({ instanceId }) => instanceId === protocolInstanceId);
  const activeExerciseId = searchParams.get('activeExerciseId');
  const snapshot = group?.exerciseSnapshots.find((item) => activeExerciseId ? item.instanceId === activeExerciseId : item.exerciseId === exerciseId);
  const stepSnapshot = group?.stepSnapshots?.find((item) => activeExerciseId ? item.exerciseInstanceId === activeExerciseId : item.exerciseId === exerciseId);
  if (!group || !snapshot) return null;
  return {
    protocolName: group.nameSnapshot,
    issueNames: [...group.targetIssueNamesSnapshot],
    order: snapshot.order,
    prescription: { ...snapshot.prescription },
    dose: stepSnapshot?.dose ? { ...stepSnapshot.dose, durationRangeSeconds: stepSnapshot.dose.durationRangeSeconds ? [...stepSnapshot.dose.durationRangeSeconds] : undefined } : snapshot.dose,
    doseConfidence: stepSnapshot?.dose?.confidence ?? snapshot.doseConfidence,
    groupLabel: stepSnapshot?.groupLabel ?? snapshot.groupLabel,
    roleExplanation: snapshot.roleExplanation,
    specialCues: [...snapshot.specialCues],
    limitations: [...(group.limitationsSnapshot ?? [])],
    visualReviewRequired: stepSnapshot?.visualReviewRequired ?? snapshot.visualReviewRequired,
    visualReviewNote: stepSnapshot?.visualReviewNote ?? snapshot.visualReviewNote
  };
}

function PostureContextContent({ context }: { context: ResolvedPostureContext }) {
  return (
    <section data-testid="posture-protocol-context" className="border-t border-white/10 pt-5">
      <h3 className="text-sm font-bold text-zinc-100">当前姿态方案</h3>
      <p className="mt-2 text-sm font-semibold text-lime-200">{context.protocolName}</p>
      <dl className="mt-3 space-y-3 text-sm">
        {context.issueNames.length ? <div><dt className="font-semibold text-zinc-200">目标问题</dt><dd className="mt-1 text-zinc-400">{context.issueNames.join(' · ')}</dd></div> : null}
        <div><dt className="font-semibold text-zinc-200">方案位置</dt><dd className="mt-1 text-zinc-400">第 {context.order} 个动作{context.groupLabel ? ` · ${context.groupLabel}` : ''}</dd></div>
        <div><dt className="font-semibold text-zinc-200">本次处方</dt><dd className="mt-1 text-zinc-400">{context.dose ? formatDose(context.dose) : formatPosturePrescription(context.prescription)}</dd></div>
        {context.doseConfidence === 'low' || context.doseConfidence === 'mediumLow' ? <div><dt className="font-semibold text-zinc-200">剂量置信度</dt><dd className="mt-1 text-amber-200">低置信度，仅保留原始信息</dd></div> : null}
        <div><dt className="font-semibold text-zinc-200">方案作用</dt><dd className="mt-1 text-zinc-400">{context.roleExplanation}</dd></div>
        {context.specialCues.length ? <div><dt className="font-semibold text-zinc-200">专项提示</dt><dd className="mt-1 text-zinc-400">{context.specialCues.join(' · ')}</dd></div> : null}
        {context.limitations.length ? <div><dt className="font-semibold text-zinc-200">适用边界</dt><dd className="mt-1 text-zinc-400">{context.limitations.join(' · ')}</dd></div> : null}
        {context.visualReviewRequired ? <div><dt className="font-semibold text-zinc-200">图示状态</dt><dd className="mt-1 text-amber-200">动作图示待人工复核{context.visualReviewNote ? `：${context.visualReviewNote}` : ''}</dd></div> : null}
      </dl>
    </section>
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
  return parts.length ? parts.join(' · ') : prescription.rawText || '按方案说明完成';
}
