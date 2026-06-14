interface IconProps {
  className?: string;
}

export default function PlayIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.75v12.5c0 .75.82 1.22 1.47.84l10-6.25a1 1 0 0 0 0-1.68l-10-6.25A.97.97 0 0 0 8 5.75Z" />
    </svg>
  );
}
