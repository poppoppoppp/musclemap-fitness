import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PostureScreeningRepository, PostureScreeningSession } from '../../repositories/postureScreeningRepository';
import type { PostureNextAction } from '../../types/postureScreening';

interface Props {
  session: PostureScreeningSession;
  repository: PostureScreeningRepository;
  onSessionChange: (session: PostureScreeningSession) => void;
}

export default function PostureNextActions({ session, repository, onSessionChange }: Props) {
  const navigate = useNavigate();
  const [confirmAssetId, setConfirmAssetId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const rawPhotos = session.photoMeasurements.filter((photo) => photo.photoAssetAvailable && photo.photoAssetId);

  const prepareDraft = (action: PostureNextAction): boolean => {
    const step = action.kind === 'retake' ? 'photo' : action.kind === 'edit' ? 'concern' : 'review';
    const answers = action.kind === 'skip-photo'
      ? { ...session.input, photo: { status: 'skipped' as const, observations: [], reasonCodes: [] } }
      : session.input;
    const saved = repository.saveDraft({ currentStep: step, answers, photoMeasurements: action.kind === 'skip-photo' ? [] : session.photoMeasurements });
    if (!saved.ok) {
      setError('无法准备修改，请检查浏览器存储设置后重试。');
      return false;
    }
    setError('');
    return true;
  };

  const skipInvalidPhoto = (action: PostureNextAction) => {
    if (!prepareDraft(action)) return;
    navigate('/growth/posture/screening');
  };

  const deleteRawPhoto = async (assetId: string) => {
    const deleted = await repository.deleteSessionPhoto(session.id, assetId);
    if (!deleted.ok) { setError('原始照片删除失败，请重试。'); return; }
    const updated = repository.getSession(session.id);
    if (!updated) { setError('筛查记录读取失败，请重新打开本页。'); return; }
    setConfirmAssetId('');
    setError('');
    setNotice('原始照片已删除，标点与测量值仍保留。');
    onSessionChange(updated);
  };

  return (
    <section className="mt-7" aria-labelledby="next-actions-title">
      <h2 id="next-actions-title" className="text-lg font-black">下一步</h2>
      <div className="mt-4 space-y-2.5">
        {session.result.nextActions.map((action) => <Action key={action.id} action={action} session={session} onPrepare={() => prepareDraft(action)} onSkip={() => skipInvalidPhoto(action)} />)}
      </div>
      {rawPhotos.length ? <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="text-sm font-black text-zinc-100">当前设备上的原始照片</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-400">删除原图不会删除人工标点、角度和筛查结果。</p>
        {rawPhotos.map((photo) => photo.photoAssetId ? <div key={photo.photoAssetId} className="mt-3">
          {confirmAssetId === photo.photoAssetId ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmAssetId('')} className="min-h-11 rounded-xl border border-white/15 px-3 text-xs font-bold text-zinc-300">保留原始照片</button><button type="button" onClick={() => { void deleteRawPhoto(photo.photoAssetId!); }} className="min-h-11 rounded-xl border border-red-300/40 px-3 text-xs font-black text-red-200">确认删除原始照片</button></div> : <button type="button" onClick={() => setConfirmAssetId(photo.photoAssetId!)} className="min-h-11 w-full rounded-xl border border-red-300/30 px-3 text-xs font-bold text-red-200 outline-none focus-visible:ring-2 focus-visible:ring-red-200">删除当前设备上的原始照片</button>}
        </div> : null)}
      </div> : session.photoMeasurements.length ? <p className="mt-5 text-xs leading-5 text-zinc-400">原始照片不在当前设备，人工标点与测量值仍保留。</p> : null}
      {notice ? <p role="status" className="mt-4 rounded-xl border border-lime-300/25 bg-lime-300/[0.06] px-3 py-3 text-sm text-lime-100">{notice}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl border border-red-300/25 bg-red-300/[0.06] px-3 py-3 text-sm text-red-100">{error}</p> : null}
    </section>
  );
}

function Action({ action, session, onPrepare, onSkip }: { action: PostureNextAction; session: PostureScreeningSession; onPrepare: () => boolean; onSkip: () => void }) {
  const base = 'flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-center text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-lime-100';
  if (action.kind === 'return') return <Link to="/growth/posture" className={`${base} bg-lime-300 text-[#10130d]`}>{action.label}</Link>;
  if (action.kind === 'history') return <Link to="/growth/posture/history" className={`${base} border border-white/15 text-zinc-100`}>{action.label}</Link>;
  if (action.kind === 'retest') return <Link to={`/growth/posture/screening?baselineSessionId=${session.id}`} className={`${base} border border-white/15 text-zinc-100`}>{action.label}</Link>;
  if (action.kind === 'edit' || action.kind === 'retake') return <Link to="/growth/posture/screening" onClick={(event) => { if (!onPrepare()) event.preventDefault(); }} className={`${base} border border-white/15 text-zinc-100`}>{action.label}</Link>;
  if (action.kind === 'skip-photo') return <button type="button" onClick={onSkip} className={`${base} border border-white/15 text-zinc-100`}>{action.label}</button>;
  if (action.kind === 'professional-review') return <div className="flex min-h-12 items-center rounded-xl border border-amber-300/30 bg-amber-300/[0.06] px-3 text-sm font-bold text-amber-100">{action.label}</div>;
  return <div className="flex min-h-12 items-center rounded-xl border border-white/10 px-3 text-sm font-bold text-zinc-200">{action.label}</div>;
}
