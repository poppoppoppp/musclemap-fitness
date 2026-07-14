import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PostureProtocol, PostureProtocolStep } from '../../types/posture';
import {
  formatDose,
  getPostureCategoryProtocolCount,
  getPostureStandardExerciseById,
  getProtocolExerciseSteps,
  getRequiredProtocolSelectionGroups,
  getSelectedAddableProtocolSteps,
  getVisiblePostureProtocols,
  getVisiblePostureProtocolsForCategory,
  postureDataset
} from '../../utils/postureProtocols';

type BrowserView = 'categories' | 'protocols' | 'detail';

interface PostureProtocolBrowserProps {
  initialProtocolId?: string | null;
  initialCategoryId?: string | null;
  initialScrollTop?: number;
  onBackToExercises: () => void;
  onAddProtocol: (protocolId: string, selectedExerciseIds?: string[]) => boolean;
}

export default function PostureProtocolBrowser({
  initialProtocolId,
  initialCategoryId,
  initialScrollTop = 0,
  onBackToExercises,
  onAddProtocol
}: PostureProtocolBrowserProps) {
  const initialProtocol = initialProtocolId
    ? getVisiblePostureProtocols().find(({ id }) => id === initialProtocolId)
    : undefined;
  const [view, setView] = useState<BrowserView>(initialProtocol ? 'detail' : 'categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId ?? initialProtocol?.category ?? '');
  const [selectedProtocolId, setSelectedProtocolId] = useState(initialProtocol?.id ?? '');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedProtocols = selectedCategoryId ? getVisiblePostureProtocolsForCategory(selectedCategoryId) : [];
  const selectedProtocol = selectedProtocolId
    ? selectedProtocols.find(({ id }) => id === selectedProtocolId) ?? initialProtocol
    : undefined;
  const selectedExerciseIds = Object.values(selectedVariants);
  const requiredSelectionGroups = selectedProtocol ? getRequiredProtocolSelectionGroups(selectedProtocol) : [];
  const selectionComplete = requiredSelectionGroups.every((groupId) => Boolean(selectedVariants[groupId]));
  const addableSteps = selectedProtocol
    ? getSelectedAddableProtocolSteps(selectedProtocol, selectedExerciseIds)
    : [];

  useEffect(() => {
    if (view !== 'detail' || !scrollRef.current) return;
    scrollRef.current.scrollTop = initialScrollTop;
  }, [initialScrollTop, view]);

  const openCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedProtocolId('');
    setSelectedVariants({});
    setView('protocols');
  };

  const openProtocol = (protocolId: string) => {
    setSelectedProtocolId(protocolId);
    setSelectedVariants({});
    setAdding(false);
    setView('detail');
  };

  const goBack = () => {
    setAdding(false);
    if (view === 'categories') {
      onBackToExercises();
    } else if (view === 'protocols') {
      setView('categories');
    } else {
      setView('protocols');
    }
  };

  const addProtocol = () => {
    if (!selectedProtocol || adding || !selectionComplete) return;
    setAdding(true);
    const added = onAddProtocol(selectedProtocol.id, selectedExerciseIds);
    if (!added) setAdding(false);
  };

  return (
    <div data-testid="posture-browser" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-5">
        <button
          type="button"
          data-testid="posture-browser-back"
          onClick={goBack}
          className="min-h-11 rounded-full border border-white/12 px-3 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.06] active:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-lime-300/60"
        >
          ← {view === 'categories' ? '返回动作列表' : '返回上一层'}
        </button>
        <p className="mt-2 text-sm text-zinc-300">
          {view === 'categories' ? '选择训练方向' : view === 'protocols' ? '选择一套体态改善方案' : '查看全部阶段后加入当前训练'}
        </p>
      </div>

      <div
        ref={scrollRef}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5"
        style={{ scrollPaddingBottom: '1rem' }}
      >
        {view === 'categories' ? (
          <CategoryList onSelect={openCategory} />
        ) : view === 'protocols' ? (
          <ProtocolList protocols={selectedProtocols} onSelect={openProtocol} />
        ) : selectedProtocol ? (
          <ProtocolDetail
            protocol={selectedProtocol}
            categoryId={selectedCategoryId}
            scrollTop={scrollTop}
            selectedVariants={selectedVariants}
            onSelectVariant={(groupId, exerciseId) => setSelectedVariants((current) => ({ ...current, [groupId]: exerciseId }))}
          />
        ) : (
          <p className="py-10 text-center text-sm text-zinc-400">当前没有可展示方案</p>
        )}
      </div>

      {view === 'detail' && selectedProtocol ? (
        <div data-testid="posture-protocol-footer" className="shrink-0 border-t border-white/10 bg-[#111410] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <p data-testid="posture-add-summary" className="mb-2 text-center text-xs font-semibold text-zinc-300">
            {selectionComplete ? `将添加 ${addableSteps.length} 个动作` : '请先选择一种器械变式'}
          </p>
          <button
            type="button"
            data-testid="add-posture-protocol"
            disabled={adding || !selectionComplete}
            onClick={addProtocol}
            className="min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] transition hover:bg-lime-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-lime-100"
          >
            {adding ? '正在加入…' : '加入当前训练'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CategoryList({ onSelect }: { onSelect: (categoryId: string) => void }) {
  const guidance = postureDataset.guidanceMaterials.find(({ visibility }) => visibility === 'primary');
  const categories = postureDataset.categories.filter(({ id }) => getPostureCategoryProtocolCount(id) > 0);
  return (
    <div>
      {guidance ? (
        <aside data-testid="posture-guidance" className="mb-5 rounded-2xl bg-lime-300/[0.07] px-4 py-3 text-sm leading-6 text-zinc-200">
          <strong className="block text-sm font-black text-lime-300">{guidance.title}</strong>
          <p className="mt-1 text-wrap-pretty">{guidance.content[3]}，训练目标优先放在舒适度、活动能力和力量表现。</p>
        </aside>
      ) : null}
      <div className="divide-y divide-white/[0.08] rounded-2xl border border-white/10 bg-white/[0.025]">
        {categories.map((category) => {
          const count = getPostureCategoryProtocolCount(category.id);
          return (
            <button
              key={category.id}
              type="button"
              data-testid={`posture-category-${category.id}`}
              data-category-id={category.id}
              onClick={() => onSelect(category.id)}
              className="flex min-h-[76px] w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-lime-300/[0.04] active:bg-lime-300/[0.08] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lime-300/55"
            >
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-black text-zinc-100">{category.name}</strong>
                <span className="mt-1 block text-xs leading-5 text-zinc-400">{category.description}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-lime-300">{count} 套方案</span>
              <span aria-hidden="true" className="shrink-0 text-lg text-zinc-400">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProtocolList({ protocols, onSelect }: { protocols: PostureProtocol[]; onSelect: (protocolId: string) => void }) {
  return (
    <div className="divide-y divide-white/[0.08] rounded-2xl border border-white/10 bg-white/[0.025]">
      {protocols.map((protocol) => (
        <button
          key={protocol.id}
          type="button"
          data-testid={`posture-protocol-${protocol.id}`}
          data-protocol-id={protocol.id}
          onClick={() => onSelect(protocol.id)}
          className="flex min-h-[92px] w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-lime-300/[0.04] active:bg-lime-300/[0.08] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lime-300/55"
        >
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-black leading-5 text-zinc-100">{protocol.title}</strong>
            <span className="mt-1 block text-xs leading-5 text-zinc-400">{protocol.userFacingGoal}</span>
            <span className="mt-1 block text-[11px] font-semibold text-lime-300">{countProtocolActions(protocol)} 个动作</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-lg text-zinc-400">›</span>
        </button>
      ))}
    </div>
  );
}

function ProtocolDetail({
  protocol,
  categoryId,
  scrollTop,
  selectedVariants,
  onSelectVariant
}: {
  protocol: PostureProtocol;
  categoryId: string;
  scrollTop: number;
  selectedVariants: Record<string, string>;
  onSelectVariant: (groupId: string, exerciseId: string) => void;
}) {
  const stages = useMemo(() => groupSteps(protocol.steps), [protocol.steps]);
  return (
    <article data-testid="posture-protocol-detail" className="min-w-0 pb-2">
      <header className="pb-5">
        <h3 className="text-wrap-balance text-xl font-black leading-7 text-white">{protocol.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {protocol.targetIssues.map((name) => <span key={name} className="rounded-full bg-lime-300/10 px-2.5 py-1 text-xs font-bold text-lime-300">{name}</span>)}
        </div>
        <p className="mt-3 text-wrap-pretty text-sm leading-6 text-zinc-300">{protocol.userFacingGoal}</p>
        <p className="mt-2 text-xs font-semibold text-zinc-400">{countProtocolActions(protocol)} 个训练动作</p>
      </header>

      <div className="border-y border-white/10">
        {stages.map(({ key, label, steps }) => (
          <section key={key} data-testid="posture-stage" className="py-4 not-last:border-b not-last:border-white/[0.08]">
            <h4 className="mb-2 text-sm font-black text-zinc-100">{label}</h4>
            <div className="space-y-2">
              {steps.map((step) => step.kind === 'observation'
                ? <ObservationStep key={step.id} step={step} />
                : <ExerciseStep
                    key={step.id}
                    protocol={protocol}
                    step={step}
                    categoryId={categoryId}
                    scrollTop={scrollTop}
                    selected={Boolean(step.selectionGroupId && step.exerciseId && selectedVariants[step.selectionGroupId] === step.exerciseId)}
                    onSelectVariant={onSelectVariant}
                  />)}
            </div>
          </section>
        ))}
      </div>

      {protocol.limitations.length > 0 ? (
        <details className="mt-4 rounded-xl border border-white/10 px-3 py-2.5">
          <summary className="min-h-7 cursor-pointer text-sm font-bold text-zinc-200">注意事项</summary>
          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-zinc-300">
            {protocol.limitations.map((limitation) => <li key={limitation}>• {limitation}</li>)}
          </ul>
        </details>
      ) : null}

      {protocol.sourceUrl ? (
        <details className="mt-3 rounded-xl border border-white/10 px-3 py-2.5">
          <summary className="min-h-7 cursor-pointer text-sm font-bold text-zinc-200">来源</summary>
          <p className="mt-3 break-all text-xs leading-5 text-zinc-400">{protocol.sourceUrl}</p>
        </details>
      ) : null}
    </article>
  );
}

function ObservationStep({ step }: { step: PostureProtocolStep }) {
  const observation = postureDataset.observations.find(({ id }) => id === step.observationId);
  if (!observation) return null;
  return (
    <div data-testid="posture-observation" className="rounded-xl bg-sky-300/[0.07] px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-sky-300/10 px-2 py-1 text-[11px] font-bold text-sky-200">观察</span>
        <strong className="text-sm font-black text-zinc-100">{observation.name}</strong>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-300">{observation.purpose}</p>
      <p className="mt-1 text-[11px] leading-5 text-zinc-400">{observation.limitation}</p>
    </div>
  );
}

function ExerciseStep({
  protocol,
  step,
  categoryId,
  scrollTop,
  selected,
  onSelectVariant
}: {
  protocol: PostureProtocol;
  step: PostureProtocolStep;
  categoryId: string;
  scrollTop: number;
  selected: boolean;
  onSelectVariant: (groupId: string, exerciseId: string) => void;
}) {
  const exercise = step.exerciseId ? getPostureStandardExerciseById(step.exerciseId) : undefined;
  if (!exercise || !step.exerciseId) return null;
  const query = new URLSearchParams({
    from: 'posture',
    postureProtocolId: protocol.id,
    postureCategoryId: categoryId,
    postureScroll: String(Math.round(scrollTop))
  });
  const lowConfidence = step.dose?.confidence === 'low' || step.dose?.confidence === 'mediumLow';
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <strong className="text-sm font-black text-zinc-100">{exercise.name}</strong>
          {step.optional ? <span data-testid="posture-optional-step" className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[11px] font-bold text-amber-200">可选</span> : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-zinc-300">{formatDose(step.dose)}</span>
        {lowConfidence ? <span className="mt-1 block text-[11px] leading-4 text-amber-200">来源剂量，低置信度，不自动作为训练推荐</span> : null}
        {exercise.visualReviewRequired ? <span className="mt-1 block text-[11px] leading-4 text-zinc-400">动作轨迹需要画面复核</span> : null}
      </span>
    </>
  );

  if (step.selectionGroupId) {
    return (
      <div data-testid="posture-protocol-action" className={`rounded-xl border px-3 py-3 ${selected ? 'border-lime-300/45 bg-lime-300/[0.07]' : 'border-white/10 bg-black/15'}`}>
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          data-testid={`posture-variant-${step.exerciseId}`}
          data-variant-choice="true"
          data-exercise-id={step.exerciseId}
          onClick={() => onSelectVariant(step.selectionGroupId!, step.exerciseId!)}
          className="flex min-h-11 w-full items-start gap-3 text-left focus:outline-none focus:ring-2 focus:ring-lime-300/55"
        >
          <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-lime-300 bg-lime-300 text-[#10130d]' : 'border-zinc-500'}`}>{selected ? '✓' : ''}</span>
          {content}
        </button>
        <Link data-testid={`posture-action-${step.exerciseId}`} to={`/exercises/${step.exerciseId}?${query.toString()}`} className="mt-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/55">查看动作详情</Link>
      </div>
    );
  }

  return (
    <div data-testid="posture-protocol-action" data-exercise-id={step.exerciseId}>
      <Link
        data-testid={`posture-action-${step.exerciseId}`}
        to={`/exercises/${step.exerciseId}?${query.toString()}`}
        className="flex min-h-14 items-start gap-3 rounded-xl bg-black/15 px-3 py-3 transition hover:bg-white/[0.04] active:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-lime-300/55"
      >
        {content}
        <span aria-hidden="true" className="shrink-0 text-zinc-400">›</span>
      </Link>
    </div>
  );
}

function groupSteps(steps: PostureProtocolStep[]) {
  const groups: Array<{ key: string; label: string; steps: PostureProtocolStep[] }> = [];
  for (const step of [...steps].sort((left, right) => left.order - right.order)) {
    const key = `${step.groupKey}:${step.groupLabel}`;
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.steps.push(step);
    else groups.push({ key, label: step.groupLabel, steps: [step] });
  }
  return groups;
}

function countProtocolActions(protocol: PostureProtocol) {
  const steps = getProtocolExerciseSteps(protocol);
  const selectionGroups = new Set(steps.flatMap(({ selectionGroupId }) => selectionGroupId ? [selectionGroupId] : []));
  return steps.filter(({ selectionGroupId }) => !selectionGroupId).length + selectionGroups.size;
}
