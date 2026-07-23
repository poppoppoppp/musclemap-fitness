import type { PostureScreeningDraftStep } from '../../repositories/postureScreeningRepository';

const stages: { id: PostureScreeningDraftStep; label: string }[] = [
  { id: 'boundary', label: '成人边界' },
  { id: 'safety', label: '安全检查' },
  { id: 'concern', label: '关注表现' },
  { id: 'movement', label: '引导观察' },
  { id: 'static-front', label: '正面静态' },
  { id: 'static-side', label: '侧面静态' },
  { id: 'static-back', label: '背面静态' },
  { id: 'dynamic-arm-raise', label: '双臂上举' },
  { id: 'dynamic-squat', label: '徒手深蹲' },
  { id: 'dynamic-neck-retraction', label: '颈部回缩' },
  { id: 'review', label: '生成结果' },
];

export default function PostureScreeningProgress({ currentStep }: { currentStep: PostureScreeningDraftStep }) {
  const normalized = currentStep === 'follow-up' ? 'concern' : currentStep === 'photo' ? 'static-front' : currentStep;
  const currentIndex = Math.max(0, stages.findIndex(({ id }) => id === normalized));
  const currentLabel = currentStep === 'photo' ? '可选照片' : stages[currentIndex].label;

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
