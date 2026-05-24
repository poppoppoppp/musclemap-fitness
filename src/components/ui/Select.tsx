interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export default function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      <select
        aria-label={label}
        className="w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
