interface IconProps {
  className?: string;
}

export default function WorkoutIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 19V9M12 19V5M18 19v-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
