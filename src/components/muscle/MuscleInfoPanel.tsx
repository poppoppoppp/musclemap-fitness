import { Link } from 'react-router-dom';
import { exercises } from '../../data/exercises';
import type { Muscle } from '../../types/muscle';
import Card from '../ui/Card';

interface MuscleInfoPanelProps {
  muscle: Muscle;
}

export default function MuscleInfoPanel({ muscle }: MuscleInfoPanelProps) {
  const recommendedExercises = muscle.exerciseIds
    .map((exerciseId) => exercises.find((exercise) => exercise.id === exerciseId))
    .filter((exercise) => Boolean(exercise));

  return (
    <Card className="h-fit">
      <div className="border-b border-line pb-4">
        <p className="text-sm font-semibold text-accent">{muscle.nameEn}</p>
        <h2 className="mt-1 text-2xl font-bold text-white">{muscle.nameZh}</h2>
        <p className="mt-2 text-sm text-slate-400">
          {muscle.bodyPart} / {muscle.region}
        </p>
      </div>

      <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
        <InfoBlock title="肌肉说明" content={muscle.description} />
        <InfoBlock title="肌肉功能" content={muscle.function} />
        <InfoBlock title="训练价值" content={muscle.trainingValue} />
        <ListBlock title="容易混淆点" items={muscle.confusions} />
        <ListBlock title="常见训练错误" items={muscle.commonMistakes} />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-white">推荐动作</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {recommendedExercises.map((exercise) => (
            <Link
              key={exercise!.id}
              to={`/exercises/${exercise!.id}?muscleId=${muscle.id}`}
              className="inline-flex min-h-11 items-center rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-slate-100 hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {exercise!.name}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}

function InfoBlock({ title, content }: { title: string; content: string }) {
  return (
    <section>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1">{content}</p>
    </section>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="font-semibold text-white">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
