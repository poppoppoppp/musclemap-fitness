import type { ProgressPhotoCategory } from '../../types/progressPhoto';

const guides: Partial<Record<ProgressPhotoCategory, string>> = {
  face: '正脸、相同距离、自然表情', full_front: '拍到头部和脚部，保持相似站姿', full_side: '身体侧向约 90°',
  chest: '肩线水平，保持相似距离', biceps: '保持相同侧别和屈臂角度', back: '保持相似站姿与肩胛状态'
};

export default function PhotoCaptureGuide({ category }: { category: ProgressPhotoCategory | null }) {
  if (!category) return null;
  return <p className="rounded-xl bg-lime-300/[0.07] p-3 text-xs leading-5 text-zinc-300">拍摄提示：{guides[category] ?? '保持相似光线、距离、姿势和拍摄角度'}</p>;
}
