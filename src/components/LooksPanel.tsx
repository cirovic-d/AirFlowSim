import type { CaseProfile } from "../types";
import { SWATCHES, type Looks } from "../lib/looks";
import { BOARD_FORMATS, BOARD_SIZES, LIMITS, PSU_WATTS, boardFit, type BoardFormat, type Build } from "../lib/build";
import { useT, type TKey } from "../lib/i18n";
import { ColorPicker, NumberField, Toggle } from "./Controls";
import { Segmented } from "./Segmented";

interface Props {
  caseProfile: CaseProfile;
  looks: Looks;
  onChange: (looks: Looks) => void;
  build: Build;
  onBuild: (patch: Partial<Build>) => void;
}

/** Motherboard size, power supply and the colors of the parts. */
export function LooksPanel({ caseProfile, looks, onChange, build, onBuild }: Props) {
  const t = useT();
  const set = (patch: Partial<Looks>) => onChange({ ...looks, ...patch });
  const fit = boardFit(caseProfile, build.board);

  return (
    <section className="looks">
      <h2>{t("motherboard")}</h2>
      <select className="select" value={build.board} onChange={(e) => onBuild({ board: e.target.value as BoardFormat })}>
        {BOARD_FORMATS.map((f) => (
          <option key={f} value={f}>
            {f} · {BOARD_SIZES[f].h} × {BOARD_SIZES[f].w} mm
          </option>
        ))}
      </select>
      <div className={"fit-badge " + fit.fit}>
        <span>{t("boardFit")}</span>
        <strong>{t(fit.fit)}</strong>
      </div>
      {fit.noteKey && (
        <p className="note">
          {t(fit.noteKey).replace("{max}", String(caseProfile.motherboards?.eatxMaxWidth ?? ""))}
        </p>
      )}
      {caseProfile.motherboards && (
        <p className="note">
          {t("boardListed")} {caseProfile.motherboards.formats.join(", ")}
        </p>
      )}

      <h2 className="section-gap">{t("powerSupply")}</h2>
      <div className="look-row">
        <span className="muted">{t("psuPower")}</span>
        <select className="select small" value={build.psuWatts} onChange={(e) => onBuild({ psuWatts: Number(e.target.value) })}>
          {PSU_WATTS.map((w) => (
            <option key={w} value={w}>
              {w} W
            </option>
          ))}
        </select>
      </div>
      <div className="look-row">
        <span className="muted">{t("psuLength")}</span>
        <NumberField
          value={build.psuLength}
          min={LIMITS.psuLength[0]}
          max={LIMITS.psuLength[1]}
          unit="mm"
          onChange={(psuLength) => onBuild({ psuLength })}
        />
      </div>
      <p className="note">{t("psuNote")}</p>

      <h2 className="section-gap">{t("tabLooks")}</h2>
      <ColorRow label="caseColor" value={looks.caseColor} onChange={(caseColor) => set({ caseColor })} />
      <ColorRow label="gpuColor" value={looks.gpuColor} onChange={(gpuColor) => set({ gpuColor })} />
      <ColorRow label="boardColor" value={looks.boardColor} onChange={(boardColor) => set({ boardColor })} />

      <h3>{t("memory")}</h3>
      <div className="look-row">
        <span className="muted">{t("ramSticks")}</span>
        <div className="look-seg">
          <Segmented
            value={String(BOARD_SIZES[build.board].w < 200 ? 2 : looks.ramCount) as "2" | "4"}
            onChange={(v) => set({ ramCount: v === "4" ? 4 : 2 })}
            options={[
              { value: "2", label: "2" },
              { value: "4", label: "4", disabled: BOARD_SIZES[build.board].w < 200 },
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
