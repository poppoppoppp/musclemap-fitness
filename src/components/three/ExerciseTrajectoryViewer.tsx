import { useEffect, useRef } from 'react';
import { getMuscleById } from '../../data/muscles';
import type { ExerciseTrajectory } from '../../data/exerciseTrajectories';

type ExerciseTrajectoryViewerProps = {
  trajectory: ExerciseTrajectory;
};

export default function ExerciseTrajectoryViewer({ trajectory }: ExerciseTrajectoryViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDisposed = false;
    let cleanupScene: (() => void) | undefined;

    const initScene = async () => {
      const THREE = await import('three');
      if (isDisposed) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(1.9, 1.4, 3.2);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 1.1));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(2, 3, 4);
      scene.add(keyLight);

      const points = trajectory.points.map((point) => new THREE.Vector3(point.x, point.y, point.z));
      const path = new THREE.CatmullRomCurve3(points);
      const pathGeometry = new THREE.TubeGeometry(path, 32, 0.026, 12, false);
      const pathMaterial = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x083344,
        roughness: 0.35
      });
      scene.add(new THREE.Mesh(pathGeometry, pathMaterial));

      points.forEach((point, index) => {
        const isStart = index === 0;
        const isEnd = index === points.length - 1;
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(isStart || isEnd ? 0.075 : 0.045, 24, 16),
          new THREE.MeshStandardMaterial({
            color: isStart ? 0x38bdf8 : isEnd ? 0xa3e635 : 0xfacc15,
            emissive: isStart || isEnd ? 0x083344 : 0x422006,
            roughness: 0.45
          })
        );
        marker.position.copy(point);
        scene.add(marker);
      });

      const start = points[points.length - 2];
      const end = points[points.length - 1];
      const direction = start && end ? new THREE.Vector3().subVectors(end, start) : null;
      if (direction && direction.lengthSq() > 0) {
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.22, 24),
          new THREE.MeshStandardMaterial({ color: 0xa3e635, roughness: 0.4 })
        );
        arrow.position.copy(end);
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        scene.add(arrow);
      }

      scene.add(createBodyReference(THREE));

      const grid = new THREE.GridHelper(2.2, 4, 0x334155, 0x1e293b);
      grid.position.y = -0.8;
      scene.add(grid);

      const resize = () => {
        const width = Math.max(240, canvas.clientWidth);
        const height = Math.max(220, canvas.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      cleanupScene = () => {
        observer.disconnect();
        pathGeometry.dispose();
        pathMaterial.dispose();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const material = object.material;
            if (Array.isArray(material)) {
              material.forEach((item) => item.dispose());
            } else {
              material.dispose();
            }
          }
        });
        renderer.dispose();
      };

      if (isDisposed) cleanupScene();
    };

    void initScene();

    return () => {
      isDisposed = true;
      cleanupScene?.();
    };
  }, [trajectory]);

  const startLabel = trajectory.points[0]?.label ?? '起点';
  const endLabel = trajectory.points[trajectory.points.length - 1]?.label ?? '终点';

  return (
    <div data-testid="exercise-trajectory-module" className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">3D 动作轨迹</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{trajectory.label}</h2>
        {trajectory.viewHint ? <p className="mt-2 text-sm leading-6 text-slate-300">{trajectory.viewHint}</p> : null}
      </div>

      <div className="relative overflow-hidden rounded-md border border-slate-700 bg-slate-950/80">
        <canvas ref={canvasRef} data-testid="exercise-trajectory-path" className="block h-64 w-full" aria-label={`${trajectory.label} 3D 轨迹`} />
        <div
          data-testid="exercise-trajectory-reference"
          className="pointer-events-none absolute left-3 top-3 rounded-md border border-slate-600 bg-slate-950/80 px-2 py-1 text-xs text-slate-200"
        >
          身体参照：灰色躯干 / 肩线
        </div>
        <div
          data-testid="exercise-trajectory-direction-label"
          className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-cyan-400 px-2 py-1 text-xs font-semibold text-slate-950"
        >
          {trajectory.directionLabel}
        </div>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <InfoItem title="起点" value={startLabel} />
        <InfoItem title="终点" value={endLabel} />
        <InfoItem title="方向" value={trajectory.directionLabel} />
      </dl>

      <div className="space-y-3">
        <TagGroup title="目标肌群" ids={trajectory.targetMuscleIds} />
        <TagGroup title="协同肌群" ids={trajectory.secondaryMuscleIds ?? []} emptyText="暂无协同肌群配置" />
      </div>

      {trajectory.cues?.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-300">
          {trajectory.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
      ) : null}

      <p className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm leading-6 text-amber-100">
        当前为简化动作轨迹，不代表完整动作动画。
      </p>
    </div>
  );
}

function createBodyReference(THREE: typeof import('three')) {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.72, 8, 18),
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.32,
      roughness: 0.6
    })
  );
  torso.position.set(0, -0.18, 0.34);
  group.add(torso);

  const shoulderBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.045, 0.045),
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.55
    })
  );
  shoulderBar.position.set(0, 0.22, 0.34);
  group.add(shoulderBar);

  const topHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.035, 0.035),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 })
  );
  topHandle.position.set(0, 0.83, -0.2);
  group.add(topHandle);

  return group;
}

function InfoItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-950 px-3 py-2">
      <dt className="font-semibold text-white">{title}</dt>
      <dd className="mt-1 text-slate-300">{value}</dd>
    </div>
  );
}

function TagGroup({ title, ids, emptyText }: { title: string; ids: string[]; emptyText?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {ids.length ? (
          ids.map((id) => (
            <span key={id} className="rounded-md bg-slate-950 px-2 py-1 text-sm text-slate-300">
              {getMuscleById(id)?.nameZh ?? id}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">{emptyText}</span>
        )}
      </div>
    </div>
  );
}
