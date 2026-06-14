interface EmptyStateProps {
  title: string;
  description?: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-app-line bg-app-surfaceMuted p-6 text-center">
      <p className="font-semibold text-app-text">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-app-muted">{description}</p> : null}
    </div>
  );
}
