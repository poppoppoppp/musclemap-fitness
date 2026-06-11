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
      <span className="mb-2 block text-sm font-medium text-[#a1a1a6]">{label}</span>
      <select
        aria-label={label}
        className="min-h-11 w-full rounded-[14px] border border-white/[0.08] bg-[#111113] px-3.5 py-2 text-sm text-[#f5f5f7] outline-none transition focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/[0.32]"
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
