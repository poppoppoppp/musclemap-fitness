import { normalizeMuscleId } from '../../utils/workoutSummary';

type WorkoutMuscleMap2DProps = {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
};

type HighlightState = 'primary' | 'secondary' | 'none';

type MuscleFigureProps = {
  muscleProps: (muscleId: string) => {
    fill: string;
    'data-testid': string;
    'data-highlight': HighlightState;
  };
};

const primaryFill = '#5b7cff';
const secondaryFill = '#8fb3d9';
const inactiveFill = '#3b4350';
const quietFill = '#242a33';
const skinFill = '#eef3f8';
const muscleStroke = '#d7e1ec';
const quietStroke = '#9aa8ba';

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
    <div className="grid grid-cols-2 gap-2" data-testid="workout-muscle-map-2d">
      <figure className="min-w-0 px-1">
        <figcaption className="mb-1 text-center text-xs font-semibold text-[#9aa8ba]">正面</figcaption>
        <FrontMuscleFigure muscleProps={muscleProps} />
      </figure>
      <figure className="min-w-0 px-1">
        <figcaption className="mb-1 text-center text-xs font-semibold text-[#9aa8ba]">背面</figcaption>
        <BackMuscleFigure muscleProps={muscleProps} />
      </figure>
    </div>
  );
}

