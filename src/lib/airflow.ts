import type { CaseProfile, CpuCooler, GpuConfig, InstalledFan, MountPosition, Slot } from "../types";
import { getGpuLength } from "./components";
import { FAN, GPU_THICK, GPU_X, INWARD, PCIE_Y, SOCKET, getShroud, inShroud, shroudTopAt, type Rect, type Shroud } from "./layout";

// A lightweight visual airflow model, NOT a fluid simulation.
// 1. A coarse grid stores an air direction for every cell. It is built once
//    per configuration from simple rules: intake fans push air in, exhaust
//    fans pull it out, the CPU/GPU coolers stir it locally.
// 2. Particles are born at intake fans, follow the grid and leave through
//    exhaust fans. They are drawn as short fading lines, which looks like smoke.

export interface FlowScene {
  caseProfile: CaseProfile;
  slots: Slot[];
  fans: InstalledFan[];
  gpu: GpuConfig;
  cooler: CpuCooler;
}

interface Particle {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  /** Outside the case: moves straight, ignoring the grid. */
  outside: boolean;
  /** 0 = fresh cool air, 1 = hot. Rises when the air passes the GPU or CPU cooler. */
  heat: number;
}

interface Emitter {
  x: number;
  y: number;
  /** Direction the air travels when it enters (zero for face-on fans). */
  dx: number;
  dy: number;
  /** Edge fans: spread across the fan width. Face fans: spawn in a disk. */
  face: boolean;
  outside: boolean;
  /** Air coming in through an AIO radiator is already warm. */
  heat: number;
}

interface Opening {
  position: MountPosition;
  from: number;
  to: number;
}

type RGB = [number, number, number];

const CELL = 6; // grid cell size in mm
const BASE_SPEED = 240; // mm per second at 100 % fan speed
const HALF = FAN / 2;

export class AirflowEngine {
  fanSpeed = 0.7; // 0..1
  maxParticles = 320;
  colors: { intake: RGB; exhaust: RGB } = { intake: hexToRgb("#3ad0f0"), exhaust: hexToRgb("#ff8a3d") };

  private depth = 0;
  private height = 0;
  private cols = 0;
  private rows = 0;
  private field = new Float32Array(0); // vx, vy per cell
  private obstacles: Rect[] = [];
  private shroud: Shroud | null = null;
  private openings: Opening[] = [];
  private faceSinks: { x: number; y: number }[] = [];
  private gpuRect: Rect | null = null;
  private gpuFanXs: number[] = [];
  private gpuFanHalf = 0;
  private cpuHeatZone: { x: number; y: number; w: number; h: number } | null = null;
  private emitters: Emitter[] = [];
  private particles: Particle[] = [];
  private spawnBudget = 0;

