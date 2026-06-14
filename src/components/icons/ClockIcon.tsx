interface IconProps {
  className?: string;
}

export default function ClockIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
