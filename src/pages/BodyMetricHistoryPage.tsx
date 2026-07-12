import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import BodyMetricSheet from '../features/growth/BodyMetricSheet';
import { createBodyMetricRepository } from '../repositories/bodyMetricRepository';
import type { BodyMetricRecord } from '../types/body';

export default function BodyMetricHistoryPage() {
  const [records, setRecords] = useState(() => createBodyMetricRepository().list());
  const [editing, setEditing] = useState<BodyMetricRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BodyMetricRecord | null>(null);
  const groups = useMemo(() => groupByMonth(records), [records]);
  const refresh = () => setRecords(createBodyMetricRepository().list());

  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-10 pt-6 text-white sm:-mx-6 sm:px-6">
      <div className="mx-auto max-w-[440px]">
        <header className="flex items-center justify-between gap-3"><div><Link to="/growth" className="text-sm font-bold text-lime-300">‹ 返回成长</Link><h1 className="mt-2 text-[1.9rem] font-black tracking-[-0.035em]">身体数据记录</h1></div><button type="button" onClick={() => { setEditing(null); setSheetOpen(true); }} className="min-h-11 rounded-full bg-lime-300 px-4 text-sm font-black text-black">＋ 记录数据</button></header>
        {records.length === 0 ? <div className="mt-12 rounded-[22px] border border-dashed border-white/15 py-12 text-center"><p className="font-bold text-zinc-300">还没有身体数据</p><button type="button" onClick={() => setSheetOpen(true)} className="mt-5 min-h-12 rounded-full border border-lime-300/40 px-5 font-black text-lime-300">记录第一条数据</button></div> : (
          <div className="mt-8 space-y-8">{groups.map((group) => <section key={group.key}><h2 className="mb-3 text-lg font-black">{group.label}</h2><div className="space-y-4">{group.records.map((record, index) => <article key={record.id} className={`relative rounded-[22px] border bg-[#111611] p-4 ${index === 0 && group === groups[0] ? 'border-lime-300/35' : 'border-white/10'}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{formatRecordDate(record.date)}</h3><div className="mt-3 flex flex-wrap gap-2">{record.weightKg !== undefined ? <MetricPill text={`体重 ${record.weightKg} kg`} /> : null}{record.waistCm !== undefined ? <MetricPill text={`腰围 ${record.waistCm} cm`} /> : null}{record.armCm !== undefined ? <MetricPill text={`臂围 ${record.armCm} cm`} /> : null}</div></div><button type="button" aria-label={`打开 ${monthDay(record.date)}记录操作`} onClick={() => setMenuId(menuId === record.id ? null : record.id)} className="grid h-11 w-11 place-items-center rounded-full text-xl text-zinc-400">···</button></div>{menuId === record.id ? <div className="absolute right-4 top-14 z-10 w-32 rounded-xl border border-white/12 bg-[#1a1e19] p-1.5"><button type="button" onClick={() => { setEditing(record); setSheetOpen(true); setMenuId(null); }} className="min-h-10 w-full rounded-lg px-3 text-left text-sm font-bold">编辑记录</button><button type="button" onClick={() => { setDeleting(record); setMenuId(null); }} className="min-h-10 w-full rounded-lg px-3 text-left text-sm font-bold text-red-300">删除记录</button></div> : null}</article>)}</div></section>)}</div>
        )}
      </div>
      <BodyMetricSheet open={sheetOpen} record={editing} onClose={() => { setSheetOpen(false); setEditing(null); }} onSaved={() => { refresh(); setSheetOpen(false); setEditing(null); }} />
      <ConfirmDialog open={Boolean(deleting)} title="删除身体记录" message="删除后无法恢复，相关趋势会立即更新。" confirmLabel="确认删除记录" destructive onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) createBodyMetricRepository().delete(deleting.id); setDeleting(null); refresh(); }} />
    </div>
  );
}

function MetricPill({ text }: { text: string }) { return <span className="rounded-full bg-white/[0.06] px-3 py-2 text-sm font-bold text-zinc-200">{text}</span>; }
function groupByMonth(records: BodyMetricRecord[]) { const groups = new Map<string, BodyMetricRecord[]>(); records.forEach((record) => { const key = record.date.slice(0, 7); groups.set(key, [...(groups.get(key) ?? []), record]); }); return [...groups.entries()].map(([key, values]) => ({ key, label: `${+key.slice(0, 4)}年${+key.slice(5)}月`, records: values })); }
function monthDay(date: string) { const [, month, day] = date.split('-').map(Number); return `${month}月${day}日`; }
function formatRecordDate(date: string) { const parsed = new Date(`${date}T00:00:00`); return `${monthDay(date)} 周${'日一二三四五六'[parsed.getDay()]}`; }
