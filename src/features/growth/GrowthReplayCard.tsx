import { useState } from 'react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function GrowthReplayCard() {
  const [open, setOpen] = useState(false);
  return <><button type="button" aria-label="了解成长回放" onClick={() => setOpen(true)} className="flex w-full items-center gap-4 rounded-[24px] border border-lime-300/20 bg-[#111611] p-5 text-left"><span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full border border-lime-300/50 text-lime-300">▶</span><span><strong className="block text-lg text-white">成长回放（即将上线）</strong><span className="mt-1 block text-sm text-zinc-400">了解后续照片序列如何生成变化视频</span></span></button><ConfirmDialog open={open} title="成长回放即将上线" message="后续将按同一分类和拍摄日期排序照片，完成位置与缩放对齐后生成平滑变化视频。本版不会生成模拟视频。" confirmLabel="知道了" onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} /></>;
}
