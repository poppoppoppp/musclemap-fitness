import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
}

export default function PageHeader({ title, description, backTo }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3">
      {backTo ? (
        <Link className="w-fit rounded-full px-1 text-sm font-medium text-accent hover:text-[#2997ff] focus:outline-none focus:ring-2 focus:ring-accent" to={backTo}>
          返回
        </Link>
      ) : null}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#f5f5f7] sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a1a1a6]">{description}</p> : null}
      </div>
    </header>
  );
}
