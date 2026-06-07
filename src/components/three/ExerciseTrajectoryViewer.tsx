import { useEffect, useMemo, useRef, useState } from 'react';
import { getMuscleById } from '../../data/muscles';
import type { ExerciseTrajectory } from '../../data/exerciseTrajectories';

type ExerciseTrajectoryViewerProps = {
  trajectory: ExerciseTrajectory;
};

type PlaybackState = 'idle' | 'playing' | 'paused' | 'finished';

const DEFAULT_PLAYBACK_DURATION_MS = 2000;

export default function ExerciseTrajectoryViewer({ trajectory }: ExerciseTrajectoryViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(0);
  const playbackStartRef = useRef(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const durationMs = trajectory.durationMs ?? DEFAULT_PLAYBACK_DURATION_MS;
  const phaseLabels = useMemo(() => getPhaseLabels(trajectory), [trajectory]);

  useEffect(() => {
    progressRef.current = playbackProgress;
  }, [playbackProgress]);

  useEffect(() => {
    setPlaybackState('idle');
    setPlaybackProgress(0);
    progressRef.current = 0;
  }, [trajectory.exerciseId]);

  useEffect(() => {
    if (playbackState !== 'playing') return;

    let animationFrameId = 0;
    const tick = (now: number) => {
      const nextProgress = Math.min((now - playbackStartRef.current) / durationMs, 1);
      progressRef.current = nextProgress;
      setPlaybackProgress(nextProgress);

      if (nextProgress >= 1) {
        setPlaybackState('finished');
        return;
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [durationMs, playbackState]);

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
      renderer.setClearColor(0x020617, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1.65, 1.65, 1.25, -1.25, 0.1, 100);
      camera.position.set(0, 0.04, 5);
      camera.lookAt(0, 0.04, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
      keyLight.position.set(2, 2.5, 4);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x67e8f9, 0.7);
      fillLight.position.set(-2, 1, 2);
      scene.add(fillLight);

      const points = trajectory.points.map((point) => new THREE.Vector3(point.x, point.y, point.z));
      const path = new THREE.CatmullRomCurve3(points);
      const pathGeometry = new THREE.TubeGeometry(path, 48, 0.026, 14, false);
      const pathMaterial = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x083344,
        roughness: 0.35
      });
      scene.add(new THREE.Mesh(pathGeometry, pathMaterial));

      const actionReference = createActionReference(THREE, trajectory.exerciseId);
      scene.add(actionReference);

      const animatedMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 32, 20),
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0x7c2d12,
          roughness: 0.25
        })
      );
      animatedMarker.position.copy(path.getPointAt(progressRef.current));
      scene.add(animatedMarker);

      const markerHalo = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 32, 20),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.22
        })
      );
      markerHalo.position.copy(animatedMarker.position);
      scene.add(markerHalo);

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

      const resize = () => {
        const width = Math.max(300, canvas.clientWidth);
        const height = Math.max(420, canvas.clientHeight);
        renderer.setSize(width, height, false);
        const aspect = width / height;
        camera.left = -1.35 * aspect;
        camera.right = 1.35 * aspect;
        camera.top = 1.35;
        camera.bottom = -1.35;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      let sceneFrameId = 0;
      let lastRenderedProgress = Number.NaN;
      const renderScene = () => {
        const currentProgress = Math.min(Math.max(progressRef.current, 0), 1);
        if (currentProgress !== lastRenderedProgress) {
          const currentPoint = path.getPointAt(currentProgress);
          animatedMarker.position.copy(currentPoint);
          markerHalo.position.copy(currentPoint);
          renderer.render(scene, camera);
          lastRenderedProgress = currentProgress;
        }
        sceneFrameId = requestAnimationFrame(renderScene);
      };
      renderScene();

      cleanupScene = () => {
        cancelAnimationFrame(sceneFrameId);
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
  const currentPhase = getCurrentPhaseLabel(playbackProgress, phaseLabels);
  const playbackButtonLabel = playbackState === 'playing' ? '暂停' : playbackState === 'finished' ? '重新播放' : '播放轨迹';

  const handlePlaybackClick = () => {
    if (playbackState === 'playing') {
      setPlaybackState('paused');
      return;
    }

    const nextProgress = playbackState === 'finished' ? 0 : playbackProgress;
    progressRef.current = nextProgress;
    setPlaybackProgress(nextProgress);
    playbackStartRef.current = performance.now() - nextProgress * durationMs;
    setPlaybackState('playing');
  };

  return (
    <div data-testid="exercise-trajectory-module" data-playback-progress={playbackProgress.toFixed(2)} className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">3D 动作轨迹</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{trajectory.label}</h2>
        {trajectory.viewHint ? <p className="mt-2 text-sm leading-6 text-slate-300">{trajectory.viewHint}</p> : null}
      </div>

      <div className="relative overflow-hidden rounded-md border border-slate-700 bg-slate-950/80">
        <canvas ref={canvasRef} data-testid="exercise-trajectory-path" className="block h-[420px] w-full sm:h-[460px]" aria-label={`${trajectory.label} 3D 动作示意`} />
        <div
          data-testid="exercise-trajectory-direction-label"
          className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-cyan-400 px-2 py-1 text-xs font-semibold text-slate-950"
        >
          {trajectory.directionLabel}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
        <button
          type="button"
          data-testid="exercise-trajectory-playback-button"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 sm:w-fit"
          onClick={handlePlaybackClick}
        >
          {playbackButtonLabel}
        </button>
        <div className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
          <p className="font-semibold text-white">
            当前阶段：
            <span data-testid="exercise-trajectory-current-phase" className="text-cyan-100">
              {currentPhase}
            </span>
          </p>
          <p className="mt-1 text-slate-300">marker 沿起点、中间点、终点移动，用于展示动作方向。</p>
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

function getPhaseLabels(trajectory: ExerciseTrajectory) {
  if (trajectory.phaseLabels?.length) return trajectory.phaseLabels;

  const startLabel = trajectory.points[0]?.label ?? '起始位置';
  const endLabel = trajectory.points[trajectory.points.length - 1]?.label ?? '结束位置';
  return [`起始位置：${startLabel}`, '发力阶段', `结束位置：${endLabel}`];
}

function getCurrentPhaseLabel(progress: number, labels: string[]) {
  if (progress <= 0.02) return labels[0] ?? '起始位置';
  if (progress >= 0.98) return labels[2] ?? labels[labels.length - 1] ?? '结束位置';
  return labels[1] ?? '发力阶段';
}

function createActionReference(THREE: typeof import('three'), exerciseId: string) {
  if (exerciseId === 'lat-pulldown') return createLatPulldownAction(THREE);
  return createGenericActionReference(THREE);
}

function createLatPulldownAction(THREE: typeof import('three')) {
  const group = new THREE.Group();

  const ghostMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.28,
    roughness: 0.45
  });
  const activeMaterial = new THREE.MeshStandardMaterial({
    color: 0xa3e635,
    emissive: 0x1a2e05,
    roughness: 0.4
  });
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.56,
    roughness: 0.55
  });
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 });

  const startPose = createLatPulldownPose(THREE, -0.72, ghostMaterial, bodyMaterial, handleMaterial, 'start');
  const endPose = createLatPulldownPose(THREE, 0.72, activeMaterial, bodyMaterial, handleMaterial, 'end');
  group.add(startPose);
  group.add(endPose);

  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 2.2, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x334155, transparent: true, opacity: 0.8, roughness: 0.5 })
  );
  divider.position.set(0, 0, -0.15);
  group.add(divider);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x083344, roughness: 0.35 })
  );
  arrow.position.set(0, -0.06, 0.02);
  arrow.rotation.x = Math.PI;
  group.add(arrow);

  const arrowShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.48, 16),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x083344, roughness: 0.35 })
  );
  arrowShaft.position.set(0, 0.18, 0.02);
  group.add(arrowShaft);

  return group;
}

