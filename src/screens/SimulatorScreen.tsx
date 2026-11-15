import { useMemo, useState } from "react";
import type { AioSize, CaseProfile, CpuCooler, FanDirection, GpuConfig, InstalledFan, MountPosition, Slot } from "../types";
import { defaultDirection, getFactoryFans, getSlots } from "../lib/layout";
import { shortName } from "../data/cases";
import { DEFAULT_GPU, getAioPositions, getAioSizes, getGpuFit, mountAio, removeAio } from "../lib/components";
import type { Setup } from "../lib/configs";
import { particlesFor, type Settings } from "../lib/settings";
import { SaveDialog } from "../components/SaveDialog";
import { useT, type TKey } from "../lib/i18n";
import { AirflowCanvas } from "../components/AirflowCanvas";
import { AnimationBar } from "../components/AnimationBar";
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

interface Props {
  caseProfile: CaseProfile;
  /** A loaded configuration to start from. Without one, the case's factory setup is used. */
  initial: Setup | null;
  /** False while another screen is shown: the screen stays mounted (keeps its state) but stops animating. */
  active: boolean;
  onSave: (setup: Setup, name: string) => void;
  settings: Settings;
  onAirAmount: (airAmount: number) => void;
}

// App.tsx gives this screen a new key when the case changes or a configuration
// is loaded, so it starts fresh from `initial` or the factory setup.
export function SimulatorScreen({ caseProfile, initial, active, onSave, settings, onAirAmount }: Props) {
  const t = useT();
  const slots = useMemo(() => getSlots(caseProfile), [caseProfile]);
  const [fans, setFans] = useState<InstalledFan[]>(() => initial?.fans ?? getFactoryFans(caseProfile, slots));
  const [cooler, setCooler] = useState<CpuCooler>(() => initial?.cooler ?? { type: "tower", direction: "rear" });
  const [gpu, setGpu] = useState<GpuConfig>(() => initial?.gpu ?? DEFAULT_GPU);
  const [tab, setTab] = useState<Tab>("fans");
  const [playing, setPlaying] = useState(true);
  const [fanSpeed, setFanSpeed] = useState(() => initial?.fanSpeed ?? 0.7);
  const [saving, setSaving] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  // One object per configuration, so the airflow is rebuilt only when it changes.
  const scene = useMemo(() => ({ caseProfile, slots, fans, gpu, cooler }), [caseProfile, slots, fans, gpu, cooler]);

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
    setFans(cooler.type === "aio" ? mountAio(factory, slots, cooler.position, cooler.size) : factory);
  }

  // ---------- CPU cooler ----------

  /**
   * After the radiator leaves some slots, put back the factory fans that
   * belong there (e.g. the front fans when the radiator moves to the top).
   */
  function refillFactory(next: InstalledFan[], before: InstalledFan[]) {
    const taken = new Set(next.map((f) => f.slotId));
    const vacated = new Set(before.filter((f) => f.radiator && !taken.has(f.slotId)).map((f) => f.slotId));
    const restored = getFactoryFans(caseProfile, slots).filter((f) => vacated.has(f.slotId));
    return [...next, ...restored];
  }

  function setCoolerType(type: CpuCooler["type"]) {
    if (type === cooler.type) return;
    if (type === "aio") {
      const sizes = getAioSizes(caseProfile);
      if (sizes.length === 0) return;
      const size = sizes.includes(360) ? 360 : sizes[0];
      const position = getAioPositions(caseProfile, size)[0];
      setCooler({ type: "aio", size, position });
      setFans((prev) => mountAio(prev, slots, position, size));
      return;
    }
    setFans((prev) => refillFactory(removeAio(prev), prev));
    setCooler(type === "tower" ? { type: "tower", direction: "rear" } : { type: "wraith" });
  }

  function setAioPosition(position: MountPosition) {
    if (cooler.type !== "aio") return;
    const size = cooler.size;
    setCooler({ type: "aio", size, position });
    setFans((prev) => refillFactory(mountAio(prev, slots, position, size), prev));
  }

  function setAioSize(size: AioSize) {
    if (cooler.type !== "aio") return;
    const positions = getAioPositions(caseProfile, size);
    const position = positions.includes(cooler.position) ? cooler.position : positions[0];
    if (!position) return;
    setCooler({ type: "aio", size, position });
    setFans((prev) => refillFactory(mountAio(prev, slots, position, size), prev));
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
            <div className="header-actions">
              <button className="btn" onClick={restoreFactory}>
                {t("restoreFactory")}
              </button>
              <button className="btn primary" onClick={() => setSaving(true)}>
                {t("saveConfig")}
              </button>
            </div>
          </header>
          <div className="stage-canvas">
            <div className="view-wrap">
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
              <AirflowCanvas
                scene={scene}
                playing={playing && active}
                fanSpeed={fanSpeed}
                restartKey={restartKey}
                colors={{ intake: settings.intakeColor, exhaust: settings.exhaustColor }}
                animationSpeed={settings.animationSpeed}
                maxParticles={particlesFor(settings.airAmount)}
              />
            </div>
          </div>
          <AnimationBar
            playing={playing}
            onPlaying={setPlaying}
            onRestart={() => setRestartKey((k) => k + 1)}
            fanSpeed={fanSpeed}
            onFanSpeed={setFanSpeed}
            airAmount={settings.airAmount}
            onAirAmount={onAirAmount}
          />
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
            onAioSize={setAioSize}
            onRadiatorDirection={setRadiatorDirection}
            onTowerDirection={(direction) => setCooler({ type: "tower", direction })}
            onToggleFan={toggleFan}
          />
        )}
        {tab === "gpu" && <GpuPanel caseProfile={caseProfile} gpu={gpu} cooler={cooler} onChange={setGpu} />}
        {tab === "case" && <SpecsPanel caseProfile={caseProfile} />}
      </aside>

      {saving && (
        <SaveDialog
          defaultName={`${shortName(caseProfile)} – ${new Date().toLocaleDateString()}`}
          onCancel={() => setSaving(false)}
          onSave={(name) => {
            onSave({ caseId: caseProfile.id, fans, gpu, cooler, fanSpeed }, name);
            setSaving(false);
          }}
        />
      )}
    </div>
  );
}
