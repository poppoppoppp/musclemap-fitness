import { getMuscleById } from '../../data/muscles';
import type { Exercise } from '../../types/exercise';

interface ExerciseMetaProps {
  exercise: Exercise;
  selectedMuscleFilter?: string;
}

export default function ExerciseMeta({ exercise, selectedMuscleFilter = '' }: ExerciseMetaProps) {
  const matchLabel = getMatchLabel(exercise, selectedMuscleFilter);

  return (
    <div className="space-y-2 text-xs text-app-muted">
      {matchLabel ? (
        <span className="inline-flex min-h-7 items-center rounded-full border border-app-accent/70 bg-app-accent/15 px-2.5 py-1 font-semibold text-app-accent">
          {matchLabel}
        </span>
      ) : null}
      <MetaRow label="主练" values={exercise.primaryMuscles.map(formatMuscle)} />
      <MetaRow label="次要" values={exercise.secondaryMuscles.map(formatMuscle)} />
      <MetaRow label="器械" values={exercise.equipment} />
      <MetaRow label="难度" values={[difficultyLabel(exercise.difficulty)]} />
    </div>
  );
}

function MetaRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <span className="mr-2 text-app-muted">{label}</span>
      <span>{values.join('、')}</span>
    </div>
  );
}

function getMatchLabel(exercise: Exercise, selectedMuscleFilter: string) {
  if (!selectedMuscleFilter) return '';
  if (exercise.primaryMuscles.includes(selectedMuscleFilter)) return '主练匹配';
  if (exercise.secondaryMuscles.includes(selectedMuscleFilter)) return '次要参与';
  return '';
}

function formatMuscle(muscleId: string) {
  return getMuscleById(muscleId)?.nameZh ?? muscleId;
}

function difficultyLabel(difficulty: string) {
  if (difficulty === 'beginner') return '新手';
  if (difficulty === 'intermediate') return '进阶';
  return '高级';
}
