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
        <Link className="w-fit text-sm text-accent hover:text-cyan-200" to={backTo}>
          返回
        </Link>
      ) : null}
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p> : null}
      </div>
    </header>
  );
}
