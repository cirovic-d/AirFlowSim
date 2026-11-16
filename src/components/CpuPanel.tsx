import type { AioSize, CaseProfile, CpuCooler, FanDirection, InstalledFan, MountPosition, Slot } from "../types";
import { AIO_SIZES, getAioPositions, getAioSizes } from "../lib/components";
import { useT } from "../lib/i18n";
import { Segmented } from "./Segmented";
import { LoadSlider, NumberField } from "./Controls";
import { CPUS, cpuMaxPower, findCpu } from "../data/cpus";
import { LIMITS, type Build } from "../lib/build";
import { externalLinkProps } from "../lib/updates";

interface Props {
  caseProfile: CaseProfile;
  cooler: CpuCooler;
  slots: Slot[];
  fans: InstalledFan[];
  onCoolerType: (type: CpuCooler["type"]) => void;
  onAioPosition: (position: MountPosition) => void;
  onAioSize: (size: AioSize) => void;
  onRadiatorDirection: (direction: FanDirection) => void;
  onTowerDirection: (direction: "rear" | "front") => void;
  onToggleFan: (slotId: string) => void;
  build: Build;
  onBuild: (patch: Partial<Build>) => void;
}

export function CpuPanel(props: Props) {
  const t = useT();
  const { cooler } = props;
  const aioSizes = getAioSizes(props.caseProfile);
  const radFans = props.fans.filter((f) => f.radiator);
  const slotById = new Map(props.slots.map((s) => [s.id, s]));

  const cpu = findCpu(props.build.cpuId);

  return (
    <section>
      <h2>{t("processor")}</h2>
      <select
        className="select"
        value={props.build.cpuId ?? ""}
        onChange={(e) => props.onBuild({ cpuId: e.target.value || undefined })}
      >
        <option value="">{t("noCpu")}</option>
        {CPUS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.socket})
          </option>
        ))}
      </select>
      {cpu && (
        <p className="note">
          {t("cpuSpecs")
            .replace("{tdp}", String(cpu.tdpW))
            .replace("{ppt}", String(cpuMaxPower(cpu)))
            .replace("{tj}", String(cpu.tjmaxC))}{" "}
          <a {...externalLinkProps(cpu.sources[0])}>{new URL(cpu.sources[0]).hostname.replace("www.", "")}</a>
        </p>
      )}
      <LoadSlider label={t("cpuLoad")} value={props.build.cpuLoad} onChange={(cpuLoad) => props.onBuild({ cpuLoad })} />

      <h2 className="section-gap">{t("cpuCooling")}</h2>
      <Segmented
        value={cooler.type}
        onChange={props.onCoolerType}
        options={[
          { value: "aio", label: t("aio"), disabled: aioSizes.length === 0 },
          { value: "tower", label: t("towerCooler") },
          { value: "wraith", label: t("wraith") },
        ]}
      />
      {aioSizes.length === 0 && <p className="note">{t("aioUnsupported")}</p>}

      {cooler.type === "aio" && (
        <>
          <h3>{t("radiatorSize")}</h3>
          <Segmented
            value={String(cooler.size) as "240" | "360"}
            onChange={(v) => props.onAioSize(Number(v) as AioSize)}
            options={AIO_SIZES.map((size) => ({
              value: String(size) as "240" | "360",
              label: `${size} mm`,
              disabled: !aioSizes.includes(size),
            }))}
          />

          <h3>{t("radiatorPosition")}</h3>
          <Segmented
            value={cooler.position}
            onChange={props.onAioPosition}
            options={getAioPositions(props.caseProfile, cooler.size).map((p) => ({ value: p, label: t(p) }))}
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
          <div className="look-row">
            <span className="muted">{t("coolerHeight")}</span>
            <NumberField
              value={props.build.towerHeight}
              min={LIMITS.towerHeight[0]}
              max={LIMITS.towerHeight[1]}
              unit="mm"
              onChange={(towerHeight) => props.onBuild({ towerHeight })}
            />
          </div>
          <p className="note">{t("coolerHeightNote").replace("{max}", String(props.caseProfile.clearanceMm.cpuCoolerMaxHeight))}</p>
        </>
      )}

      {cooler.type === "wraith" && <p className="note">{t("wraithText")}</p>}
    </section>
  );
}
