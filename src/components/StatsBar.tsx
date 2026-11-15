import type { InstalledFan } from "../types";
import { getFanStats } from "../lib/pressure";
import { useT } from "../lib/i18n";

export function StatsBar({ fans }: { fans: InstalledFan[] }) {
  const t = useT();
  const stats = getFanStats(fans);

  return (
    <footer className="stats">
      <Stat label={t("intake")} value={stats.intake} tone="intake" />
      <Stat label={t("exhaust")} value={stats.exhaust} tone="exhaust" />
      <Stat label={t("totalFans")} value={stats.total} />
      <div className="stat pressure" title={t("approxNote")}>
        <span className="stat-label">{t("pressure")} ≈</span>
        <span className={"stat-value pressure-" + stats.pressure}>{t(stats.pressure)}</span>
      </div>
      <p className="stats-note">{t("approxNote")}</p>
    </footer>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">
        {tone && <i className={"dot " + tone} />}
        {label}
      </span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
