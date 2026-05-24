import type { KeyboardEvent } from 'react';
import type { BodyView } from '../../types/common';
import { muscles } from '../../data/muscles';

interface MuscleSvgMapProps {
  bodyView: BodyView;
  selectedMuscleId: string;
  onSelectMuscle: (muscleId: string) => void;
}

interface MuscleShape {
  id: string;
  side: string;
  label: string;
  ariaLabel: string;
  path: string;
}

const muscleShapes: MuscleShape[] = [
  // Simplified 2D back-muscle schematic informed by common posterior anatomy layouts
  // and open anatomy references. It is for training education only, not diagnosis.
  {
    id: 'latissimus-dorsi',
    side: 'left',
    label: '背阔肌',
    ariaLabel: '左背阔肌',
    path: 'M118 153 C88 166 67 199 62 246 C59 279 66 308 83 329 L124 306 C117 266 119 214 137 172 C132 164 126 158 118 153 Z'
  },
  {
    id: 'latissimus-dorsi',
    side: 'right',
    label: '背阔肌',
    ariaLabel: '右背阔肌',
    path: 'M202 153 C232 166 253 199 258 246 C261 279 254 308 237 329 L196 306 C203 266 201 214 183 172 C188 164 194 158 202 153 Z'
  },
  {
    id: 'upper-trapezius',
    side: 'center',
    label: '斜方肌上束',
    ariaLabel: '斜方肌上束',
    path: 'M132 75 C143 59 177 59 188 75 L213 128 C192 121 176 111 160 99 C144 111 128 121 107 128 Z'
  },
  {
    id: 'middle-lower-trapezius',
    side: 'center',
    label: '斜方肌中下束',
    ariaLabel: '斜方肌中下束',
    path: 'M116 129 C134 118 147 110 160 100 C173 110 186 118 204 129 L190 238 C179 260 169 273 160 283 C151 273 141 260 130 238 Z'
  },
  {
    id: 'rhomboids',
    side: 'center',
    label: '菱形肌',
    ariaLabel: '菱形肌',
    path: 'M132 145 L160 124 L188 145 L160 178 Z'
  },
  {
    id: 'erector-spinae',
    side: 'left',
    label: '竖脊肌',
    ariaLabel: '左竖脊肌',
    path: 'M145 181 C139 214 137 261 139 325 C141 354 145 377 150 392 L156 392 C152 344 153 261 154 181 Z'
  },
  {
    id: 'erector-spinae',
    side: 'right',
    label: '竖脊肌',
    ariaLabel: '右竖脊肌',
    path: 'M166 181 C167 261 168 344 164 392 L170 392 C175 377 179 354 181 325 C183 261 181 214 175 181 Z'
  },
  {
    id: 'teres-major',
    side: 'left',
    label: '大圆肌',
    ariaLabel: '左大圆肌',
    path: 'M93 137 C110 133 126 139 138 153 C128 166 111 174 91 168 C85 157 86 145 93 137 Z'
  },
  {
    id: 'teres-major',
    side: 'right',
    label: '大圆肌',
    ariaLabel: '右大圆肌',
    path: 'M227 137 C210 133 194 139 182 153 C192 166 209 174 229 168 C235 157 234 145 227 137 Z'
  },
  {
    id: 'rear-deltoid',
    side: 'left',
    label: '后束三角肌',
    ariaLabel: '左后束三角肌',
    path: 'M73 111 C91 91 116 96 132 118 C119 132 97 140 73 133 C64 126 65 118 73 111 Z'
  },
  {
    id: 'rear-deltoid',
    side: 'right',
    label: '后束三角肌',
    ariaLabel: '右后束三角肌',
    path: 'M247 111 C229 91 204 96 188 118 C201 132 223 140 247 133 C256 126 255 118 247 111 Z'
  }
];

const chipMuscles = [
  'latissimus-dorsi',
  'upper-trapezius',
  'middle-lower-trapezius',
  'rhomboids',
  'erector-spinae',
  'teres-major',
  'rear-deltoid'
];

