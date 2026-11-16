import type { CaseProfile, CpuCooler, GpuConfig, InstalledFan, MountPosition, Slot } from "../types";
import { getGpuFans, getGpuLength, getGpuThickness } from "./components";
import { fanStrength } from "./pressure";
import { FAN, GPU_X, INWARD, PCIE_Y, SOCKET, getShroud, inShroud, shroudTopAt, type Rect, type Shroud } from "./layout";

// A lightweight visual airflow model, NOT a fluid simulation.
// 1. A coarse grid stores an air direction for every cell. It is built once
//    per configuration from simple rules: intake fans push air in, exhaust
//    fans pull it out, the CPU cooler stirs it locally.
// 2. Particles are born at intake fans, follow the grid and leave through
//    exhaust fans. They are drawn as short fading lines, which looks like smoke.
// 3. The graphics card is handled per particle: air under the card is drawn
//    to one of its fans, travels through the heatsink and leaves the top of
//    the card, hot.

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
  /** Random phase for the gentle side-to-side wobble. */
  seed: number;
  /** Outside the case: moves straight, ignoring the grid. */
  outside: boolean;
  /** 0 = fresh cool air, 1 = hot. Rises when the air passes the GPU or CPU cooler. */
  heat: number;
  /** Which GPU fan this particle heads for once it's under the card (-1 = none yet). */
  gpuFan: number;
  /** Set while the particle travels through the GPU heatsink: where it comes out. */
  gpuExit: { x: number; y: number } | null;
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
  /** Share of new particles, from the fan's simulated speed. */
  weight: number;
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
const UNDER_GPU = 140; // how far below the card its fans pull air from, in mm
const GPU_REACH = 150; // how far in front of the card's end they still draw air, in mm

