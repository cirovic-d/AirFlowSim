import * as THREE from "three";
import type { CaseProfile, CpuCooler, GpuConfig, InstalledFan, MountPosition, Slot } from "../types";
import { getGpuFans, getGpuLength, getGpuThickness } from "./components";
import { BOARD, FAN, FAN_THICK, GPU_X, INWARD, SOCKET, getShroud } from "./layout";
import { PSU_WIDTH, boardLayout, psuPlacement, type Build } from "./build";
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
  build: Build;
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

  /** Cylinder starting at (x, y, z) and running `len` mm along an axis. */
  function cylinder(x: number, y: number, z: number, r: number, len: number, axis: "x" | "y" | "z", mat: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), mat);
    if (axis === "z") {
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, y, z + len / 2);
    } else if (axis === "x") {
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(x + len / 2, y, z);
    } else mesh.position.set(x, y + len / 2, z);
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
  const b = boardLayout(input.build.board, looks.ramCount);
  const bx = BOARD.rearGap;
  const by = BOARD.topGap;
  const bz = BOARD_Z;
  box(bx, by, bz - 2, b.w, b.h, 2, m.board);
  // Standoffs behind the board
  for (const [hx, hy] of [[7, 7], [b.w - 7, 7], [7, b.h - 7], [b.w - 7, b.h - 7]]) cylinder(bx + hx, by + hy, bz - 8, 3, 6, "z", m.metal);
  // Rear I/O cover with ports showing through the rear panel
  box(bx + 2, by + 4, bz, 38, b.ioHeight, 30, m.metal);
  for (let i = 0; i < 5; i++) box(-0.5, 172 + i * 7, bz + 6, 1, 4, 16, m.dark);
  // VRM heatsinks with fins
  box(bx + 56, by + 8, bz, b.vrmWidth, 28, 8, m.metal);
  for (let x = 0; x < b.vrmWidth - 2; x += 5) box(bx + 57 + x, by + 8, bz + 8, 2.5, 28, 16, m.metal);
  box(bx + 50, by + 46, bz, 28, 74, 8, m.metal);
  for (let y = 0; y < 72; y += 5) box(bx + 50, by + 47 + y, bz + 8, 28, 2.5, 16, m.metal);
  // CPU socket and the processor's heat spreader
  box(SOCKET.x - 4, SOCKET.y - 4, bz, SOCKET.size + 8, SOCKET.size + 8, 3, m.dark);
  box(SOCKET.x + 4, SOCKET.y + 4, bz + 3, SOCKET.size - 8, SOCKET.size - 8, 2, m.aluminium);
  // 8-pin CPU power at the top edge, 24-pin at the front edge
  box(bx + 12, by + 2, bz, 20, 8, 12, m.dark);
  const atxY = by + Math.min(92, b.h - 70);
  box(bx + b.w - 12, atxY, bz, 9, 56, 14, m.dark);
  // PCIe slots, M.2 heatsink, chipset, battery
  box(bx + 20, b.pcieY - 1, bz, Math.min(b.w, 244) - 40, 7, 10, m.metal);
  for (const y of b.extraPcie) box(bx + 20, y, bz, Math.min(b.w, 244) - 90, 4, 8, m.slot);
  if (b.full) {
    box(bx + 46, b.pcieY + 26, bz, 110, 13, 6, m.metal);
    box(bx + Math.min(b.w, 244) - 64, by + b.h - 72, bz, 50, 46, 10, m.metal);
    cylinder(bx + 150, by + b.h - 40, bz + 1, 8, 2, "z", m.aluminium);
  }

  // Memory: slots, sticks with heat spreaders and a top bar
  for (const x of b.dimmX) box(bx + x - 2.5, by + 10, bz, 5, b.dimmLen, 7, m.slot);
  for (const i of b.filled) {
    const x = bx + b.dimmX[i];
    box(x - 3, by + 7, bz + 3, 6, b.dimmLen + 6, 30, m.ram);
    box(x - 3.5, by + 7, bz + 33, 7, b.dimmLen + 6, 3, looks.ramRgb ? m.rgb : m.ramTop);
  }

  // ---------- Graphics card ----------
  const length = getGpuLength(input.gpu);
  const gpuY = b.pcieY + 6;
  let gpuPower: THREE.Vector3 | null = null;
  if (length !== null) {
    const thick = getGpuThickness(input.gpu);
    const y = gpuY;
    const finH = thick * 0.45;
    box(GPU_X, y, bz, length, 3, CARD_W, m.gpuPlate); // backplate
    box(GPU_X, y + 3, bz + 2, length - 4, 2, CARD_W - 4, m.pcb); // circuit board
    // Heatsink: thin vertical fins along the card
    for (let x = 6; x < length - 6; x += 4) box(GPU_X + x, y + 5, bz + 4, 1, finH - 2, CARD_W - 8, m.fins);
    box(GPU_X, y + 5 + finH, bz, length, thick - 5 - finH, CARD_W, m.gpu); // shroud
    box(GPU_X + length * 0.62, y - 7, bz + CARD_W - 30, 20, 7, 14, m.dark); // power connector
    gpuPower = new THREE.Vector3(GPU_X + length * 0.62 + 10, y - 7, bz + CARD_W - 23);
    box(-1, y - 6, bz, 4, thick + 12, CARD_W, m.metal); // bracket
    for (let i = 0; i < 4; i++) box(-1.5, y + 2 + i * ((thick - 4) / 4), bz + 10, 1, (thick - 4) / 4 - 3, CARD_W - 20, m.dark);
    // Fans on the underside, facing the bottom of the case
    const fans = getGpuFans(input.gpu);
    const segment = length / fans;
    const r = Math.min(46, segment / 2 - 6);
    for (let i = 0; i < fans; i++) {
      const fan = new THREE.Group();
      fan.add(new THREE.Mesh(new THREE.TorusGeometry(r, 1.6, 6, 40), m.dark));
      for (let k = 0; k < 9; k++) {
        const blade = new THREE.Mesh(m.bladeShape, m.gpuFan);
        blade.scale.setScalar(r / 52);
        blade.rotation.z = (k * Math.PI * 2) / 9;
        fan.add(blade);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, 3, 24), m.metal);
      hub.rotation.x = Math.PI / 2;
      fan.add(hub);
      fan.rotation.x = Math.PI / 2;
      fan.position.set(GPU_X + segment * (i + 0.5), y + thick + 0.5, bz + CARD_W / 2);
      group.add(fan);
    }
  }

  // ---------- CPU cooler ----------
  const cx = SOCKET.x + SOCKET.size / 2;
  const cy = SOCKET.y + SOCKET.size / 2;
  const cooler = input.cooler;
  const base = bz + 5;
  if (cooler.type === "tower") {
    const h = Math.max(60, Math.min(input.build.towerHeight, width - bz - 10));
    box(cx - 20, cy - 20, base, 40, 40, 8, m.copper); // base plate
    // Heat pipes rise from the base through the fins
    for (const dy of [-21, -7, 7, 21]) for (const dx of [-12, 12]) cylinder(cx + dx, cy + dy, base + 8, 3, h - 14, "z", m.copper);
    // Fin stack, one plate every 2.5 mm
    for (let z = base + 34; z < base + h - 4; z += 2.5) box(cx - 25, cy - 62, z, 50, 124, 0.6, m.aluminium);
    box(cx - 26, cy - 63, base + h - 4, 52, 126, 4, m.dark); // top cover
    // The fan sits on the side the air comes from (it pushes toward the chosen direction).
    const side = cooler.direction === "rear" ? 1 : -1;
    addFan(group, m, cx + side * (25 + FAN_THICK / 2), cy, Math.max(base + 62, base + 34 + (h - 38) / 2), "x", null);
  } else if (cooler.type === "wraith") {
    cylinder(cx, cy, base, 40, 10, "z", m.copper); // core
    for (let k = 0; k < 24; k++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(36, 1.2, 34), m.aluminium);
      fin.position.set(cx, cy, base + 10 + 17);
      fin.rotation.z = (k * Math.PI) / 24;
      group.add(fin);
    }
    cylinder(cx, cy, base + 44, 47, 14, "z", m.dark); // fan shroud
    const fan = new THREE.Group();
    for (let k = 0; k < 7; k++) {
      const blade = new THREE.Mesh(m.bladeShape, m.bladesPlain);
      blade.scale.setScalar(0.75);
      blade.rotation.z = (k * Math.PI * 2) / 7;
      fan.add(blade);
    }
    fan.position.set(cx, cy, base + 59);
    group.add(fan);
  } else {
    cylinder(cx, cy, base, 30, 6, "z", m.copper);
    cylinder(cx, cy, base + 6, 27, 30, "z", m.dark); // pump
    const ring = new THREE.Mesh(new THREE.TorusGeometry(24, 1.4, 8, 48), looks.ramRgb ? m.rgb : m.metal);
    ring.position.set(cx, cy, base + 36);
    group.add(ring);
    const radSlots = input.slots.filter((s) => input.fans.some((f) => f.slotId === s.id && f.radiator));
    addRadiator(group, m, radSlots, fanZ, cx, cy);
  }

  // ---------- Power supply and cables ----------
  const psu = psuPlacement(c, input.build.psuLength);
  const atx = new THREE.Vector3(bx + b.w - 7, atxY + 28, bz + 14);
  if (psu) {
    const pz = Math.max(T + 4, Math.min(width - PSU_WIDTH - T - 4, bz - 8));
    box(psu.x, psu.y, pz, psu.w, psu.h, PSU_WIDTH, m.psu);
    // Fan grille on the underside and modular sockets facing the inside
    const grille = new THREE.Mesh(new THREE.TorusGeometry(56, 1.5, 6, 48), m.metal);
    grille.rotation.x = Math.PI / 2;
    grille.position.set(psu.x + psu.w / 2, psu.y + psu.h + 0.5, pz + PSU_WIDTH / 2);
    group.add(grille);
    const sx = c.psuPosition === "front" ? psu.x - 1 : psu.x + psu.w;
    box(sx, psu.y + 12, pz + 20, 1.5, psu.h - 24, PSU_WIDTH - 40, m.dark);
  }
  // Cables are routed behind the motherboard tray and come out through grommets
  // next to the board, as in most builds.
  const grommetX = Math.min(depth - 30, bx + b.w + 16);
  cable(group, m, new THREE.Vector3(grommetX, atx.y, 4), atx, 7);
  cable(group, m, new THREE.Vector3(bx + 22, by - 14, 4), new THREE.Vector3(bx + 22, by + 6, bz + 12), 3.5); // CPU power
  if (gpuPower) cable(group, m, new THREE.Vector3(grommetX, Math.max(gpuY - 40, atx.y + 50), 4), gpuPower, 4);

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

/** A sleeved cable that bends out toward the glass between two points. */
function cable(group: THREE.Group, m: Mats, from: THREE.Vector3, to: THREE.Vector3, r: number) {
  const mid = from.clone().lerp(to, 0.5);
  mid.z = Math.max(from.z, to.z) + 30;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, r, 10), m.cable));
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
  // End tanks at both ends of the long side
  const along = size.indexOf(len);
  for (const sign of [-1, 1]) {
    const tankSize: [number, number, number] = [...size];
    tankSize[along] = 14;
    const tank = new THREE.Mesh(new THREE.BoxGeometry(tankSize[0] + 1, tankSize[1] + 1, tankSize[2] + 1), m.dark);
    const pos: [number, number, number] = [...center];
    pos[along] += sign * (len / 2 - 7);
    tank.position.set(...pos);
    group.add(tank);
  }

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
    copper: std("#b87346", 0.35, 0.8),
    pcb: std("#1d3324", 0.8, 0.1),
    slot: std(shade(looks.boardColor, -0.35), 0.7, 0.1),
    ramTop: std(shade(looks.ramColor, 0.12), 0.4, 0.5),
    psu: std("#1b1c20", 0.6, 0.3),
    cable: std("#121316", 0.9, 0),
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