export default function MuscleSvgMap({ bodyView, selectedMuscleId, onSelectMuscle }: MuscleSvgMapProps) {
  if (bodyView === 'front') {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-line bg-slate-950 p-6 text-center text-slate-300">
        正面肌群图将在后续版本补充。V0.1 重点实现背面肌群认知。
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-slate-950 p-3">
      <div className="mx-auto w-full max-w-[440px]">
        <svg viewBox="0 0 320 440" role="img" aria-label="人体背面肌群示意图" className="h-auto w-full">
          <title>人体背面肌群示意图</title>
          <defs>
            <linearGradient id="muscleIdle" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.28" />
            </linearGradient>
            <linearGradient id="muscleSelected" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="320" height="440" rx="18" fill="#0f172a" />
          <path d="M134 54 C145 29 175 29 186 54 C194 74 188 94 160 101 C132 94 126 74 134 54 Z" fill="#111827" stroke="#64748b" strokeWidth="2" />
          <path d="M109 97 C130 78 190 78 211 97 C237 120 251 169 261 226 C268 268 265 307 247 335 L229 323 C244 281 240 220 223 166 C211 130 187 111 160 111 C133 111 109 130 97 166 C80 220 76 281 91 323 L73 335 C55 307 52 268 59 226 C69 169 83 120 109 97 Z" fill="#111827" stroke="#64748b" strokeWidth="2.5" />
          <path d="M116 336 C132 349 148 355 160 355 C172 355 188 349 204 336 L215 417 C190 431 175 435 160 435 C145 435 130 431 105 417 Z" fill="#0b1220" stroke="#475569" strokeWidth="2" />
          <path d="M60 126 C35 151 29 205 36 263 C40 293 51 318 69 337" fill="none" stroke="#475569" strokeWidth="2" />
          <path d="M260 126 C285 151 291 205 284 263 C280 293 269 318 251 337" fill="none" stroke="#475569" strokeWidth="2" />
          <path d="M160 111 L160 402" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          <path d="M119 158 C140 173 180 173 201 158" fill="none" stroke="#334155" strokeWidth="2" />
          <path d="M108 181 C124 209 141 232 160 244 C179 232 196 209 212 181" fill="none" stroke="#334155" strokeWidth="2" />

          {muscleShapes.map((shape) => {
            const muscle = muscles.find((item) => item.id === shape.id);
            const selected = selectedMuscleId === shape.id;

            return (
              <path
                key={`${shape.id}-${shape.side}`}
                d={shape.path}
                role="button"
                tabIndex={0}
                data-testid={`muscle-region-${shape.id}-${shape.side}`}
                aria-label={`${shape.ariaLabel} ${muscle?.nameEn ?? ''}`}
                aria-pressed={selected}
                fill={selected ? 'url(#muscleSelected)' : 'url(#muscleIdle)'}
                stroke={selected ? '#99f6e4' : '#67e8f9'}
                strokeWidth={selected ? 2.8 : 1.4}
                opacity={selected ? 0.96 : 0.56}
                className="cursor-pointer transition hover:opacity-90 hover:stroke-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                onClick={() => onSelectMuscle(shape.id)}
                onKeyDown={(event: KeyboardEvent<SVGPathElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectMuscle(shape.id);
                  }
                }}
              />
            );
          })}
        </svg>

        <div className="mt-3 flex flex-wrap gap-2" aria-label="肌群快捷选择">
          {chipMuscles.map((muscleId) => {
            const muscle = muscles.find((item) => item.id === muscleId);
            const selected = selectedMuscleId === muscleId;

            if (!muscle) return null;

            return (
              <button
                key={muscle.id}
                type="button"
                aria-pressed={selected}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent',
                  selected
                    ? 'border-accent bg-accent text-slate-950'
                    : 'border-line bg-slate-900 text-slate-300 hover:border-accent hover:text-accent'
                ].join(' ')}
                onClick={() => onSelectMuscle(muscle.id)}
              >
                {muscle.nameZh}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
