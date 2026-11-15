import type { CaseProfile, MountPosition } from "../types";
import { useT } from "../lib/i18n";
import { externalLinkProps } from "../lib/updates";

const POSITIONS: MountPosition[] = ["front", "top", "side", "bottom", "rear"];

export function SpecsPanel({ caseProfile: c }: { caseProfile: CaseProfile }) {
  const t = useT();

  return (
    <section className="specs">
      <h2>{t("caseSpecs")}</h2>

      <dl className="spec-list">
        <Row label={t("gpuMax")} value={`${c.clearanceMm.gpuMaxLength} mm`} />
        <Row label={t("cpuMax")} value={`${c.clearanceMm.cpuCoolerMaxHeight} mm`} />
        {c.clearanceMm.psuMaxLength && <Row label={t("psuMax")} value={`${c.clearanceMm.psuMaxLength} mm`} />}
      </dl>

      <h3>{t("fanMounts")}</h3>
      <dl className="spec-list">
        {POSITIONS.filter((p) => c.fanMounts[p]).map((p) => (
          <Row key={p} label={t(p)} value={`${c.fanMounts[p]!.max120}×`} />
        ))}
      </dl>
      <p className="note">{t("layoutNote")}</p>
      {c.shroud?.note && <p className="note">{c.shroud.note}</p>}

      <h3>{t("radiators")}</h3>
      <dl className="spec-list">
        {POSITIONS.filter((p) => c.radiatorMounts[p]).map((p) => (
          <Row key={p} label={t(p)} value={c.radiatorMounts[p]!.join(" / ") + " mm"} wrap />
        ))}
      </dl>
      {c.radiatorNotes && <p className="note">{c.radiatorNotes}</p>}

      <h3>{t("factoryFans")}</h3>
      <ul className="fan-list">
        {c.factoryFans.map((f) => (
          <li key={f.position}>
            <i className={"dot " + f.direction} />
            <span>
              {f.count}× {t(f.position)}
            </span>
            <span className="muted">
              {t(f.direction)}
              {!f.directionVerified && (
                <span className="assumed" title={t("directionUnverified")}>
                  *
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <h3>{t("sources")}</h3>
      <ul className="sources">
        {c.sources.map((url) => (
          <li key={url}>
            <a {...externalLinkProps(url)}>
              {new URL(url).hostname.replace("www.", "")}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({ label, value, wrap }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div className={"spec-row" + (wrap ? " wrap" : "")}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
