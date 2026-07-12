import { useEffect, useState } from 'react';
import InteractiveMuscleMap2D, { type MuscleMapView } from '../../components/muscle/InteractiveMuscleMap2D';
import { progressPhotoCategoryLabels, type ProgressPhotoCategory } from '../../types/progressPhoto';

const muscleCategoryMap: Record<string, ProgressPhotoCategory> = {
  'anterior-deltoid': 'shoulders', 'lateral-deltoid': 'shoulders', 'rear-deltoid': 'shoulders', 'pectoralis-major': 'chest',
  'biceps-brachii': 'biceps', 'triceps-brachii': 'triceps', 'rectus-abdominis': 'abs', obliques: 'abs', quadriceps: 'front_thigh',
  'latissimus-dorsi': 'back', 'middle-lower-trapezius': 'back', rhomboids: 'back', 'gluteus-maximus': 'glutes', hamstrings: 'rear_thigh', calves: 'rear_calf'
};
const categoryMuscleMap: Partial<Record<ProgressPhotoCategory, string>> = { shoulders: 'lateral-deltoid', chest: 'pectoralis-major', biceps: 'biceps-brachii', abs: 'rectus-abdominis', front_thigh: 'quadriceps', back: 'latissimus-dorsi', triceps: 'triceps-brachii', glutes: 'gluteus-maximus', rear_thigh: 'hamstrings', rear_calf: 'calves' };
const localCategories: Record<MuscleMapView, ProgressPhotoCategory[]> = {
  front: ['shoulders', 'chest', 'biceps', 'forearms', 'abs', 'front_thigh', 'front_calf'],
  back: ['shoulders', 'back', 'triceps', 'glutes', 'rear_thigh', 'rear_calf']
};
const backCategories = new Set<ProgressPhotoCategory>(localCategories.back.filter((category) => category !== 'shoulders'));

export default function PhotoCategoryPicker({ value, onChange }: { value: ProgressPhotoCategory | null; onChange: (value: ProgressPhotoCategory) => void }) {
  const [view, setView] = useState<MuscleMapView>('front');
  useEffect(() => { if (value && backCategories.has(value)) setView('back'); }, [value]);
  const selectedMuscle = value ? categoryMuscleMap[value] ?? '' : '';
  const button = (category: ProgressPhotoCategory, label = progressPhotoCategoryLabels[category]) => <button key={category} type="button" aria-pressed={value === category} onClick={() => onChange(category)} className={`min-h-10 rounded-full border px-3 text-sm font-bold ${value === category ? 'border-lime-300 bg-lime-300 text-black' : 'border-white/12 text-zinc-300'}`}>{label}</button>;
  return (
    <div className="space-y-5">
      <section><h3 className="mb-2 text-sm font-black">面部</h3>{button('face')}</section>
      <section><h3 className="mb-2 text-sm font-black">整体身材</h3><div className="flex flex-wrap gap-2">{button('full_front')}{button('full_side')}{button('full_back')}</div></section>
      <section>
        <div className="flex items-center justify-between"><h3 className="text-sm font-black">局部肌群</h3><div className="flex rounded-full border border-white/12 p-1">{(['front', 'back'] as const).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)} className={`min-h-8 rounded-full px-3 text-xs font-bold ${view === item ? 'bg-lime-300 text-black' : 'text-zinc-400'}`}>{item === 'front' ? '正面' : '背面'}</button>)}</div></div>
        <div className="mt-3"><InteractiveMuscleMap2D variant="compact" view={view} selectedMuscleId={selectedMuscle} onSelectMuscle={(muscleId) => { const category = muscleCategoryMap[muscleId]; if (category) onChange(category); }} /></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{localCategories[view].map((category) => button(category))}</div>
        <p className="mt-2 text-center text-sm text-zinc-400">当前选择：<strong className="text-lime-300">{value && !value.startsWith('full_') && value !== 'face' ? progressPhotoCategoryLabels[value] : '请选择局部区域'}</strong></p>
      </section>
    </div>
  );
}
