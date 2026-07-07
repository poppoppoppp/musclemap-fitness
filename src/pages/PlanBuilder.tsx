import { Link, useLocation } from 'react-router-dom';
import DumbbellIcon from '../components/icons/DumbbellIcon';
import { readTrainingTemplates } from '../utils/trainingTemplates';

type TemplateListLocationState = { saved?: boolean } | null;

export default function PlanBuilder() {
  const location = useLocation();
  const templates = readTrainingTemplates();
  const saved = (location.state as TemplateListLocationState)?.saved === true;

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden bg-[#070907] px-4 pb-8 pt-6 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-20 h-96 w-96 rounded-full bg-lime-300/[0.08] blur-3xl" />
      <div className="relative mx-auto max-w-[440px]">
        <header className="mb-7 flex items-center gap-4">
          <Link to="/data-management" aria-label="返回我的" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xl text-white transition hover:border-lime-300/40 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/70">
            ‹
          </Link>
          <h1 className="text-4xl font-black tracking-[-0.035em]">训练模板</h1>
        </header>

        {saved ? <p role="status" className="mb-4 rounded-xl bg-lime-300/10 px-4 py-3 text-sm font-bold text-lime-300">模板已保存</p> : null}

        <Link to="/templates/new" className="flex min-h-14 w-full items-center justify-center rounded-full bg-lime-300 px-5 text-base font-black text-[#10130d] transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-100 focus:ring-offset-2 focus:ring-offset-[#070907] active:scale-[0.99]">
          ＋ 新建模板
        </Link>

        {templates.length === 0 ? (
          <section className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#111511] px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-lime-300/35 bg-lime-300/[0.06] text-lime-300">
              <DumbbellIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-5 text-xl font-bold">还没有训练模板</h2>
            <p className="mt-2 text-sm text-zinc-400">创建模板，保存自己的训练安排</p>
          </section>
        ) : (
          <div className="mt-8 space-y-4">
            {templates.map((template) => (
              <article key={template.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111511] p-5">
                <div aria-hidden="true" className="absolute -right-16 -top-16 h-40 w-40 rounded-full border border-lime-300/10" />
                <div className="relative flex items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-lime-300/30 text-lime-300">
                    <DumbbellIcon className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-black">{template.name}</h2>
                    {template.focusTags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {template.focusTags.map((tag) => <span key={tag} className="rounded-md bg-white/[0.08] px-2 py-1 text-xs text-zinc-300">{tag}</span>)}
                      </div>
                    ) : null}
                    <p className="mt-3 flex items-center gap-2 text-sm text-zinc-400"><DumbbellIcon className="h-4 w-4" /> {template.items.length} 个动作</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
