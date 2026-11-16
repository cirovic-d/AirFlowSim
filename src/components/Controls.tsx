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
