import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DumbbellIcon from '../components/icons/DumbbellIcon';
import { createTrainingTemplate } from '../utils/trainingTemplates';

const focusOptions = ['胸部', '背部', '肩部', '手臂', '腿部', '核心'];

export default function NewTrainingTemplate() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [focusTags, setFocusTags] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const toggleFocus = (tag: string) => {
    setFocusTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };

  const showPlaceholder = (text: string) => setMessage(text);

  const handleSave = () => {
    if (!name.trim()) {
      setMessage('请输入模板名称');
      return;
    }

    createTrainingTemplate({ name, focusTags });
    navigate('/plan-builder', { state: { saved: true }, replace: true });
  };

  return (
    <div className="template-dark relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden bg-[#070907] px-4 pb-8 pt-6 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-lime-300/[0.09] blur-3xl" />
      <div className="relative mx-auto max-w-[440px]">
        <header className="grid min-h-12 grid-cols-[44px_1fr_44px] items-center gap-3">
          <Link to="/plan-builder" aria-label="返回训练模板" className="flex h-11 w-11 items-center justify-center rounded-full border border-lime-300/35 bg-white/[0.04] text-3xl leading-none text-lime-300 transition hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-300/70">‹</Link>
          <h1 className="text-center text-3xl font-black tracking-[-0.035em]">新建模板</h1>
          <button type="button" aria-label="更多操作" onClick={() => showPlaceholder('更多功能开发中')} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg font-black tracking-widest text-lime-300 transition hover:border-lime-300/35 focus:outline-none focus:ring-2 focus:ring-lime-300/70">•••</button>
        </header>

        <main className="mt-7 rounded-2xl border border-lime-300/35 bg-[#0f130f]/95 p-5 sm:p-6">
          <TemplateSection title="模板名称">
            <input value={name} onChange={(event) => { setName(event.target.value); if (message === '请输入模板名称') setMessage(''); }} placeholder="请输入模板名称" className="mt-4 h-14 w-full rounded-xl border border-lime-300/30 bg-black/35 px-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300 focus:ring-2 focus:ring-lime-300/20" />
          </TemplateSection>

          <TemplateSection title="训练重点" className="mt-8">
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {focusOptions.map((tag) => {
                const selected = focusTags.includes(tag);
                return (
                  <button key={tag} type="button" aria-pressed={selected} onClick={() => toggleFocus(tag)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-lime-300/70 ${selected ? 'border-lime-300 bg-lime-300 text-[#10130d]' : 'border-lime-300/30 bg-black/20 text-zinc-200 hover:border-lime-300/65'}`}>
                    <span aria-hidden="true" className={`h-4 w-4 rounded-full border ${selected ? 'border-[#10130d] bg-[#10130d]' : 'border-zinc-500'}`} />{tag}
                  </button>
                );
              })}
              <button type="button" onClick={() => showPlaceholder('自定义训练重点功能开发中')} className="min-h-12 rounded-xl border border-dashed border-lime-300/45 bg-black/20 text-2xl text-lime-300 transition hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-300/70">+</button>
            </div>
          </TemplateSection>

          <TemplateSection title="动作列表" className="mt-8">
            <div className="mt-4 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-lime-300/25 bg-black/20 p-5 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-lime-300/35 bg-lime-300/[0.06] text-lime-300"><DumbbellIcon className="h-8 w-8" /></span>
              <p className="mt-4 text-sm text-zinc-400">还没有添加动作</p>
              <button type="button" onClick={() => showPlaceholder('请选择添加方式')} className="mt-5 min-h-12 w-full rounded-xl border border-dashed border-lime-300/60 text-base font-bold text-lime-300 transition hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-300/70">+ 添加动作</button>
            </div>
          </TemplateSection>

          <TemplateSection title="添加方式" className="mt-8">
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => showPlaceholder('搜索动作功能开发中')} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-lime-300/35 bg-black/20 px-2 text-xs font-bold text-lime-300 transition hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-300/70"><SearchIcon />搜索动作</button>
              <Link to="/three-muscle-selector?mode=template" className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-lime-300/35 bg-black/20 px-1 text-center text-xs font-bold leading-4 text-lime-300 transition hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-300/70"><MuscleIcon />从肌群地图添加</Link>
              <Link to="/exercises?mode=template" className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-lime-300/35 bg-black/20 px-2 text-xs font-bold text-lime-300 transition hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-300/70"><LibraryIcon />从动作库</Link>
            </div>
          </TemplateSection>

          {message ? <p role={message === '请输入模板名称' ? 'alert' : 'status'} className={`mt-5 text-center text-sm font-bold ${message === '请输入模板名称' ? 'text-red-300' : 'text-lime-300'}`}>{message}</p> : null}

          <button type="button" onClick={handleSave} className="mt-8 min-h-14 w-full rounded-full bg-lime-300 px-6 text-lg font-black text-[#10130d] transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-100 focus:ring-offset-2 focus:ring-offset-[#0f130f] active:scale-[0.99]">保存模板</button>
        </main>
      </div>
    </div>
  );
}

function TemplateSection({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  return <section className={className}><h2 className="flex items-center gap-3 text-xl font-black"><span aria-hidden="true" className="h-7 w-1.5 rounded-full bg-lime-300" />{title}</h2>{children}</section>;
}

function SearchIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" /><path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function MuscleIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10c1-3 3-4 5-1 2-3 4-2 5 1v7H7v-7Z" stroke="currentColor" strokeWidth="2" /><path d="M9 7V4m6 3V4M4 11h3m10 0h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function LibraryIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 7 8 4 8-4-8-4-8 4Zm0 5 8 4 8-4M4 17l8 4 8-4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>; }
