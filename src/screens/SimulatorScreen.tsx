import type { CaseProfile } from "../types";
import { CaseStage } from "../components/CaseStage";
import { SpecsPanel } from "../components/SpecsPanel";
import { StatsBar } from "../components/StatsBar";

export function SimulatorScreen({ caseProfile }: { caseProfile: CaseProfile }) {
  return (
    <div className="simulator">
      <div className="sim-main">
        <CaseStage caseProfile={caseProfile} />
        <StatsBar fans={caseProfile.factoryFans} />
      </div>
      <SpecsPanel caseProfile={caseProfile} />
    </div>
  );
}
