import { Link } from 'react-router-dom';

type DashboardMuscleArea = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core';

type DashboardMuscleShortcut = {
  area: DashboardMuscleArea;
  label: string;
  icon: string;
};

const muscleShortcuts: DashboardMuscleShortcut[] = [
  { area: 'chest', label: '胸部', icon: 'pectoralis' },
  { area: 'back', label: '背部', icon: 'back' },
  { area: 'legs', label: '腿部', icon: 'leg' },
  { area: 'shoulders', label: '肩部', icon: 'shoulder' },
  { area: 'arms', label: '手臂', icon: 'arm' },
  { area: 'core', label: '核心', icon: 'core' }
];

interface DashboardMuscleHeroProps {
  selectedArea: DashboardMuscleArea;
  onSelectArea: (area: DashboardMuscleArea) => void;
}

export type { DashboardMuscleArea };

export default function DashboardMuscleHero({ selectedArea, onSelectArea }: DashboardMuscleHeroProps) {
  return (
    <section
      data-testid="dashboard-muscle-card"
      aria-label="2D 选肌群"
      className="rounded-[24px] border border-[#E5EAF2] bg-white px-4 pb-4 pt-7 shadow-[0_12px_32px_rgba(16,24,40,0.08)]"
    >
      <h1 className="whitespace-nowrap text-[1.72rem] font-black leading-[1.12] tracking-normal text-[#101828] sm:text-[2.1rem]">今天点亮哪块肌肉？</h1>
      <p className="mt-3 whitespace-nowrap text-[0.92rem] font-medium leading-6 text-[#667085] sm:text-base">选择目标肌群，快速生成今天的训练记录</p>

      <div className="mt-6 grid grid-cols-2 gap-4 px-4">
        <BodyFigure view="front" selectedArea={selectedArea} />
        <BodyFigure view="back" selectedArea={selectedArea} />
      </div>

      <div
        data-testid="dashboard-muscle-picker"
        className="mt-4 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {muscleShortcuts.map((item) => {
          const selected = selectedArea === item.area;

          return (
            <Link
              key={item.area}
              to={`/three-muscle-selector?area=${item.area}`}
              data-testid={`dashboard-muscle-shortcut-${item.area}`}
              aria-label={`${item.label} 2D 选肌群`}
              aria-current={selected ? 'true' : undefined}
              onFocus={() => onSelectArea(item.area)}
              onMouseEnter={() => onSelectArea(item.area)}
              onPointerDown={() => onSelectArea(item.area)}
              className={[
                'flex min-h-[54px] min-w-[46px] shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] border px-1 py-2 text-[11px] font-bold transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#2478FF]/25',
                selected
                  ? 'border-[#2478FF] bg-[#2478FF] text-white shadow-[0_8px_18px_rgba(36,120,255,0.24)]'
                  : 'border-[#E5EAF2] bg-white text-[#101828] hover:border-[#2478FF]/35'
              ].join(' ')}
            >
              <MuscleGlyph name={item.icon} className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function BodyFigure({ view, selectedArea }: { selectedArea: DashboardMuscleArea; view: 'front' | 'back' }) {
  const isBack = view === 'back';

  return (
    <figure data-testid={`dashboard-body-${view}`} className="min-w-0">
      <figcaption className="mb-2 text-center text-sm font-bold text-[#667085]">{isBack ? '背面' : '正面'}</figcaption>
      <svg viewBox="0 0 150 300" role="img" aria-label={`${isBack ? '背面' : '正面'} 2D 肌肉图`} className="mx-auto h-auto w-full max-w-[116px] sm:max-w-[132px]">
        <BodyBase />
        {isBack ? <BackMuscles selectedArea={selectedArea} /> : <FrontMuscles selectedArea={selectedArea} />}
        <BodyLinework back={isBack} />
      </svg>
    </figure>
  );
}

const neutralFill = '#EAF0F6';
const neutralDark = '#D8E1EA';
const lineColor = '#B8C4D2';
const activeBlue = '#2478FF';

function activeFill(isActive: boolean) {
  return isActive ? activeBlue : neutralFill;
}

function BodyBase() {
  return (
    <g stroke={lineColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M58 31c1-19 9-29 17-29s16 10 17 29c1 18-7 30-17 30S57 49 58 31Z" fill="#F8FBFF" />
      <path d="M54 61h42l11 42-11 72 12 106H84l-9-83-9 83H42l12-106-11-72Z" fill="#F8FBFF" />
      <path d="M43 74C24 84 13 106 9 141l17 6 24-53Z" fill="#F8FBFF" />
      <path d="M107 74c19 10 30 32 34 67l-17 6-24-53Z" fill="#F8FBFF" />
      <path d="M26 146c-3 34 0 59 8 76l16-5 2-73Z" fill="#F8FBFF" />
      <path d="M124 146c3 34 0 59-8 76l-16-5-2-73Z" fill="#F8FBFF" />
      <path d="M43 279h26M81 279h26" fill="none" />
    </g>
  );
}

function FrontMuscles({ selectedArea }: { selectedArea: DashboardMuscleArea }) {
  return (
    <g stroke="#F8FBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M48 76c12-9 27-9 26 8l-3 35c-18 4-34-3-45-20 1-10 8-19 22-23Z" fill={activeFill(selectedArea === 'chest')} />
      <path d="M102 76c-12-9-27-9-26 8l3 35c18 4 34-3 45-20-1-10-8-19-22-23Z" fill={activeFill(selectedArea === 'chest')} />
      <path d="M37 79c-14 5-23 17-28 34 14 8 28 5 41-8 2-12-2-21-13-26Z" fill={activeFill(selectedArea === 'shoulders')} />
      <path d="M113 79c14 5 23 17 28 34-14 8-28 5-41-8-2-12 2-21 13-26Z" fill={activeFill(selectedArea === 'shoulders')} />
      <path d="M19 120c-11 22-15 49-11 82 12 3 23-2 31-14l11-63c-8-7-18-9-31-5Z" fill={activeFill(selectedArea === 'arms')} />
      <path d="M131 120c11 22 15 49 11 82-12 3-23-2-31-14l-11-63c8-7 18-9 31-5Z" fill={activeFill(selectedArea === 'arms')} />
      <path d="M54 120h42l5 61-26 17-26-17Z" fill={activeFill(selectedArea === 'core')} />
      <path d="M50 181c16-6 29-1 38 14l-10 85H51c-8-38-8-71-1-99Z" fill={activeFill(selectedArea === 'legs')} />
      <path d="M100 181c-16-6-29-1-38 14l10 85h27c8-38 8-71 1-99Z" fill={activeFill(selectedArea === 'legs')} />
    </g>
  );
}

function BackMuscles({ selectedArea }: { selectedArea: DashboardMuscleArea }) {
  return (
    <g stroke="#F8FBFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M52 72c14 13 21 35 23 66-2 31-11 56-29 75l-9-104c2-18 7-31 15-37Z" fill={activeFill(selectedArea === 'back')} />
      <path d="M98 72c-14 13-21 35-23 66 2 31 11 56 29 75l9-104c-2-18-7-31-15-37Z" fill={activeFill(selectedArea === 'back')} />
      <path d="M38 81c-14 5-24 17-29 33 13 8 27 5 41-8 3-12-1-20-12-25Z" fill={selectedArea === 'shoulders' ? activeBlue : neutralDark} />
      <path d="M112 81c14 5 24 17 29 33-13 8-27 5-41-8-3-12 1-20 12-25Z" fill={selectedArea === 'shoulders' ? activeBlue : neutralDark} />
      <path d="M18 119c-10 21-14 47-10 80 12 3 22-2 31-14l11-62c-8-7-18-9-32-4Z" fill={selectedArea === 'arms' ? activeBlue : neutralFill} />
      <path d="M132 119c10 21 14 47 10 80-12 3-22-2-31-14l-11-62c8-7 18-9 32-4Z" fill={selectedArea === 'arms' ? activeBlue : neutralFill} />
      <path d="M50 181c16-7 29-1 38 14l-10 85H51c-8-38-8-71-1-99Z" fill={selectedArea === 'legs' ? activeBlue : neutralFill} />
      <path d="M100 181c-16-7-29-1-38 14l10 85h27c8-38 8-71 1-99Z" fill={selectedArea === 'legs' ? activeBlue : neutralFill} />
    </g>
  );
}

function BodyLinework({ back = false }: { back?: boolean }) {
  return (
    <g className="pointer-events-none" fill="none" stroke={lineColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" opacity="0.86">
      {back ? (
        <>
          <path d="M75 61v152M52 86c16 20 24 42 23 68M98 86c-16 20-24 42-23 68" />
          <path d="M42 109c20 12 31 28 33 48M108 109c-20 12-31 28-33 48" />
          <path d="M52 214c13 13 33 13 46 0M47 247c17 10 39 10 56 0" />
        </>
      ) : (
        <>
          <path d="M75 61v137M51 121h48M53 145h44M56 168h38" />
          <path d="M60 113v67M90 113v67" />
          <path d="M52 194c12 14 18 42 19 82M98 194c-12 14-18 42-19 82" />
        </>
      )}
    </g>
  );
}

function MuscleGlyph({ className = 'h-6 w-6', name }: { className?: string; name: string }) {
  if (name === 'arm') {
    return (
      <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M8 21c5-1 8-5 10-11 3 1 5 4 4 8 3-1 5 1 5 4 0 4-4 6-9 6H9c-4 0-5-5-1-7Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'leg') {
    return (
      <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M14 4h7l-3 11 5 7c2 3 0 6-4 6h-9c-2 0-2-3 0-4l6-3-5-8Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'core') {
    return (
      <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M10 5h5v6h-5ZM17 5h5v6h-5ZM10 13h5v6h-5ZM17 13h5v6h-5ZM10 21h5v6h-5ZM17 21h5v6h-5Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'back') {
    return (
      <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 5c6 2 9 7 9 15l-6-5-3 11-3-11-6 5c0-8 3-13 9-15Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'shoulder') {
    return (
      <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M9 12c5-7 13-6 16 0-2 8-8 12-16 12 3-4 3-8 0-12Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 12c5-6 15-6 20 0l-3 10H9Z" fill="currentColor" />
    </svg>
  );
}
