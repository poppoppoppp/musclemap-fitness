import type { KeyboardEvent } from 'react';

type InteractiveMuscleMap2DProps = {
  selectedMuscleId: string;
  onSelectMuscle: (muscleId: string) => void;
};

type MuscleRegion = {
  id: string;
  view: 'front' | 'back';
  label: string;
  ariaLabel?: string;
  testId?: string;
  paths: string[];
};

const regions: MuscleRegion[] = [
  {
    id: 'pectoralis-major',
    view: 'front',
    label: '胸',
    paths: [
      'M70 101c13-14 29-17 40-7l-3 43c-19 5-35-2-48-18 0-8 4-14 11-18Z',
      'M150 101c-13-14-29-17-40-7l3 43c19 5 35-2 48-18 0-8-4-14-11-18Z'
    ]
  },
  {
    id: 'anterior-deltoid',
    view: 'front',
    label: '肩前束',
    paths: [
      'M63 81c-18 2-30 12-36 28 14 8 30 5 44-8 3-9 0-16-8-20Z',
      'M157 81c18 2 30 12 36 28-14 8-30 5-44-8-3-9 0-16 8-20Z'
    ]
  },
  {
    id: 'lateral-deltoid',
    view: 'front',
    label: '肩中束',
    paths: [
      'M55 101c-10 6-17 17-22 32 11 5 22 2 31-9l9-20c-5-4-11-5-18-3Z',
      'M165 101c10 6 17 17 22 32-11 5-22 2-31-9l-9-20c5-4 11-5 18-3Z'
    ]
  },
  {
    id: 'biceps-brachii',
    view: 'front',
    label: '肱二头',
    paths: [
      'M35 121c-12 19-18 43-18 72 11 4 22 0 31-11l13-59c-7-6-16-7-26-2Z',
      'M185 121c12 19 18 43 18 72-11 4-22 0-31-11l-13-59c7-6 16-7 26-2Z'
    ]
  },
  {
    id: 'triceps-brachii',
    view: 'back',
    label: '肱三头',
    paths: [
      'M36 116c-12 20-18 44-18 73 11 4 22 1 31-10l13-60c-7-5-16-6-26-3Z',
      'M184 116c12 20 18 44 18 73-11 4-22 1-31-10l-13-60c7-5 16-6 26-3Z'
    ]
  },
  {
    id: 'rectus-abdominis',
    view: 'front',
    label: '腹直肌',
    paths: [
      'M88 140h21v25H85c-2-9-1-18 3-25Z',
      'M111 140h21c4 7 5 16 3 25h-24Z',
      'M85 168h24v28H82c-2-10-1-20 3-28Z',
      'M111 168h24c4 8 5 18 3 28h-27Z',
      'M84 199h25v29l-28-11c-1-7 0-13 3-18Z',
      'M111 199h25c3 5 4 11 3 18l-28 11Z'
    ]
  },
  {
    id: 'obliques',
    view: 'front',
    label: '腹斜肌',
    paths: [
      'M65 134c12 12 17 33 16 61l-9 31c-15-20-20-45-16-77 2-7 5-12 9-15Z',
      'M155 134c-12 12-17 33-16 61l9 31c15-20 20-45 16-77-2-7-5-12-9-15Z'
    ]
  },
  {
    id: 'quadriceps',
    view: 'front',
    label: '股四头',
    paths: [
      'M70 228c13-5 25-1 35 12l-8 89c-19-17-30-43-33-77 0-10 2-18 6-24Z',
      'M150 228c-13-5-25-1-35 12l8 89c19-17 30-43 33-77 0-10-2-18-6-24Z',
      'M90 237c9 8 15 20 19 36l-1 54c-11-15-19-35-26-59 0-13 3-23 8-31Z',
      'M130 237c-9 8-15 20-19 36l1 54c11-15 19-35 26-59 0-13-3-23-8-31Z'
    ]
  },
  {
    id: 'latissimus-dorsi',
    view: 'back',
    label: '背阔肌',
    testId: 'muscle-region-latissimus-dorsi-left',
    paths: [
      'M72 104c13 7 24 20 31 40l-10 67c-20-17-33-49-39-97 5-6 11-9 18-10Z',
      'M148 104c-13 7-24 20-31 40l10 67c20-17 33-49 39-97-5-6-11-9-18-10Z'
    ]
  },
  {
    id: 'upper-trapezius',
    view: 'back',
    label: '上斜方',
    paths: ['M79 91c16-10 46-10 62 0l-14 32-17 13-17-13Z']
  },
  {
    id: 'middle-lower-trapezius',
    view: 'back',
    label: '中下斜方',
    paths: [
      'M94 126c9 8 14 21 16 39-2 21-8 38-18 51l-8-73c1-7 4-13 10-17Z',
      'M126 126c-9 8-14 21-16 39 2 21 8 38 18 51l8-73c-1-7-4-13-10-17Z'
    ]
  },
  {
    id: 'rhomboids',
    view: 'back',
    label: '菱形肌',
    testId: 'muscle-region-rhomboids-center',
    paths: ['M92 133l18-19 18 19-18 31Z']
  },
  {
    id: 'teres-major',
    view: 'back',
    label: '大圆肌',
    paths: [
      'M64 108c13-7 25-6 36 4l-7 18c-14 4-27 1-39-9 2-6 5-10 10-13Z',
      'M156 108c-13-7-25-6-36 4l7 18c14 4 27 1 39-9-2-6-5-10-10-13Z'
    ]
  },
  {
    id: 'rear-deltoid',
    view: 'back',
    label: '后束肩',
    paths: [
      'M62 82c-16 2-28 12-34 27 14 8 29 5 43-8 2-9 0-15-9-19Z',
      'M158 82c16 2 28 12 34 27-14 8-29 5-43-8-2-9 0-15 9-19Z'
    ]
  },
  {
    id: 'erector-spinae',
    view: 'back',
    label: '竖脊肌',
    paths: [
      'M98 154c7 17 10 39 8 66l-12 31c-8-29-10-62-6-99 3-2 6-2 10 2Z',
      'M122 154c-7 17-10 39-8 66l12 31c8-29 10-62 6-99-3-2-6-2-10 2Z'
    ]
  },
  {
    id: 'gluteus-maximus',
    view: 'back',
    label: '臀大肌',
    paths: [
      'M70 217c16-11 31-9 41 6 0 24-10 39-31 45-17-12-20-29-10-51Z',
      'M150 217c-16-11-31-9-41 6 0 24 10 39 31 45 17-12 20-29 10-51Z'
    ]
  },
  {
    id: 'hamstrings',
    view: 'back',
    label: '腘绳肌',
    paths: [
      'M70 264c13-7 26-5 38 5l-10 62c-15-11-26-31-33-60 1-3 3-5 5-7Z',
      'M150 264c-13-7-26-5-38 5l10 62c15-11 26-31 33-60-1-3-3-5-5-7Z'
    ]
  },
  {
    id: 'calves',
    view: 'back',
    label: '小腿',
    paths: [
      'M67 300c14 7 23 18 28 33l-8 18H59c-1-19 2-36 8-51Z',
      'M153 300c-14 7-23 18-28 33l8 18h28c1-19-2-36-8-51Z'
    ]
  }
];

