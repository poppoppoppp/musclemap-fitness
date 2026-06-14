interface IconProps {
  className?: string;
}

export default function BackPoseIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M60 18c9 0 16 7 16 16v6H44v-6c0-9 7-16 16-16Z" fill="currentColor" opacity=".28" />
      <path d="M30 46c18-11 42-11 60 0l-7 22-23-9-23 9-7-22Z" fill="currentColor" opacity=".85" />
      <path d="M37 68 22 95M83 68l15 27M49 64l-8 32M71 64l8 32" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M60 42v58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".35" />
    </svg>
  );
}
