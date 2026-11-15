import type { InstalledFan, Slot } from "../types";
import { useT } from "../lib/i18n";

interface Props {
  slots: Slot[];
  fans: InstalledFan[];
  onToggle: (slotId: string) => void;
  onRemove: (slotId: string) => void;
}

export function FanList({ slots, fans, onToggle, onRemove }: Props) {
  const t = useT();
  const fanBySlot = new Map(fans.map((f) => [f.slotId, f]));
  // Keep the list in slot order so it doesn't jump around.
  const installed = slots.filter((s) => fanBySlot.has(s.id));

  return (
    <section className="fan-section">
      <h2>{t("fans")}</h2>
      {installed.length === 0 && <p className="note">{t("noFans")}</p>}
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
