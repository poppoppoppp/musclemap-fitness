import { normalizeMuscleId } from '../../utils/workoutSummary';

type WorkoutMuscleMap2DProps = {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
};

type HighlightState = 'primary' | 'secondary' | 'none';

const primaryFill = '#2997ff';
const secondaryFill = '#66d9e8';
const inactiveFill = '#343842';
const bodyStroke = '#7b8494';

export default function WorkoutMuscleMap2D({ primaryMuscles, secondaryMuscles = [] }: WorkoutMuscleMap2DProps) {
  const primary = new Set(primaryMuscles.map(normalizeMuscleId));
  const secondary = new Set(secondaryMuscles.map(normalizeMuscleId).filter((muscleId) => !primary.has(muscleId)));

  const getHighlight = (muscleId: string): HighlightState => {
    const normalized = normalizeMuscleId(muscleId);
    if (primary.has(normalized)) return 'primary';
    if (secondary.has(normalized)) return 'secondary';
    return 'none';
  };

  const getFill = (muscleId: string) => {
    const highlight = getHighlight(muscleId);
    if (highlight === 'primary') return primaryFill;
    if (highlight === 'secondary') return secondaryFill;
    return inactiveFill;
  };

  const muscleProps = (muscleId: string) => ({
    fill: getFill(muscleId),
    'data-testid': `workout-muscle-${normalizeMuscleId(muscleId)}`,
    'data-highlight': getHighlight(muscleId)
  });

  return (
    <div className="grid gap-4 min-[420px]:grid-cols-2" data-testid="workout-muscle-map-2d">
      <figure className="rounded-2xl border border-white/10 bg-black/25 p-3">
        <figcaption className="mb-2 text-center text-xs font-semibold text-[#86868b]">正面</figcaption>
        <svg viewBox="0 0 150 260" role="img" aria-label="本次训练正面肌群高亮图" className="mx-auto h-64 max-h-[48vw] min-h-48 w-full max-w-[160px]">
          <BodyBase />
          <path {...muscleProps('shoulders')} d="M42 65c9-11 22-12 31-3l-9 19-25-4Z" />
          <path {...muscleProps('shoulders')} d="M108 65c-9-11-22-12-31-3l9 19 25-4Z" />
          <path {...muscleProps('chest')} d="M48 78c12-12 22-13 27-2v30H48c-7-7-8-20 0-28Z" />
          <path {...muscleProps('chest')} d="M102 78c-12-12-22-13-27-2v30h27c7-7 8-20 0-28Z" />
          <path {...muscleProps('biceps')} d="M33 86c-10 17-12 39-9 62l17-4 9-55Z" />
          <path {...muscleProps('biceps')} d="M117 86c10 17 12 39 9 62l-17-4-9-55Z" />
          <path {...muscleProps('abs')} d="M61 110h28l5 55-19 15-19-15Z" />
          <path {...muscleProps('obliques')} d="M48 111h13l-5 54-17-18Z" />
          <path {...muscleProps('obliques')} d="M102 111H89l5 54 17-18Z" />
          <path {...muscleProps('quadriceps')} d="M54 174h20l-5 60H45Z" />
          <path {...muscleProps('quadriceps')} d="M96 174H76l5 60h24Z" />
          <path {...muscleProps('calves')} d="M45 230h23l-4 23H42Z" />
          <path {...muscleProps('calves')} d="M105 230H82l4 23h22Z" />
        </svg>
      </figure>
      <figure className="rounded-2xl border border-white/10 bg-black/25 p-3">
        <figcaption className="mb-2 text-center text-xs font-semibold text-[#86868b]">背面</figcaption>
        <svg viewBox="0 0 150 260" role="img" aria-label="本次训练背面肌群高亮图" className="mx-auto h-64 max-h-[48vw] min-h-48 w-full max-w-[160px]">
          <BodyBase />
          <path {...muscleProps('shoulders')} d="M41 66c10-12 23-13 34-4l-12 24-24-7Z" />
          <path {...muscleProps('shoulders')} d="M109 66c-10-12-23-13-34-4l12 24 24-7Z" />
          <path {...muscleProps('back')} d="M49 76c14-9 38-9 52 0l-9 72-17 19-17-19Z" />
          <path {...muscleProps('triceps')} d="M32 89c-9 18-11 38-8 60l16-4 11-55Z" />
          <path {...muscleProps('triceps')} d="M118 89c9 18 11 38 8 60l-16-4-11-55Z" />
          <path {...muscleProps('glutes')} d="M52 158c13-8 22-5 23 11-2 17-11 25-25 18-8-11-7-20 2-29Z" />
          <path {...muscleProps('glutes')} d="M98 158c-13-8-22-5-23 11 2 17 11 25 25 18 8-11 7-20-2-29Z" />
          <path {...muscleProps('hamstrings')} d="M52 188h22l-6 47H45Z" />
          <path {...muscleProps('hamstrings')} d="M98 188H76l6 47h23Z" />
          <path {...muscleProps('calves')} d="M45 230h23l-4 23H42Z" />
          <path {...muscleProps('calves')} d="M105 230H82l4 23h22Z" />
        </svg>
      </figure>
    </div>
  );
}

function BodyBase() {
  return (
    <g fill="none" stroke={bodyStroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" opacity="0.65">
      <circle cx="75" cy="34" r="20" fill="#20242d" />
      <path d="M57 56c12 7 24 7 36 0M39 77 23 148l17 5M111 77l16 71-17 5M54 173l-11 80h22M96 173l11 80H85" />
      <path d="M52 75c-8 28-7 61 2 93M98 75c8 28 7 61-2 93M75 58v122" />
    </g>
  );
}
