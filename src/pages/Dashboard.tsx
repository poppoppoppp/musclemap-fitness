import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { readActiveWorkout } from '../utils/activeWorkout';
import type { ActiveWorkout } from '../types/activeWorkout';

const secondaryEntries = [
  { to: '/exercises', title: '动作库', description: '按肌群和器械查动作' },
  { to: '/workout-history', title: '训练历史', description: '查看已归档训练' },
  { to: '/data-management', title: '数据备份', description: '导出本地 JSON' },
  { to: '/plan-builder', title: '训练计划', description: '生成训练安排' }
];

export default function Dashboard() {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);

  useEffect(() => {
    setActiveWorkout(readActiveWorkout());
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm font-semibold text-accent">MuscleMap Fitness</p>
        <h1 className="mt-2 text-2xl font-bold text-white">今天练什么</h1>
        <div className="mt-4 grid gap-3">
          {activeWorkout ? (
            <HomeAction to="/workout-log" title="继续当前训练" description={`${activeWorkout.exercises.length} 个动作进行中`} primary />
          ) : (
            <HomeAction to="/three-muscle-selector" title="3D 选肌群" description="点肌肉，选动作，加入训练" primary />
          )}
          <HomeAction to="/workout-log" title="开始记录" description="直接进入训练记录" />
          <HomeAction to="/three-muscle-selector" title="3D 肌群选择" description="从真实模型选择训练部位" />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {secondaryEntries.map((entry) => (
          <Link key={entry.to} to={entry.to} aria-label={entry.title}>
            <Card className="h-full transition hover:border-accent">
              <h2 className="text-base font-semibold text-white">{entry.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{entry.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function HomeAction({
  to,
  title,
  description,
  primary = false
}: {
  to: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`block rounded-md border px-4 py-3 transition ${
        primary ? 'border-accent bg-accent text-slate-950' : 'border-line bg-slate-950 text-white hover:border-accent'
      }`}
    >
      <span className={`block text-base font-semibold ${primary ? 'text-slate-950' : 'text-white'}`}>{title}</span>
      <span className={`mt-1 block text-sm ${primary ? 'text-slate-800' : 'text-slate-300'}`}>{description}</span>
    </Link>
  );
}
