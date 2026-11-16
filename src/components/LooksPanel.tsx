import { SWATCHES, type Looks } from "../lib/looks";
import { useT, type TKey } from "../lib/i18n";
import { ColorPicker, Toggle } from "./Controls";
import { Segmented } from "./Segmented";

interface Props {
  looks: Looks;
  onChange: (looks: Looks) => void;
}

/** Colors of the case and the parts inside it. Visual only. */
export function LooksPanel({ looks, onChange }: Props) {
  const t = useT();
  const set = (patch: Partial<Looks>) => onChange({ ...looks, ...patch });

  return (
    <section className="looks">
      <h2>{t("tabLooks")}</h2>
      <ColorRow label="caseColor" value={looks.caseColor} onChange={(caseColor) => set({ caseColor })} />
      <ColorRow label="gpuColor" value={looks.gpuColor} onChange={(gpuColor) => set({ gpuColor })} />
      <ColorRow label="boardColor" value={looks.boardColor} onChange={(boardColor) => set({ boardColor })} />

      <h3>{t("memory")}</h3>
      <div className="look-row">
        <span className="muted">{t("ramSticks")}</span>
        <div className="look-seg">
          <Segmented
            value={String(looks.ramCount) as "2" | "4"}
            onChange={(v) => set({ ramCount: v === "4" ? 4 : 2 })}
            options={[
              { value: "2", label: "2" },
              { value: "4", label: "4" },
            ]}
          />
        </div>
      </div>
      <div className="look-row">
        <span className="muted">{t("ramRgb")}</span>
        <Toggle value={looks.ramRgb} onChange={(ramRgb) => set({ ramRgb })} />
      </div>
      <ColorRow label="ramColor" value={looks.ramColor} onChange={(ramColor) => set({ ramColor })} />

      <p className="note">{t("looksNote")}</p>
    </section>
  );
}

function ColorRow({ label, value, onChange }: { label: TKey; value: string; onChange: (v: string) => void }) {
  const t = useT();
  return (
    <div className="color-row">
      <div className="look-row">
        <span className="muted">{t(label)}</span>
        <span title={t("pickColor")}>
          <ColorPicker value={value} onChange={(v) => onChange(v.toLowerCase())} />
        </span>
      </div>
      <div className="swatches">
        {SWATCHES.map((c) => (
          <button
            type="button"
            key={c}
            className={"swatch" + (c === value ? " active" : "")}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  );
}
