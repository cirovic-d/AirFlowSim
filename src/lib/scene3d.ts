import * as THREE from "three";
import type { CaseProfile, CpuCooler, GpuConfig, InstalledFan, MountPosition, Slot } from "../types";
import { getGpuFans, getGpuLength, getGpuThickness } from "./components";
import { BOARD, FAN, FAN_THICK, GPU_X, INWARD, PCIE_Y, SOCKET, getShroud } from "./layout";
import { getPanels, isLight, shade, type Looks, type PanelKind } from "./looks";

// The 3D view uses the same millimetre layout as the side view:
// x = rear (0) → front (depth), y = top (0) → bottom (height),
// z = motherboard side panel (0) → glass side panel (width).
// It is a general model built from the case's dimensions, not a scan of the real case.

export interface Scene3DInput {
  caseProfile: CaseProfile;
  slots: Slot[];
  fans: InstalledFan[];
  gpu: GpuConfig;
  cooler: CpuCooler;
  looks: Looks;
  colors: { intake: string; exhaust: string };
}

const T = 2; // panel thickness
const BOARD_Z = 22; // motherboard distance from the right side panel
const CARD_W = 125; // graphics card height (how far it sticks out from the board)
const RAD_THICK = 27;

export function buildCaseModel(input: Scene3DInput): THREE.Group {
  const { caseProfile: c, looks } = input;
  const { depth, width, height } = c.dimensionsMm;
  const group = new THREE.Group();
  // Center the case on the origin and flip y so up is up.
  group.position.set(-depth / 2, height / 2, -width / 2);
  group.scale.set(1, -1, 1);

  const m = materials(looks);
  const fanZ = Math.min(width / 2, 130);

  /** Box from its min corner and size, in case millimetres. */
  function box(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x + w / 2, y + h / 2, z + d / 2);
    group.add(mesh);
    return mesh;
  }

  // ---------- Panels ----------
  const panels = getPanels(c);
  const panel = (kind: PanelKind, x: number, y: number, z: number, w: number, h: number, d: number, repeat: [number, number]) =>
    box(x, y, z, w, h, d, kind === "solid" ? m.solid : kind === "glass" ? m.glass : m.mesh(repeat));

  panel(panels.right, 0, 0, 0, depth, height, T, [depth / 7, height / 7]);
  panel(panels.left, 0, 0, width - T, depth, height, T, [depth / 7, height / 7]);
  panel(panels.front, depth - T, 0, 0, T, height, width, [width / 7, height / 7]);
  panel(panels.rear, 0, 0, 0, T, height, width, [width / 7, height / 7]);
  panel(panels.top, 0, 0, 0, depth, T, width, [depth / 7, width / 7]);
  panel(panels.bottom, 0, height - T, 0, depth, T, width, [depth / 7, width / 7]);

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(depth, height, width)), m.edge);
  edges.position.set(depth / 2, height / 2, width / 2);
  group.add(edges);

  // Feet
  for (const x of [24, depth - 64]) for (const z of [12, width - 32]) box(x, height, z, 40, 10, 20, m.foot);

  // Rear I/O and expansion slot covers, on the outside of the rear panel
  box(-1, 168, BOARD_Z, 1.5, 40, 50, m.dark);
  for (let i = 0; i < 7; i++) box(-1, 215 + i * 16, BOARD_Z, 1.5, 11, 120, m.metal);

  // ---------- Motherboard ----------
  const bx = BOARD.rearGap;
  const by = BOARD.topGap;
  box(bx, by, BOARD_Z - 2, BOARD.width, BOARD.height, 2, m.board);
  box(bx + 2, by + 4, BOARD_Z, 38, 108, 30, m.metal); // I/O cover
  box(bx + 56, by + 8, BOARD_Z, 104, 28, 24, m.metal); // VRM heatsinks
  box(bx + 50, by + 46, BOARD_Z, 28, 74, 24, m.metal);
  box(SOCKET.x - 4, SOCKET.y - 4, BOARD_Z, SOCKET.size + 8, SOCKET.size + 8, 4, m.dark);
  box(bx + 46, PCIE_Y + 26, BOARD_Z, 110, 13, 8, m.metal); // M.2 heatsink
  box(bx + BOARD.width - 64, by + BOARD.height - 72, BOARD_Z, 50, 46, 10, m.metal); // chipset
  box(bx + BOARD.width - 12, by + 92, BOARD_Z, 9, 56, 14, m.dark); // 24-pin
  box(bx + 20, PCIE_Y - 1, BOARD_Z, BOARD.width - 40, 7, 10, m.metal);

  // Memory
  const dimms = [180, 189, 198, 207];
  const filled = looks.ramCount === 4 ? [0, 1, 2, 3] : [1, 3];
  for (const i of filled) {
    box(dimms[i] - 3.5, by + 7, BOARD_Z, 7, 139, 32, m.ram);
    if (looks.ramRgb) box(dimms[i] - 2.5, by + 9, BOARD_Z + 32, 5, 135, 4, m.rgb);
  }

  // ---------- Graphics card ----------
  const length = getGpuLength(input.gpu);
  if (length !== null) {
    const thick = getGpuThickness(input.gpu);
    const y = PCIE_Y + 6;
    box(GPU_X, y, BOARD_Z, length, 3, CARD_W, m.gpuPlate); // backplate
    box(GPU_X, y + 3, BOARD_Z + 2, length - 4, thick * 0.45, CARD_W - 4, m.fins); // heatsink
    box(GPU_X, y + thick * 0.45, BOARD_Z, length, thick * 0.55, CARD_W, m.gpu); // shroud
    box(GPU_X + length * 0.62, y - 7, BOARD_Z + CARD_W - 30, 20, 7, 14, m.dark); // power connector
    box(-1, y - 6, BOARD_Z, 4, thick + 12, CARD_W, m.metal); // bracket
    const fans = getGpuFans(input.gpu);
    const segment = length / fans;
    const r = Math.min(46, segment / 2 - 6);
    for (let i = 0; i < fans; i++) {
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3, 40), m.gpuFan);
      fan.position.set(GPU_X + segment * (i + 0.5), y + thick + 1, BOARD_Z + CARD_W / 2);
      group.add(fan);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, 4, 24), m.metal);
      hub.position.copy(fan.position);
      group.add(hub);
    }
  }

  // ---------- CPU cooler ----------
  const cx = SOCKET.x + SOCKET.size / 2;
  const cy = SOCKET.y + SOCKET.size / 2;
  const cooler = input.cooler;
  if (cooler.type === "tower") {
    const h = Math.min(155, c.clearanceMm.cpuCoolerMaxHeight - 10);
    box(cx - 25, cy - 75, BOARD_Z + 6, 50, 150, h, m.aluminium);
    box(cx - 26, cy - 78, BOARD_Z + 6, 52, 5, h, m.dark); // top cover
    addFan(group, m, cx + 25 + FAN_THICK / 2, cy, BOARD_Z + 6 + h / 2, "x", null);
  } else if (cooler.type === "wraith") {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 50, 48), m.dark);
    base.rotation.x = Math.PI / 2;
    base.position.set(cx, cy, BOARD_Z + 6 + 25);
    group.add(base);
  } else {
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 36, 48), m.dark);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(cx, cy, BOARD_Z + 6 + 18);
    group.add(pump);
    const radSlots = input.slots.filter((s) => input.fans.some((f) => f.slotId === s.id && f.radiator));
    addRadiator(group, m, radSlots, fanZ, cx, cy);
  }

  // ---------- PSU shroud ----------
  const shroud = getShroud(c);
  if (shroud) {
    const top = (shroud.rearTop + shroud.frontTop) / 2;
    const h = height - T - top;
    const parts: [number, number, THREE.Material][] = shroud.vent
      ? [
          [shroud.x, shroud.vent.from, m.shroud],
          [shroud.vent.from, shroud.vent.to, m.mesh([(shroud.vent.to - shroud.vent.from) / 7, h / 7], m.shroudColor)],
          [shroud.vent.to, shroud.x + shroud.w, m.shroud],
        ]
      : [[shroud.x, shroud.x + shroud.w, m.shroud]];
    for (const [from, to, mat] of parts) if (to - from > 1) box(from, top, T, to - from, h, width - 2 * T, mat);
  }

  // ---------- Case fans ----------
  const slotById = new Map(input.slots.map((s) => [s.id, s]));
  for (const f of input.fans) {
    const slot = slotById.get(f.slotId);
    if (!slot) continue;
    const color = f.direction === "intake" ? input.colors.intake : input.colors.exhaust;
    const [x, y, z, axis] = fanPlacement(slot, depth, height, fanZ);
    addFan(group, m, x, y, z, axis, color);
  }

  return group;
}

