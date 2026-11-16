import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildCaseModel, disposeModel, type Scene3DInput } from "../lib/scene3d";
import { useT } from "../lib/i18n";
import { Toggle } from "./Controls";

interface Props extends Scene3DInput {
  /** False while another screen is shown: stops drawing. */
  active: boolean;
}

interface View {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group | null;
}

/** Rotatable 3D model of the case. No airflow particles here. */
export default function Case3D(props: Props) {
  const t = useT();
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  const [failed, setFailed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const { caseProfile, slots, fans, gpu, cooler, looks, build, colors, active } = props;
  const size = Math.max(caseProfile.dimensionsMm.depth, caseProfile.dimensionsMm.height, caseProfile.dimensionsMm.width);

  function resetCamera(v: View) {
    v.camera.position.set(size * 1.45, size * 0.55, size * 1.95);
    v.controls.target.set(0, 0, 0);
    v.controls.update();
  }

  // Renderer, camera and lights: once.
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#ffffff", "#30323a", 1.1));
    const key = new THREE.DirectionalLight("#ffffff", 1.8);
    key.position.set(600, 900, 900);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#bcd4ff", 0.8);
    fill.position.set(-800, 200, -400);
    scene.add(fill);
    // Soft light inside the case, so the parts behind solid panels stay visible.
    scene.add(new THREE.PointLight("#fff4e8", 1.2, 0, 0));

    const camera = new THREE.PerspectiveCamera(32, 1, 10, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = size * 0.9;
    controls.maxDistance = size * 4;
    controls.autoRotateSpeed = 1.2;

    const v: View = { renderer, scene, camera, controls, model: null };
    view.current = v;
    resetCamera(v);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    return () => {
      observer.disconnect();
      controls.dispose();
      if (v.model) disposeModel(v.model);
      renderer.dispose();
      renderer.domElement.remove();
      view.current = null;
    };
    // The case can't change while this view is mounted (the simulator remounts).
  }, []);

  // Rebuild the model when the setup or the colors change.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    if (v.model) {
      v.scene.remove(v.model);
      disposeModel(v.model);
    }
    v.model = buildCaseModel({ caseProfile, slots, fans, gpu, cooler, looks, build, colors });
    v.scene.add(v.model);
  }, [caseProfile, slots, fans, gpu, cooler, looks, build, colors]);

  useEffect(() => {
    if (view.current) view.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  // Draw only while visible.
  useEffect(() => {
    const v = view.current;
    if (!v || !active) return;
    let frame = 0;
    const loop = () => {
      v.controls.update();
      v.renderer.render(v.scene, v.camera);
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (failed) return <p className="view-msg muted">{t("view3dError")}</p>;

  return (
    <div className="view3d" ref={host}>
      <div className="view3d-controls">
        <span className="muted">{t("autoRotate")}</span>
        <Toggle value={autoRotate} onChange={setAutoRotate} />
        <button type="button" className="btn small" onClick={() => view.current && resetCamera(view.current)}>
          {t("resetView")}
        </button>
      </div>
    </div>
  );
}