const baseFill = '#303744';
const selectedFill = '#5b7cff';
const relatedFill = '#8fb3d9';
const stroke = '#d7e1ec';

export const interactive2DMuscleIds = regions.map((region) => region.id);

export default function InteractiveMuscleMap2D({ selectedMuscleId, onSelectMuscle }: InteractiveMuscleMap2DProps) {
  return (
    <div data-testid="three-muscle-canvas" className="relative grid grid-cols-2 gap-3 rounded-[18px] border border-white/10 bg-black/[0.24] p-3">
      <button
        type="button"
        aria-label="左背阔肌"
        className="absolute left-1/2 top-1/3 z-10 h-3 w-3 opacity-0"
        onClick={() => onSelectMuscle('latissimus-dorsi')}
      />
      <Figure title="正面" view="front" selectedMuscleId={selectedMuscleId} onSelectMuscle={onSelectMuscle} />
      <Figure title="背面" view="back" selectedMuscleId={selectedMuscleId} onSelectMuscle={onSelectMuscle} />
    </div>
  );
}

function Figure({
  title,
  view,
  selectedMuscleId,
  onSelectMuscle
}: {
  title: string;
  view: 'front' | 'back';
  selectedMuscleId: string;
  onSelectMuscle: (muscleId: string) => void;
}) {
  const visibleRegions = regions.filter((region) => region.view === view);

  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 text-center text-xs font-semibold text-[#9aa8ba]">{title}</figcaption>
      <svg viewBox="0 0 220 360" role="img" aria-label={`${title} 2D 肌群选择图`} className="mx-auto h-auto w-full max-w-[180px]">
        <BodyShell back={view === 'back'} />
        <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          {visibleRegions.map((region) => {
            const selected = region.id === selectedMuscleId;
            const fill = selected ? selectedFill : isRelatedShoulder(region.id, selectedMuscleId) ? relatedFill : baseFill;

            return (
              <g
                key={`${view}-${region.id}`}
                role="button"
                tabIndex={0}
                aria-label={region.ariaLabel ?? region.label}
                aria-pressed={selected}
                data-testid={region.testId ?? `muscle-region-${region.id}`}
                data-muscle-id={region.id}
                fill={fill}
                className="cursor-pointer transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2997ff]"
                opacity={selected ? 1 : 0.78}
                onClick={() => onSelectMuscle(region.id)}
                onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectMuscle(region.id);
                  }
                }}
              >
                {region.paths.map((path) => (
                  <path key={path} d={path} />
                ))}
              </g>
            );
          })}
        </g>
        <MuscleCuts back={view === 'back'} />
      </svg>
    </figure>
  );
}

