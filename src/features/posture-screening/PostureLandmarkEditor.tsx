import { useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { NormalizedPoint, PostureLandmarkId, PosturePhotoView } from '../../utils/posturePhotogrammetry';

interface LandmarkDefinition { id: PostureLandmarkId; label: string }

const definitions: Record<PosturePhotoView, LandmarkDefinition[]> = {
  front: [
    { id: 'leftEar', label: '左耳参考点' },
    { id: 'rightEar', label: '右耳参考点' },
    { id: 'leftAcromion', label: '左肩峰' },
    { id: 'rightAcromion', label: '右肩峰' },
    { id: 'upperTrunkMidline', label: '上段躯干中线' },
    { id: 'lowerTrunkMidline', label: '下段躯干中线' },
  ],
  'left-lateral': [
    { id: 'tragus', label: '耳屏' },
    { id: 'c7', label: 'C7' },
    { id: 'acromion', label: '肩峰' },
    { id: 'upperTrunk', label: '上段躯干参考点' },
    { id: 'lowerTrunk', label: '下段躯干参考点' },
  ],
};

interface Props {
  view: PosturePhotoView;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  landmarks: Partial<Record<PostureLandmarkId, NormalizedPoint>>;
  onChange: (landmarks: Partial<Record<PostureLandmarkId, NormalizedPoint>>) => void;
}

const KEYBOARD_STEP = 0.005;

export function getPostureLandmarkDefinitions(view: PosturePhotoView): LandmarkDefinition[] {
  return definitions[view];
}

export default function PostureLandmarkEditor({ view, imageUrl, imageWidth, imageHeight, landmarks, onChange }: Props) {
  const [activeLandmark, setActiveLandmark] = useState<PostureLandmarkId>(definitions[view][0].id);
  const updatePoint = (id: PostureLandmarkId, point: NormalizedPoint) => onChange({ ...landmarks, [id]: { x: clamp(point.x), y: clamp(point.y) } });
  const pointFromEvent = (event: ReactPointerEvent<HTMLElement>): NormalizedPoint => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rectangle.left) / rectangle.width, y: (event.clientY - rectangle.top) / rectangle.height };
  };
  const placeActive = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    updatePoint(activeLandmark, pointFromEvent(event));
  };
  const moveMarker = (event: ReactPointerEvent<HTMLButtonElement>, id: PostureLandmarkId) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const stage = event.currentTarget.parentElement;
    if (!stage) return;
    const rectangle = stage.getBoundingClientRect();
    updatePoint(id, { x: (event.clientX - rectangle.left) / rectangle.width, y: (event.clientY - rectangle.top) / rectangle.height });
  };
  const moveByKeyboard = (event: KeyboardEvent<HTMLButtonElement>, id: PostureLandmarkId) => {
    const point = landmarks[id];
    if (!point) return;
    const delta = event.shiftKey ? KEYBOARD_STEP * 4 : KEYBOARD_STEP;
    const next = { ...point };
    if (event.key === 'ArrowLeft') next.x -= delta;
    else if (event.key === 'ArrowRight') next.x += delta;
    else if (event.key === 'ArrowUp') next.y -= delta;
    else if (event.key === 'ArrowDown') next.y += delta;
    else return;
    event.preventDefault();
    updatePoint(id, next);
  };

  return (
    <section className="mt-5" aria-labelledby="landmark-title">
      <div className="flex items-end justify-between gap-3"><div><h3 id="landmark-title" className="text-sm font-black text-zinc-100">手动标记解剖参考点</h3><p className="mt-1 text-xs leading-5 text-zinc-400">逐项选择后点击照片；方向键微调，Shift + 方向键加速。</p></div><span className="shrink-0 text-xs font-bold text-zinc-400">{Object.keys(landmarks).length}/{definitions[view].length}</span></div>
      <div data-testid="landmark-stage" onPointerDown={placeActive} className="relative mt-3 w-full overflow-hidden rounded-xl border border-white/15 bg-black" style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}>
        <img src={imageUrl} alt={`待标点的${view === 'front' ? '正面' : '左侧面'}照片`} className="pointer-events-none h-full w-full select-none object-contain" draggable={false} />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
          {definitions[view].flatMap(({ id }) => landmarks[id] ? [<circle key={id} cx={landmarks[id]!.x} cy={landmarks[id]!.y} r="0.012" fill="#bef264" stroke="#10130d" strokeWidth="0.004" vectorEffect="non-scaling-stroke" />] : [])}
        </svg>
        {definitions[view].map(({ id, label }) => {
          const point = landmarks[id];
          return point ? <button key={id} type="button" aria-label={`${label}标点`} data-x={point.x} data-y={point.y} onFocus={() => setActiveLandmark(id)} onKeyDown={(event) => moveByKeyboard(event, id)} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => moveMarker(event, id)} className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#10130d] bg-lime-300/90 text-[0] outline-none focus-visible:ring-2 focus-visible:ring-white" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}>{label}</button> : null;
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="标点清单">
        {definitions[view].map(({ id, label }) => <button key={id} type="button" aria-pressed={activeLandmark === id} aria-label={`选择${label}标点`} onClick={() => setActiveLandmark(id)} className={`min-h-11 rounded-full border px-3 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-lime-200 ${activeLandmark === id ? 'border-lime-300 text-lime-300' : landmarks[id] ? 'border-white/20 text-zinc-200' : 'border-white/10 text-zinc-400'}`}>{label}{landmarks[id] ? ' · 已标' : ''}</button>)}
      </div>
    </section>
  );
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(4))));
}
