interface SearchInputProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export default function SearchInput({ label, value, placeholder, onChange }: SearchInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-app-muted">{label}</span>
      <input
        aria-label={label}
        className="min-h-11 w-full rounded-xl border border-app-line bg-app-surface px-3.5 py-2 text-sm text-app-text outline-none transition placeholder:text-app-subtle focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