  setScene(scene: FlowScene) {
    const { caseProfile, slots, fans } = scene;
    this.depth = caseProfile.dimensionsMm.depth;
    this.height = caseProfile.dimensionsMm.height;

    const slotById = new Map(slots.map((s) => [s.id, s]));
    const placed = fans
      .map((f) => ({ fan: f, slot: slotById.get(f.slotId) }))
      .filter((p): p is { fan: InstalledFan; slot: Slot } => !!p.slot);

    // Obstacles the air goes around.
    this.shroud = getShroud(caseProfile);
    this.obstacles = [];
    const gpuLength = getGpuLength(scene.gpu);
    const gpuRect = gpuLength ? { x: GPU_X, y: PCIE_Y + 6, w: gpuLength, h: GPU_THICK } : null;
    if (gpuRect) this.obstacles.push(gpuRect);
    this.gpuRect = gpuRect;
    this.gpuFanXs = [];
    if (gpuRect) {
      const segment = gpuRect.w / scene.gpu.fans;
      this.gpuFanHalf = Math.min(46, segment / 2 - 5);
      for (let i = 0; i < scene.gpu.fans; i++) this.gpuFanXs.push(gpuRect.x + segment * (i + 0.5));
    }

    // Area around the CPU cooler where passing air picks up heat.
    const cx = SOCKET.x + SOCKET.size / 2;
    const cy = SOCKET.y + SOCKET.size / 2;
    const cooler = scene.cooler;
    this.cpuHeatZone =
      cooler.type === "tower"
        ? { x: cx - 30, y: cy - 75, w: 60, h: 150 }
        : cooler.type === "wraith"
          ? { x: cx - 46, y: cy - 46, w: 92, h: 92 }
          : null; // AIO: the heat leaves through the radiator instead

    // Openings in the walls that particles may leave through.
    this.openings = [];
    this.faceSinks = [];
    this.emitters = [];
    for (const { fan, slot } of placed) {
      const [dx, dy] = INWARD[slot.position];
      const face = slot.position === "side";
      if (fan.direction === "exhaust") {
        if (face) this.faceSinks.push({ x: slot.cx, y: slot.cy });
        else {
          const along = dx !== 0 ? slot.cy : slot.cx;
          this.openings.push({ position: slot.position, from: along - HALF, to: along + HALF });
        }
      } else {
        this.emitters.push({
          x: face ? slot.cx : slot.cx - dx * 40,
          y: face ? slot.cy : slot.cy - dy * 40,
          dx,
          dy,
          face,
          outside: !face,
          heat: fan.radiator ? 0.45 : 0,
        });
      }
    }

    // No intake fans: air leaks in through gaps, here the rear slot covers.
    if (this.emitters.length === 0 && placed.length > 0) {
      for (const y of [250, 300]) {
        this.emitters.push({ x: 8, y, dx: 1, dy: 0, face: false, outside: false, heat: 0 });
      }
    }

    this.buildField(placed, scene, gpuRect);
  }

  reset() {
    this.particles = [];
    this.spawnBudget = 0;
  }

