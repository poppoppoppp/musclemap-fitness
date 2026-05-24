interface SearchInputProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export default function SearchInput({ label, value, placeholder, onChange }: SearchInputProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      <input
        aria-label={label}
        className="w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
