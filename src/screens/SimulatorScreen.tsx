import { useMemo, useState } from "react";
import type { CaseProfile, InstalledFan, Slot } from "../types";
import { defaultDirection, getFactoryFans, getSlots } from "../lib/layout";
import { useT } from "../lib/i18n";
import { CaseView } from "../components/CaseView";
import { FanList } from "../components/FanList";
import { SpecsPanel } from "../components/SpecsPanel";
import { StatsBar } from "../components/StatsBar";

// App.tsx gives this screen key={caseId}, so switching cases starts fresh
// with that case's factory fans.
export function SimulatorScreen({ caseProfile }: { caseProfile: CaseProfile }) {
  const t = useT();
  const slots = useMemo(() => getSlots(caseProfile), [caseProfile]);
  const [fans, setFans] = useState<InstalledFan[]>(() => getFactoryFans(caseProfile, slots));

  function addFan(slot: Slot) {
    setFans((prev) => [...prev, { slotId: slot.id, direction: defaultDirection(slot.position) }]);
  }

  function toggleFan(slotId: string) {
    setFans((prev) =>
      prev.map((f) =>
        f.slotId === slotId ? { ...f, direction: f.direction === "intake" ? "exhaust" : "intake" } : f,
      ),
    );
  }

  function removeFan(slotId: string) {
    setFans((prev) => prev.filter((f) => f.slotId !== slotId));
  }

  function restoreFactory() {
    setFans(getFactoryFans(caseProfile, slots));
  }

  const { depth, width, height } = caseProfile.dimensionsMm;

  return (
    <div className="simulator">
      <div className="sim-main">
        <section className="stage">
          <header className="stage-header">
            <div>
              <h1>{caseProfile.name}</h1>
              <p className="muted">
                {depth} × {width} × {height} mm
              </p>
            </div>
            <button className="btn" onClick={restoreFactory}>
              {t("restoreFactory")}
            </button>
          </header>
          <div className="stage-canvas">
            <CaseView
              caseProfile={caseProfile}
              slots={slots}
              fans={fans}
              onAdd={addFan}
              onToggle={toggleFan}
              onRemove={removeFan}
            />
          </div>
          <p className="stage-hint">{t("interactionHint")}</p>
        </section>
        <StatsBar fans={fans} />
      </div>

      <aside className="panel">
        <FanList slots={slots} fans={fans} onToggle={toggleFan} onRemove={removeFan} />
        <SpecsPanel caseProfile={caseProfile} />
      </aside>
    </div>
  );
}
