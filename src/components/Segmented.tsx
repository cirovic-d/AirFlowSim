interface Option<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** A row of buttons where exactly one is selected. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented full">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          className={o.value === value ? "active" : ""}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