function FrontMuscleFigure({ muscleProps }: MuscleFigureProps) {
  return (
    <svg
      viewBox="0 0 220 360"
      role="img"
      aria-label="本次训练正面肌群高亮图"
      className="mx-auto h-auto w-full max-w-[148px]"
    >
      <FigureFrame />
      <g stroke={muscleStroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
        <HeadAndNeck />

        <path {...muscleProps('shoulders')} d="M63 82c-17 3-28 12-33 27 14 7 28 4 41-8 3-8 0-15-8-19Z" />
        <path {...muscleProps('shoulders')} d="M157 82c17 3 28 12 33 27-14 7-28 4-41-8-3-8 0-15 8-19Z" />

        <path {...muscleProps('chest')} d="M72 104c13-15 27-18 39-8l-3 42c-17 4-32-2-45-18 0-7 3-13 9-16Z" />
        <path {...muscleProps('chest')} d="M148 104c-13-15-27-18-39-8l3 42c17 4 32-2 45-18 0-7-3-13-9-16Z" />

        <path {...muscleProps('biceps')} d="M36 115c-11 18-17 42-18 73 11 3 21-1 29-11l13-62c-7-5-15-5-24 0Z" />
        <path {...muscleProps('biceps')} d="M184 115c11 18 17 42 18 73-11 3-21-1-29-11l-13-62c7-5 15-5 24 0Z" />
        <path {...muscleProps('triceps')} d="M58 121c8 10 10 25 5 45l-13 42c-7-9-9-20-6-33l9-50Z" />
        <path {...muscleProps('triceps')} d="M162 121c-8 10-10 25-5 45l13 42c7-9 9-20 6-33l-9-50Z" />
        <path d="M20 190c4 17 10 32 18 47 8-1 14-6 18-15l-9-42c-9 8-18 11-27 10Z" fill={quietFill} />
        <path d="M200 190c-4 17-10 32-18 47-8-1-14-6-18-15l9-42c9 8 18 11 27 10Z" fill={quietFill} />

        <path {...muscleProps('abs')} d="M91 139h18v25H88c-2-9-1-18 3-25Z" />
        <path {...muscleProps('abs')} d="M111 139h18c4 7 5 16 3 25h-21Z" />
        <path {...muscleProps('abs')} d="M88 166h21v28H84c-2-10 0-20 4-28Z" />
        <path {...muscleProps('abs')} d="M111 166h21c4 8 6 18 4 28h-25Z" />
        <path {...muscleProps('abs')} d="M86 196h23v31l-26-10c-2-8-1-15 3-21Z" />
        <path {...muscleProps('abs')} d="M111 196h23c4 6 5 13 3 21l-26 10Z" />
        <path {...muscleProps('obliques')} d="M66 134c11 12 16 32 15 60l-9 30c-14-19-19-44-15-75 2-7 5-12 9-15Z" />
        <path {...muscleProps('obliques')} d="M154 134c-11 12-16 32-15 60l9 30c14-19 19-44 15-75-2-7-5-12-9-15Z" />

        <path {...muscleProps('quadriceps')} d="M71 228c13-4 25 0 34 12l-8 88c-18-17-29-43-32-77 0-10 2-18 6-23Z" />
        <path {...muscleProps('quadriceps')} d="M149 228c-13-4-25 0-34 12l8 88c18-17 29-43 32-77 0-10-2-18-6-23Z" />
        <path {...muscleProps('quadriceps')} d="M91 236c8 8 14 20 18 36l-1 54c-10-15-18-34-25-58 0-13 2-24 8-32Z" />
        <path {...muscleProps('quadriceps')} d="M129 236c-8 8-14 20-18 36l1 54c10-15 18-34 25-58 0-13-2-24-8-32Z" />
        <path {...muscleProps('calves')} d="M67 292c14 8 23 20 28 38l-8 21H59c-1-22 2-42 8-59Z" />
        <path {...muscleProps('calves')} d="M153 292c-14 8-23 20-28 38l8 21h28c1-22-2-42-8-59Z" />
      </g>
      <MuscleCutsFront />
    </svg>
  );
}

function BackMuscleFigure({ muscleProps }: MuscleFigureProps) {
  return (
    <svg
      viewBox="0 0 220 360"
      role="img"
      aria-label="本次训练背面肌群高亮图"
      className="mx-auto h-auto w-full max-w-[148px]"
    >
      <FigureFrame />
      <g stroke={muscleStroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
        <HeadAndNeck back />

        <path {...muscleProps('shoulders')} d="M62 82c-16 2-28 12-34 27 14 8 29 5 43-8 2-9 0-15-9-19Z" />
        <path {...muscleProps('shoulders')} d="M158 82c16 2 28 12 34 27-14 8-29 5-43-8-2-9 0-15 9-19Z" />
        <g {...muscleProps('back')}>
          <path d="M79 91c16-10 46-10 62 0l-14 32-17 13-17-13Z" />
          <path d="M72 104c13 7 24 20 31 40l-10 67c-20-17-33-49-39-97 5-6 11-9 18-10Z" />
          <path d="M148 104c-13 7-24 20-31 40l10 67c20-17 33-49 39-97-5-6-11-9-18-10Z" />
          <path d="M94 126c9 8 14 21 16 39-2 21-8 38-18 51l-8-73c1-7 4-13 10-17Z" />
          <path d="M126 126c-9 8-14 21-16 39 2 21 8 38 18 51l8-73c-1-7-4-13-10-17Z" />
        </g>

        <path {...muscleProps('triceps')} d="M36 114c-12 21-18 45-18 73 11 4 21 1 30-10l13-60c-7-5-15-6-25-3Z" />
        <path {...muscleProps('triceps')} d="M184 114c12 21 18 45 18 73-11 4-21 1-30-10l-13-60c7-5 15-6 25-3Z" />
        <path d="M20 190c5 18 11 33 18 47 8-1 14-6 18-15l-8-43c-9 9-19 12-28 11Z" fill={quietFill} />
        <path d="M200 190c-5 18-11 33-18 47-8-1-14-6-18-15l8-43c9 9 19 12 28 11Z" fill={quietFill} />

        <path {...muscleProps('glutes')} d="M70 217c16-11 31-9 41 6 0 24-10 39-31 45-17-12-20-29-10-51Z" />
        <path {...muscleProps('glutes')} d="M150 217c-16-11-31-9-41 6 0 24 10 39 31 45 17-12 20-29 10-51Z" />
        <path {...muscleProps('hamstrings')} d="M70 264c13-7 26-5 38 5l-10 62c-15-11-26-31-33-60 1-3 3-5 5-7Z" />
        <path {...muscleProps('hamstrings')} d="M150 264c-13-7-26-5-38 5l10 62c15-11 26-31 33-60-1-3-3-5-5-7Z" />
        <path {...muscleProps('calves')} d="M67 300c14 7 23 18 28 33l-8 18H59c-1-19 2-36 8-51Z" />
        <path {...muscleProps('calves')} d="M153 300c-14 7-23 18-28 33l8 18h28c1-19-2-36-8-51Z" />
      </g>
      <MuscleCutsBack />
    </svg>
  );
}

function FigureFrame() {
  return (
    <g fill="none" stroke={quietStroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" opacity="0.35">
      <path d="M61 82c-23 9-38 30-45 62M159 82c23 9 38 30 45 62" />
      <path d="M54 218c-6 43-5 88 1 136M166 218c6 43 5 88-1 136" />
      <path d="M42 351h40M138 351h40" />
    </g>
  );
}

function HeadAndNeck({ back = false }: { back?: boolean }) {
  return (
    <g stroke={muscleStroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
      <path d="M91 46c1-18 10-30 19-30s18 12 19 30c1 17-7 30-19 30S90 63 91 46Z" fill={skinFill} />
      {back ? (
        <path d="M91 45c7-13 31-13 38 0l-3-18c-11-12-25-12-36 0Z" fill={quietFill} />
      ) : (
        <path d="M88 42c5-20 39-22 45 0-5-9-13-10-21-4-7-6-15-5-24 4Z" fill={quietFill} />
      )}
      <path d="M98 74h24l5 15c-11 9-23 9-34 0Z" fill={quietFill} />
    </g>
  );
}

function MuscleCutsFront() {
  return (
    <g fill="none" stroke="#eef3f8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" opacity="0.8">
      <path d="M110 96v132M67 122c25 10 61 10 86 0M86 164h48M84 194h52M82 218c19 10 37 10 56 0" />
      <path d="M39 132c9 9 15 23 18 42M181 132c-9 9-15 23-18 42" />
      <path d="M75 239c11 16 18 45 20 87M145 239c-11 16-18 45-20 87" />
      <path d="M72 294c6 14 13 26 23 36M148 294c-6 14-13 26-23 36" />
    </g>
  );
}

function MuscleCutsBack() {
  return (
    <g fill="none" stroke="#eef3f8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" opacity="0.78">
      <path d="M110 90v132M82 102c16 21 25 44 28 70M138 102c-16 21-25 44-28 70" />
      <path d="M72 124c14 11 25 23 32 38M148 124c-14 11-25 23-32 38" />
      <path d="M81 224c16 12 42 12 58 0M74 252c20 10 52 10 72 0" />
      <path d="M76 270c10 15 17 36 22 61M144 270c-10 15-17 36-22 61" />
      <path d="M72 306c7 12 15 21 24 27M148 306c-7 12-15 21-24 27" />
    </g>
  );
}
