import { useEffect, useState } from 'react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SnapBottomSheet from '../../components/ui/SnapBottomSheet';
import { createProgressPhotoRepository, PHOTO_LOCAL_NOTICE_KEY } from '../../repositories/progressPhotoRepository';
import type { ProgressPhotoCategory, ProgressPhotoRecord } from '../../types/progressPhoto';
import PhotoCaptureGuide from './PhotoCaptureGuide';
import PhotoCategoryPicker from './PhotoCategoryPicker';

export default function ProgressPhotoSheet({ open, record, onClose, onSaved }: { open: boolean; record?: ProgressPhotoRecord | null; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState<ProgressPhotoCategory | null>(null);
  const [date, setDate] = useState(localDateKey(new Date()));
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [initial, setInitial] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    if (!open) return;
    const values = [record?.category ?? null, record?.date ?? localDateKey(new Date()), record?.note ?? ''] as const;
    setCategory(values[0]); setDate(values[1]); setNote(values[2]); setFile(null); setError(''); setNotice(false); setInitial(JSON.stringify(values));
  }, [open, record]);
  const dirty = JSON.stringify([category, date, note]) !== initial || Boolean(file);
  const canSave = Boolean(category && date && (record || file));
  const save = async () => {
    if (!category || !date) return;
    try {
      const repository = createProgressPhotoRepository();
      if (record) await repository.update(record.id, { category, date, note });
      else if (file) {
        const dimensions = await readImageDimensions(file);
        await repository.save({ category, date, blob: file, note, ...dimensions });
      }
      if (!record && localStorage.getItem(PHOTO_LOCAL_NOTICE_KEY) !== 'shown') { localStorage.setItem(PHOTO_LOCAL_NOTICE_KEY, 'shown'); setNotice(true); }
      else onSaved();
    } catch { setError('照片保存失败，请检查浏览器存储空间。'); }
  };
  const handleFile = (value: File | null) => { setFile(value); if (value?.lastModified) setDate(localDateKey(new Date(value.lastModified))); };
  return (
    <>
      <SnapBottomSheet open={open} title={record ? '编辑进度照片' : '添加进度照片'} testId="progress-photo-sheet" dirty={dirty && !notice} initialSnap="expanded" compactRatio={0.76} expandedRatio={0.94} onRequestClose={onClose} footer={<button type="button" disabled={!canSave} onClick={save} className="min-h-14 w-full rounded-full bg-lime-300 font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500">{record ? '保存修改' : '保存照片'}</button>}>
        <PhotoCategoryPicker value={category} onChange={setCategory} />
        <div className="mt-5"><PhotoCaptureGuide category={category} /></div>
        <label className="mt-5 block"><span className="text-sm font-black">拍摄日期</span><input aria-label="拍摄日期" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/12 bg-black/25 px-3 !text-white" /></label>
        {!record ? <div className="mt-5 rounded-xl border border-dashed border-lime-300/35 p-4"><p className="text-center font-black text-lime-300">添加照片</p><div className="mt-3 grid grid-cols-2 gap-2"><label className="min-h-11 cursor-pointer content-center rounded-full bg-lime-300 text-center text-sm font-black text-black">拍照<input aria-label="拍照" type="file" accept="image/*" capture="environment" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} className="sr-only" /></label><label className="min-h-11 cursor-pointer content-center rounded-full border border-lime-300/40 text-center text-sm font-black text-lime-300">从相册选择<input aria-label="从相册选择" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} className="sr-only" /></label></div>{file ? <span className="mt-3 block truncate text-center text-xs text-zinc-300">{file.name}</span> : null}</div> : null}
        <label className="mt-5 block"><span className="text-sm font-black">备注（可选）</span><textarea aria-label="备注" value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/12 bg-black/25 p-3 !text-white" /></label>
        {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
      </SnapBottomSheet>
      <ConfirmDialog open={notice} title="照片保存说明" message="照片当前仅保存在此设备，暂不支持跨设备同步。" confirmLabel="知道了" onConfirm={onSaved} onCancel={onSaved} />
    </>
  );
}

async function readImageDimensions(file: File) { try { const bitmap = await createImageBitmap(file); const result = { width: bitmap.width, height: bitmap.height, orientation: bitmap.width > bitmap.height ? 'landscape' : bitmap.width < bitmap.height ? 'portrait' : 'square' }; bitmap.close(); return result; } catch { return {}; } }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
