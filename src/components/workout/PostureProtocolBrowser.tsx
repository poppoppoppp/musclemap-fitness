import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PostureProtocol } from '../../types/posture';
import {
  getAddableProtocolItems,
  getPostureStandardExerciseById,
  getVisiblePostureIssues,
  getVisiblePostureProtocols,
  getVisiblePostureProtocolsForIssue,
  postureDataset
} from '../../utils/postureProtocols';

type BrowserView = 'issues' | 'protocols' | 'detail';

interface PostureProtocolBrowserProps {
  initialProtocolId?: string | null;
  initialIssueId?: string | null;
  initialScrollTop?: number;
  onBackToExercises: () => void;
  onAddProtocol: (protocolId: string) => boolean;
}

export default function PostureProtocolBrowser({
  initialProtocolId,
  initialIssueId,
  initialScrollTop = 0,
  onBackToExercises,
  onAddProtocol
}: PostureProtocolBrowserProps) {
  const issues = useMemo(() => getVisiblePostureIssues(postureDataset), []);
  const initialProtocol = initialProtocolId
    ? getVisiblePostureProtocols(postureDataset).find(({ id }) => id === initialProtocolId)
    : undefined;
  const [view, setView] = useState<BrowserView>(initialProtocol ? 'detail' : 'issues');
  const [selectedIssueId, setSelectedIssueId] = useState(initialIssueId ?? initialProtocol?.targetIssueIds[0] ?? '');
  const [selectedProtocolId, setSelectedProtocolId] = useState(initialProtocol?.id ?? '');
  const [adding, setAdding] = useState(false);
  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedProtocols = selectedIssueId ? getVisiblePostureProtocolsForIssue(selectedIssueId) : [];
  const selectedProtocol = selectedProtocolId
    ? selectedProtocols.find(({ id }) => id === selectedProtocolId) ?? initialProtocol
    : undefined;

  useEffect(() => {
    if (view !== 'detail' || !scrollRef.current) return;
    scrollRef.current.scrollTop = initialScrollTop;
  }, [initialScrollTop, view]);

  const openIssue = (issueId: string) => {
    const protocols = getVisiblePostureProtocolsForIssue(issueId);
    setSelectedIssueId(issueId);
    if (protocols.length === 1) {
      setSelectedProtocolId(protocols[0].id);
      setView('detail');
    } else {
      setSelectedProtocolId('');
      setView('protocols');
    }
  };

  const goBack = () => {
    if (view === 'issues') {
      onBackToExercises();
      return;
    }
    if (view === 'detail' && selectedProtocols.length > 1) {
      setView('protocols');
      return;
    }
    setView('issues');
  };

  const addProtocol = () => {
    if (!selectedProtocol || adding) return;
    setAdding(true);
    const added = onAddProtocol(selectedProtocol.id);
    if (!added) setAdding(false);
  };

  return (
    <div data-testid="posture-browser" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={goBack}
          className="min-h-11 rounded-full border border-white/12 px-3 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-lime-300/60"
        >
          ← {view === 'issues' ? '返回动作列表' : '返回上一层'}
        </button>
        <p className="mt-2 text-sm text-zinc-400">
          {view === 'issues' ? '选择需要改善的体态问题' : view === 'protocols' ? '选择一套体态改善方案' : '查看动作安排后整体加入当前训练'}
        </p>
      </div>

      <div
        ref={scrollRef}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5"
        style={{ scrollPaddingBottom: '1rem' }}
      >
        {view === 'issues' ? (
          <IssueList issues={issues} onSelect={openIssue} />
        ) : view === 'protocols' ? (
          <ProtocolList
            protocols={selectedProtocols}
            onSelect={(protocolId) => {
              setSelectedProtocolId(protocolId);
              setView('detail');
            }}
          />
        ) : selectedProtocol ? (
          <ProtocolDetail protocol={selectedProtocol} issueId={selectedIssueId} scrollTop={scrollTop} />
        ) : (
          <p className="py-10 text-center text-sm text-zinc-500">当前没有可展示方案</p>
        )}
      </div>

      {view === 'detail' && selectedProtocol ? (
        <div data-testid="posture-protocol-footer" className="shrink-0 border-t border-white/10 bg-[#111410] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <p data-testid="posture-add-summary" className="mb-2 text-center text-xs font-semibold text-zinc-400">
            将添加 {getAddableProtocolItems(selectedProtocol).length} 个动作
          </p>
          <button
            type="button"
            data-testid="add-posture-protocol"
            disabled={adding}
            onClick={addProtocol}
            className="min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] transition hover:bg-lime-200 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-lime-100"
          >
            {adding ? '正在加入…' : '加入当前训练'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IssueList({ issues, onSelect }: { issues: ReturnType<typeof getVisiblePostureIssues>; onSelect: (issueId: string) => void }) {
  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <button
          key={issue.id}
          type="button"
          data-testid={`posture-issue-${issue.id}`}
          onClick={() => onSelect(issue.id)}
          className="flex min-h-[76px] w-full min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-left transition hover:border-lime-300/30 hover:bg-lime-300/[0.035] focus:outline-none focus:ring-2 focus:ring-lime-300/55"
        >
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-black text-zinc-100">{issue.name}</strong>
            <span className="mt-1 block text-xs leading-5 text-zinc-500">{issue.description}</span>
            <span className="mt-1 block text-[11px] font-semibold text-lime-300/80">{issue.protocolCount} 套可用方案</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-lg text-zinc-500">›</span>
        </button>
      ))}
    </div>
  );
}

function ProtocolList({ protocols, onSelect }: { protocols: PostureProtocol[]; onSelect: (protocolId: string) => void }) {
  return (
    <div className="space-y-2">
      {protocols.map((protocol) => (
        <button
          key={protocol.id}
          type="button"
          onClick={() => onSelect(protocol.id)}
          className="flex min-h-[84px] w-full min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-left focus:outline-none focus:ring-2 focus:ring-lime-300/55"
        >
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-black text-zinc-100">{protocol.name}</strong>
            <span className="mt-1 block text-xs leading-5 text-zinc-500">{protocol.summary}</span>
            <span className="mt-1 block text-[11px] font-semibold text-lime-300/80">{getAddableProtocolItems(protocol).length} 个动作</span>
          </span>
          <span aria-hidden="true" className="text-lg text-zinc-500">›</span>
        </button>
      ))}
    </div>
  );
}

function ProtocolDetail({ protocol, issueId, scrollTop }: { protocol: PostureProtocol; issueId: string; scrollTop: number }) {
  const issueNames = protocol.targetIssueIds.flatMap((id) => {
    const issue = postureDataset.postureIssues.find((item) => item.id === id);
    return issue ? [issue.name] : [];
  });
  const items = getAddableProtocolItems(protocol);
  const sourceEntries = Object.entries(protocol.sourceOriginal).filter(
    ([key, value]) => key !== 'claimsNotForPublicCopy' && (typeof value === 'string' || typeof value === 'number')
  );
  const theoryItems = (protocol.theoryIds ?? []).flatMap((theoryId) => {
    const theory = postureDataset.theoryMaterials.find(
      ({ id, status, appEligibility }) => id === theoryId && status === 'ready' && appEligibility === 'released'
    );
    return theory ? [theory] : [];
  });

  return (
    <article data-testid="posture-protocol-detail" className="min-w-0 space-y-4 pb-2">
      <div>
        <h3 className="text-wrap-balance text-xl font-black leading-7 text-white">{protocol.name}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {issueNames.map((name) => <span key={name} className="rounded-full bg-lime-300/10 px-2.5 py-1 text-xs font-bold text-lime-300">{name}</span>)}
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{protocol.summary}</p>
        <p className="mt-2 text-xs font-semibold text-zinc-500">{items.length} 个动作</p>
      </div>

      <ol className="space-y-2">
        {items.map((item, index) => {
          const exercise = getPostureStandardExerciseById(item.exerciseId);
          if (!exercise) return null;
          const query = new URLSearchParams({
            from: 'posture',
            postureProtocolId: protocol.id,
            postureIssueId: issueId || protocol.targetIssueIds[0] || '',
            postureScroll: String(Math.round(scrollTop))
          });
          return (
            <li key={item.exerciseId} data-testid="posture-protocol-action" className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <Link
                data-testid={`posture-action-${item.exerciseId}`}
                to={`/exercises/${item.exerciseId}?${query.toString()}`}
                className="flex min-h-11 min-w-0 items-start gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-300/55"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-300 text-sm font-black text-[#10130d]">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-black text-zinc-100">{exercise.name}</strong>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">{item.roleExplanation}</span>
                  <span className="mt-1 block text-[11px] font-semibold text-zinc-400">{item.prescription.rawText || '视频未说明'}</span>
                </span>
                <span aria-hidden="true" className="text-zinc-500">›</span>
              </Link>
            </li>
          );
        })}
      </ol>

      {theoryItems.length > 0 ? (
        <details className="rounded-xl border border-white/10 bg-black/15 px-3 py-2.5">
          <summary className="cursor-pointer text-sm font-bold text-zinc-300">为什么这样练</summary>
          <div className="mt-3 space-y-3 text-xs leading-5 text-zinc-400">
            {theoryItems.map((theory) => <p key={theory.id}>{theory.name}</p>)}
          </div>
        </details>
      ) : null}

      <details className="rounded-xl border border-white/10 bg-black/15 px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-bold text-zinc-300">来源与原始说明</summary>
        <dl className="mt-3 space-y-2 text-xs leading-5 text-zinc-400">
          {sourceEntries.map(([key, value]) => (
            <div key={key}>
              <dt className="font-bold text-zinc-500">{sourceLabel(key)}</dt>
              <dd className="mt-0.5 break-words">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  );
}

function sourceLabel(key: string) {
  if (key === 'creator') return '来源作者';
  if (key === 'videoTitle') return '原视频';
  if (key === 'videoDuration') return '视频时长';
  if (key === 'coreClaim') return '来源原始说明';
  if (key === 'sourceFile') return '来源文件';
  return key;
}
