import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  backTestId?: string;
}

export default function PageHeader({ title, description, backTo, backLabel = '返回', backTestId }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-3">
      {backTo ? (
        <Link
          className="inline-flex min-h-9 w-fit items-center rounded-xl border border-app-line bg-app-surface px-3 text-sm font-semibold text-app-accent transition hover:bg-app-surfaceMuted focus:outline-none focus:ring-2 focus:ring-app-accent/30"
          to={backTo}
          data-testid={backTestId}
        >
          {backLabel}
        </Link>
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-normal text-app-text sm:text-[1.65rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[0.95rem] leading-7 text-app-muted">{description}</p> : null}
      </div>
    </header>
  );
}
