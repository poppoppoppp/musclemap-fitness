interface SearchInputProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export default function SearchInput({ label, value, placeholder, onChange }: SearchInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#a1a1a6]">{label}</span>
      <input
        aria-label={label}
        className="min-h-11 w-full rounded-xl border border-white/[0.12] bg-black/40 px-3 py-2 text-sm text-[#f5f5f7] outline-none transition placeholder:text-[#6e6e73] focus:border-accent focus:ring-2 focus:ring-accent/[0.45]"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
