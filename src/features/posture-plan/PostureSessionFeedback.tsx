import { useState, type FormEvent } from 'react';
import type { PostureSessionFeedbackInput } from '../../types/posturePlan';

interface PostureSessionFeedbackProps {
  planId: string;
  workoutLogId: string;
  onCancel: () => void;
  onSubmit: (feedback: PostureSessionFeedbackInput) => void;
}

export default function PostureSessionFeedback({ planId, workoutLogId, onCancel, onSubmit }: PostureSessionFeedbackProps) {
  const [status, setStatus] = useState<'completed' | 'aborted'>('completed');
  const [discomfortBefore, setDiscomfortBefore] = useState(0);
  const [discomfortAfter, setDiscomfortAfter] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'appropriate' | 'hard'>('appropriate');
  const [abortReason, setAbortReason] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (status === 'aborted' && !abortReason.trim()) return;
    onSubmit(status === 'completed'
      ? { planId, workoutLogId, discomfortBefore, discomfortAfter, difficulty, status, note }
      : { planId, workoutLogId, discomfortBefore, status, abortReason, note });
  };

  return (
    <section role="dialog" aria-modal="true" aria-labelledby="posture-feedback-title" className="rounded-3xl border border-lime-300/20 bg-[#121510] p-5 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-300">训练结束前</p>
      <h2 id="posture-feedback-title" className="mt-2 text-xl font-black text-white">记录本次体态反馈</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">这不是医学评估；反馈只用于计算计划执行情况和复测对比。</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <fieldset>
          <legend className="text-sm font-bold text-white">本次结果</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ChoiceButton active={status === 'completed'} label="已完成" onClick={() => setStatus('completed')} />
            <ChoiceButton active={status === 'aborted'} label="中止训练" onClick={() => setStatus('aborted')} />
          </div>
        </fieldset>

        <ScoreInput label="训练前不适程度" value={discomfortBefore} onChange={setDiscomfortBefore} />

        {status === 'completed' ? (
          <>
            <ScoreInput label="训练后不适程度" value={discomfortAfter} onChange={setDiscomfortAfter} />
            <label className="block text-sm font-bold text-white">
              难度感受
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-white focus:border-lime-300 focus:outline-none">
                <option value="easy" className="bg-zinc-900">偏轻松</option>
                <option value="appropriate" className="bg-zinc-900">合适</option>
                <option value="hard" className="bg-zinc-900">偏困难</option>
              </select>
            </label>
          </>
        ) : (
          <label className="block text-sm font-bold text-white">
            中止原因
            <textarea required value={abortReason} onChange={(event) => setAbortReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-white focus:border-lime-300 focus:outline-none" placeholder="例如：动作中出现明显不适" />
          </label>
        )}

        <label className="block text-sm font-bold text-white">
          备注（可选）
          <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-white focus:border-lime-300 focus:outline-none" />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="min-h-12 rounded-xl border border-white/15 px-3 text-sm font-bold text-zinc-200 focus:outline-none focus:ring-2 focus:ring-white/30">继续训练</button>
          <button type="submit" className="min-h-12 rounded-xl bg-lime-300 px-3 text-sm font-black text-zinc-950 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:ring-offset-2 focus:ring-offset-[#121510]">保存反馈并结束训练</button>
        </div>
      </form>
    </section>
  );
}

function ChoiceButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${active ? 'border-lime-300 bg-lime-300/10 text-lime-200' : 'border-white/10 text-zinc-300'}`}>{label}</button>;
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm font-bold text-white">
      <span className="flex items-center justify-between"><span>{label}</span><span className="text-lime-300">{value}/10</span></span>
      <input aria-label={label} type="range" min="0" max="10" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-lime-300" />
    </label>
  );
}
