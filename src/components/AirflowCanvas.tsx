import { useEffect, useRef } from "react";
import { AirflowEngine, type FlowScene } from "../lib/airflow";
import { VIEW_PAD } from "../lib/layout";

interface Props {
  scene: FlowScene;
  playing: boolean;
  fanSpeed: number;
  /** Changing this number clears all particles and starts over. */
  restartKey: number;
}

/**
 * Transparent canvas laid exactly over the case drawing. It ignores the mouse,
 * so the fans underneath stay clickable.
 */
export function AirflowCanvas({ scene, playing, fanSpeed, restartKey }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new AirflowEngine());

  // Rebuild the air directions whenever the configuration changes.
  useEffect(() => {
    engineRef.current.setScene(scene);
  }, [scene]);

  useEffect(() => {
    engineRef.current.fanSpeed = fanSpeed;
  }, [fanSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    engineRef.current.reset();
    engineRef.current.clear(canvas.getContext("2d")!);
  }, [restartKey]);

  // Keep the canvas pixel size in sync with its on-screen size.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Animation loop. Runs only while playing and while the window is visible.
  useEffect(() => {
    if (!playing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const engine = engineRef.current;
    let frame = 0;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Same math as the SVG's viewBox with preserveAspectRatio="xMidYMid meet".
      const { depth, height } = scene.caseProfile.dimensionsMm;
      const vbW = depth + VIEW_PAD * 2;
      const vbH = height + VIEW_PAD * 2;
      const scale = Math.min(canvas.width / vbW, canvas.height / vbH);
      const originX = (canvas.width - vbW * scale) / 2 + VIEW_PAD * scale;
      const originY = (canvas.height - vbH * scale) / 2 + VIEW_PAD * scale;

      engine.step(dt);
      engine.draw(ctx, scale, originX, originY);
      frame = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(frame);
      else start();
    }

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playing, scene]);

  return <canvas ref={canvasRef} className="airflow-canvas" aria-hidden="true" />;
}