  /** Advances the animation by dt seconds. */
  step(dt: number) {
    const speed = BASE_SPEED * (0.25 + 0.75 * this.fanSpeed);
    this.spawn(dt);

    for (const p of this.particles) {
      p.age += dt;
      p.px = p.x;
      p.py = p.y;

      if (p.outside) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (this.isInside(p.x, p.y)) p.outside = false;
        else if (this.distanceOutside(p.x, p.y) > 55) p.age = p.life;
        continue;
      }

      // Follow the grid, with a little inertia and turbulence.
      const [fx, fy] = this.sample(p.x, p.y);
      p.vx += (fx * speed - p.vx) * 0.12 + (Math.random() - 0.5) * 18;
      p.vy += (fy * speed - p.vy) * 0.12 + (Math.random() - 0.5) * 18;

      let nx = p.x + p.vx * dt;
      let ny = p.y + p.vy * dt;

      // GPU: air pulled into a fan from below goes through the heatsink
      // and comes out of the top of the card, hot.
      const g = this.gpuRect;
      if (g && nx > g.x && nx < g.x + g.w && ny > g.y && p.y >= g.y + g.h - 1) {
        const fanX = this.gpuFanXs.find((fx) => Math.abs(nx - fx) < this.gpuFanHalf);
        if (fanX !== undefined) {
          p.x = p.px = nx + (Math.random() - 0.5) * 30;
          p.y = p.py = g.y - 2;
          p.vx = (Math.random() - 0.5) * 90;
          p.vy = -speed * 1.1;
          p.heat = Math.min(1, p.heat + 0.6);
          continue;
        }
      }

      // CPU cooler warms the air passing through it.
      const z = this.cpuHeatZone;
      if (z && nx > z.x && nx < z.x + z.w && ny > z.y && ny < z.y + z.h) {
        p.heat = Math.min(1, p.heat + dt * 1.6);
      }

      // Slide around obstacles.
      if (this.hitsObstacle(nx, ny)) {
        p.age += dt * 5; // particles that keep scraping along a part fade sooner
        if (!this.hitsObstacle(nx, p.y)) ny = p.y;
        else if (!this.hitsObstacle(p.x, ny)) nx = p.x;
        else {
          nx = p.x;
          ny = p.y;
        }
      }

      // Walls: leave only through exhaust openings, otherwise slide along.
      if (!this.isInside(nx, ny)) {
        if (this.throughOpening(nx, ny)) p.outside = true;
        else {
          // Air pressed against a wall escapes through gaps: fade it out quickly.
          p.age = Math.max(p.age, p.life - 0.5);
          nx = clamp(nx, 2, this.depth - 2);
          ny = clamp(ny, 2, this.height - 2);
        }
      }

      p.x = nx;
      p.y = ny;

      // Face-on exhaust fans (side panel) swallow particles that reach them.
      for (const s of this.faceSinks) {
        if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < 40 * 40) p.age = p.life;
      }
    }

    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  /**
   * Draws one frame. The canvas keeps the previous frame and fades it a little,
   * which leaves soft trails behind every particle.
   */
  draw(ctx: CanvasRenderingContext2D, scale: number, originX: number, originY: number) {
    const { width, height } = ctx.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "source-over";
    ctx.setTransform(scale, 0, 0, scale, originX, originY);
    ctx.lineCap = "round";
    ctx.lineWidth = 2.6;

    const { intake, exhaust } = this.colors;
    for (const p of this.particles) {
      // Cool air has the intake color, hot air the exhaust color. Heat comes mostly
      // from the GPU and CPU cooler, plus a little from time spent in the case.
      const heat = Math.min(1, p.heat + (0.35 * p.age) / p.life);
      const r = Math.round(intake[0] + (exhaust[0] - intake[0]) * heat);
      const g = Math.round(intake[1] + (exhaust[1] - intake[1]) * heat);
      const b = Math.round(intake[2] + (exhaust[2] - intake[2]) * heat);
      const alpha = Math.min(1, p.age / 0.3) * Math.min(1, (p.life - p.age) / 0.6) * 0.75;
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }

  clear(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // ---------- Particles ----------

  private spawn(dt: number) {
    if (this.emitters.length === 0) return;
    const speed = BASE_SPEED * (0.25 + 0.75 * this.fanSpeed);
    const avgLife = 4.8;
    this.spawnBudget += (this.maxParticles / avgLife) * dt;

    while (this.spawnBudget >= 1) {
      this.spawnBudget -= 1;
      if (this.particles.length >= this.maxParticles) continue;

      const e = this.emitters[Math.floor(Math.random() * this.emitters.length)];
      let x = e.x;
      let y = e.y;
      if (e.face) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 48;
        x += Math.cos(a) * r;
        y += Math.sin(a) * r;
      } else {
        const t = (Math.random() - 0.5) * (FAN - 16);
        x += -e.dy * t;
        y += e.dx * t;
      }
      if (!e.outside && this.hitsObstacle(x, y)) continue;

      this.particles.push({
        x,
        y,
        px: x,
        py: y,
        vx: e.dx * speed,
        vy: e.dy * speed,
        age: 0,
        life: 3.5 + Math.random() * 2.6,
        outside: e.outside,
        heat: e.heat,
      });
    }
  }

  // ---------- Geometry helpers ----------

  private isInside(x: number, y: number) {
    return x > 0 && x < this.depth && y > 0 && y < this.height;
  }

  private distanceOutside(x: number, y: number) {
    return Math.max(-x, x - this.depth, -y, y - this.height, 0);
  }

  private hitsObstacle(x: number, y: number) {
    if (this.shroud && inShroud(this.shroud, x, y)) return true;
    return this.obstacles.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);
  }

  private throughOpening(x: number, y: number) {
    let wall: MountPosition;
    let along: number;
    if (x <= 0) [wall, along] = ["rear", y];
    else if (x >= this.depth) [wall, along] = ["front", y];
    else if (y <= 0) [wall, along] = ["top", x];
    else [wall, along] = ["bottom", x];
    return this.openings.some((o) => o.position === wall && along >= o.from && along <= o.to);
  }

  private sample(x: number, y: number): [number, number] {
    const c = clamp(Math.floor(x / CELL), 0, this.cols - 1);
    const r = clamp(Math.floor(y / CELL), 0, this.rows - 1);
    const i = (r * this.cols + c) * 2;
    return [this.field[i], this.field[i + 1]];
  }

  // ---------- Velocity field ----------

  private buildField(placed: { fan: InstalledFan; slot: Slot }[], scene: FlowScene, gpuRect: Rect | null) {
    this.cols = Math.ceil(this.depth / CELL);
    this.rows = Math.ceil(this.height / CELL);
    this.field = new Float32Array(this.cols * this.rows * 2);

    const cpuX = SOCKET.x + SOCKET.size / 2;
    const cpuY = SOCKET.y + SOCKET.size / 2;
    const { cooler } = scene;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = (c + 0.5) * CELL;
        const y = (r + 0.5) * CELL;
        let vx = 0;
        let vy = 0;

        for (const { fan, slot } of placed) {
          const rx = x - slot.cx;
          const ry = y - slot.cy;
          const r2 = rx * rx + ry * ry + 40 * 40;
          const sign = fan.direction === "intake" ? 1 : -1;
          const [dx, dy] = INWARD[slot.position];

          if (slot.position === "side") {
            // Face-on fan: plain source (intake) or sink (exhaust).
            vx += (sign * 60 * rx) / r2;
            vy += (sign * 60 * ry) / r2;
            continue;
          }

          // Jet along the fan axis: pushes air in (intake) or pulls it out (exhaust).
          const along = rx * dx + ry * dy;
          const lateral = Math.abs(rx * dy - ry * dx);
          if (along > -10) {
            const reach = fan.direction === "intake" ? 230 : 170;
            const jet = Math.exp(-along / reach) * Math.exp(-((lateral / 75) ** 2));
            vx += sign * dx * jet;
            vy += sign * dy * jet;
          }
          // Weak source/sink so air also spreads toward or gathers at the fan.
          const k = fan.direction === "intake" ? 20 : 45;
          vx += (sign * k * rx) / r2;
          vy += (sign * k * ry) / r2;
        }

        // GPU fans suck air in from below, each toward its own fan;
        // hot air rises off the top of the card.
        if (gpuRect) {
          const bottom = gpuRect.y + gpuRect.h;
          if (y > bottom - 4) {
            for (const fx of this.gpuFanXs) {
              const ax = fx - x;
              const ay = bottom - y;
              const d = Math.hypot(ax, ay) || 1;
              if (d < 140) {
                const pull = 2.4 * (1 - d / 140);
                vx += (ax / d) * pull;
                vy += (ay / d) * pull;
              }
            }
          }
          const above = gpuRect.y - y;
          if (above > 0 && above < 70 && x > gpuRect.x && x < gpuRect.x + gpuRect.w) vy -= 1.0 * (1 - above / 70);
        }

        // Air turns away just before it reaches the top of the shroud or the GPU.
        const sh = this.shroud;
        const tops = this.obstacles.filter((o) => x > o.x && x < o.x + o.w).map((o) => o.y);
        if (sh && x > sh.x && x < sh.x + sh.w && !(sh.vent && x > sh.vent.from && x < sh.vent.to)) {
          tops.push(shroudTopAt(sh, x));
        }
        for (const top of tops) {
          const gap = top - y;
          if (gap > 0 && gap < 30) vy -= 0.8 * (1 - gap / 30);
        }

        // CPU coolers stir the air around the socket.
        if (cooler.type === "tower" && Math.abs(x - cpuX) < 75 && Math.abs(y - cpuY) < 75) {
          vx += cooler.direction === "rear" ? -1.1 : 1.1;
        }
        if (cooler.type === "wraith") {
          const rx = x - cpuX;
          const ry = y - cpuY;
          const d2 = rx * rx + ry * ry;
          if (d2 < 110 * 110) {
            vx += (35 * rx) / (d2 + 30 * 30);
            vy += (35 * ry) / (d2 + 30 * 30);
          }
        }

        // Keep the direction, but limit the strength so nothing stalls or shoots off.
        const mag = Math.hypot(vx, vy);
        const target = clamp(mag, 0.22, 1.3);
        const i = (r * this.cols + c) * 2;
        if (mag > 1e-6) {
          this.field[i] = (vx / mag) * target;
          this.field[i + 1] = (vy / mag) * target;
        }
      }
    }
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
