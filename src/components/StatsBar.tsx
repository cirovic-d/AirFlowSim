import type { InstalledFan } from "../types";
import { getFanStats } from "../lib/pressure";
import type { Check } from "../lib/compat";
import { scoreLabel, type ThermalResult } from "../lib/thermal";
import { LIMITS } from "../lib/build";
import { useT } from "../lib/i18n";

interface Props {
  fans: InstalledFan[];
  checks: Check[];
  thermal: ThermalResult;
  ambient: number;
  onAmbient: (v: number) => void;
}

export function StatsBar({ fans, checks, thermal, ambient, onAmbient }: Props) {
  const t = useT();
  const stats = getFanStats(fans);
  const problems = checks.filter((c) => c.fit === "incompatible").length;
  const ready = thermal.missing.length === 0;

  return (
    <footer className="stats">
      <div className="stats-row">
        <Stat label={t("intake")} value={stats.intake} tone="intake" />
        <Stat label={t("exhaust")} value={stats.exhaust} tone="exhaust" />
        <Stat label={t("totalFans")} value={stats.total} />
        <div className="stat pressure" title={t("approxNote")}>
          <span className="stat-label">{t("pressure")} ≈</span>
          <span className={"stat-value pressure-" + stats.pressure}>{t(stats.pressure)}</span>
        </div>
        <div className="stat" title={t("compatHint")}>
          <span className="stat-label">{t("compatibility")}</span>
          <span className={"stat-value " + (problems ? "fit-incompatible" : "fit-compatible")}>
            {problems ? t("problems").replace("{n}", String(problems)) : t("allOk")}
          </span>
        </div>
      </div>

      <div className="stats-row thermal">
        <div className="stat score">
          <span className="stat-label">{t("airflowScore")} ≈</span>
          {ready ? (
            <span className="score-line">
              <span className="stat-value">{thermal.score}</span>
              <span className="score-bar">
                <i style={{ width: `${thermal.score}%` }} className={scoreLabel(thermal.score)} />
              </span>
              <span className="muted">{t(scoreLabel(thermal.score))}</span>
            </span>
          ) : (
            <span className="muted pick-parts">{t("thermalMissing")}</span>
          )}
        </div>
        {ready && (
          <>
            <Temp label={t("caseAir")} value={thermal.caseAir} spread={thermal.spread(thermal.caseAir)} />
            <Temp label="GPU" value={thermal.gpu} spread={thermal.spread(thermal.gpu)} hot={thermal.gpu >= 85} />
            <Temp label="CPU" value={thermal.cpu} spread={thermal.spread(thermal.cpu)} hot={thermal.cpu >= thermal.cpuTjmax - 3} />
          </>
        )}
        <div className="stat ambient">
          <span className="stat-label">{t("ambient")}</span>
          <span className="stepper">
            <button type="button" onClick={() => onAmbient(Math.max(LIMITS.ambient[0], ambient - 1))} aria-label="−">
              −
            </button>
            <span className="stat-value">{ambient} °C</span>
            <button type="button" onClick={() => onAmbient(Math.min(LIMITS.ambient[1], ambient + 1))} aria-label="+">
              +
            </button>
          </span>
        </div>
      </div>
      <p className="stats-note">{t("thermalNote")}</p>
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

function Temp({ label, value, spread, hot }: { label: string; value: number; spread: number; hot?: boolean }) {
  return (
    <div className="stat">
      <span className="stat-label">{label} ≈</span>
      <span className={"stat-value" + (hot ? " hot" : "")}>
        {Math.round(value)} °C <small className="muted">±{spread}</small>
      </span>
    </div>
  );
}
