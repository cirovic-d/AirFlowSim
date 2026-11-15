import type { CaseProfile, CpuCooler, FanDirection, InstalledFan, MountPosition, Slot } from "../types";
import { getAioPositions } from "../lib/components";
import { useT } from "../lib/i18n";
import { Segmented } from "./Segmented";

interface Props {
  caseProfile: CaseProfile;
  cooler: CpuCooler;
  slots: Slot[];
  fans: InstalledFan[];
  onCoolerType: (type: CpuCooler["type"]) => void;
  onAioPosition: (position: MountPosition) => void;
  onRadiatorDirection: (direction: FanDirection) => void;
  onTowerDirection: (direction: "rear" | "front") => void;
  onToggleFan: (slotId: string) => void;
}

export function CpuPanel(props: Props) {
  const t = useT();
  const { cooler } = props;
  const aioPositions = getAioPositions(props.caseProfile);
  const radFans = props.fans.filter((f) => f.radiator);
  const slotById = new Map(props.slots.map((s) => [s.id, s]));

  return (
    <section>
      <h2>{t("cpuCooling")}</h2>
      <Segmented
        value={cooler.type}
        onChange={props.onCoolerType}
        options={[
          { value: "aio", label: t("aio360"), disabled: aioPositions.length === 0 },
          { value: "tower", label: t("towerCooler") },
          { value: "wraith", label: t("wraith") },
        ]}
      />
      {aioPositions.length === 0 && <p className="note">{t("aioUnsupported")}</p>}

      {cooler.type === "aio" && (
        <>
          <h3>{t("radiatorPosition")}</h3>
          <Segmented
            value={cooler.position}
            onChange={props.onAioPosition}
            options={aioPositions.map((p) => ({ value: p, label: t(p) }))}
          />

          <h3>{t("radiatorFans")}</h3>
          <ul className="fan-rows">
            {radFans.map((fan) => {
              const slot = slotById.get(fan.slotId)!;
              return (
                <li key={fan.slotId}>
                  <span>
                    {t(slot.position)} {slot.index + 1}
                  </span>
                  <button className={"dir-pill " + fan.direction} onClick={() => props.onToggleFan(fan.slotId)}>
                    <i className={"dot " + fan.direction} />
                    {t(fan.direction)}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="row-actions">
            <span className="muted">{t("setAll")}</span>
            <button className="btn small" onClick={() => props.onRadiatorDirection("intake")}>
              {t("intake")}
            </button>
            <button className="btn small" onClick={() => props.onRadiatorDirection("exhaust")}>
              {t("exhaust")}
            </button>
          </div>
        </>
      )}

      {cooler.type === "tower" && (
        <>
          <h3>{t("towerDirection")}</h3>
          <Segmented
            value={cooler.direction}
            onChange={props.onTowerDirection}
            options={[
              { value: "rear", label: t("towardRear") },
              { value: "front", label: t("towardFront") },
            ]}
          />
          <p className="note">{t("towerText")}</p>
        </>
      )}

      {cooler.type === "wraith" && <p className="note">{t("wraithText")}</p>}
    </section>
  );
}