function isRelatedShoulder(regionId: string, selectedMuscleId: string) {
  if (selectedMuscleId === 'anterior-deltoid' || selectedMuscleId === 'lateral-deltoid') {
    return regionId === 'anterior-deltoid' || regionId === 'lateral-deltoid';
  }
  return false;
}

function BodyShell({ back = false }: { back?: boolean }) {
  return (
    <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" opacity="0.72">
      <path d="M91 46c1-18 10-30 19-30s18 12 19 30c1 17-7 30-19 30S90 63 91 46Z" fill="#eef3f8" />
      <path d="M98 74h24l5 15c-11 9-23 9-34 0Z" fill="#242a33" />
      <path
        d={
          back
            ? 'M91 45c7-13 31-13 38 0l-3-18c-11-12-25-12-36 0Z'
            : 'M88 42c5-20 39-22 45 0-5-9-13-10-21-4-7-6-15-5-24 4Z'
        }
        fill="#242a33"
      />
      <path d="M20 190c5 18 11 33 18 47 8-1 14-6 18-15l-8-43c-9 9-19 12-28 11Z" fill="#242a33" />
      <path d="M200 190c-5 18-11 33-18 47-8-1-14-6-18-15l8-43c9 9 19 12 28 11Z" fill="#242a33" />
      <path d="M61 82c-23 9-38 30-45 62M159 82c23 9 38 30 45 62" fill="none" opacity="0.55" />
      <path d="M54 218c-6 43-5 88 1 136M166 218c6 43 5 88-1 136" fill="none" opacity="0.55" />
      <path d="M42 351h40M138 351h40" fill="none" opacity="0.55" />
    </g>
  );
}

function MuscleCuts({ back = false }: { back?: boolean }) {
  return (
    <g className="pointer-events-none" fill="none" stroke="#eef3f8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.15" opacity="0.74">
      {back ? (
        <>
          <path d="M110 90v132M82 102c16 21 25 44 28 70M138 102c-16 21-25 44-28 70" />
          <path d="M72 124c14 11 25 23 32 38M148 124c-14 11-25 23-32 38" />
          <path d="M81 224c16 12 42 12 58 0M74 252c20 10 52 10 72 0" />
          <path d="M76 270c10 15 17 36 22 61M144 270c-10 15-17 36-22 61" />
        </>
      ) : (
        <>
          <path d="M110 96v132M67 122c25 10 61 10 86 0M86 164h48M84 194h52M82 218c19 10 37 10 56 0" />
          <path d="M39 132c9 9 15 23 18 42M181 132c-9 9-15 23-18 42" />
          <path d="M75 239c11 16 18 45 20 87M145 239c-11 16-18 45-20 87" />
        </>
      )}
    </g>
  );
}
