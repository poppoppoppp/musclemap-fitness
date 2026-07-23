import type { PostureScreeningDraftStep } from '../../repositories/postureScreeningRepository';
import { POSTURE_AUTOMATED_CAPTURE_STEPS } from '../../utils/postureScreeningFlow';

const stages: { id: PostureScreeningDraftStep; label: string }[] = [
  { id: 'boundary', label: '成人边界' },
  { id: 'safety', label: '安全检查' },
  { id: 'concern', label: '关注表现' },
  { id: 'movement', label: '引导观察' },
  ...POSTURE_AUTOMATED_CAPTURE_STEPS.map(({ id, label }) => ({ id, label })),
];

export default function PostureScreeningProgress({ currentStep }: { currentStep: PostureScreeningDraftStep }) {
  const normalized = currentStep === 'follow-up' ? 'concern' : currentStep === 'photo' || currentStep === 'review' ? 'static-front' : currentStep;
  const currentIndex = Math.max(0, stages.findIndex(({ id }) => id === normalized));
  const currentLabel = stages[currentIndex].label;

  return (
    <nav data-testid="screening-progress" aria-label="筛查进度" className="mt-7">
      <div className="flex gap-1.5" aria-hidden="true">
        {stages.map((stage, index) => <span key={stage.id} className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? 'bg-lime-300' : 'bg-white/10'}`} />)}
      </div>
      <p className="mt-3 text-xs font-bold tracking-[0.08em] text-zinc-400">
        当前：<span className="text-lime-300">{currentLabel}</span>
      </p>
    </nav>
  );
}
