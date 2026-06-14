interface IconProps {
  className?: string;
}

export default function HomeIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 11.4 12 4l9 7.4v8.1a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5v-8.1Z" />
    </svg>
  );
}
