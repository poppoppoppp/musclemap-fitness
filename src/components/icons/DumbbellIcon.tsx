interface IconProps {
  className?: string;
}

export default function DumbbellIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
