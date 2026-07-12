import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LocalPhoto from '../components/progress-photo/LocalPhoto';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ProgressPhotoSheet from '../features/growth/ProgressPhotoSheet';
import { createProgressPhotoRepository } from '../repositories/progressPhotoRepository';
import { getProgressPhotoGroup, progressPhotoCategoryLabels, type ProgressPhotoGroup, type ProgressPhotoRecord } from '../types/progressPhoto';

type Filter = 'all' | ProgressPhotoGroup;

export default function ProgressPhotoGalleryPage() {
  const [photos, setPhotos] = useState<ProgressPhotoRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [detail, setDetail] = useState<ProgressPhotoRecord | null>(null);
  const [editing, setEditing] = useState<ProgressPhotoRecord | null>(null);
  const [deleting, setDeleting] = useState<ProgressPhotoRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const refresh = async () => setPhotos(await createProgressPhotoRepository().list());
  useEffect(() => { void refresh(); }, []);
  const visible = filter === 'all' ? photos : photos.filter((photo) => getProgressPhotoGroup(photo.category) === filter);
  const groups = useMemo(() => groupByDate(visible), [visible]);
  const comparisonCategories = [...new Set(visible.map(({ category }) => category))].filter((category) => visible.filter((photo) => photo.category === category).length >= 2);
  const filters: Array<{ id: Filter; label: string }> = [{ id: 'all', label: '全部' }, { id: 'face', label: '面部' }, { id: 'full', label: '整体' }, { id: 'local', label: '局部肌群' }];

  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-10 pt-6 text-white sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-[440px]">
        <header className="flex items-center justify-between"><div><Link to="/growth" className="text-sm font-bold text-lime-300">‹ 返回成长</Link><h1 className="mt-2 text-[1.9rem] font-black">进度照片</h1></div><button type="button" onClick={() => { setEditing(null); setSheetOpen(true); }} className="min-h-11 rounded-full bg-lime-300 px-4 text-sm font-black text-black">＋ 添加照片</button></header>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item.id} type="button" aria-label={`${item.label}筛选`} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold ${filter === item.id ? 'bg-lime-300 text-black' : 'border border-white/12 text-zinc-300'}`}>{item.label}</button>)}</div>
        {comparisonCategories.length ? <div className="mt-4 flex flex-wrap gap-2">{comparisonCategories.map((category) => <Link key={category} to={`/growth/photos/compare/${category}`} aria-label={`对比${progressPhotoCategoryLabels[category]}变化`} className="min-h-10 content-center rounded-full border border-lime-300/35 px-3 text-sm font-bold text-lime-300">对比{progressPhotoCategoryLabels[category]}变化</Link>)}</div> : null}
        {groups.length === 0 ? <div className="mt-12 rounded-[22px] border border-dashed border-white/15 py-12 text-center text-zinc-400">当前筛选下没有照片</div> : <div className="mt-7 space-y-6">{groups.map((group) => <section key={group.date} className="rounded-[22px] border border-white/10 bg-[#111611] p-4"><h2 className="text-lg font-black">{formatDate(group.date)}</h2><div className="mt-4 grid grid-cols-2 gap-3">{group.photos.map((photo) => <div key={photo.id}><button type="button" aria-label={`查看${progressPhotoCategoryLabels[photo.category]}照片 ${photo.date}`} onClick={() => setDetail(photo)} className="w-full overflow-hidden rounded-[16px] border border-white/10 bg-black/25 text-left"><LocalPhoto blobId={photo.blobId} alt={progressPhotoCategoryLabels[photo.category]} className="aspect-[3/4] w-full" /><span className="block px-3 py-2 text-sm font-bold">{progressPhotoCategoryLabels[photo.category]}</span></button>{photo.note ? <p className="mt-1 truncate text-xs text-zinc-400">{photo.note}</p> : null}</div>)}</div></section>)}</div>}
      </div>
      {detail ? <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4"><section role="dialog" aria-label="照片详情" className="w-full max-w-[420px] rounded-[22px] border border-white/12 bg-[#111511] p-4"><LocalPhoto blobId={detail.blobId} alt={`${progressPhotoCategoryLabels[detail.category]}大图`} className="max-h-[56dvh] w-full rounded-xl" /><div className="mt-4"><h2 className="font-black">{progressPhotoCategoryLabels[detail.category]}</h2><p className="text-sm text-zinc-400">{formatDate(detail.date)}</p>{detail.note ? <p className="mt-2 text-sm text-zinc-300">{detail.note}</p> : null}</div><div className="mt-4 grid grid-cols-3 gap-2"><button type="button" onClick={() => setDetail(null)} className="min-h-11 rounded-xl border border-white/12">关闭</button><button type="button" onClick={() => { setEditing(detail); setSheetOpen(true); setDetail(null); }} className="min-h-11 rounded-xl border border-lime-300/35 text-lime-300">编辑照片信息</button><button type="button" onClick={() => { setDeleting(detail); setDetail(null); }} className="min-h-11 rounded-xl border border-red-300/35 text-red-300">删除照片</button></div></section></div> : null}
      <ProgressPhotoSheet open={sheetOpen} record={editing} onClose={() => { setSheetOpen(false); setEditing(null); }} onSaved={() => { setSheetOpen(false); setEditing(null); void refresh(); }} />
      <ConfirmDialog open={Boolean(deleting)} title="删除进度照片" message="照片和本地原图将同时删除，无法恢复。" confirmLabel="确认删除照片" destructive onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) void createProgressPhotoRepository().delete(deleting.id).then(refresh); setDeleting(null); }} />
    </div>
  );
}

function groupByDate(photos: ProgressPhotoRecord[]) { const groups = new Map<string, ProgressPhotoRecord[]>(); photos.forEach((photo) => groups.set(photo.date, [...(groups.get(photo.date) ?? []), photo])); return [...groups.entries()].map(([date, values]) => ({ date, photos: values })); }
function formatDate(date: string) { const [year, month, day] = date.split('-').map(Number); return `${year}年${month}月${day}日`; }
