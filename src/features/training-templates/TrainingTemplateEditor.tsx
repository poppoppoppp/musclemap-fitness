import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DumbbellIcon from '../../components/icons/DumbbellIcon';
import ExercisePickerSheet from '../../components/workout/ExercisePickerSheet';
import { getExerciseById } from '../../data/exercises';
import type { TrainingTemplateDraft, TrainingTemplateItem } from '../../types/trainingTemplate';
import {
  clearTrainingTemplateDraft,
  createTrainingTemplate,
  getTrainingTemplate,
  readTrainingTemplateDraft,
  updateTrainingTemplate,
  writeTrainingTemplateDraft
} from '../../utils/trainingTemplates';

type TrainingTemplateEditorProps = {
  mode: 'create' | 'edit';
  templateId?: string;
};

const focusOptions = ['胸部', '背部', '肩部', '手臂', '腿部', '核心'];

export default function TrainingTemplateEditor({ mode, templateId }: TrainingTemplateEditorProps) {
  const navigate = useNavigate();
  const draftKey = mode === 'create' ? 'new' : `edit:${templateId ?? ''}`;
  const [savedTemplate] = useState(() => mode === 'edit' && templateId ? getTrainingTemplate(templateId) : null);
  const [initialDraft] = useState(() => readTrainingTemplateDraft(draftKey));
  const initialValue = initialDraft ?? savedTemplate;
  const missingTemplate = mode === 'edit' && !savedTemplate;
  const [name, setName] = useState(initialValue?.name ?? '');
  const [focusTags, setFocusTags] = useState<string[]>(initialValue?.focusTags ?? []);
  const [items, setItems] = useState<TrainingTemplateItem[]>(initialValue?.items ?? []);
  const [message, setMessage] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const existingExerciseIds = useMemo(() => new Set(items.map((item) => item.exerciseId)), [items]);

  useEffect(() => {
    if (missingTemplate) return;
    const draft: TrainingTemplateDraft = {
      key: draftKey,
      name,
      focusTags,
      items,
      savedAt: new Date().toISOString()
    };
    const result = writeTrainingTemplateDraft(draft);
    if (!result.ok) setMessage('草稿保存失败，请检查本地存储空间');
  }, [draftKey, focusTags, items, missingTemplate, name]);

  const toggleFocus = (tag: string) => {
    setFocusTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };

  const handleAddExercise = (exerciseId: string) => {
    if (existingExerciseIds.has(exerciseId)) return false;
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), exerciseId, order: current.length, sets: 3, repRange: '8-12', restSeconds: 90 }
    ]);
    setMessage('');
    setPickerOpen(false);
    return true;
  };

  const updateItem = (itemId: string, changes: Partial<TrainingTemplateItem>) => {
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...changes } : item));
  };

  const moveItem = (itemId: string, direction: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === itemId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, order) => ({ ...item, order }));
    });
  };

  const removeItem = (itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId).map((item, order) => ({ ...item, order })));
  };

  const handleSave = () => {
    if (!name.trim()) {
      setMessage('请输入模板名称');
      return;
    }
    if (items.length === 0) {
      setMessage('请至少添加一个动作');
      return;
    }
    if (items.some((item) => !Number.isInteger(item.sets) || item.sets < 1)) {
      setMessage('每个动作至少需要 1 组');
      return;
    }
    if (items.some((item) => !item.repRange.trim())) {
      setMessage('请填写每个动作的次数范围');
      return;
    }
    if (items.some((item) => !Number.isInteger(item.restSeconds) || item.restSeconds < 0)) {
      setMessage('休息时间不能小于 0 秒');
      return;
    }

    const result = mode === 'edit' && templateId
      ? updateTrainingTemplate(templateId, { name, focusTags, items })
      : createTrainingTemplate({ name, focusTags, items });
    if (!result.ok) {
      setMessage('模板保存失败，请检查本地存储空间');
      return;
    }
    clearTrainingTemplateDraft(draftKey);
    navigate('/plan-builder', { state: { saved: true }, replace: true });
  };

  if (missingTemplate) {
    return (
      <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] bg-[#070907] px-4 pt-20 text-center text-white sm:-mx-6 sm:px-6">
        <h1 className="text-3xl font-black">找不到训练模板</h1>
        <p className="mt-3 text-sm text-zinc-400">这个模板可能已被删除或本地数据已经损坏。</p>
        <Link to="/plan-builder" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-lime-300 px-6 font-black text-[#10130d]">返回训练模板</Link>
      </div>
    );
  }

  return (
    <div className="template-dark relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden bg-[#070907] px-4 pb-32 pt-6 text-white sm:-mx-6 sm:px-6 lg:pb-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-lime-300/[0.09] blur-3xl" />
      <div className="relative mx-auto max-w-[440px]">
        <header className="grid min-h-12 grid-cols-[44px_1fr_44px] items-center gap-3">
          <Link to="/plan-builder" aria-label="返回训练模板" className="flex h-11 w-11 items-center justify-center rounded-full border border-lime-300/35 bg-white/[0.04] text-3xl leading-none text-lime-300 transition hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-300/70">‹</Link>
          <h1 className="text-center text-3xl font-black tracking-[-0.035em]">{mode === 'create' ? '新建模板' : '编辑模板'}</h1>
          <span aria-hidden="true" />
        </header>

        <main className="mt-7 space-y-7 rounded-2xl border border-white/10 bg-[#0f130f]/95 p-5 sm:p-6">
          <section>
            <label htmlFor="template-name" className="text-lg font-black">模板名称</label>
            <input
              id="template-name"
              value={name}
              onChange={(event) => { setName(event.target.value); setMessage(''); }}
              placeholder="请输入模板名称"
              className="mt-3 h-14 w-full rounded-xl border border-white/12 bg-black/35 px-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300 focus:ring-2 focus:ring-lime-300/20"
            />
          </section>

          <section>
            <h2 className="text-lg font-black">训练重点</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {focusOptions.map((tag) => {
                const selected = focusTags.includes(tag);
                return (
                  <button key={tag} type="button" aria-pressed={selected} onClick={() => toggleFocus(tag)} className={`min-h-12 rounded-xl border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-lime-300/70 ${selected ? 'border-lime-300 bg-lime-300 text-[#10130d]' : 'border-white/12 bg-black/20 text-zinc-300 hover:border-lime-300/50'}`}>
                    {tag}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">动作列表</h2>
              <span className="text-sm text-zinc-500">{items.length} 个动作</span>
            </div>
            {items.length === 0 ? (
              <div className="mt-3 flex min-h-44 flex-col items-center justify-center rounded-xl bg-black/20 p-5 text-center">
                <DumbbellIcon className="h-8 w-8 text-lime-300" />
                <p className="mt-3 text-sm text-zinc-400">还没有添加动作</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {items.map((item, index) => <TemplateItemRow key={item.id} item={item} index={index} itemCount={items.length} onChange={updateItem} onMove={moveItem} onRemove={removeItem} />)}
              </div>
            )}
            <button type="button" onClick={() => setPickerOpen(true)} className="mt-3 min-h-12 w-full rounded-xl border border-dashed border-lime-300/55 text-base font-bold text-lime-300 transition hover:bg-lime-300/10 focus:outline-none focus:ring-2 focus:ring-lime-300/70">+ 添加动作</button>
          </section>

          {message ? <p role="alert" className="text-center text-sm font-bold text-red-300">{message}</p> : null}
          <button type="button" onClick={handleSave} className="min-h-14 w-full rounded-full bg-lime-300 px-6 text-lg font-black text-[#10130d] transition hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-100 focus:ring-offset-2 focus:ring-offset-[#0f130f] active:scale-[0.99]">保存模板</button>
          <div data-testid="template-editor-content-end" className="h-24 lg:hidden" />
        </main>
      </div>

      <ExercisePickerSheet
        open={pickerOpen}
        existingExerciseIds={existingExerciseIds}
        onAddExercise={handleAddExercise}
        onAddPostureProtocol={() => false}
        onClose={() => setPickerOpen(false)}
        title="添加模板动作"
        description="搜索、筛选或从身体图中精确查找模板动作"
        duplicateMessage="该动作已在模板中"
        showPosture={false}
      />
    </div>
  );
}

function TemplateItemRow({ item, index, itemCount, onChange, onMove, onRemove }: {
  item: TrainingTemplateItem;
  index: number;
  itemCount: number;
  onChange: (itemId: string, changes: Partial<TrainingTemplateItem>) => void;
  onMove: (itemId: string, direction: -1 | 1) => void;
  onRemove: (itemId: string) => void;
}) {
  const exercise = getExerciseById(item.exerciseId);
  const name = exercise?.name ?? item.exerciseId;
  return (
    <article data-testid={`template-item-${item.exerciseId}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-black text-white">{name}</h3>
          <p className="truncate text-xs text-zinc-500">{exercise?.nameEn}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" aria-label={`上移 ${name}`} disabled={index === 0} onClick={() => onMove(item.id, -1)} className="min-h-10 min-w-10 rounded-lg text-zinc-400 disabled:opacity-30">↑</button>
          <button type="button" aria-label={`下移 ${name}`} disabled={index === itemCount - 1} onClick={() => onMove(item.id, 1)} className="min-h-10 min-w-10 rounded-lg text-zinc-400 disabled:opacity-30">↓</button>
          <button type="button" aria-label={`删除 ${name}`} onClick={() => onRemove(item.id)} className="min-h-10 min-w-10 rounded-lg text-red-300">×</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <PrescriptionField label={`${name}组数`} value={String(item.sets)} type="number" min="1" onChange={(value) => onChange(item.id, { sets: Number(value) })} />
        <PrescriptionField label={`${name}次数范围`} value={item.repRange} onChange={(value) => onChange(item.id, { repRange: value })} />
        <PrescriptionField label={`${name}休息秒数`} value={String(item.restSeconds)} type="number" min="0" onChange={(value) => onChange(item.id, { restSeconds: Number(value) })} />
      </div>
      <label className="mt-2 block text-xs font-bold text-zinc-500">
        <span className="sr-only">{name}备注</span>
        <input aria-label={`${name}备注`} value={item.note ?? ''} onChange={(event) => onChange(item.id, { note: event.target.value })} placeholder="动作备注（可选）" className="min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-lime-300/60" />
      </label>
    </article>
  );
}

function PrescriptionField({ label, value, onChange, type = 'text', min }: { label: string; value: string; onChange: (value: string) => void; type?: 'text' | 'number'; min?: string }) {
  return (
    <label className="text-xs font-bold text-zinc-500">
      <span>{label.replace(/^.*?(组数|次数范围|休息秒数)$/, '$1')}</span>
      <input aria-label={label} type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-2 text-sm text-white outline-none focus:border-lime-300/60" />
    </label>
  );
}
