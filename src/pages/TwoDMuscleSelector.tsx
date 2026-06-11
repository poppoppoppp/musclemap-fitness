import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import InteractiveMuscleMap2D, { interactive2DMuscleIds } from '../components/muscle/InteractiveMuscleMap2D';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import { exercises } from '../data/exercises';
import { getMuscleById, muscles } from '../data/muscles';
import type { Exercise } from '../types/exercise';
import {
  addExerciseToExistingActiveWorkout,
  readActiveWorkout,
  startWorkoutWithExercise
} from '../utils/activeWorkout';
import { useAppStore } from '../store/useAppStore';

type MuscleGroup = {
  id: string;
  label: string;
  muscleIds: string[];
};

type RelatedExercise = {
  exercise: Exercise;
  matchType: 'primary' | 'secondary';
};

const MAX_RELATED_EXERCISES = 4;

const muscleGroups: MuscleGroup[] = [
  { id: 'back-partial', label: '背部', muscleIds: ['latissimus-dorsi', 'upper-trapezius', 'middle-lower-trapezius', 'rhomboids', 'teres-major', 'rear-deltoid', 'erector-spinae'] },
  { id: 'chest', label: '胸部', muscleIds: ['pectoralis-major'] },
  { id: 'shoulders-arms', label: '肩部', muscleIds: ['anterior-deltoid', 'lateral-deltoid', 'rear-deltoid'] },
  { id: 'arms', label: '手臂', muscleIds: ['biceps-brachii', 'triceps-brachii'] },
  { id: 'core', label: '核心', muscleIds: ['rectus-abdominis', 'obliques'] },
  { id: 'legs', label: '腿部', muscleIds: ['gluteus-maximus', 'quadriceps', 'hamstrings', 'calves'] }
];

const areaToGroupId: Record<string, string> = {
  back: 'back-partial',
  chest: 'chest',
  shoulders: 'shoulders-arms',
  arms: 'arms',
  core: 'core',
  legs: 'legs'
};

