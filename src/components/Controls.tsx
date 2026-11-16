/** On/off switch. */
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={value} className={"toggle" + (value ? " on" : "")} onClick={() => onChange(!value)}>
      <span />
    </button>
  );
}

/** Color input shown as a swatch with its hex value. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="color-picker">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="color-swatch" style={{ background: value }} />
      <span className="color-hex">{value.toUpperCase()}</span>
    </label>
  );
}

/** 0–100 % slider with its value. */
export function LoadSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <label className="load-row">
      <span className="muted">{label}</span>
      <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(e.target.valueAsNumber)} />
      <span className="load-value">{value}%</span>
    </label>
  );
}

/** Small number field in mm or °C, kept inside [min, max] when it loses focus. */
export function NumberField({
  value,
  onChange,
  min,
  max,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <span className="num-field">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v) && v >= min && v <= max) onChange(Math.round(v));
        }}
        onBlur={(e) => {
          const v = e.target.valueAsNumber;
          onChange(Math.round(Math.min(max, Math.max(min, Number.isFinite(v) ? v : value))));
          e.target.value = String(value);
        }}
      />
      <span className="muted">{unit}</span>
    </span>
  );
}
