import { useEffect, useState } from 'react';
import type { ResolvedExerciseDetail } from '../../../utils/exerciseDetail';

interface ExerciseMediaPanelProps {
  media: ResolvedExerciseDetail['media'];
  exerciseName: string;
}

export default function ExerciseMediaPanel({ media, exerciseName }: ExerciseMediaPanelProps) {
  return (
    <section
      data-testid="exercise-media-panel"
      data-exercise-section="media"
      aria-labelledby="exercise-media-title"
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#111511]"
    >
      <h2 id="exercise-media-title" className="sr-only">动作示意</h2>
      <div className="relative grid grid-cols-2 divide-x divide-white/10">
        <MediaStage
          number="1"
          title="起始位置"
          image={media.startImage}
          caption={media.startCaption}
          alt={`${exerciseName}起始位置`}
        />
        <MediaStage
          number="2"
          title="顶峰位置"
          image={media.peakImage}
          caption={media.peakCaption}
          alt={`${exerciseName}顶峰位置`}
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[44%] z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border border-lime-300/25 bg-[#111511] text-lime-300 sm:h-10 sm:w-10"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13" />
            <path d="m14 8 4 4-4 4" />
          </svg>
        </span>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-center text-xs leading-5 text-zinc-400 sm:text-sm">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-lime-300" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7v5h-5" />
          <path d="M4 17v-5h5" />
          <path d="M6.1 9A7 7 0 0 1 18 6l2 1" />
          <path d="M17.9 15A7 7 0 0 1 6 18l-2-1" />
        </svg>
        <span>{media.returnCaption}</span>
      </div>
    </section>
  );
}

function MediaStage({ number, title, image, caption, alt }: { number: string; title: string; image: string; caption: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [image]);

  return (
    <article data-testid="exercise-media-stage" className="min-w-0 px-2.5 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lime-300 text-sm font-black text-[#0a0d09] sm:h-8 sm:w-8">{number}</span>
        <h3 className="truncate text-sm font-bold text-zinc-100 sm:text-base">{title}</h3>
      </div>
      <div className="mt-3 aspect-[4/5] overflow-hidden rounded-xl bg-[#090c09]">
        {failed ? (
          <MediaPlaceholder />
        ) : (
          <img
            src={image}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        )}
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-center text-xs leading-5 text-zinc-300 sm:text-sm">{caption}</p>
    </article>
  );
}

function MediaPlaceholder() {
  return (
    <div data-testid="exercise-media-placeholder" aria-hidden="true" className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(190,242,100,0.09),transparent_42%)]">
      <svg viewBox="0 0 120 160" fill="none" className="h-[72%] w-[72%] text-zinc-700" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="60" cy="25" r="13" />
        <path d="M60 40v45M35 59l25-13 25 13M60 84 42 132M60 84l18 48" />
        <path d="M27 63h16M19 55v16M51 55v16" className="text-lime-300/60" />
      </svg>
    </div>
  );
}
