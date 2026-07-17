import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PostureScreeningRepository, PostureScreeningSession } from '../../repositories/postureScreeningRepository';
import PostureRetestComparison from './PostureRetestComparison';

const metricLabels: Record<string, string> = {
  'craniovertebral-angle': '颅椎角',
  'frontal-head-tilt': '正面头部倾斜角',
  'frontal-shoulder-height-difference': '正面肩高差',
  'lateral-shoulder-angle': '侧面肩部角度',
  'lateral-trunk-inclination': '侧面躯干倾角',
  'frontal-trunk-deviation': '正面躯干偏移角',
};

export default function PostureScreeningHistoryList({ initialSessions, repository }: { initialSessions: PostureScreeningSession[]; repository: PostureScreeningRepository }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [confirmPhoto, setConfirmPhoto] = useState('');
  const [confirmSession, setConfirmSession] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = () => {
    const result = repository.readSessions();
    if (!result.ok) { setError('筛查历史数据异常，暂时无法刷新。'); return; }
    setSessions(result.value);
    setError('');
  };
  const deletePhoto = async (sessionId: string, assetId: string) => {
    const result = await repository.deleteSessionPhoto(sessionId, assetId);
    if (!result.ok) { setError('原始照片删除失败，请重试。'); return; }
    setConfirmPhoto('');
    setNotice('原始照片已删除，测量值仍保留。');
    refresh();
  };
  const deleteSession = async (sessionId: string) => {
    const result = await repository.deleteSession(sessionId);
    if (!result.ok) { setError('筛查记录删除失败，请重试。'); return; }
    setConfirmSession('');
    setNotice('筛查记录及其设备内原始照片已删除。');
    refresh();
  };

  if (!sessions.length) return <section className="mt-10 text-center"><h2 className="text-xl font-black">还没有体态筛查记录</h2><p className="mt-2 text-sm leading-6 text-zinc-400">完成一次筛查后，可在这里重看结论并按相同方法复测。</p><Link to="/growth/posture/screening" className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d]">开始第一次筛查</Link>{notice ? <p role="status" className="mt-4 text-sm text-zinc-300">{notice}</p> : null}</section>;

  return (
    <>
      <p className="mt-5 text-xs leading-5 text-zinc-400">删除原图后，人工标点、测量值与筛查结论仍会保留。删除整条记录会同时删除仍关联的设备内原图。</p>
      {notice ? <p role="status" className="mt-4 rounded-xl border border-lime-300/25 bg-lime-300/[0.06] px-3 py-3 text-sm text-lime-100">{notice}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl border border-red-300/25 bg-red-300/[0.06] px-3 py-3 text-sm text-red-100">{error}</p> : null}
      <div className="mt-6 space-y-5">
        {sessions.map((session) => {
          const baseline = session.context?.baselineSessionId ? sessions.find(({ id }) => id === session.context?.baselineSessionId) : undefined;
          const rawPhotos = session.photoMeasurements.filter((photo) => photo.photoAssetAvailable && photo.photoAssetId);
          return <article key={session.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-zinc-500">{formatDate(session.completedAt)}</p><h2 className="mt-1 text-base font-black leading-6 text-white">{session.result.findings[0]?.label ?? session.result.summary}</h2></div><span className="shrink-0 rounded-full border border-white/15 px-2 py-1 text-[11px] font-bold text-zinc-300">{statusLabel(session.status)}</span></div>
            {session.photoMeasurements.flatMap((photo) => photo.measurements).map((measurement) => <p key={measurement.metricId} className="mt-3 text-xs text-zinc-400">{metricLabels[measurement.metricId] ?? measurement.metricId}：{formatMeasurement(measurement.value, measurement.unit)}</p>)}
            {baseline ? <PostureRetestComparison baseline={baseline} current={session} /> : null}
            <Link to={`/growth/posture/results/${session.id}`} className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-3 text-xs font-black text-zinc-100">查看完整结果</Link>
            {rawPhotos.map((photo) => photo.photoAssetId ? <div key={photo.photoAssetId} className="mt-2">{confirmPhoto === photo.photoAssetId ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmPhoto('')} className="min-h-11 rounded-xl border border-white/15 px-2 text-xs font-bold text-zinc-300">保留原图</button><button type="button" onClick={() => { void deletePhoto(session.id, photo.photoAssetId!); }} className="min-h-11 rounded-xl border border-red-300/40 px-2 text-xs font-black text-red-200">确认仅删除原始照片</button></div> : <button type="button" onClick={() => setConfirmPhoto(photo.photoAssetId!)} className="min-h-11 w-full rounded-xl border border-white/10 px-3 text-xs font-bold text-zinc-300">仅删除原始照片</button>}</div> : null)}
            <div className="mt-2">{confirmSession === session.id ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmSession('')} className="min-h-11 rounded-xl border border-white/15 px-2 text-xs font-bold text-zinc-300">保留筛查记录</button><button type="button" onClick={() => { void deleteSession(session.id); }} className="min-h-11 rounded-xl border border-red-300/40 px-2 text-xs font-black text-red-200">确认删除整条记录</button></div> : <button type="button" onClick={() => setConfirmSession(session.id)} className="min-h-11 w-full px-3 text-xs font-bold text-red-200">删除整条筛查记录</button>}</div>
          </article>;
        })}
      </div>
    </>
  );
}

function formatDate(value: string): string { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatMeasurement(value: number, unit: 'deg' | 'ratio'): string { return unit === 'deg' ? `${value.toFixed(1)}°` : `${value.toFixed(3)}（图像比例）`; }
function statusLabel(status: PostureScreeningSession['status']): string { return status === 'safety-review' ? '安全分流' : status === 'measurement-invalid' ? '测量需处理' : status === 'mixed-evidence' ? '证据不一致' : status === 'functional-only' ? '功能证据' : '完整流程'; }
