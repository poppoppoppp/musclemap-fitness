import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
}

export default function PageHeader({ title, description, backTo }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-3">
      {backTo ? (
        <Link
          className="inline-flex min-h-9 w-fit items-center rounded-full border border-white/[0.08] bg-white/[0.06] px-3 text-sm font-semibold text-[#0a84ff] transition hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
          to={backTo}
        >
          返回
        </Link>
      ) : null}
      <div>
        <h1 className="text-[2rem] font-semibold leading-tight tracking-normal text-[#f5f5f7] sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[0.95rem] leading-6 text-[#a1a1a6]">{description}</p> : null}
      </div>
    </header>
  );
}
