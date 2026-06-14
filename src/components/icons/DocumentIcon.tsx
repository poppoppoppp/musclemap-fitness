interface IconProps {
  className?: string;
}

export default function DocumentIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h7l4 4v12H7V4ZM14 4v5h4M10 13h5M10 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
