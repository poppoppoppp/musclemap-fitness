import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SnapBottomSheet from '../../ui/SnapBottomSheet';
import { getExerciseById } from '../../../data/exercises';
import type { ExerciseTroubleshootingItem } from '../../../types/exercise';
import type { ResolvedExerciseDetail } from '../../../utils/exerciseDetail';
import type { ExerciseDetailSheetType } from './ExerciseDetailLinks';

export type OpenExerciseSheet = ExerciseDetailSheetType | 'troubleshooting-all' | ExerciseTroubleshootingItem | null;

interface ExerciseDetailSheetsProps {
  openSheet: OpenExerciseSheet;
  detail: ResolvedExerciseDetail;
  postureContent?: ReactNode;
  onClose: () => void;
  onSelectIssue: (item: ExerciseTroubleshootingItem) => void;
}

export default function ExerciseDetailSheets({ openSheet, detail, postureContent, onClose, onSelectIssue }: ExerciseDetailSheetsProps) {
  const selectedIssue = typeof openSheet === 'object' ? openSheet : null;

  return (
    <>
      <SnapBottomSheet open={Boolean(selectedIssue)} title={selectedIssue?.title ?? '问题排查'} testId="exercise-troubleshooting-sheet" compactRatio={0.68} onRequestClose={onClose}>
        {selectedIssue ? <IssueDetails item={selectedIssue} /> : null}
      </SnapBottomSheet>

      <SnapBottomSheet open={openSheet === 'troubleshooting-all'} title="感觉不对？" testId="exercise-troubleshooting-list-sheet" compactRatio={0.72} onRequestClose={onClose}>
        <div className="space-y-2">
          {detail.troubleshooting.map((item) => (
            <button key={item.id} type="button" onClick={() => onSelectIssue(item)} className="flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 text-left transition hover:border-lime-300/30 focus:outline-none focus:ring-2 focus:ring-lime-300/55">
              <span className="min-w-0"><strong className="block truncate text-sm text-zinc-100">{item.title}</strong><span className="mt-1 block truncate text-xs text-zinc-400">{item.quickFix}</span></span>
              <span aria-hidden="true" className="text-lg text-zinc-600">›</span>
            </button>
          ))}
        </div>
      </SnapBottomSheet>

      <SnapBottomSheet open={openSheet === 'instructions'} title="动作说明" testId="exercise-instructions-sheet" compactRatio={0.76} expandedRatio={0.94} onRequestClose={onClose}>
        <div className="space-y-5">
          <SheetSection title="起始姿势" text={detail.instructions.startPosition} />
          <SheetSection title="执行动作" text={detail.instructions.execution} />
          <SheetSection title="返回过程" text={detail.instructions.returnProcess} />
          <SheetSection title="呼吸要求" text={detail.breathing} />
          <SheetSection title="动作范围" text={detail.instructions.rangeOfMotion} />
          {detail.instructions.notes?.length ? <ListSection title="其他要点" items={detail.instructions.notes} /> : null}
          {postureContent}
        </div>
      </SnapBottomSheet>

      <SnapBottomSheet open={openSheet === 'muscles'} title="训练部位" testId="exercise-muscles-sheet" compactRatio={0.62} onRequestClose={onClose}>
        <div className="space-y-5">
          <MuscleList title="主练肌群" items={detail.primaryMuscleNames} accent />
          {detail.secondaryMuscleNames.length ? <MuscleList title="次要肌群" items={detail.secondaryMuscleNames} /> : null}
        </div>
      </SnapBottomSheet>

      <SnapBottomSheet open={openSheet === 'alternatives'} title="替代动作" testId="exercise-alternatives-sheet" compactRatio={0.7} onRequestClose={onClose}>
        <div data-testid="contextual-alternatives" className="space-y-2">
          {detail.alternatives.map((alternative) => {
            const exercise = getExerciseById(alternative.exerciseId);
            if (!exercise) return null;
            return (
              <Link key={alternative.exerciseId} data-testid={`alternative-link-${alternative.exerciseId}`} to={`/exercises/${alternative.exerciseId}${alternative.muscleId ? `?muscleId=${alternative.muscleId}` : ''}`} onClick={onClose} className="flex min-h-[68px] items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 transition hover:border-lime-300/30 focus:outline-none focus:ring-2 focus:ring-lime-300/55">
                <span className="min-w-0"><span className="flex items-center gap-2"><strong className="truncate text-sm text-zinc-100">{exercise.name}</strong>{alternative.matchType !== 'related' ? <span className="shrink-0 rounded-full bg-lime-300/[0.08] px-2 py-0.5 text-[10px] font-bold text-lime-300">{alternative.matchType === 'primary' ? '主练匹配' : '次要参与'}</span> : null}</span><span className="mt-1 block truncate text-xs text-zinc-400">{alternative.reason}</span></span>
                <span aria-hidden="true" className="text-lg text-zinc-600">›</span>
              </Link>
            );
          })}
        </div>
      </SnapBottomSheet>
    </>
  );
}

function IssueDetails({ item }: { item: ExerciseTroubleshootingItem }) {
  return (
    <div className="space-y-5">
      {item.image ? <IssueImage src={item.image} alt={`${item.title}示意`} /> : null}
      <p className="rounded-xl border border-lime-300/15 bg-lime-300/[0.05] p-4 text-sm leading-6 text-lime-100">{item.quickFix}</p>
      <ListSection title="可能原因" items={item.causes} />
      <ListSection title="立即调整" items={item.fixes} ordered />
    </div>
  );
}

function IssueImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) return null;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="aspect-[16/9] w-full rounded-xl bg-black/20 object-contain" />;
}

function SheetSection({ title, text }: { title: string; text: string }) {
  return <section><h3 className="text-sm font-bold text-zinc-100">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p></section>;
}

function ListSection({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  const List = ordered ? 'ol' : 'ul';
  return <section><h3 className="text-sm font-bold text-zinc-100">{title}</h3><List className={`${ordered ? 'list-decimal' : 'list-disc'} mt-2 space-y-2 pl-5 text-sm leading-6 text-zinc-400`}>{items.map((item) => <li key={item}>{item}</li>)}</List></section>;
}

function MuscleList({ title, items, accent = false }: { title: string; items: string[]; accent?: boolean }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => <span key={item} className={`rounded-full border px-3 py-2 text-sm ${accent ? 'border-lime-300/25 bg-lime-300/[0.07] text-lime-200' : 'border-white/10 bg-white/[0.035] text-zinc-300'}`}>{item}</span>)}
      </div>
    </section>
  );
}