function createLatPulldownPose(
  THREE: typeof import('three'),
  xOffset: number,
  armMaterial: import('three').Material,
  bodyMaterial: import('three').Material,
  handleMaterial: import('three').Material,
  pose: 'start' | 'end'
) {
  const group = new THREE.Group();
  const z = 0.2;

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.18), bodyMaterial);
  pelvis.position.set(xOffset, -0.62, z);
  group.add(pelvis);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.76, 10, 22), bodyMaterial);
  torso.position.set(xOffset, -0.2, z);
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), bodyMaterial);
  head.position.set(xOffset, 0.52, z);
  group.add(head);

  const shoulderBar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.055, 0.055), bodyMaterial);
  shoulderBar.position.set(xOffset, 0.18, z);
  group.add(shoulderBar);

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.06, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 })
  );
  seat.position.set(xOffset, -0.82, z);
  group.add(seat);

  const topHandle = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.05, 0.055), pose === 'start' ? armMaterial : handleMaterial);
  topHandle.position.set(xOffset, 0.9, z);
  group.add(topHandle);

  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.86, 10), handleMaterial);
  cable.position.set(xOffset, 0.48, z);
  group.add(cable);

  if (pose === 'start') {
    addArmPose(THREE, group, [xOffset - 0.28, 0.18, z], [xOffset - 0.36, 0.55, z], [xOffset - 0.34, 0.88, z], armMaterial);
    addArmPose(THREE, group, [xOffset + 0.28, 0.18, z], [xOffset + 0.36, 0.55, z], [xOffset + 0.34, 0.88, z], armMaterial);
  } else {
    addArmPose(THREE, group, [xOffset - 0.28, 0.18, z], [xOffset - 0.44, -0.02, z], [xOffset - 0.28, -0.13, z], armMaterial);
    addArmPose(THREE, group, [xOffset + 0.28, 0.18, z], [xOffset + 0.44, -0.02, z], [xOffset + 0.28, -0.13, z], armMaterial);
    const endHandle = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.055, 0.055), armMaterial);
    endHandle.position.set(xOffset, -0.13, z);
    group.add(endHandle);
  }

  return group;
}

function createGenericActionReference(THREE: typeof import('three')) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.5,
    roughness: 0.55
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.8, 10, 18), material);
  torso.position.set(0, -0.18, 0.28);
  group.add(torso);

  const shoulderBar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.055, 0.055), material);
  shoulderBar.position.set(0, 0.2, 0.28);
  group.add(shoulderBar);

  return group;
}

function addArmPose(
  THREE: typeof import('three'),
  group: import('three').Group,
  shoulder: [number, number, number],
  elbow: [number, number, number],
  hand: [number, number, number],
  material: import('three').Material
) {
  addLimb(THREE, group, shoulder, elbow, material);
  addLimb(THREE, group, elbow, hand, material);
  const jointMaterial = material;
  for (const point of [shoulder, elbow, hand]) {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 12), jointMaterial);
    joint.position.set(point[0], point[1], point[2]);
    group.add(joint);
  }
}

function addLimb(
  THREE: typeof import('three'),
  group: import('three').Group,
  start: [number, number, number],
  end: [number, number, number],
  material: import('three').Material
) {
  const startVector = new THREE.Vector3(start[0], start[1], start[2]);
  const endVector = new THREE.Vector3(end[0], end[1], end[2]);
  const direction = new THREE.Vector3().subVectors(endVector, startVector);
  const length = direction.length();
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, length, 16), material);
  limb.position.copy(startVector).add(endVector).multiplyScalar(0.5);
  limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(limb);
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
