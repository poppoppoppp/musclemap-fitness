import { Link } from 'react-router-dom';
import LocalPhoto from '../../components/progress-photo/LocalPhoto';
import { progressPhotoCategoryLabels, type ProgressPhotoRecord } from '../../types/progressPhoto';

export default function ProgressPhotosCard({ photos, onAdd }: { photos: ProgressPhotoRecord[]; onAdd: () => void }) {
  const featured = photos.slice(0, 2);
  return (
    <section className="rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">进度照片</h2><div className="flex items-center gap-3">{photos.length ? <Link to="/growth/photos" aria-label="查看全部照片" className="min-h-10 content-center text-sm font-bold text-zinc-300">查看全部 <span aria-hidden="true">›</span></Link> : null}<button type="button" onClick={onAdd} className="min-h-10 rounded-full bg-lime-300 px-3 text-sm font-black text-black">＋ 添加照片</button></div></div>
      {photos.length === 0 ? <div data-testid="progress-photo-empty" className="py-10 text-center"><p className="font-bold text-zinc-300">还没有进度照片</p><p className="mt-2 text-sm text-zinc-500">使用固定分类和角度记录真实变化。</p><button type="button" onClick={onAdd} className="mt-5 min-h-12 rounded-full border border-lime-300/40 px-5 font-black text-lime-300">添加第一张照片</button></div> : <div className="mt-5 grid grid-cols-2 gap-3">{featured.map((photo) => <article key={photo.id} className="overflow-hidden rounded-[18px] border border-white/10 bg-black/25 p-2"><LocalPhoto blobId={photo.blobId} alt={`${progressPhotoCategoryLabels[photo.category]}进度照片`} className="aspect-[3/4] w-full rounded-xl" /><div className="mt-2 flex justify-between gap-2 text-xs"><strong className="truncate">{progressPhotoCategoryLabels[photo.category]}</strong><span className="text-zinc-500">{photo.date.slice(5).replace('-', '/')}</span></div></article>)}</div>}
    </section>
  );
}
