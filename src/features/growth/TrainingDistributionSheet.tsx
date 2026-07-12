import SnapBottomSheet from '../../components/ui/SnapBottomSheet';
import type { GrowthTimeRange, TrainingDistributionItem } from '../../types/growth';

const rangeLabels: Record<GrowthTimeRange, string> = { '4w': '近4周', '3m': '近3个月', '6m': '近6个月', all: '全部记录' };
export default function TrainingDistributionSheet({ open, items, range, onClose }: { open: boolean; items: TrainingDistributionItem[]; range: GrowthTimeRange; onClose: () => void }) {
  return <SnapBottomSheet open={open} title="训练分布详情" testId="training-distribution-sheet" compactRatio={0.72} onRequestClose={onClose}><p className="text-sm text-zinc-400">时间范围：{rangeLabels[range]}</p><div className="mt-5 space-y-4">{items.filter((item) => item.sets > 0).length === 0 ? <p className="py-10 text-center text-zinc-500">当前范围内暂无训练记录</p> : items.filter((item) => item.sets > 0).map((item) => <section key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex justify-between"><h3 className="font-black">{item.label}</h3><strong className="text-lime-300">{item.sets}组</strong></div><ul className="mt-3 space-y-2">{item.exercises.map((exercise) => <li key={exercise.exerciseId} className="flex justify-between text-sm text-zinc-300"><span>{exercise.label}</span><span>{exercise.sets}组</span></li>)}</ul></section>)}</div></SnapBottomSheet>;
}