export class AirflowEngine {
  fanSpeed = 0.7; // 0..1
  animationSpeed = 1; // time multiplier from Settings
  maxParticles = 330;
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
  private gpuSegment = 0;
  private cpuHeatZone: Rect | null = null;
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
    const gpuRect = gpuLength ? { x: GPU_X, y: PCIE_Y + 6, w: gpuLength, h: getGpuThickness(scene.gpu) } : null;
    if (gpuRect) this.obstacles.push(gpuRect);
    this.gpuRect = gpuRect;
    this.gpuFanXs = [];
    if (gpuRect) {
      const gpuFans = getGpuFans(scene.gpu);
      this.gpuSegment = gpuRect.w / gpuFans;
      this.gpuFanHalf = Math.min(46, this.gpuSegment / 2 - 5);
      for (let i = 0; i < gpuFans; i++) this.gpuFanXs.push(gpuRect.x + this.gpuSegment * (i + 0.5));
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

    // Openings in the walls that particles may leave through, and intake emitters.
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
          weight: fanStrength(fan),
        });
      }
    }

    // No intake fans: air leaks in through gaps, here the rear slot covers.
    if (this.emitters.length === 0 && placed.length > 0) {
      for (const y of [250, 300]) {
        this.emitters.push({ x: 8, y, dx: 1, dy: 0, face: false, outside: false, heat: 0, weight: 1 });
      }
    }

    // Particles from the previous setup may now be stuck inside a part.
    this.particles = this.particles.filter((p) => p.outside || p.gpuExit || !this.hitsObstacle(p.x, p.y));
    for (const p of this.particles) {
      p.gpuFan = -1;
      if (p.gpuExit && !gpuRect) p.gpuExit = null;
    }

    this.buildField(placed, scene, gpuRect);
  }

  reset() {
    this.particles = [];
    this.spawnBudget = 0;
  }

  /** Advances the animation by realDt seconds of real time. */
  step(realDt: number) {
    const dt = realDt * this.animationSpeed;
    const speed = BASE_SPEED * (0.25 + 0.75 * this.fanSpeed);
    const g = this.gpuRect;
    this.spawn(dt, speed);

    for (const p of this.particles) {
      p.age += dt;
      p.px = p.x;
      p.py = p.y;

      // Outside the case: straight line (entering through an intake or leaving through an exhaust).
      if (p.outside) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (this.isInside(p.x, p.y)) p.outside = false;
        else if (this.distanceOutside(p.x, p.y) > 55) p.age = p.life;
        continue;
      }

      // Inside the GPU heatsink: move to the exit point, heating up on the way.
      if (p.gpuExit && g) {
        const ex = p.gpuExit.x - p.x;
        const ey = p.gpuExit.y - p.y;
        const dist = Math.hypot(ex, ey);
        const move = speed * 0.7 * dt;
        p.heat = Math.min(1, p.heat + dt * 1.6);
        if (dist <= move) {
          // Out of the top of the card, drifting a little toward the rear exhaust.
          p.x = p.gpuExit.x;
          p.y = g.y - 2;
          p.vx = (Math.random() - 0.5) * 70 - speed * 0.12;
          p.vy = -speed * 0.85;
          p.gpuExit = null;
          p.gpuFan = -1;
        } else {
          p.x += (ex / dist) * move;
          p.y += (ey / dist) * move;
        }
        continue;
      }

      // Follow the grid. A slow wobble across the flow direction makes it look
      // like drifting smoke instead of perfectly straight lines.
      const [fx, fy] = this.sample(p.x, p.y);
      const wobble = Math.sin(p.age * 3.2 + p.seed) * 0.22;
      p.vx += ((fx - fy * wobble) * speed - p.vx) * 0.14;
      p.vy += ((fy + fx * wobble) * speed - p.vy) * 0.14;

      // Under the GPU: head for one of its fans (picked at random, so every fan gets air).
      if (g && this.gpuFanXs.length) {
        const under = p.y - (g.y + g.h);
        if (under > -2 && under < UNDER_GPU && p.x > g.x - 30 && p.x < g.x + g.w + GPU_REACH * 0.5) {
          if (p.gpuFan < 0) p.gpuFan = Math.floor(Math.random() * this.gpuFanXs.length);
          const pull = 1 - Math.max(0, under) / UNDER_GPU;
          const targetX = this.gpuFanXs[p.gpuFan];
          p.vx += ((targetX - p.x) * 2.4 - p.vx) * 0.12 * pull;
          p.vy += (-speed * 0.9 - p.vy) * 0.12 * pull;
        } else if (under >= UNDER_GPU || under < -g.h) {
          p.gpuFan = -1;
        }
      }

      let nx = p.x + p.vx * dt;
      let ny = p.y + p.vy * dt;

      // Reaching the underside of the GPU right at a fan: the fan takes the air in.
      if (g && p.y >= g.y + g.h - 1 && ny < g.y + g.h && nx > g.x && nx < g.x + g.w) {
        // A particle that already picked a fan is only taken in by that fan,
        // so the air spreads over the whole card instead of the first fan it meets.
        const fanIndex =
          p.gpuFan >= 0
            ? Math.abs(nx - this.gpuFanXs[p.gpuFan]) < this.gpuFanHalf
              ? p.gpuFan
              : -1
            : this.gpuFanXs.findIndex((x) => Math.abs(nx - x) < this.gpuFanHalf);
        if (fanIndex >= 0) {
          const spread = (Math.random() - 0.5) * this.gpuSegment * 1.5;
          p.x = nx;
          p.y = g.y + g.h - 1;
          p.gpuExit = { x: clamp(this.gpuFanXs[fanIndex] + spread, g.x + 8, g.x + g.w - 8), y: g.y + 3 };
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
        // Particles that keep scraping along a part fade sooner (but not air
        // under the GPU on its way to a fan).
        if (p.gpuFan < 0) p.age += dt * 3;
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
   * which leaves soft trails behind every particle. Each particle is drawn twice:
   * a wide faint stroke (soft glow) and a thin brighter core.
   */
  draw(ctx: CanvasRenderingContext2D, scale: number, originX: number, originY: number) {
    const { width, height } = ctx.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.13)";
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "source-over";
    ctx.setTransform(scale, 0, 0, scale, originX, originY);
    ctx.lineCap = "round";

    const { intake, exhaust } = this.colors;
    for (const p of this.particles) {
      if (p.x === p.px && p.y === p.py) continue;
      // Cool air has the intake color, hot air the exhaust color. Heat comes mostly
      // from the GPU and CPU cooler, plus a little from time spent in the case.
      const heat = Math.min(1, p.heat + (0.3 * p.age) / p.life);
      const r = Math.round(intake[0] + (exhaust[0] - intake[0]) * heat);
      const g = Math.round(intake[1] + (exhaust[1] - intake[1]) * heat);
      const b = Math.round(intake[2] + (exhaust[2] - intake[2]) * heat);
      const alpha = Math.min(1, p.age / 0.35) * Math.min(1, (p.life - p.age) / 0.7);

      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.12})`;
      ctx.stroke();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.7})`;
      ctx.stroke();
    }
  }

  clear(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // ---------- Particles ----------

  private spawn(dt: number, speed: number) {
    if (this.emitters.length === 0) return;
    const avgLife = 4.8;
    this.spawnBudget += (this.maxParticles / avgLife) * dt;

    while (this.spawnBudget >= 1) {
      this.spawnBudget -= 1;
      if (this.particles.length >= this.maxParticles) {
        this.spawnBudget = 0;
        break;
      }

      const e = this.pickEmitter();
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
        seed: Math.random() * Math.PI * 2,
        outside: e.outside,
        heat: e.heat,
        gpuFan: -1,
        gpuExit: null,
      });
    }
  }

  /** Faster intake fans bring in more air, so they are picked more often. */
  private pickEmitter(): Emitter {
    const total = this.emitters.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * total;
    for (const e of this.emitters) {
      r -= e.weight;
      if (r <= 0) return e;
    }
    return this.emitters[this.emitters.length - 1];
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

  /** Air direction at a point, blended from the four nearest grid cells (smooth paths). */
  private sample(x: number, y: number): [number, number] {
    const gx = clamp(x / CELL - 0.5, 0, this.cols - 1);
    const gy = clamp(y / CELL - 0.5, 0, this.rows - 1);
    const c0 = Math.floor(gx);
    const r0 = Math.floor(gy);
    const c1 = Math.min(c0 + 1, this.cols - 1);
    const r1 = Math.min(r0 + 1, this.rows - 1);
    const tx = gx - c0;
    const ty = gy - r0;
    const f = this.field;
    const i00 = (r0 * this.cols + c0) * 2;
    const i10 = (r0 * this.cols + c1) * 2;
    const i01 = (r1 * this.cols + c0) * 2;
    const i11 = (r1 * this.cols + c1) * 2;
    const vx = (f[i00] * (1 - tx) + f[i10] * tx) * (1 - ty) + (f[i01] * (1 - tx) + f[i11] * tx) * ty;
    const vy = (f[i00 + 1] * (1 - tx) + f[i10 + 1] * tx) * (1 - ty) + (f[i01 + 1] * (1 - tx) + f[i11 + 1] * tx) * ty;
    return [vx, vy];
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
          // Fan speed (RPM) scales how hard this fan pushes or pulls.
          const sign = (fan.direction === "intake" ? 1 : -1) * fanStrength(fan);
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
            const reach = (fan.direction === "intake" ? 230 : 170) * (0.6 + 0.4 * fanStrength(fan));
            const jet = Math.exp(-along / reach) * Math.exp(-((lateral / 75) ** 2));
            vx += sign * dx * jet;
            vy += sign * dy * jet;
          }
          // Weak source/sink so air also spreads toward or gathers at the fan.
          const k = fan.direction === "intake" ? 20 : 45;
          vx += (sign * k * rx) / r2;
          vy += (sign * k * ry) / r2;
        }

        if (gpuRect) {
          // Below the card the air rises toward it and drifts along its length
          // (toward the bracket), so it reaches every fan, not just the nearest one.
          const under = y - (gpuRect.y + gpuRect.h);
          const end = gpuRect.x + gpuRect.w;
          if (under > 0 && under < UNDER_GPU && x > gpuRect.x - 20 && x < end + 20) {
            const k = 1 - under / UNDER_GPU;
            vy -= 0.8 * k;
            vx -= 0.35 * k;
          }
          // In front of the card's end, the fans also draw air in sideways.
          if (under > -20 && under < UNDER_GPU && x >= end + 20 && x < end + GPU_REACH) {
            const k = (1 - (x - end) / GPU_REACH) * (1 - Math.max(0, under) / UNDER_GPU);
            vx -= 1.0 * k;
            vy += under < 10 ? 0.4 * k : 0; // dip under the card's edge instead of hitting it
          }
          // Air arriving at the card's end splits: the lower half dips under the
          // card (where the fans take it), the upper half goes over it.
          const ahead = x - end;
          if (ahead > 0 && ahead < 60 && y > gpuRect.y - 15 && y < gpuRect.y + gpuRect.h + 15) {
            const k = 1 - ahead / 60;
            vy += (y > gpuRect.y + gpuRect.h * 0.35 ? 1.4 : -1.4) * k;
          }
          // Hot air rises off the top of the card.
          const above = gpuRect.y - y;
          if (above > 0 && above < 70 && x > gpuRect.x && x < gpuRect.x + gpuRect.w) vy -= 1.0 * (1 - above / 70);
        }

        // Air turns away just before it reaches the top of the shroud.
        const sh = this.shroud;
        if (sh && x > sh.x && x < sh.x + sh.w && !(sh.vent && x > sh.vent.from && x < sh.vent.to)) {
          const gap = shroudTopAt(sh, x) - y;
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
        const target = clamp(mag, 0.22, 1.5);
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
