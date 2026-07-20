import type { CaptureQualityEvaluation, CaptureRuleResult } from '../captureLabTypes';
import { describeQualityReason, QUALITY_RULE_LABELS } from '../quality/qualityCopy';

export default function CaptureQualityPanel({ quality }: { quality: CaptureQualityEvaluation | null }) {
  const entries = quality ? Object.entries(quality.rules) as Array<[keyof CaptureQualityEvaluation['rules'], CaptureQualityEvaluation['rules'][keyof CaptureQualityEvaluation['rules']]]> : [];
  return (
    <section aria-labelledby="capture-quality-title" className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="capture-quality-title" className="text-base font-black text-zinc-100">实时拍摄条件</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">仅用于构图与采集，不是体态分析准确率。</p>
        </div>
        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black ${quality?.passed ? 'bg-lime-300 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
          {quality?.passed ? '连续合格' : '等待调整'}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {(entries.length ? entries : Object.keys(QUALITY_RULE_LABELS).map((key) => [key, { status: 'unknown' } as CaptureRuleResult] as const)).map(([key, rule]) => (
          <div key={key} className="min-w-0 border-l border-zinc-800 pl-3">
            <p className="text-xs text-zinc-500">{QUALITY_RULE_LABELS[key as keyof typeof QUALITY_RULE_LABELS]}</p>
            <p className={`mt-1 truncate text-sm font-bold ${rule.status === 'pass' ? 'text-lime-300' : rule.status === 'fail' ? 'text-amber-300' : 'text-zinc-400'}`} title={describeQualityReason(rule.reasonCode)}>
              {rule.status === 'pass' ? '通过' : rule.status === 'fail' ? describeQualityReason(rule.reasonCode) : '检测中'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
