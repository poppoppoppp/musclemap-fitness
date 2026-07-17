import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DumbbellIcon from '../components/icons/DumbbellIcon';
import type { TrainingTemplate } from '../types/trainingTemplate';
import { createActiveWorkoutFromTemplate, readActiveWorkout, writeActiveWorkout } from '../utils/activeWorkout';
import {
  deleteTrainingTemplate,
  duplicateTrainingTemplate,
  markTrainingTemplateUsed,
  readTrainingTemplates
} from '../utils/trainingTemplates';

type TemplateListLocationState = { saved?: boolean } | null;

export default function PlanBuilder() {
  const location = useLocation();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(() => readTrainingTemplates());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const saved = (location.state as TemplateListLocationState)?.saved === true;

  const handleDuplicate = (templateId: string) => {
    const result = duplicateTrainingTemplate(templateId);
    if (!result.ok) {
      setMessageIsError(true);
      setMessage('复制模板失败，请稍后重试');
      return;
    }
    setTemplates(readTrainingTemplates());
    setMessageIsError(false);
    setMessage('模板已复制');
  };

  const handleDelete = (templateId: string) => {
    const result = deleteTrainingTemplate(templateId);
    if (!result.ok) {
      setMessageIsError(true);
      setMessage('删除模板失败，请稍后重试');
      return;
    }
    setTemplates(readTrainingTemplates());
    setPendingDeleteId(null);
    setMessageIsError(false);
    setMessage('模板已删除');
  };

  const handleStart = (template: TrainingTemplate) => {
    if (readActiveWorkout()) {
      navigate('/workout-log');
      return;
    }

    try {
      writeActiveWorkout(createActiveWorkoutFromTemplate(template));
      markTrainingTemplateUsed(template.id);
      navigate('/workout-log');
    } catch {
      setMessageIsError(true);
      setMessage('无法开始训练，请检查浏览器存储空间');
    }
  };

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden bg-[#070907] px-4 pb-28 pt-6 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-20 h-96 w-96 rounded-full bg-lime-300/[0.08] blur-3xl" />
      <div className="relative mx-auto max-w-[440px]">
        <header className="mb-7 flex items-center gap-4">
          <Link to="/data-management" aria-label="返回我的" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xl text-white transition hover:border-lime-300/40 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/70">
            ‹
          </Link>
          <h1 className="text-4xl font-black tracking-[-0.035em]">训练模板</h1>
        </header>

        {saved || message ? <p role={messageIsError ? 'alert' : 'status'} className={`mb-4 rounded-xl px-4 py-3 text-sm font-bold ${messageIsError ? 'bg-red-300/10 text-red-300' : 'bg-lime-300/10 text-lime-300'}`}>{message ?? '模板已保存'}</p> : null}

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
              <article
                key={template.id}
                aria-label={template.name}
                data-template-id={template.id}
                data-testid={`training-template-${template.id}`}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111511] p-5"
              >
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
                    <p className="mt-3 flex items-center gap-2 text-sm text-zinc-400"><DumbbellIcon className="h-4 w-4" /> {template.items.length} 个动作 · {getTotalSets(template)} 组</p>
                    <p className="mt-1 text-xs text-zinc-500">{template.lastUsedAt ? `上次使用 ${template.lastUsedAt.slice(0, 10)}` : '尚未使用'}</p>
                  </div>
                </div>

                <div className="relative mt-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleStart(template)} aria-label={`开始 ${template.name}`} className="min-h-11 rounded-xl bg-lime-300 px-3 text-sm font-black text-[#10130d] transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-100">
                    开始训练
                  </button>
                  <Link to={`/templates/${template.id}/edit`} aria-label={`编辑 ${template.name}`} className="flex min-h-11 items-center justify-center rounded-xl border border-white/12 px-3 text-sm font-bold text-white transition hover:border-lime-300/40 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">
                    编辑
                  </Link>
                  <button type="button" onClick={() => handleDuplicate(template.id)} aria-label={`复制 ${template.name}`} className="min-h-11 rounded-xl border border-white/12 px-3 text-sm font-bold text-zinc-300 transition hover:border-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40">
                    复制
                  </button>
                  <button type="button" onClick={() => setPendingDeleteId(template.id)} aria-label={`删除 ${template.name}`} className="min-h-11 rounded-xl border border-red-300/20 px-3 text-sm font-bold text-red-300 transition hover:bg-red-300/10 focus:outline-none focus:ring-2 focus:ring-red-300/50">
                    删除
                  </button>
                </div>

                {pendingDeleteId === template.id ? (
                  <div className="relative mt-3 rounded-xl border border-red-300/20 bg-red-300/[0.06] p-3">
                    <p className="text-sm text-red-100">删除后无法恢复，确认删除这个模板？</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setPendingDeleteId(null)} className="min-h-11 rounded-lg border border-white/12 text-sm font-bold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-white/40">取消</button>
                      <button type="button" onClick={() => handleDelete(template.id)} aria-label={`确认删除 ${template.name}`} className="min-h-11 rounded-lg bg-red-300 text-sm font-black text-red-950 focus:outline-none focus:ring-2 focus:ring-red-100">确认删除</button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getTotalSets(template: TrainingTemplate) {
  return template.items.reduce((total, item) => total + item.sets, 0);
}