export default function TwoDMuscleSelector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialGroupId = areaToGroupId[searchParams.get('area') ?? ''] ?? 'back-partial';
  const setGlobalSelectedMuscleId = useAppStore((state) => state.setSelectedMuscleId);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [selectedMuscleId, setSelectedMuscleId] = useState(
    muscleGroups.find((group) => group.id === initialGroupId)?.muscleIds[0] ?? 'latissimus-dorsi'
  );
  const [workoutStatus, setWorkoutStatus] = useState('');

  const selectedGroup = muscleGroups.find((group) => group.id === selectedGroupId) ?? muscleGroups[0];
  const selectedMuscle = getMuscleById(selectedMuscleId) ?? getMuscleById('latissimus-dorsi');
  const visibleMuscles = selectedGroup.muscleIds
    .map((muscleId) => getMuscleById(muscleId))
    .filter((muscle): muscle is NonNullable<typeof muscle> => Boolean(muscle));
  const relatedExercises = useMemo(() => getRelatedExercises(selectedMuscleId), [selectedMuscleId]);

  useEffect(() => {
    if (!selectedGroup.muscleIds.includes(selectedMuscleId)) {
      setSelectedMuscleId(selectedGroup.muscleIds[0]);
    }
  }, [selectedGroup.muscleIds, selectedMuscleId]);

  const handleSelectGroup = (group: MuscleGroup) => {
    setSelectedGroupId(group.id);
    setSelectedMuscleId(group.muscleIds[0]);
    setWorkoutStatus('');
  };

  const handleSelectMuscle = (muscleId: string) => {
    if (!interactive2DMuscleIds.includes(muscleId)) return;

    setSelectedMuscleId(muscleId);
    setWorkoutStatus('');

    const matchingGroup = muscleGroups.find((group) => group.muscleIds.includes(muscleId));
    if (matchingGroup) setSelectedGroupId(matchingGroup.id);
  };

  const handleAddExerciseToWorkout = (exercise: Exercise) => {
    const activeWorkout = readActiveWorkout();

    if (!activeWorkout) {
      startWorkoutWithExercise(exercise.id);
      navigate('/workout-log');
      return;
    }

    const result = addExerciseToExistingActiveWorkout(exercise.id);
    if (result.status === 'duplicate') {
      setWorkoutStatus(`${exercise.nameEn} 已在当前训练中`);
      return;
    }

    if (result.status === 'missing') {
      startWorkoutWithExercise(exercise.id);
    }

    navigate('/workout-log');
  };

  return (
    <div className="pb-32 lg:pb-0">
      <PageHeader title="2D 肌群选择" description="选择肌群，查看动作，加入当前训练。" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4">
          <section data-testid="three-region-selector" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {muscleGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                data-testid={`select-three-region-${group.id}`}
                aria-pressed={selectedGroupId === group.id}
                className={[
                  'min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent',
                  selectedGroupId === group.id
                    ? 'border-[#2997ff] bg-[#2997ff] text-white'
                    : 'border-white/10 bg-[#1d1d1f] text-[#a1a1a6] hover:border-[#2997ff]/60 hover:text-white'
                ].join(' ')}
                onClick={() => handleSelectGroup(group)}
              >
                {group.label}
              </button>
            ))}
          </section>

          <section className="rounded-[22px] border border-white/10 bg-[#1d1d1f] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[#86868b]">当前区域</p>
                <h2 data-testid="three-current-region-label" className="text-lg font-semibold text-white">
                  {selectedGroup.label}
                </h2>
              </div>
              <span data-testid="glb-load-status" className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-[#8fb3d9]">
                2D 简化示意可用
              </span>
            </div>
            <InteractiveMuscleMap2D selectedMuscleId={selectedMuscleId} onSelectMuscle={handleSelectMuscle} />
            <div className="sr-only" aria-hidden="true">
              <span data-testid="glb-mesh-count">0</span>
              <span data-testid="glb-selected-mesh-name">{getLegacyRegionName(selectedMuscleId)}</span>
              <span data-testid="three-selected-muscle-id">{selectedMuscleId}</span>
              <span data-testid="three-mapping-source">hotspot-2d-svg</span>
            </div>
          </section>

          <section data-testid="three-muscle-options" className="flex flex-wrap gap-2">
            {visibleMuscles.map((muscle) => (
              <button
                key={muscle.id}
                type="button"
                data-testid={`select-three-muscle-option-${muscle.id}`}
                aria-pressed={selectedMuscleId === muscle.id}
                className={[
                  'rounded-full border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent',
                  selectedMuscleId === muscle.id
                    ? 'border-[#2997ff] bg-[#2997ff]/20 text-[#8fdcff]'
                    : 'border-white/10 bg-[#1d1d1f] text-[#a1a1a6] hover:border-[#2997ff]/60 hover:text-white'
                ].join(' ')}
                onClick={() => handleSelectMuscle(muscle.id)}
              >
                {muscle.nameZh}
              </button>
            ))}
          </section>
        </div>

        <aside className="space-y-4">
          {selectedMuscle ? (
            <section className="rounded-[22px] border border-white/10 bg-[#1d1d1f] p-5">
              <p className="text-sm font-semibold text-[#8fb3d9]">当前选择</p>
              <h2 data-testid="three-selected-muscle-name" className="mt-2 text-2xl font-semibold text-white">
                {selectedMuscle.nameZh}
              </h2>
              <p className="mt-1 text-sm text-[#86868b]">{selectedMuscle.nameEn}</p>
              <div data-testid="three-selected-muscle-description" className="mt-4 space-y-2 text-sm leading-6 text-[#a1a1a6]">
                <p>{selectedMuscle.description}</p>
                <p>{selectedMuscle.function}</p>
              </div>
              <Link
                to="/muscle-map"
                data-testid="three-related-actions-link"
                onClick={() => setGlobalSelectedMuscleId(selectedMuscle.id)}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 bg-[#2c2c2e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3a3c]"
              >
                查看相关动作
              </Link>
              <Link
                to="/muscle-map"
                data-testid="three-muscle-detail-link"
                onClick={() => setGlobalSelectedMuscleId(selectedMuscle.id)}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#2997ff]/50 bg-[#2997ff]/10 px-4 py-2 text-sm font-semibold text-[#8fdcff] transition hover:bg-[#2997ff]/20"
              >
                查看肌肉详情
              </Link>
            </section>
          ) : null}

          <section className="rounded-[22px] border border-white/10 bg-[#1d1d1f] p-5">
            <h2 className="text-lg font-semibold text-white">相关动作</h2>
            <div data-testid="three-related-exercises" className="mt-4 space-y-3">
              {selectedMuscle && relatedExercises.length > 0 ? (
                relatedExercises.map(({ exercise, matchType }) => (
                  <article
                    key={exercise.id}
                    data-testid={`three-related-exercise-card-${exercise.id}`}
                    className="rounded-2xl border border-white/10 bg-black/[0.32] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-white">{exercise.name}</p>
                        <p className="mt-1 break-words text-xs text-[#86868b]">{exercise.nameEn}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-1 text-xs text-[#a1a1a6]">
                        {matchType === 'primary' ? '主练' : '协同'}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <Link
                        to={`/exercises/${exercise.id}?muscleId=${selectedMuscle.id}`}
                        data-testid={`three-related-exercise-link-${exercise.id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-[#2c2c2e] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3a3c]"
                      >
                        查看详情
                      </Link>
                      <button
                        type="button"
                        data-testid={`three-add-exercise-${exercise.id}`}
                        onClick={() => handleAddExerciseToWorkout(exercise)}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#2997ff]/50 bg-[#2997ff] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#147ce5] focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        加入训练
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-[#a1a1a6]">暂无相关动作</p>
              )}
            </div>
            <p data-testid="three-active-workout-status" className="mt-3 min-h-6 text-sm text-[#8fdcff]">
              {workoutStatus}
            </p>
            {workoutStatus ? (
              <Link
                to="/workout-log"
                data-testid="three-go-active-workout"
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/10 bg-[#2c2c2e] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3a3c]"
              >
                去当前训练
              </Link>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function getRelatedExercises(muscleId: string): RelatedExercise[] {
  const primaryMatches = exercises
    .filter((exercise) => exercise.primaryMuscles.includes(muscleId))
    .map((exercise) => ({ exercise, matchType: 'primary' as const }));

  const secondaryMatches = exercises
    .filter((exercise) => !exercise.primaryMuscles.includes(muscleId) && exercise.secondaryMuscles.includes(muscleId))
    .map((exercise) => ({ exercise, matchType: 'secondary' as const }));

  return [...primaryMatches, ...secondaryMatches].slice(0, MAX_RELATED_EXERCISES);
}

function getLegacyRegionName(muscleId: string) {
  if (muscleId === 'latissimus-dorsi') return 'Simplified_left_latissimus_dorsi';
  return `2D-${muscleId}`;
}
