import { progressPhotoCategories } from '../../data/growthMockData';
import type { ProgressPhotoCategory } from '../../types/growth';

export default function ProgressPhotosCard() {
  const featured = progressPhotoCategories.filter(({ featured: value }) => value);
  const categories = progressPhotoCategories.filter(({ featured: value }) => !value);
  return (
    <section className="rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2"><h2 className="text-xl font-black tracking-[-0.025em] text-white">进度照片</h2><span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600 text-[0.65rem] font-bold text-zinc-400">i</span></div>
        <button type="button" className="min-h-11 text-sm font-bold text-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70">查看全部 <span aria-hidden="true">›</span></button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">{featured.map((category) => <ComparisonCard key={category.id} category={category} />)}</div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {categories.map((category) => <button key={category.id} type="button" className="min-h-11 rounded-2xl border border-white/10 bg-black/20 px-2 text-xs font-semibold text-zinc-300 transition hover:border-lime-300/30 hover:text-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70">{category.label}</button>)}
      </div>
    </section>
  );
}

function ComparisonCard({ category }: { category: ProgressPhotoCategory }) {
  const kind = category.id === 'face' ? 'face' : 'body';
  return (
    <article className="min-w-0 overflow-hidden rounded-[18px] border border-white/10 bg-black/25 p-2.5">
      <h3 className="truncate text-sm font-bold text-white">{category.label}</h3>
      <div className="relative mt-2 grid grid-cols-2 gap-1.5">
        <PhotoPlaceholder kind={kind} tone="earliest" /><PhotoPlaceholder kind={kind} tone="latest" />
        <span aria-hidden="true" className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-lime-300/35 bg-[#111611] text-sm font-black text-lime-300">→</span>
      </div>
      <div className="mt-2 flex justify-between px-1 text-[0.65rem] font-semibold text-zinc-400"><span>{category.earliestDate}</span><span>{category.latestDate}</span></div>
    </article>
  );
}

function PhotoPlaceholder({ kind, tone }: { kind: 'face' | 'body'; tone: 'earliest' | 'latest' }) {
  return (
    <div aria-label={`${tone === 'earliest' ? '最早' : '最新'}照片占位`} className={`flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] ${tone === 'latest' ? 'bg-[radial-gradient(circle_at_50%_30%,rgba(190,242,100,0.13),rgba(255,255,255,0.035)_58%)]' : 'bg-white/[0.035]'}`}>
      {kind === 'face' ? <FaceSilhouette /> : <BodySilhouette />}
    </div>
  );
}

function FaceSilhouette() {
  return <svg viewBox="0 0 80 100" className="h-[82%] w-[82%] text-zinc-700" fill="currentColor" aria-hidden="true"><ellipse cx="40" cy="37" rx="20" ry="25" /><path d="M12 100c1-24 12-36 28-36s27 12 28 36H12Z" /><path d="M23 39c5-5 10-8 17-8s12 3 17 8" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function BodySilhouette() {
  return <svg viewBox="0 0 80 120" className="h-[88%] w-[88%] text-zinc-700" fill="currentColor" aria-hidden="true"><circle cx="40" cy="16" r="10" /><path d="M29 29c7-3 15-3 22 0l8 31-9 22 4 38H43l-3-32-3 32H26l4-38-9-22 8-31Z" /><path d="m27 34-12 35M53 34l12 35" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" /></svg>;
}
