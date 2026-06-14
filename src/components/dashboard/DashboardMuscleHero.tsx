import { Link } from 'react-router-dom';

type DashboardMuscleArea = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core';

type DashboardMuscleShortcut = {
  area: DashboardMuscleArea;
  label: string;
  icon: string;
  color: string;
  position: string;
  side: 'left' | 'right';
  labelPoint: [number, number];
  bodyPoint: [number, number];
};

const muscleShortcuts: DashboardMuscleShortcut[] = [
  {
    area: 'chest',
    label: '胸',
    icon: 'pectoralis',
    color: 'from-orange-500 to-rose-500',
    position: 'left-4 top-[17%] sm:left-10',
    side: 'left',
    labelPoint: [31, 30],
    bodyPoint: [49, 31]
  },
  {
    area: 'arms',
    label: '手臂',
    icon: 'arm',
    color: 'from-violet-500 to-fuchsia-500',
    position: 'left-2 top-[43%] sm:left-12',
    side: 'left',
    labelPoint: [35, 51],
    bodyPoint: [42, 44]
  },
  {
    area: 'core',
    label: '核心',
    icon: 'core',
    color: 'from-app-success to-app-accent',
    position: 'left-5 bottom-[17%] sm:left-14',
    side: 'left',
    labelPoint: [36, 72],
    bodyPoint: [50, 47]
  },
  {
    area: 'back',
    label: '背',
    icon: 'back',
    color: 'from-sky-400 to-blue-600',
    position: 'right-1 top-[18%] sm:right-10',
    side: 'right',
    labelPoint: [68, 30],
    bodyPoint: [56, 29]
  },
  {
    area: 'shoulders',
    label: '肩',
    icon: 'shoulder',
    color: 'from-amber-400 to-orange-500',
    position: 'right-3 top-[43%] sm:right-14',
    side: 'right',
    labelPoint: [66, 51],
    bodyPoint: [61, 33]
  },
  {
    area: 'legs',
    label: '腿',
    icon: 'leg',
    color: 'from-app-accentSoft to-app-accent',
    position: 'right-3 bottom-[17%] sm:right-14',
    side: 'right',
    labelPoint: [66, 72],
    bodyPoint: [55, 63]
  }
];

interface DashboardMuscleHeroProps {
  selectedArea: DashboardMuscleArea;
  onSelectArea: (area: DashboardMuscleArea) => void;
}

export type { DashboardMuscleArea };

export default function DashboardMuscleHero({ selectedArea, onSelectArea }: DashboardMuscleHeroProps) {
  const selectedShortcut = muscleShortcuts.find((item) => item.area === selectedArea) ?? muscleShortcuts[0];

  return (
    <section aria-label="2D 选肌群" className="rounded-2xl border border-app-line bg-app-surface p-4">
      <div className="relative min-h-[280px] overflow-hidden rounded-xl bg-app-surfaceMuted sm:min-h-[330px]">
        <div className="absolute inset-8 rounded-full border border-app-line" />
        <div className="absolute inset-14 rounded-full border border-app-line/70" />
        <MuscleFigure />
        <SelectedMuscleLine shortcut={selectedShortcut} />
        {muscleShortcuts.map((item) => (
          <MuscleShortcut
            key={item.area}
            {...item}
            selected={selectedArea === item.area}
            onSelect={() => onSelectArea(item.area)}
          />
        ))}
        <Link
          to={`/three-muscle-selector?area=${selectedArea}`}
          data-testid="dashboard-selected-muscle-link"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl border border-app-line bg-app-surface px-4 py-2 text-sm font-semibold text-app-accent transition hover:border-app-accent/45 focus:outline-none focus:ring-2 focus:ring-app-accent/30"
        >
          2D 选肌群
        </Link>
      </div>
    </section>
  );
}

function MuscleShortcut({
  area,
  label,
  icon,
  color,
  position,
  side,
  selected,
  onSelect
}: DashboardMuscleShortcut & {
  selected: boolean;
  onSelect: () => void;
}) {
  const iconNode = (
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-app-surface bg-gradient-to-br ${color} p-[2px] shadow-[0_6px_16px_rgba(17,24,39,0.12)] sm:h-14 sm:w-14`}>
      <span className="flex h-full w-full items-center justify-center rounded-full bg-app-surface/90 text-app-text">
        <MuscleGlyph name={icon} />
      </span>
    </span>
  );
  const labelNode = <span className="shrink-0 text-base font-semibold text-app-text sm:text-lg">{label}</span>;

  return (
    <Link
      to={`/three-muscle-selector?area=${area}`}
      data-testid={`dashboard-muscle-shortcut-${area}`}
      aria-label={`${label} 2D 选肌群`}
      aria-current={selected ? 'true' : undefined}
      onFocus={onSelect}
      onMouseEnter={onSelect}
      onPointerDown={onSelect}
      className={`absolute ${position} z-10 flex items-center gap-3 rounded-full transition hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-app-accent/30 ${
        selected ? 'scale-105' : 'opacity-88'
      }`}
    >
      {side === 'right' ? (
        <>
          {labelNode}
          {iconNode}
        </>
      ) : (
        <>
          {iconNode}
          {labelNode}
        </>
      )}
    </Link>
  );
}

function SelectedMuscleLine({ shortcut }: { shortcut: DashboardMuscleShortcut }) {
  const [x1, y1] = shortcut.labelPoint;
  const [x2, y2] = shortcut.bodyPoint;

  return (
    <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line
        data-testid="dashboard-selected-muscle-line"
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(125, 211, 252, 0.78)"
        strokeWidth="0.45"
        strokeDasharray="1.4 1.4"
        strokeLinecap="round"
      />
      <circle cx={x2} cy={y2} r="0.9" fill="rgba(125, 211, 252, 0.95)" />
    </svg>
  );
}

function MuscleFigure() {
  return (
    <img
      src="/images/musclemap-figure.png"
      alt=""
      className="pointer-events-none absolute left-1/2 top-2 h-[276px] w-[174px] -translate-x-1/2 object-contain drop-shadow-[0_8px_20px_rgba(17,24,39,0.08)] sm:h-[326px] sm:w-[206px]"
    />
  );
}

function MuscleGlyph({ name }: { name: string }) {
  if (name === 'arm') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M8 21c5-1 8-5 10-11 3 1 5 4 4 8 3-1 5 1 5 4 0 4-4 6-9 6H9c-4 0-5-5-1-7Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'leg') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M14 4h7l-3 11 5 7c2 3 0 6-4 6h-9c-2 0-2-3 0-4l6-3-5-8Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'core') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M10 5h5v6h-5ZM17 5h5v6h-5ZM10 13h5v6h-5ZM17 13h5v6h-5ZM10 21h5v6h-5ZM17 21h5v6h-5Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'back') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 5c6 2 9 7 9 15l-6-5-3 11-3-11-6 5c0-8 3-13 9-15Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'shoulder') {
    return (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M9 12c5-7 13-6 16 0-2 8-8 12-16 12 3-4 3-8 0-12Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 12c5-6 15-6 20 0l-3 10H9Z" fill="currentColor" />
    </svg>
  );
}
