import { useEffect, useMemo, useState } from 'react';
import SnapBottomSheet from '../../components/ui/SnapBottomSheet';
import { createBodyMetricRepository, type BodyMetricInput } from '../../repositories/bodyMetricRepository';
import type { BodyMetricRecord } from '../../types/body';
import MeasurementHelp from './MeasurementHelp';

interface BodyMetricSheetProps { open: boolean; record?: BodyMetricRecord | null; onClose: () => void; onSaved: (record: BodyMetricRecord) => void; }

export default function BodyMetricSheet({ open, record, onClose, onSaved }: BodyMetricSheetProps) {
  const today = localDateKey(new Date());
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [arm, setArm] = useState('');
  const [initial, setInitial] = useState('');
  const [existingToday, setExistingToday] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const repository = createBodyMetricRepository();
    const value = record ?? repository.getByDate(today);
    const nextDate = value?.date ?? today;
    const nextWeight = value?.weightKg?.toString() ?? '';
    const nextWaist = value?.waistCm?.toString() ?? '';
    const nextArm = value?.armCm?.toString() ?? '';
    setDate(nextDate); setWeight(nextWeight); setWaist(nextWaist); setArm(nextArm); setExistingToday(!record && Boolean(value)); setError('');
    setInitial(JSON.stringify([nextDate, nextWeight, nextWaist, nextArm]));
  }, [open, record, today]);

  const dirty = JSON.stringify([date, weight, waist, arm]) !== initial;
  const canSave = Boolean(weight || waist || arm);
  const save = () => {
    const input: BodyMetricInput = { date, weightKg: numberOrUndefined(weight), waistCm: numberOrUndefined(waist), armCm: numberOrUndefined(arm) };
    const repository = createBodyMetricRepository();
    const result = record ? repository.update(record.id, input) : repository.save(input);
    if (!result.ok) { setError(errorMessage(result.error)); return; }
    onSaved(result.record);
  };

  const fields = useMemo(() => [
    { id: 'weight', label: '体重', unit: 'kg', value: weight, setValue: setWeight, metric: 'weight' as const },
    { id: 'waist', label: '腰围', unit: 'cm', value: waist, setValue: setWaist, metric: 'waist' as const },
    { id: 'arm', label: '臂围', unit: 'cm', value: arm, setValue: setArm, metric: 'arm' as const }
  ], [arm, waist, weight]);

  return (
    <SnapBottomSheet open={open} title="记录身体数据" testId="body-metric-sheet" dirty={dirty} onRequestClose={onClose} footer={<button type="button" disabled={!canSave} onClick={save} className="min-h-14 w-full rounded-full bg-lime-300 font-black text-black disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-100">保存记录</button>}>
      <label className="block"><span className="text-sm font-bold text-zinc-300">日期</span><input aria-label="日期" type="date" required value={date} max={today} onChange={(event) => setDate(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/12 bg-black/25 px-3 !text-white outline-none focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15" /></label>
      {existingToday ? <p className="mt-3 rounded-xl bg-lime-300/[0.08] p-3 text-sm text-lime-200">今天已有记录，可继续补充或修改。</p> : null}
      <div className="mt-5 space-y-3">
        <h3 className="text-sm font-black text-white">身体数据</h3>
        {fields.map((field) => <label key={field.id} className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><span className="flex items-center text-sm font-bold text-zinc-300">{field.label}<MeasurementHelp metric={field.metric} /></span><input aria-label={field.label} type="number" inputMode="decimal" min="0" step="0.1" value={field.value} onChange={(event) => field.setValue(event.target.value)} className="h-11 min-w-0 bg-transparent text-right !text-white outline-none" /><span className="text-sm text-zinc-500">{field.unit}</span></label>)}
      </div>
      <p className="mt-3 text-xs text-zinc-500">至少填写一项</p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
    </SnapBottomSheet>
  );
}

function numberOrUndefined(value: string) { return value.trim() === '' ? undefined : Number(value); }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function errorMessage(error: string) { return ({ 'measurement-required': '至少填写一项身体数据。', 'invalid-weight': '请输入 20–500 kg 之间的体重。', 'invalid-waist': '请输入 30–300 cm 之间的腰围。', 'invalid-arm': '请输入 10–150 cm 之间的臂围。', 'invalid-date': '请选择有效日期。', 'storage-failed': '保存失败，请检查浏览器存储空间。', 'not-found': '记录不存在或已被删除。' } as Record<string, string>)[error] ?? '保存失败，请稍后重试。'; }
