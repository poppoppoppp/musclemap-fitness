import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ConfirmDialog from './ConfirmDialog';

type SnapPoint = 'compact' | 'expanded';

interface SnapBottomSheetProps {
  open: boolean;
  title: string;
  testId: string;
  dirty?: boolean;
  initialSnap?: SnapPoint;
  compactRatio?: number;
  expandedRatio?: number;
  footer?: ReactNode;
  children: ReactNode;
  onRequestClose: () => void;
}

export default function SnapBottomSheet({ open, title, testId, dirty = false, initialSnap = 'compact', compactRatio = 0.55, expandedRatio = 0.9, footer, children, onRequestClose }: SnapBottomSheetProps) {
  const [snap, setSnap] = useState<SnapPoint>(initialSnap);
  const [confirmClose, setConfirmClose] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setSnap(initialSnap);
    setConfirmClose(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); };
  }, [initialSnap, open]);

  const requestClose = () => dirty ? setConfirmClose(true) : onRequestClose();
  if (!open) return null;
  const ratio = snap === 'expanded' ? expandedRatio : compactRatio;

  return createPortal(
    <>
      <div data-testid="snap-sheet-backdrop" className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
        <section
          data-testid={testId}
          data-snap={snap}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onFocusCapture={() => setSnap('expanded')}
          className="workout-dark flex w-full max-w-[440px] flex-col overflow-hidden rounded-t-[24px] border border-b-0 border-white/12 bg-[#111511] text-white transition-[height] duration-200 ease-out motion-reduce:transition-none"
          style={{ height: `${Math.round(ratio * 100)}dvh`, maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px))' }}
        >
          <div
            data-testid="sheet-drag-handle"
            className="shrink-0 touch-none px-4 pb-2 pt-3"
            onPointerDown={(event) => { dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerUp={(event) => {
              if (dragStart.current === null) return;
              const delta = event.clientY - dragStart.current;
              dragStart.current = null;
              if (delta < -60) setSnap('expanded');
              else if (delta > 80 && snap === 'expanded') setSnap('compact');
              else if (delta > 80) requestClose();
            }}
          >
            <div className="mx-auto h-1 w-11 rounded-full bg-white/25" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-5 pb-3">
              <h2 className="text-xl font-black tracking-[-0.02em]">{title}</h2>
              <button type="button" aria-label={`关闭${title}`} onClick={requestClose} className="grid h-11 w-11 place-items-center rounded-full text-xl text-zinc-400 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-lime-300/60">×</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
            {footer ? <div className="shrink-0 border-t border-white/10 bg-[#111511] px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">{footer}</div> : null}
          </div>
        </section>
      </div>
      <ConfirmDialog open={confirmClose} title="放弃本次修改" message="尚未保存的内容将会丢失。" confirmLabel="放弃修改" cancelLabel="继续修改" destructive onConfirm={onRequestClose} onCancel={() => setConfirmClose(false)} />
    </>,
    document.body
  );
}
