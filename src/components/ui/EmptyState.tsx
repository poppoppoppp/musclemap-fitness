interface EmptyStateProps {
  title: string;
  description?: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[18px] border border-dashed border-white/[0.16] bg-[#1d1d1f] p-6 text-center">
      <p className="font-semibold text-[#f5f5f7]">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-[#a1a1a6]">{description}</p> : null}
    </div>
  );
}
