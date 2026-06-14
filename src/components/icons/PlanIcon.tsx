interface IconProps {
  className?: string;
}

export default function PlanIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 5c2.3 2.3.5 7.9-4 12.4s-10.1 6.3-12.4 4 .5-7.9 4-12.4S16.7 2.7 19 5Z" stroke="currentColor" strokeWidth="2.1" />
      <path d="M5 5c-2.3 2.3-.5 7.9 4 12.4s10.1 6.3 12.4 4-.5-7.9-4-12.4S7.3 2.7 5 5Z" stroke="currentColor" strokeWidth="2.1" opacity=".72" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  );
}
