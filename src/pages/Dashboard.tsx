import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';

const entries = [
  { to: '/muscle-map', title: '肌群地图', description: '从背面人体图认识目标肌群。' },
  { to: '/exercises', title: '动作库', description: '按肌群、器械和关键词查找动作。' },
  { to: '/plan-builder', title: '训练计划生成器', description: 'V0.2 开放，当前为占位入口。' },
  { to: '/workout-log', title: '训练记录', description: 'V0.3 开放，当前为占位入口。' }
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-panel p-5">
        <p className="text-sm font-semibold text-accent">MuscleMap Fitness</p>
        <h1 className="mt-3 text-3xl font-bold text-white">从肌群理解动作，从动作建立训练计划</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          面向健身新手和进阶者的肌群认知工具。V0.1 先打通背部肌群、动作推荐和动作详情。
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link key={entry.to} to={entry.to} aria-label={entry.title}>
            <Card className="h-full transition hover:border-accent">
              <h2 className="text-lg font-semibold text-white">{entry.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{entry.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
