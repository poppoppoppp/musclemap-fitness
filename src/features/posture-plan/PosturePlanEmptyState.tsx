import { Link } from 'react-router-dom';

export default function PosturePlanEmptyState() {
  return (
    <section className="mt-8 border-y border-white/10 py-8">
      <h2 className="text-xl font-black text-white">先了解当前体态表现</h2>
      <p className="mt-2 max-w-[42ch] text-sm leading-6 text-zinc-300">完成一组针对性问题和引导观察，获得可解释、可复测的体态表现结果。筛查不会自动创建或修改训练方案。</p>
      <Link to="/growth/posture/screening" className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] outline-none focus-visible:ring-2 focus-visible:ring-lime-100">开始体态筛查</Link>
    </section>
  );
}
