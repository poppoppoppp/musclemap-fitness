import type { PosturePhotoView } from '../../utils/posturePhotogrammetry';

const guides: Record<PosturePhotoView, { label: string; instructions: string[] }> = {
  front: {
    label: '正面照片',
    instructions: [
      '正对镜头自然站立，镜头与胸廓大致同高。',
      '双脚自然分开，双臂放松垂于身体两侧。',
      '确保双耳、双肩与躯干轮廓完整可见。',
    ],
  },
  'left-lateral': {
    label: '左侧面照片',
    instructions: [
      '左侧朝向镜头，自然站立，不刻意收下巴或夹肩。',
      '镜头与胸廓大致同高，避免明显俯拍或仰拍。',
      '确保耳部、颈肩交界与躯干轮廓完整可见。',
    ],
  },
};

export default function PosturePhotoGuide({ view, onChange }: { view: PosturePhotoView; onChange: (view: PosturePhotoView) => void }) {
  return (
    <section aria-labelledby="photo-guide-title">
      <h3 id="photo-guide-title" className="text-sm font-black text-zinc-100">选择拍摄方向</h3>
      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="照片方向">
        {(Object.keys(guides) as PosturePhotoView[]).map((value) => (
          <button key={value} type="button" aria-pressed={view === value} onClick={() => onChange(value)} className={`min-h-12 rounded-xl border px-3 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-lime-200 ${view === value ? 'border-lime-300 bg-lime-300 text-[#10130d]' : 'border-white/15 bg-white/[0.03] text-zinc-200'}`}>{guides[value].label}</button>
        ))}
      </div>
      <ol className="mt-4 space-y-2.5">
        {guides[view].instructions.map((instruction, index) => <li key={instruction} className="flex gap-3 text-sm leading-6 text-zinc-300"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-black text-lime-300">{index + 1}</span><span>{instruction}</span></li>)}
      </ol>
    </section>
  );
}
