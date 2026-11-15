import { useMemo, useState } from "react";
import type { CaseProfile, CpuCooler, FanDirection, GpuConfig, InstalledFan, MountPosition, Slot } from "../types";
import { defaultDirection, getFactoryFans, getSlots } from "../lib/layout";
import { DEFAULT_GPU, getAioPositions, getGpuFit, mountAio, removeAio } from "../lib/components";
import { useT, type TKey } from "../lib/i18n";
import { CaseView } from "../components/CaseView";
import { CpuPanel } from "../components/CpuPanel";
import { FanList } from "../components/FanList";
import { GpuPanel } from "../components/GpuPanel";
import { SpecsPanel } from "../components/SpecsPanel";
import { StatsBar } from "../components/StatsBar";

type Tab = "fans" | "cpu" | "gpu" | "case";
const TABS: { tab: Tab; label: TKey }[] = [
  { tab: "fans", label: "tabFans" },
  { tab: "cpu", label: "tabCpu" },
  { tab: "gpu", label: "tabGpu" },
  { tab: "case", label: "tabCase" },
];

// App.tsx gives this screen key={caseId}, so switching cases starts fresh
// with that case's factory fans.
export function SimulatorScreen({ caseProfile }: { caseProfile: CaseProfile }) {
  const t = useT();
  const slots = useMemo(() => getSlots(caseProfile), [caseProfile]);
  const [fans, setFans] = useState<InstalledFan[]>(() => getFactoryFans(caseProfile, slots));
  const [cooler, setCooler] = useState<CpuCooler>({ type: "tower", direction: "rear" });
  const [gpu, setGpu] = useState<GpuConfig>(DEFAULT_GPU);
  const [tab, setTab] = useState<Tab>("fans");

  // ---------- Case fans ----------

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
    setFans((prev) => prev.filter((f) => f.slotId !== slotId || f.radiator));
  }

  function restoreFactory() {
    const factory = getFactoryFans(caseProfile, slots);
    setFans(cooler.type === "aio" ? mountAio(factory, slots, cooler.position) : factory);
  }

  // ---------- CPU cooler ----------

  function setCoolerType(type: CpuCooler["type"]) {
    if (type === cooler.type) return;
    if (type === "aio") {
      const position = getAioPositions(caseProfile)[0];
      if (!position) return;
      setCooler({ type: "aio", position });
      setFans((prev) => mountAio(prev, slots, position));
      return;
    }
    setFans(removeAio);
    setCooler(type === "tower" ? { type: "tower", direction: "rear" } : { type: "wraith" });
  }

  function setAioPosition(position: MountPosition) {
    setCooler({ type: "aio", position });
    setFans((prev) => mountAio(prev, slots, position));
  }

  function setRadiatorDirection(direction: FanDirection) {
    setFans((prev) => prev.map((f) => (f.radiator ? { ...f, direction } : f)));
  }

  function toggleTower() {
    if (cooler.type === "tower") setCooler({ type: "tower", direction: cooler.direction === "rear" ? "front" : "rear" });
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
              gpu={gpu}
              cooler={cooler}
              onAdd={addFan}
              onToggle={toggleFan}
              onRemove={removeFan}
              onToggleTower={toggleTower}
            />
          </div>
          <p className="stage-hint">{t("interactionHint")}</p>
        </section>
        <StatsBar fans={fans} gpuFit={getGpuFit(caseProfile, gpu)} />
      </div>

      <aside className="panel">
        <div className="tabs">
          {TABS.map((item) => (
            <button key={item.tab} className={tab === item.tab ? "active" : ""} onClick={() => setTab(item.tab)}>
              {t(item.label)}
            </button>
          ))}
        </div>

        {tab === "fans" && <FanList slots={slots} fans={fans} onToggle={toggleFan} onRemove={removeFan} />}
        {tab === "cpu" && (
          <CpuPanel
            caseProfile={caseProfile}
            cooler={cooler}
            slots={slots}
            fans={fans}
            onCoolerType={setCoolerType}
            onAioPosition={setAioPosition}
            onRadiatorDirection={setRadiatorDirection}
            onTowerDirection={(direction) => setCooler({ type: "tower", direction })}
            onToggleFan={toggleFan}
          />
        )}
        {tab === "gpu" && <GpuPanel caseProfile={caseProfile} gpu={gpu} cooler={cooler} onChange={setGpu} />}
        {tab === "case" && <SpecsPanel caseProfile={caseProfile} />}
      </aside>
    </div>
  );
}
