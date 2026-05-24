import PageHeader from '../components/layout/PageHeader';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { exercises, getExerciseById } from '../data/exercises';
import { getMuscleById } from '../data/muscles';
import type { Exercise } from '../types/exercise';

type AlternativeMatch = {
  exercise: Exercise;
  matchType: 'primary' | 'secondary';
};

const MAX_CONTEXTUAL_ALTERNATIVES = 6;

export default function ExerciseDetail() {
  const { exerciseId } = useParams();
  const [searchParams] = useSearchParams();
  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;

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

  return (
    <div>
      <PageHeader title={exercise.name} description={exercise.nameEn} backTo="/exercises" />
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <dl className="grid gap-4 text-sm">
            <Meta title="主练肌群" values={exercise.primaryMuscles.map(formatMuscle)} />
            <Meta title="次要肌群" values={exercise.secondaryMuscles.map(formatMuscle)} />
            <Meta title="器械" values={exercise.equipment} />
            <Meta title="难度" values={[difficultyLabel(exercise.difficulty)]} />
            <Meta title="类型" values={[exercise.mechanic === 'compound' ? '复合动作' : '孤立动作', exercise.force]} />
          </dl>
        </Card>

        <div className="space-y-4">
          <DetailList title="动作步骤" items={exercise.steps} ordered />
          <DetailList title="发力提示" items={exercise.cues} />
          <DetailList title="常见错误" items={exercise.commonMistakes} />
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
                  <span className="text-xs text-slate-400">{alternative.matchType === 'primary' ? '涓荤粌鍖归厤' : '娆¤鍙備笌'}</span>
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
