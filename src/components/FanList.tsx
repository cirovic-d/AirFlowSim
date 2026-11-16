import type { InstalledFan, Slot } from "../types";
import { DEFAULT_RPM, MAX_RPM, MIN_RPM, RPM_STEP, fanRpm } from "../lib/pressure";
import { useT } from "../lib/i18n";

interface Props {
  slots: Slot[];
  fans: InstalledFan[];
  onToggle: (slotId: string) => void;
  onRemove: (slotId: string) => void;
  onRpm: (slotId: string, rpm: number) => void;
  onAllRpm: (rpm: number) => void;
}

export function FanList({ slots, fans, onToggle, onRemove, onRpm, onAllRpm }: Props) {
  const t = useT();
  const fanBySlot = new Map(fans.map((f) => [f.slotId, f]));
  // Keep the list in slot order so it doesn't jump around.
  const installed = slots.filter((s) => fanBySlot.has(s.id));
  // The "all fans" slider shows the shared speed, or the default when they differ.
  const speeds = new Set(fans.map(fanRpm));
  const allRpm = speeds.size === 1 ? [...speeds][0] : DEFAULT_RPM;

  return (
    <section className="fan-section">
      <h2>{t("fans")}</h2>
      {installed.length === 0 && <p className="note">{t("noFans")}</p>}

      {installed.length > 1 && (
        <RpmSlider label={t("allFans")} value={allRpm} mixed={speeds.size > 1} onChange={onAllRpm} />
      )}

      <ul className="fan-rows">
        {installed.map((slot) => {
          const fan = fanBySlot.get(slot.id)!;
          return (
            <li key={slot.id}>
              <span>
                {t(slot.position)} {slot.index + 1}
                {fan.radiator && <span className="muted"> · {t("radiator")}</span>}
              </span>
              <button className={"dir-pill " + fan.direction} onClick={() => onToggle(slot.id)}>
                <i className={"dot " + fan.direction} />
                {t(fan.direction)}
              </button>
              {fan.radiator ? (
                <span className="icon-btn-spacer" />
              ) : (
                <button className="icon-btn" onClick={() => onRemove(slot.id)} aria-label={t("remove")} title={t("remove")}>
                  ×
                </button>
              )}
              <RpmSlider value={fanRpm(fan)} onChange={(rpm) => onRpm(slot.id, rpm)} />
            </li>
          );
        })}
      </ul>
      {installed.length > 0 && <p className="note">{t("rpmNote")}</p>}
    </section>
  );
}

function RpmSlider({ label, value, mixed, onChange }: { label?: string; value: number; mixed?: boolean; onChange: (rpm: number) => void }) {
  const t = useT();
  return (
    <label className={"rpm" + (label ? " rpm-all" : "")}>
      {label && <span className="rpm-label">{label}</span>}
      <input
        type="range"
        min={MIN_RPM}
        max={MAX_RPM}
        step={RPM_STEP}
        value={value}
        aria-label={label ?? t("fanSpeedRpm")}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
      <span className="rpm-value">{mixed ? t("mixed") : `${value} RPM`}</span>
    </label>
  );
}