/** Where a case fan sits and which way its axis points. */
function fanPlacement(slot: Slot, depth: number, height: number, fanZ: number): [number, number, number, "x" | "y" | "z"] {
  const edge = FAN_THICK / 2 + T;
  switch (slot.position) {
    case "front":
      return [depth - edge, slot.cy, fanZ, "x"];
    case "rear":
      return [edge, slot.cy, fanZ, "x"];
    case "top":
      return [slot.cx, edge, fanZ, "y"];
    case "bottom":
      return [slot.cx, height - edge, fanZ, "y"];
    case "side":
      return [slot.cx, slot.cy, edge, "z"];
  }
}

/** A 120 mm fan: square frame, colored blade disc (intake/exhaust) and hub. */
function addFan(group: THREE.Group, m: Mats, x: number, y: number, z: number, axis: "x" | "y" | "z", color: string | null) {
  const fan = new THREE.Group();
  const bar = (w: number, h: number, px: number, py: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, FAN_THICK), m.fanFrame);
    b.position.set(px, py, 0);
    fan.add(b);
  };
  const half = FAN / 2;
  bar(FAN, 6, 0, half - 3);
  bar(FAN, 6, 0, -half + 3);
  bar(6, FAN, half - 3, 0);
  bar(6, FAN, -half + 3, 0);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(half - 6, 2.5, 8, 48), m.fanFrame);
  fan.add(ring);
  const bladeMat = color ? m.blades(color) : m.bladesPlain;
  for (let i = 0; i < 7; i++) {
    const blade = new THREE.Mesh(m.bladeShape, bladeMat);
    blade.rotation.z = (i * Math.PI * 2) / 7;
    fan.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, FAN_THICK - 4, 32), m.fanFrame);
  hub.rotation.x = Math.PI / 2;
  fan.add(hub);

  // The fan is built facing z; turn it to its axis.
  if (axis === "x") fan.rotation.y = Math.PI / 2;
  if (axis === "y") fan.rotation.x = Math.PI / 2;
  fan.position.set(x, y, z);
  group.add(fan);
}

