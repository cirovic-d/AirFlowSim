import type { CaseProfile } from "../types";
import { useT } from "../lib/i18n";

// Side view of the case, drawn to scale (depth x height).
// Fans, components and airflow are added in later phases.
export function CaseStage({ caseProfile }: { caseProfile: CaseProfile }) {
  const t = useT();
  const { depth, height, width } = caseProfile.dimensionsMm;

  return (
    <section className="stage">
      <header className="stage-header">
        <div>
          <h1>{caseProfile.name}</h1>
          <p className="muted">
            {depth} × {width} × {height} mm
          </p>
        </div>
      </header>

      <div className="stage-canvas">
        <svg viewBox={`-20 -20 ${depth + 40} ${height + 40}`} className="case-outline">
          <rect x="0" y="0" width={depth} height={height} rx="10" className="case-body" />
          <text x={depth / 2} y={height / 2} className="stage-hint">
            {t("stagePlaceholder")}
          </text>
        </svg>
      </div>
    </section>
  );
}
