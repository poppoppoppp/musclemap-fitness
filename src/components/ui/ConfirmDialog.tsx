import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = '取消', destructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 px-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-[340px] rounded-[22px] border border-white/12 bg-[#151914] p-5 text-white">
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="min-h-12 rounded-xl border border-white/12 font-bold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={`min-h-12 rounded-xl font-black focus:outline-none focus:ring-2 ${destructive ? 'bg-red-400 text-black focus:ring-red-200' : 'bg-lime-300 text-black focus:ring-lime-100'}`}>{confirmLabel}</button>
        </div>
      </section>
    </div>,
    document.body
  );
}
