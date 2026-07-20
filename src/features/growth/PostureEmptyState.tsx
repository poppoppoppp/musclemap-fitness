import { Link } from 'react-router-dom';
import BackPoseIcon from '../../components/icons/BackPoseIcon';

const capabilities = ['头肩位置', '肩部高低差', '躯干偏移', '动作表现', '照片测量', '复测关系'];

export default function PostureEmptyState() {
  return (
    <div data-testid="posture-state-empty" className="space-y-7">
      <section className="relative overflow-hidden rounded-[26px] border border-lime-300/20 bg-[linear-gradient(135deg,rgba(190,242,48,0.10),rgba(255,255,255,0.025)_48%,rgba(0,0,0,0.1))] p-5">
        <div aria-hidden="true" className="absolute -right-8 top-4 h-48 w-48 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative grid grid-cols-[1fr_92px] items-center gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.14em] text-lime-300">POSTURE CHECK</p>
            <h2 className="mt-3 text-[1.7rem] font-black leading-tight tracking-[-0.035em] text-white">了解你的体态表现</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">通过问答、引导动作与可选照片测量，形成可解释、可复测的筛查记录。</p>
          </div>
          <div className="flex h-28 items-center justify-center rounded-2xl border border-lime-300/20 bg-black/25 text-lime-300"><BackPoseIcon className="h-24 w-24" /></div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-lime-200/80"><span>约 3–5 分钟</span><span>需固定手机</span><span>建议全身入镜</span></div>
        <Link to="/growth/posture/screening" className="relative mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-100">开始体态分析</Link>
      </section>
      <section>
        <h2 className="text-lg font-black text-white">可记录内容</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{capabilities.map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-center text-sm font-bold text-zinc-300">{item}</div>)}</div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <h2 className="text-base font-black text-white">当前记录</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">完成首次体态分析后，这里会展示筛查报告、手动创建的改善计划与真实复测记录。</p>
      </section>
    </div>
  );
}
