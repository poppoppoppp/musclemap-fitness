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
      <span className="mb-2 block text-sm font-medium text-app-muted">{label}</span>
      <select
        aria-label={label}
        className="min-h-11 w-full rounded-xl border border-app-line bg-app-surface px-3.5 py-2 text-sm text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
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
