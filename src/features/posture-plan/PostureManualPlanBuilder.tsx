import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostureScreeningRepository, PostureScreeningSession } from '../../repositories/postureScreeningRepository';
import type { PosturePlanRepository } from '../../repositories/posturePlanRepository';
import type { PostureProtocol } from '../../types/posture';
import type { PostureWeekday } from '../../types/posturePlan';
import { canCreatePosturePlanFromSession } from '../../utils/postureGrowth';
import { getEligiblePosturePlanProtocols } from '../../utils/posturePlanRules';

interface PostureManualPlanBuilderProps {
  session: PostureScreeningSession;
  screeningRepository: PostureScreeningRepository;
  planRepository: PosturePlanRepository;
}

type Step = 'protocol' | 'schedule' | 'confirm';

const weekdays: Array<{ value: PostureWeekday; label: string }> = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

export default function PostureManualPlanBuilder({ session, screeningRepository, planRepository }: PostureManualPlanBuilderProps) {
  const navigate = useNavigate();
  const protocols = useMemo(() => getEligiblePosturePlanProtocols(), []);
  const [step, setStep] = useState<Step>('protocol');
  const [protocolId, setProtocolId] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(0);
  const [weeklyFrequency, setWeeklyFrequency] = useState(0);
  const [selectedWeekdays, setSelectedWeekdays] = useState<PostureWeekday[]>([]);
  const [error, setError] = useState('');
  const selectedProtocol = protocols.find(({ id }) => id === protocolId);
  const primaryFinding = session.result.findings.find(({ confidence }) => confidence === 'supported')?.label ?? session.result.summary;
  const scheduleComplete = durationWeeks >= 2 && durationWeeks <= 4
    && weeklyFrequency >= 1 && weeklyFrequency <= 7
    && selectedWeekdays.length === weeklyFrequency;

  const toggleWeekday = (weekday: PostureWeekday) => {
    setSelectedWeekdays((current) => current.includes(weekday)
      ? current.filter((value) => value !== weekday)
      : current.length < weeklyFrequency ? [...current, weekday] : current);
  };

  const createPlan = () => {
    setError('');
    const currentSession = screeningRepository.getSession(session.id);
    const currentProtocol = getEligiblePosturePlanProtocols().find(({ id }) => id === protocolId);
    if (!currentSession || !canCreatePosturePlanFromSession(currentSession) || !currentProtocol || !scheduleComplete) {
      navigate('/growth/posture', { replace: true, state: { postureNotice: '这次筛查当前无法用于创建计划，请查看最新状态。' } });
      return;
    }
    if (planRepository.getActivePlan()) {
      navigate('/growth/posture', { replace: true, state: { postureNotice: '已有进行中或暂停的计划，不能重复创建。' } });
      return;
    }
    const currentPrimaryFinding = currentSession.result.findings.find(({ confidence }) => confidence === 'supported')?.label ?? currentSession.result.summary;
    const result = planRepository.tryCreatePlan({
      protocolId: currentProtocol.id,
      screeningSessionId: currentSession.id,
      sourceSnapshot: {
        screeningCompletedAt: currentSession.completedAt,
        primaryFinding: currentPrimaryFinding,
        selectedProtocolId: currentProtocol.id,
        createdAt: new Date().toISOString(),
        selectionMode: 'manual',
      },
      startDate: localDateKey(new Date()),
      durationWeeks,
      weeklyFrequency,
      weekdays: [...selectedWeekdays].sort((left, right) => weekdayOrder(left) - weekdayOrder(right)),
      recommendationReasons: ['用户主动选择'],
      qualitySnapshot: {
        dataQuality: currentProtocol.dataQuality,
        completeness: currentProtocol.completeness,
        sourceUrl: currentProtocol.sourceUrl ?? '',
      },
    });
    if (!result.ok) {
      if (result.error === 'active-plan-exists') {
        navigate('/growth/posture', { replace: true, state: { postureNotice: '已有进行中或暂停的计划，不能重复创建。' } });
        return;
      }
      setError('计划保存失败，请检查浏览器存储设置后重试。');
      return;
    }
    navigate('/growth/posture', { replace: true, state: { postureNotice: '体态训练计划已创建。' } });
  };

  return (
    <div className="mx-auto max-w-[440px]">
      <header className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => navigate('/growth/posture')} className="min-h-11 rounded-xl px-2 text-sm font-bold text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">取消</button>
        <p className="text-xs font-black tracking-[0.12em] text-lime-300">手动创建 · {step === 'protocol' ? '1/3' : step === 'schedule' ? '2/3' : '3/3'}</p>
      </header>

      {step === 'protocol' ? (
        <section className="mt-8">
          <h1 className="text-[2rem] font-black tracking-[-0.035em] text-white">选择训练方案</h1>
          <div data-testid="screening-summary" className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-zinc-500">筛查摘要，仅供选择时参考</p>
            <p className="mt-2 text-sm font-bold leading-6 text-zinc-100">{primaryFinding}</p>
          </div>
          <div className="mt-6 space-y-3">
            {protocols.map((protocol) => (
              <ProtocolOption key={protocol.id} protocol={protocol} checked={protocol.id === protocolId} onChange={() => setProtocolId(protocol.id)} />
            ))}
          </div>
          <button type="button" disabled={!selectedProtocol} onClick={() => setStep('schedule')} className="mt-7 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">下一步：安排周期</button>
        </section>
      ) : null}

      {step === 'schedule' && selectedProtocol ? (
        <section className="mt-8">
          <button type="button" onClick={() => setStep('protocol')} className="text-sm font-bold text-zinc-400">返回选择方案</button>
          <h1 className="mt-4 text-[2rem] font-black tracking-[-0.035em] text-white">安排训练周期</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">方案：{selectedProtocol.title}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-zinc-200">训练周期
              <select aria-label="训练周期" value={durationWeeks || ''} onChange={(event) => setDurationWeeks(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-white">
                <option value="">请选择</option>
                {[2, 3, 4].map((value) => <option key={value} value={value}>{value} 周</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-zinc-200">每周频率
              <select aria-label="每周频率" value={weeklyFrequency || ''} onChange={(event) => { setWeeklyFrequency(Number(event.target.value)); setSelectedWeekdays([]); }} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-white">
                <option value="">请选择</option>
                {[1, 2, 3, 4, 5, 6, 7].map((value) => <option key={value} value={value}>每周 {value} 次</option>)}
              </select>
            </label>
          </div>
          <fieldset className="mt-7">
            <legend className="text-sm font-bold text-zinc-200">训练日（需选择 {weeklyFrequency || 0} 天）</legend>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {weekdays.map(({ value, label }) => (
                <label key={value} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-bold ${selectedWeekdays.includes(value) ? 'border-lime-300 bg-lime-300/15 text-lime-200' : 'border-white/10 bg-white/[0.03] text-zinc-400'}`}>
                  <input type="checkbox" className="h-4 w-4 accent-lime-300" aria-label={label} checked={selectedWeekdays.includes(value)} disabled={!weeklyFrequency} onChange={() => toggleWeekday(value)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="button" disabled={!scheduleComplete} onClick={() => setStep('confirm')} className="mt-7 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">下一步：确认计划</button>
        </section>
      ) : null}

      {step === 'confirm' && selectedProtocol ? (
        <section className="mt-8">
          <button type="button" onClick={() => setStep('schedule')} className="text-sm font-bold text-zinc-400">返回修改安排</button>
          <h1 className="mt-4 text-[2rem] font-black tracking-[-0.035em] text-white">确认训练计划</h1>
          <dl className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] px-4">
            <SummaryRow label="训练方案" value={selectedProtocol.title} />
            <SummaryRow label="训练周期" value={`${durationWeeks} 周`} />
            <SummaryRow label="每周频率" value={`${weeklyFrequency} 次`} />
            <SummaryRow label="训练日" value={weekdays.filter(({ value }) => selectedWeekdays.includes(value)).map(({ label }) => label).join('、')} />
          </dl>
          <p className="mt-4 text-xs leading-5 text-zinc-500">计划只会在你确认后创建；筛查摘要不会自动决定训练方案。</p>
          {error ? <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          <button type="button" onClick={createPlan} className="mt-7 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d]">确认创建计划</button>
        </section>
      ) : null}
    </div>
  );
}

function ProtocolOption({ protocol, checked, onChange }: { protocol: PostureProtocol; checked: boolean; onChange: () => void }) {
  return (
    <label className={`grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 rounded-2xl border p-4 ${checked ? 'border-lime-300 bg-lime-300/10' : 'border-white/10 bg-white/[0.04]'}`}>
      <input type="radio" name="protocol" value={protocol.id} checked={checked} onChange={onChange} aria-label={`方案 ${protocol.id} ${protocol.title}`} className="mt-1 h-5 w-5 accent-lime-300" />
      <span>
        <span className="block text-base font-black text-white">{protocol.title}</span>
        <span className="mt-1 block text-xs font-bold text-zinc-500">{protocol.id}</span>
        <span className="mt-3 block text-sm leading-6 text-zinc-300">{protocol.userFacingGoal}</span>
      </span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 py-4"><dt className="text-sm text-zinc-500">{label}</dt><dd className="text-right text-sm font-bold text-zinc-100">{value}</dd></div>;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function weekdayOrder(value: PostureWeekday) {
  return value === 0 ? 7 : value;
}