function addRadiator(group: THREE.Group, m: Mats, slots: Slot[], fanZ: number, cx: number, cy: number) {
  if (slots.length === 0) return;
  const p: MountPosition = slots[0].position;
  const n = slots.length;
  const len = FAN * n + 24;
  const xs = slots.map((s) => s.cx);
  const ys = slots.map((s) => s.cy);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const [ix, iy] = INWARD[p];
  const offset = FAN_THICK / 2 + RAD_THICK / 2 + T;

  let size: [number, number, number];
  let center: [number, number, number];
  if (p === "side") {
    size = [FAN + 12, len, RAD_THICK];
    center = [midX, midY, FAN_THICK + T + RAD_THICK / 2];
  } else if (ix !== 0) {
    size = [RAD_THICK, len, 125];
    center = [slots[0].cx + ix * offset - ix * T, midY, fanZ];
  } else {
    size = [len, RAD_THICK, 125];
    center = [midX, slots[0].cy + iy * offset - iy * T, fanZ];
  }
  const rad = new THREE.Mesh(new THREE.BoxGeometry(...size), m.fins);
  rad.position.set(...center);
  group.add(rad);

  // Two tubes from the pump to the radiator.
  for (const d of [-8, 8]) {
    const start = new THREE.Vector3(cx, cy + d, BOARD_Z + 6 + 36);
    const end = new THREE.Vector3(center[0], center[1] + d, center[2]);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0, 40));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 4, 8), m.tube));
  }
}

// ---------- Materials ----------

type Mats = ReturnType<typeof materials>;

function holesTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(16, 16, 10, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** One fan blade (same outline as the 2D drawing), for a 120 mm fan. */
function bladeGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 14);
  s.bezierCurveTo(18, 22, 30, 34, 22, 50);
  s.bezierCurveTo(12, 42, 4, 30, 0, 14);
  return new THREE.ShapeGeometry(s, 8);
}

function materials(looks: Looks) {
  const std = (color: string, roughness = 0.6, metalness = 0.2) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const holes = holesTexture();
  const light = isLight(looks.caseColor);
  const shroudColor = shade(looks.caseColor, light ? -0.12 : 0.05);

  return {
    solid: std(looks.caseColor, 0.55, 0.3),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#d8e6f5",
      transparent: true,
      opacity: 0.14,
      roughness: 0.05,
      metalness: 0,
      depthWrite: false,
    }),
    /** Perforated panel: an alpha map of round holes (reads as a see-through mesh from afar). */
    mesh(repeat: [number, number], color = looks.caseColor) {
      const map = holes.clone();
      map.repeat.set(repeat[0], repeat[1]);
      map.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.6,
        metalness: 0.3,
        alphaMap: map,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    },
    shroudColor,
    shroud: std(shroudColor),
    edge: new THREE.LineBasicMaterial({ color: light ? "#9a9ca3" : "#4a4c55" }),
    foot: std(shade(looks.caseColor, light ? -0.2 : 0.08)),
    board: std(looks.boardColor, 0.7, 0.1),
    metal: std("#4a4d56", 0.4, 0.6),
    aluminium: std("#b7bbc3", 0.35, 0.7),
    dark: std("#202126", 0.5, 0.3),
    ram: std(looks.ramColor, 0.4, 0.5),
    rgb: new THREE.MeshStandardMaterial({ color: "#b06cff", emissive: "#7a5cff", emissiveIntensity: 0.9 }),
    gpu: std(looks.gpuColor, 0.45, 0.4),
    gpuPlate: std(shade(looks.gpuColor, 0.12), 0.4, 0.5),
    gpuFan: std("#16171a", 0.7, 0.1),
    fins: std("#8d919a", 0.45, 0.6),
    tube: std("#1c1d21", 0.8, 0),
    fanFrame: std("#24252a", 0.6, 0.2),
    bladeShape: bladeGeometry(),
    bladesPlain: std("#2c2e34", 0.6, 0.1),
    blades: (color: string) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
  };
}

/** Frees the GPU memory of a model built by buildCaseModel. */
export function disposeModel(group: THREE.Object3D) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.geometry) return;
    mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const map = (mat as THREE.MeshStandardMaterial).alphaMap;
      map?.dispose();
      mat.dispose();
    }
  });
}
