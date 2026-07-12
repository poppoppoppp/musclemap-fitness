import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LocalPhoto from '../components/progress-photo/LocalPhoto';
import { createProgressPhotoRepository } from '../repositories/progressPhotoRepository';
import { progressPhotoCategories, progressPhotoCategoryLabels, type ProgressPhotoCategory, type ProgressPhotoRecord } from '../types/progressPhoto';

export default function ProgressPhotoComparePage() {
  const { category: rawCategory } = useParams();
  const category = progressPhotoCategories.includes(rawCategory as ProgressPhotoCategory) ? rawCategory as ProgressPhotoCategory : null;
  const [photos, setPhotos] = useState<ProgressPhotoRecord[]>([]);
  useEffect(() => { if (category) void createProgressPhotoRepository().list().then((values) => setPhotos(values.filter((photo) => photo.category === category).sort((a, b) => a.date.localeCompare(b.date)))); }, [category]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  useEffect(() => { if (photos.length) { setLeftId(photos[0].id); setRightId(photos.at(-1)!.id); } }, [photos]);
  const left = photos.find(({ id }) => id === leftId); const right = photos.find(({ id }) => id === rightId);
  return <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-10 pt-6 text-white sm:-mx-6 sm:px-6"><div className="mx-auto max-w-[440px]"><Link to="/growth/photos" className="text-sm font-bold text-lime-300">‹ 返回照片列表</Link><h1 className="mt-3 text-[1.9rem] font-black">{category ? progressPhotoCategoryLabels[category] : '照片'}对比变化</h1>{photos.length < 2 ? <div className="mt-12 rounded-[22px] border border-dashed border-white/15 py-12 text-center text-zinc-400">同一分类至少需要两张照片</div> : <><div className="mt-6 grid grid-cols-2 gap-3"><PhotoChoice label="最早" photos={photos} value={leftId} onChange={setLeftId} /><PhotoChoice label="最新" photos={photos} value={rightId} onChange={setRightId} /></div><div className="mt-4 grid grid-cols-2 gap-3">{left ? <PhotoPanel photo={left} /> : null}{right ? <PhotoPanel photo={right} /> : null}</div></>}</div></div>;
}

function PhotoChoice({ label, photos, value, onChange }: { label: string; photos: ProgressPhotoRecord[]; value: string; onChange: (id: string) => void }) { return <label className="text-sm font-bold text-zinc-300">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/12 bg-[#111511] px-2 !text-white">{photos.map((photo) => <option key={photo.id} value={photo.id}>{photo.date}</option>)}</select></label>; }
function PhotoPanel({ photo }: { photo: ProgressPhotoRecord }) { return <figure className="m-0 overflow-hidden rounded-[18px] border border-white/10 bg-[#111611] p-2"><LocalPhoto blobId={photo.blobId} alt="对比照片" className="aspect-[3/4] w-full rounded-xl" /><figcaption className="py-2 text-center text-sm font-bold">{formatDate(photo.date)}</figcaption></figure>; }
function formatDate(date: string) { const [year, month, day] = date.split('-').map(Number); return `${year}年${month}月${day}日`; }
