import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import PageHeader from '../components/layout/PageHeader';
import { exercises } from '../data/exercises';
import { getMuscleById } from '../data/muscles';
import { threeModelRegions, type ThreeModelRegion } from '../data/threeModelRegions';
import { useAppStore } from '../store/useAppStore';
import type { Exercise } from '../types/exercise';
import {
  addExerciseToExistingActiveWorkout,
  readActiveWorkout,
  startWorkoutWithExercise
} from '../utils/activeWorkout';

type PageMode = 'demo' | 'selector';

type RegionMeshInfo = {
  name: string;
  mesh: THREE.Mesh;
};

type RelatedExercise = {
  exercise: Exercise;
  matchType: 'primary' | 'secondary';
};

type MuscleOption = {
  muscleId: string;
  meshNames: string[];
};

const DEFAULT_REGION_ID = 'back-partial';
const UNSELECTED_MESH_LABEL = '未选择';
const UNMAPPED_LABEL = '未映射';
const UPPER_BODY_LOCAL_MODEL_PATH = '/models/private/upper-body-local.glb';
const UPPER_BODY_LOCAL_MODEL_PUBLIC_PATH = 'public/models/private/upper-body-local.glb';
const MAX_RELATED_EXERCISES = 6;
const SIMPLIFIED_LATISSIMUS_TARGETS = [
  'Simplified_left_latissimus_dorsi',
  'Simplified_right_latissimus_dorsi'
] as const;
const upperBodyLocalMeshMappings: Record<string, string> = {};

export default function ThreeMuscleDemo() {
  return <ThreeMuscleExperience mode="demo" />;
}

export function ThreeMuscleExperience({ mode }: { mode: PageMode }) {
  const [selectedRegionId, setSelectedRegionId] = useState(DEFAULT_REGION_ID);
  const selectedRegion = useMemo(
    () => threeModelRegions.find((region) => region.id === selectedRegionId) ?? threeModelRegions[0],
    [selectedRegionId]
  );
  const isSelector = mode === 'selector';

  return (
    <div className="space-y-4 overflow-x-hidden">
      <PageHeader
        title={isSelector ? '3D 肌群选择' : '3D 肌群模型技术预研'}
        description={
          isSelector
            ? '选择想练的身体部位，点击 3D 模型中的肌群，查看肌群说明和相关动作。'
            : '该页面为实验 Demo，不影响正式肌群地图。当前模型区域由本地注册表管理，用于验证 GLB 加载、mesh 点击、高亮和映射。'
        }
      />

      {isSelector ? (
        <section className="rounded-lg border border-line bg-panel p-4">
          <h2 className="text-base font-semibold text-white">选择训练部位</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            先选择身体区域，再在模型里点选想练的肌群。当前版本只覆盖部分背部局部肌群，不代表完整全身 3D 人体已经完成。
          </p>
          <RegionSelector selectedRegion={selectedRegion} onSelect={setSelectedRegionId} mode={mode} />
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">模型区域</h2>
          <RegionSelector selectedRegion={selectedRegion} onSelect={setSelectedRegionId} mode={mode} />
        </section>
      )}

      <RegionModelExperience key={`${mode}-${selectedRegion.id}`} region={selectedRegion} mode={mode} />
      {!isSelector && <UpperBodyLocalSandbox />}
    </div>
  );
}

function RegionSelector({
  selectedRegion,
  onSelect,
  mode
}: {
  selectedRegion: ThreeModelRegion;
  onSelect: (regionId: string) => void;
  mode: PageMode;
}) {
  const isSelector = mode === 'selector';

  return (
    <div data-testid="three-region-selector" className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {threeModelRegions.map((region) => {
        const label = isSelector ? getSelectorRegionLabel(region) : region.label;
        const meta = isSelector ? getSelectorRegionMeta(region) : region.isConfigured ? region.id : `${region.id} 路线未配置`;
        const selected = selectedRegion.id === region.id;
        const selectedClasses = isSelector
          ? 'border-cyan-400 bg-cyan-400/10 text-white'
          : 'border-amber-500 bg-amber-50 text-amber-950';
        const idleClasses = isSelector
          ? 'border-line bg-slate-900/70 text-slate-200 hover:border-cyan-500/70'
          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300';

        return (
          <button
            key={region.id}
            type="button"
            data-testid={`select-three-region-${region.id}`}
            onClick={() => onSelect(region.id)}
            className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition ${
              selected ? selectedClasses : idleClasses
            }`}
          >
            <span className="block">{label}</span>
            <span className={`mt-1 block text-xs font-normal ${isSelector ? 'text-slate-400' : 'text-slate-500'}`}>
              {meta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function UpperBodyLocalSandbox() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const meshesRef = useRef<RegionMeshInfo[]>([]);
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);
  const [loadStatus, setLoadStatus] = useState('检测本地模型');
  const [modelAvailable, setModelAvailable] = useState(false);
  const [meshCount, setMeshCount] = useState(0);
  const [selectedMeshName, setSelectedMeshName] = useState(UNSELECTED_MESH_LABEL);

  const selectedMuscleId =
    selectedMeshName === UNSELECTED_MESH_LABEL ? undefined : upperBodyLocalMeshMappings[selectedMeshName];

  const resetMeshHighlight = (mesh: THREE.Mesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.set(0x000000);
      } else if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshLambertMaterial) {
        const baseColor = material.userData.baseColor as number | undefined;
        if (baseColor !== undefined) {
          material.color.set(baseColor);
        }
      }
    });
  };

  const highlightMesh = (meshInfo: RegionMeshInfo) => {
    if (selectedMeshRef.current) {
      resetMeshHighlight(selectedMeshRef.current);
    }

    const materials = Array.isArray(meshInfo.mesh.material) ? meshInfo.mesh.material : [meshInfo.mesh.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.set(0x0f766e);
      } else if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshLambertMaterial) {
        material.color.set(0x14b8a6);
      }
    });

    selectedMeshRef.current = meshInfo.mesh;
    setSelectedMeshName(meshInfo.name);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    setSelectedMeshName(UNSELECTED_MESH_LABEL);
    setMeshCount(0);
    setModelAvailable(false);
    meshesRef.current = [];
    selectedMeshRef.current = null;

    let disposed = false;
    let animationFrame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let scene: THREE.Scene | null = null;
    let removeListeners: (() => void) | undefined;

    const disposeScene = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      removeListeners?.();
      controls?.dispose();
      scene?.traverse((object) => {
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
      renderer?.dispose();
      renderer?.domElement.remove();
      meshesRef.current = [];
      selectedMeshRef.current = null;
    };

    const loadLocalModel = async () => {
      setLoadStatus('检测本地模型');

      try {
        const response = await fetch(UPPER_BODY_LOCAL_MODEL_PATH, { method: 'HEAD' });
        const contentType = response.headers.get('content-type') ?? '';
        if (!response.ok || contentType.includes('text/html')) {
          if (!disposed) {
            setLoadStatus('未检测到模型文件');
          }
          return;
        }
      } catch {
        if (!disposed) {
          setLoadStatus('未检测到模型文件');
        }
        return;
      }

      if (disposed) {
        return;
      }

      setModelAvailable(true);
      setLoadStatus('加载中');

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8fafc);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(0, 0.25, 4.2);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 0.5;
      controls.maxDistance = 12;
      controls.target.set(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 1.35));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
      keyLight.position.set(2, 3, 4);
      scene.add(keyLight);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      const updateSize = () => {
        if (!renderer) {
          return;
        }

        const { clientWidth, clientHeight } = mount;
        const width = Math.max(clientWidth, 1);
        const height = Math.max(clientHeight, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (!renderer) {
          return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const intersections = raycaster.intersectObjects(
          meshesRef.current.map((meshInfo) => meshInfo.mesh),
          false
        );
        const selectedMesh = intersections[0]?.object;
        const meshInfo = meshesRef.current.find((candidate) => candidate.mesh === selectedMesh);
        if (meshInfo) {
          highlightMesh(meshInfo);
        }
      };

      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('resize', updateSize);
      removeListeners = () => {
        renderer?.domElement.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('resize', updateSize);
      };

      const loader = new GLTFLoader();
      loader.load(
        UPPER_BODY_LOCAL_MODEL_PATH,
        (gltf) => {
          if (disposed || !scene) {
            return;
          }

          const loadedMeshes: RegionMeshInfo[] = [];
          gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              const meshName = object.name || `upper-body-local-mesh-${loadedMeshes.length + 1}`;
              object.name = meshName;
              if (Array.isArray(object.material)) {
                object.material = object.material.map((material) => material.clone());
              } else {
                object.material = object.material.clone();
              }

              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => {
                if (
                  material instanceof THREE.MeshBasicMaterial ||
                  material instanceof THREE.MeshLambertMaterial ||
                  material instanceof THREE.MeshStandardMaterial
                ) {
                  material.userData.baseColor = material.color.getHex();
                }
              });

              loadedMeshes.push({ name: meshName, mesh: object });
            }
          });

          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxAxis = Math.max(size.x, size.y, size.z, 1);
          const modelScale = 2.4 / maxAxis;
          gltf.scene.scale.setScalar(modelScale);
          gltf.scene.position.set(-center.x * modelScale, -center.y * modelScale, -center.z * modelScale);

          scene.add(gltf.scene);
          meshesRef.current = loadedMeshes;
          setMeshCount(loadedMeshes.length);
          setLoadStatus('加载成功');
          updateSize();
          window.requestAnimationFrame(updateSize);
        },
        undefined,
        () => {
          if (!disposed) {
            setLoadStatus('加载失败');
            setModelAvailable(false);
          }
        }
      );

      updateSize();

      const animate = () => {
        if (renderer && scene) {
          controls?.update();
          renderer.render(scene, camera);
        }
        animationFrame = window.requestAnimationFrame(animate);
      };
      animate();
    };

    void loadLocalModel();

    return () => {
      disposed = true;
      disposeScene();
    };
  }, []);

  const firstMesh = meshesRef.current[0];

  return (
    <section
      data-testid="upper-body-local-sandbox"
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="min-w-0">
        <h2 data-testid="upper-body-local-title" className="text-lg font-semibold text-slate-950">
          上身真实模型实验区
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          本区域只用于本机验证真实上身 GLB 的加载、mesh 点击、mesh.name 读取和 muscleId 映射潜力，不是正式产品资源。
        </p>
        <p data-testid="upper-body-local-path" className="mt-2 break-words font-mono text-xs text-slate-600">
          {UPPER_BODY_LOCAL_MODEL_PATH}
        </p>

        {!modelAvailable && (
          <div
            data-testid="upper-body-local-fallback"
            className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
          >
            未检测到本地上身真实模型。请将实验 GLB 放入 {UPPER_BODY_LOCAL_MODEL_PUBLIC_PATH}
            。该路径被 Git 忽略，不会提交或部署。
          </div>
        )}

        <div
          ref={mountRef}
          data-testid="upper-body-local-canvas"
          className={
            modelAvailable
              ? 'mt-3 h-[320px] w-full touch-none rounded-md border border-slate-100 bg-slate-50 sm:h-[420px]'
              : 'hidden'
          }
          aria-label="上身真实模型实验画布"
        />

        {modelAvailable && (
          <button
            type="button"
            data-testid="select-upper-body-local-first-mesh"
            disabled={!firstMesh}
            onClick={() => {
              if (firstMesh) {
                highlightMesh(firstMesh);
              }
            }}
            className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            选择首个 mesh
          </button>
        )}
      </div>

      <aside className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-950">本地验证信息</h3>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">加载状态</dt>
            <dd data-testid="upper-body-local-status" className="mt-1 font-medium text-slate-950">
              {loadStatus}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">mesh 数量</dt>
            <dd data-testid="upper-body-local-mesh-count" className="mt-1 font-mono text-xs text-slate-950">
              {meshCount}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">当前 mesh.name</dt>
            <dd data-testid="upper-body-local-selected-mesh" className="mt-1 break-words font-mono text-xs text-slate-950">
              {selectedMeshName}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">muscleId</dt>
            <dd data-testid="upper-body-local-selected-muscle" className="mt-1 font-mono text-xs text-slate-950">
              {selectedMuscleId ?? UNMAPPED_LABEL}
            </dd>
          </div>
        </dl>
        <p data-testid="upper-body-local-mapping-note" className="mt-4 text-sm leading-6 text-slate-600">
          没有手工 mapping 时，点击 mesh 只显示 mesh.name，muscleId 保持未映射。当前 mapping 为空，只有读取到真实
          mesh.name 后才允许填入。
        </p>
      </aside>
    </section>
  );
}

function RegionModelExperience({ region, mode }: { region: ThreeModelRegion; mode: PageMode }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const meshesRef = useRef<RegionMeshInfo[]>([]);
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);
  const setSelectedMuscleId = useAppStore((state) => state.setSelectedMuscleId);
  const [loadStatus, setLoadStatus] = useState(region.isConfigured ? '等待加载' : '未配置');
  const [modelAvailable, setModelAvailable] = useState(false);
  const [meshCount, setMeshCount] = useState(0);
  const [selectedMeshName, setSelectedMeshName] = useState(UNSELECTED_MESH_LABEL);
  const isSelector = mode === 'selector';

  const selectedMuscleId =
    selectedMeshName === UNSELECTED_MESH_LABEL ? undefined : region.mappings[selectedMeshName];
  const selectedMuscle = selectedMuscleId ? getMuscleById(selectedMuscleId) : undefined;
  const relatedExercises = useMemo(
    () => (selectedMuscleId ? getRelatedExercises(selectedMuscleId) : []),
    [selectedMuscleId]
  );
  const hasSelectedMesh = selectedMeshName !== UNSELECTED_MESH_LABEL;
  const selectedIsSimplifiedLatissimus = isSimplifiedLatissimusTarget(selectedMeshName);
  const mappedMeshEntries = useMemo(() => Object.entries(region.mappings), [region.mappings]);
  const muscleOptions = useMemo(() => getUniqueMuscleOptions(region.mappings), [region.mappings]);

  const resetMeshHighlight = (mesh: THREE.Mesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.set(0x000000);
      } else if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshLambertMaterial) {
        const baseColor = material.userData.baseColor as number | undefined;
        if (baseColor !== undefined) {
          material.color.set(baseColor);
        }
      }
    });
  };

  const highlightMesh = (meshInfo: RegionMeshInfo) => {
    if (selectedMeshRef.current) {
      resetMeshHighlight(selectedMeshRef.current);
    }

    const materials = Array.isArray(meshInfo.mesh.material) ? meshInfo.mesh.material : [meshInfo.mesh.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.set(0x7a4a00);
      } else if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshLambertMaterial) {
        material.color.set(0xf59e0b);
      }
    });

    selectedMeshRef.current = meshInfo.mesh;
    setSelectedMeshName(meshInfo.name);
  };

  const selectMappedMeshByName = (meshName: string) => {
    const meshInfo = meshesRef.current.find((candidate) => candidate.name === meshName);
    if (meshInfo) {
      highlightMesh(meshInfo);
      return;
    }

    setSelectedMeshName(meshName);
  };

  const selectMuscleOption = (option: MuscleOption) => {
    const availableMeshName =
      option.meshNames.find((meshName) => meshesRef.current.some((candidate) => candidate.name === meshName)) ??
      option.meshNames[0];
    selectMappedMeshByName(availableMeshName);
  };

  useEffect(() => {
    setSelectedMeshName(UNSELECTED_MESH_LABEL);
    setMeshCount(0);
    setModelAvailable(false);
    meshesRef.current = [];
    selectedMeshRef.current = null;

    const mount = mountRef.current;
    if (!mount || !region.isConfigured) {
      setLoadStatus('未配置');
      return undefined;
    }

    let disposed = false;
    let animationFrame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let scene: THREE.Scene | null = null;
    let removeListeners: (() => void) | undefined;

    const disposeScene = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      removeListeners?.();
      controls?.dispose();

      scene?.traverse((object) => {
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

      renderer?.dispose();
      renderer?.domElement.remove();
      meshesRef.current = [];
      selectedMeshRef.current = null;
    };

    const loadModel = async () => {
      if (!region.modelPath && (region.id === 'front-upper' || region.id === 'legs')) {
        setModelAvailable(true);
        setLoadStatus('简化示意可用');

        scene = new THREE.Scene();
        scene.background = new THREE.Color(isSelector ? 0x0f172a : 0xf8fafc);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera.position.set(0, 0.2, 4.2);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 2.4;
        controls.maxDistance = 6;
        controls.target.set(0, 0, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 1.35));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
        keyLight.position.set(2, 3, 4);
        scene.add(keyLight);

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        const updateSize = () => {
          if (!renderer) {
            return;
          }

          const { clientWidth, clientHeight } = mount;
          const width = Math.max(clientWidth, 1);
          const height = Math.max(clientHeight, 1);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        };

        const handlePointerDown = (event: PointerEvent) => {
          if (!renderer) {
            return;
          }

          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);

          const intersections = raycaster.intersectObjects(
            meshesRef.current.map((meshInfo) => meshInfo.mesh),
            false
          );
          const selectedMesh = intersections[0]?.object;
          const meshInfo = meshesRef.current.find((candidate) => candidate.mesh === selectedMesh);
          if (meshInfo) {
            highlightMesh(meshInfo);
          }
        };

        renderer.domElement.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('resize', updateSize);
        removeListeners = () => {
          renderer?.domElement.removeEventListener('pointerdown', handlePointerDown);
          window.removeEventListener('resize', updateSize);
        };

        const simplifiedTargets =
          region.id === 'legs' ? createSimplifiedLowerBodyTargets() : createSimplifiedFrontUpperTargets();
        simplifiedTargets.forEach((target) => scene?.add(target.mesh));
        meshesRef.current = simplifiedTargets;
        setMeshCount(simplifiedTargets.length);
        updateSize();
        window.requestAnimationFrame(updateSize);

        const animate = () => {
          if (renderer && scene) {
            controls?.update();
            renderer.render(scene, camera);
          }
          animationFrame = window.requestAnimationFrame(animate);
        };
        animate();
        return;
      }

      if (!region.modelPath) {
        setLoadStatus('未配置');
        return;
      }

      const modelPath = region.modelPath;
      setLoadStatus(region.isPrivateModel ? '检测本地模型' : '加载中');

      if (region.isPrivateModel) {
        try {
          const response = await fetch(modelPath, { method: 'HEAD' });
          const contentType = response.headers.get('content-type') ?? '';
          if (!response.ok || contentType.includes('text/html')) {
            if (!disposed) {
              setLoadStatus('未检测到模型文件');
            }
            return;
          }
        } catch {
          if (!disposed) {
            setLoadStatus('未检测到模型文件');
          }
          return;
        }
      }

      if (disposed) {
        return;
      }

      setModelAvailable(true);
      setLoadStatus('加载中');

      scene = new THREE.Scene();
      scene.background = new THREE.Color(isSelector ? 0x0f172a : 0xf8fafc);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(0, 0.25, 4.2);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = region.view === 'test' ? 1.5 : 0.5;
      controls.maxDistance = region.view === 'test' ? 6 : 12;
      controls.target.set(0, 0, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 1.35));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
      keyLight.position.set(2, 3, 4);
      scene.add(keyLight);

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      const updateSize = () => {
        if (!renderer) {
          return;
        }

        const { clientWidth, clientHeight } = mount;
        const width = Math.max(clientWidth, 1);
        const height = Math.max(clientHeight, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (!renderer) {
          return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        const intersections = raycaster.intersectObjects(
          meshesRef.current.map((meshInfo) => meshInfo.mesh),
          false
        );
        const selectedMesh = intersections[0]?.object;
        const meshInfo = meshesRef.current.find((candidate) => candidate.mesh === selectedMesh);
        if (meshInfo) {
          highlightMesh(meshInfo);
        }
      };

      renderer.domElement.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('resize', updateSize);
      removeListeners = () => {
        renderer?.domElement.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('resize', updateSize);
      };

      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          if (disposed || !scene || !controls) {
            return;
          }

          const loadedMeshes: RegionMeshInfo[] = [];
          gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              const meshName = object.name || `${region.id}-mesh-${loadedMeshes.length + 1}`;
              object.name = meshName;
              if (Array.isArray(object.material)) {
                object.material = object.material.map((material) => material.clone());
              } else {
                object.material = object.material.clone();
              }

              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => {
                if (
                  material instanceof THREE.MeshBasicMaterial ||
                  material instanceof THREE.MeshLambertMaterial ||
                  material instanceof THREE.MeshStandardMaterial
                ) {
                  material.userData.baseColor = material.color.getHex();
                }
              });

              loadedMeshes.push({ name: meshName, mesh: object });
            }
          });

          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxAxis = Math.max(size.x, size.y, size.z, 1);
          const modelScale = region.view === 'test' ? 1.2 : 2.4 / maxAxis;
          gltf.scene.scale.setScalar(modelScale);
          gltf.scene.position.set(-center.x * modelScale, -center.y * modelScale, -center.z * modelScale);

          scene.add(gltf.scene);
          if (region.id === 'back-partial') {
            const simplifiedTargets = createSimplifiedLatissimusTargets();
            simplifiedTargets.forEach((target) => scene?.add(target.mesh));
            loadedMeshes.unshift(...simplifiedTargets);
          }
          meshesRef.current = loadedMeshes;
          setMeshCount(loadedMeshes.length);
          setLoadStatus('加载成功');
          updateSize();
          window.requestAnimationFrame(updateSize);
        },
        undefined,
        () => {
          if (!disposed) {
            setLoadStatus('加载失败');
            setModelAvailable(false);
          }
        }
      );

      updateSize();

      const animate = () => {
        if (renderer && scene) {
          controls?.update();
          renderer.render(scene, camera);
        }
        animationFrame = window.requestAnimationFrame(animate);
      };
      animate();
    };

    void loadModel();

    return () => {
      disposed = true;
      disposeScene();
    };
  }, [region, isSelector]);

  const firstMesh = meshesRef.current[0];
  const mappedMuscleLabel = selectedMuscle?.nameZh ?? (hasSelectedMesh ? UNMAPPED_LABEL : UNMAPPED_LABEL);

  return (
    <section
      data-testid="region-model-experiment"
      className={
        isSelector
          ? 'grid gap-4 rounded-lg border border-line bg-panel p-4 lg:grid-cols-[minmax(0,1fr)_360px]'
          : 'grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]'
      }
    >
      <div className="min-w-0">
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              data-testid="three-current-region-label"
              className={isSelector ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-slate-950'}
            >
              {isSelector ? getSelectorRegionHeading(region) : region.label}
            </h2>
            {isSelector && <RegionBadge region={region} />}
          </div>
          <p className={`mt-1 text-sm leading-6 ${isSelector ? 'text-slate-300' : 'text-slate-600'}`}>
            {isSelector ? getSelectorRegionDescription(region) : region.description}
          </p>
          {isSelector && region.isConfigured && (
            <p className="mt-2 text-sm text-cyan-200">点击模型中的肌肉区域，查看它能怎么练。</p>
          )}
          {isSelector && region.id === 'back-partial' && (
            <p data-testid="three-simplified-latissimus-note" className="mt-2 text-sm leading-6 text-amber-100">
              背阔肌当前使用简化 3D 示意区域；当前真实背部模型未包含背阔肌 mesh，后续可替换为真实解剖模型。
            </p>
          )}
          {isSelector && region.id === 'front-upper' && (
            <p data-testid="three-front-upper-note" className="mt-2 text-sm leading-6 text-amber-100">
              正面上半身当前使用简化 3D 示意区域 / hotspot，不是精确真实解剖模型；当前目标是让用户能通过 3D 入口选择训练部位，后续可逐步替换为真实模型资源。
            </p>
          )}
          {isSelector && region.id === 'legs' && (
            <p data-testid="three-lower-body-note" className="mt-2 text-sm leading-6 text-amber-100">
              臀腿区域当前使用简化 3D 示意区域 / hotspot，不是精确真实解剖模型；当前目标是让用户能通过 3D 入口选择主要下肢训练部位，后续可逐步替换为真实模型资源。
            </p>
          )}
        </div>

        {!region.isConfigured && (
          <div
            data-testid="three-region-placeholder"
            className={
              isSelector
                ? 'rounded-md border border-line bg-slate-900/70 p-4 text-sm leading-6 text-slate-300'
                : 'rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'
            }
          >
            {isSelector ? (
              <>
                <p className="font-medium text-white">该区域的 3D 肌群模型暂未配置</p>
                <p className="mt-2">这是后续扩展区域，当前不会加载不存在的资源，也不会展示假肌群数据。</p>
              </>
            ) : (
              '暂未配置模型资源'
            )}
          </div>
        )}

        {region.isConfigured && !modelAvailable && (
          <div
            className={
              isSelector
                ? 'rounded-md border border-amber-400/40 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100'
                : 'rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950'
            }
          >
            <p className="font-medium">{region.isPrivateModel ? '未检测到模型文件。' : '模型文件暂不可用。'}</p>
            <p className="mt-2">
              {region.isPrivateModel
                ? `本地实验模型应放在 ${region.modelPath}。缺失时页面会保留说明和映射入口，不会白屏。`
                : `请检查模型路径 ${region.modelPath}。`}
            </p>
            {region.isPrivateModel && <p className="mt-2">该目录已被 Git 忽略，真实模型不会进入提交。</p>}
          </div>
        )}

        <div
          ref={mountRef}
          data-testid="three-muscle-canvas"
          className={
            region.isConfigured && modelAvailable
              ? `h-[320px] w-full touch-none rounded-md border sm:h-[420px] ${
                  isSelector ? 'border-line bg-slate-950' : 'border-slate-100 bg-slate-50'
                }`
              : 'hidden'
          }
          aria-label={`${region.label} 3D 模型画布`}
        />

        {region.id === 'box-test' && (
          <button
            type="button"
            data-testid="select-glb-test-mesh"
            disabled={!firstMesh}
            onClick={() => {
              if (firstMesh) {
                highlightMesh(firstMesh);
              }
            }}
            className={
              isSelector
                ? 'mt-3 rounded-md border border-line bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60'
                : 'mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60'
            }
          >
            选择首个 mesh
          </button>
        )}

        {isSelector && muscleOptions.length > 0 && (
          <div
            className="mt-4 rounded-md border border-line bg-slate-900/70 p-3"
          >
            <h3 className="text-sm font-semibold text-white">可选择的背部局部肌群</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">3D 模型是主入口；这里按肌群合并左右侧 mesh 和简化区域，作为辅助选择。</p>
            <div data-testid="three-muscle-options" className="mt-2 grid gap-2 sm:grid-cols-2">
              {muscleOptions.map((option) => {
                const muscle = getMuscleById(option.muscleId);
                const selected = selectedMuscleId === option.muscleId;

                return (
                  <button
                    key={option.muscleId}
                    type="button"
                    data-testid={`select-three-muscle-option-${option.muscleId}`}
                    aria-pressed={selected}
                    onClick={() => selectMuscleOption(option)}
                    className={`min-w-0 rounded-md border px-3 py-2 text-left text-xs transition hover:border-cyan-500 hover:bg-cyan-500/10 ${
                      selected ? 'border-cyan-400 bg-cyan-400/10' : 'border-line bg-slate-950'
                    }`}
                  >
                    <span className="block font-medium text-white">{muscle?.nameZh ?? option.muscleId}</span>
                    <span className="mt-1 block break-words text-slate-400">{muscle?.nameEn ?? option.muscleId}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isSelector && mappedMeshEntries.length > 0 && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-950">已注册 mesh 映射</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {mappedMeshEntries.map(([meshName, muscleId]) => {
                const muscle = getMuscleById(muscleId);

                return (
                  <button
                    key={meshName}
                    type="button"
                    data-testid={`select-three-mapped-mesh-${meshName}`}
                    onClick={() => selectMappedMeshByName(meshName)}
                    className="min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-amber-300 hover:bg-amber-50"
                  >
                    <span className="block break-words font-mono text-slate-950">{muscle?.nameZh ?? muscleId}</span>
                    <span className="mt-1 block break-words text-slate-600">{meshName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <aside className="min-w-0">
        {isSelector ? (
          <SelectorResultPanel
            region={region}
            loadStatus={loadStatus}
            meshCount={meshCount}
            selectedMeshName={selectedMeshName}
            selectedMuscleId={selectedMuscleId}
            selectedMuscle={selectedMuscle}
            relatedExercises={relatedExercises}
            hasSelectedMesh={hasSelectedMesh}
            selectedIsSimplifiedLatissimus={selectedIsSimplifiedLatissimus}
            setSelectedMuscleId={setSelectedMuscleId}
          />
        ) : (
          <DemoDebugPanel
            region={region}
            loadStatus={loadStatus}
            meshCount={meshCount}
            selectedMeshName={selectedMeshName}
            selectedMuscleId={selectedMuscleId}
            selectedMuscle={selectedMuscle}
            relatedExercises={relatedExercises}
            mappedMuscleLabel={mappedMuscleLabel}
            setSelectedMuscleId={setSelectedMuscleId}
          />
        )}
      </aside>
    </section>
  );
}

function SelectorResultPanel({
  region,
  loadStatus,
  meshCount,
  selectedMeshName,
  selectedMuscleId,
  selectedMuscle,
  relatedExercises,
  hasSelectedMesh,
  selectedIsSimplifiedLatissimus,
  setSelectedMuscleId
}: {
  region: ThreeModelRegion;
  loadStatus: string;
  meshCount: number;
  selectedMeshName: string;
  selectedMuscleId: string | undefined;
  selectedMuscle: ReturnType<typeof getMuscleById>;
  relatedExercises: RelatedExercise[];
  hasSelectedMesh: boolean;
  selectedIsSimplifiedLatissimus: boolean;
  setSelectedMuscleId: (muscleId: string) => void;
}) {
  const navigate = useNavigate();
  const [workoutStatus, setWorkoutStatus] = useState('');

  useEffect(() => {
    setWorkoutStatus('');
  }, [selectedMuscleId]);

  const handleAddExerciseToWorkout = (exercise: Exercise) => {
    const activeWorkout = readActiveWorkout();

    if (!activeWorkout) {
      startWorkoutWithExercise(exercise.id);
      navigate('/workout-log');
      return;
    }

    const result = addExerciseToExistingActiveWorkout(exercise.id);
    if (result.status === 'duplicate') {
      setWorkoutStatus(`${exercise.nameEn} 已在当前训练中`);
      return;
    }

    if (result.status === 'missing') {
      startWorkoutWithExercise(exercise.id);
    }

    navigate('/workout-log');
  };

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-line bg-slate-900/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">当前选择</p>
        {!hasSelectedMesh && (
          <div className="mt-3 text-sm leading-6 text-slate-300">
            <p className="font-medium text-white">还没有选择肌群</p>
            <p className="mt-1">点击模型或下方可选肌群，查看说明、相关动作和入口。</p>
          </div>
        )}

        {hasSelectedMesh && selectedMuscle && (
          <div>
            <h3 data-testid="three-selected-muscle-name" className="mt-3 text-xl font-semibold text-white">
              {selectedMuscle.nameZh}
            </h3>
            <p className="mt-1 text-sm text-slate-400">{selectedMuscle.nameEn}</p>
            <p className="mt-1 break-words font-mono text-xs text-cyan-100">muscleId: {selectedMuscle.id}</p>
            <div data-testid="three-selected-muscle-description" className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              <p>{selectedMuscle.description}</p>
              <p>{selectedMuscle.function}</p>
            </div>
            {selectedIsSimplifiedLatissimus && (
              <p
                data-testid="three-simplified-selection-note"
                className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100"
              >
                当前选择的是背阔肌简化 3D 示意区域，不是当前真实模型 mesh。
              </p>
            )}
          </div>
        )}

        {hasSelectedMesh && !selectedMuscle && (
          <div data-testid="three-selected-unmapped-state" className="mt-3 text-sm leading-6 text-slate-300">
            <p className="font-medium text-white">该部位暂未配置为可训练肌群</p>
            <p className="mt-1">状态：未映射</p>
            <p className="mt-1 break-words text-slate-400">mesh：{selectedMeshName}</p>
          </div>
        )}
      </section>

      {selectedMuscle && (
        <section className="rounded-md border border-line bg-slate-900/70 p-4">
          <h3 className="text-sm font-semibold text-white">相关动作</h3>
          <div data-testid="three-related-exercises" className="mt-3 space-y-3">
            {relatedExercises.length > 0 ? (
              relatedExercises.map(({ exercise, matchType }) => (
                <article
                  key={exercise.id}
                  data-testid={`three-related-exercise-card-${exercise.id}`}
                  className="rounded-md border border-line bg-slate-950 p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-white">{exercise.name}</p>
                      <p className="mt-1 break-words text-xs text-slate-400">{exercise.nameEn}</p>
                    </div>
                    <span className="w-fit shrink-0 rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                      {matchType === 'primary' ? '主练' : '次要参与'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Link
                      to={`/exercises/${exercise.id}?muscleId=${selectedMuscle.id}`}
                      data-testid={`three-related-exercise-link-${exercise.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500"
                    >
                      查看详情
                    </Link>
                    <button
                      type="button"
                      data-testid={`three-add-exercise-${exercise.id}`}
                      onClick={() => handleAddExerciseToWorkout(exercise)}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-cyan-400 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                      加入训练
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <span className="text-sm text-slate-400">暂无相关动作</span>
            )}
          </div>
          <p data-testid="three-active-workout-status" className="mt-3 min-h-6 text-sm text-cyan-100">
            {workoutStatus}
          </p>
          {workoutStatus ? (
            <Link
              to="/workout-log"
              data-testid="three-go-active-workout"
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-line bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500"
            >
              去当前训练
            </Link>
          ) : null}
        </section>
      )}

      {selectedMuscle && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            to="/muscle-map"
            data-testid="three-muscle-detail-link"
            onClick={() => setSelectedMuscleId(selectedMuscle.id)}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-cyan-400 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
          >
            查看肌肉详情
          </Link>
          {relatedExercises[0] && (
            <Link
              to={`/exercises/${relatedExercises[0].exercise.id}?muscleId=${selectedMuscle.id}`}
              data-testid="three-related-actions-link"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500"
            >
              查看相关动作
            </Link>
          )}
        </div>
      )}

      <section className="rounded-md border border-line bg-slate-900/70 p-4">
        <h3 className="text-sm font-semibold text-white">模型范围</h3>
        <div data-testid="three-region-limitations" className="mt-2 text-sm leading-6 text-slate-300">
          {region.limitations?.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {getSelectorLimitations(region).map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          ) : (
            <p>{region.id === 'box-test' ? '不是人体模型，也不是正式肌群选择资源。' : '暂无额外限制。'}</p>
          )}
        </div>
      </section>

      <details className="rounded-md border border-line bg-slate-900/70 p-4 text-sm text-slate-300">
        <summary className="cursor-pointer font-semibold text-white">调试信息</summary>
        <dl className="mt-3 space-y-3">
          <DebugRows
            region={region}
            loadStatus={loadStatus}
            meshCount={meshCount}
            selectedMeshName={selectedMeshName}
            selectedMuscleId={selectedMuscleId}
            tone="dark"
          />
        </dl>
      </details>
    </div>
  );
}

function DemoDebugPanel({
  region,
  loadStatus,
  meshCount,
  selectedMeshName,
  selectedMuscleId,
  selectedMuscle,
  relatedExercises,
  mappedMuscleLabel,
  setSelectedMuscleId
}: {
  region: ThreeModelRegion;
  loadStatus: string;
  meshCount: number;
  selectedMeshName: string;
  selectedMuscleId: string | undefined;
  selectedMuscle: ReturnType<typeof getMuscleById>;
  relatedExercises: RelatedExercise[];
  mappedMuscleLabel: string;
  setSelectedMuscleId: (muscleId: string) => void;
}) {
  return (
    <dl className="space-y-3 text-sm">
      <DebugRows
        region={region}
        loadStatus={loadStatus}
        meshCount={meshCount}
        selectedMeshName={selectedMeshName}
        selectedMuscleId={selectedMuscleId}
      />
      <div>
        <dt className="text-slate-500">中文肌肉名</dt>
        <dd data-testid="three-selected-muscle-name" className="mt-1 font-medium text-slate-950">
          {mappedMuscleLabel}
        </dd>
      </div>
      {selectedMuscle && (
        <div>
          <dt className="text-slate-500">肌群说明</dt>
          <dd data-testid="three-selected-muscle-description" className="mt-1 space-y-2 text-slate-700">
            <p>{selectedMuscle.description}</p>
            <p>{selectedMuscle.function}</p>
          </dd>
        </div>
      )}
      {selectedMuscle && (
        <div>
          <dt className="text-slate-500">相关动作</dt>
          <dd data-testid="three-related-exercises" className="mt-2 space-y-2">
            {relatedExercises.length > 0 ? (
              relatedExercises.map(({ exercise, matchType }) => (
                <Link
                  key={exercise.id}
                  to={`/exercises/${exercise.id}?muscleId=${selectedMuscle.id}`}
                  data-testid={`three-related-exercise-link-${exercise.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-950 transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <span>{exercise.name}</span>
                  <span className="shrink-0 rounded bg-white px-2 py-1 text-xs text-slate-600">
                    {matchType === 'primary' ? '主练' : '次要参与'}
                  </span>
                </Link>
              ))
            ) : (
              <span className="text-sm text-slate-500">暂无相关动作</span>
            )}
          </dd>
        </div>
      )}
      {selectedMuscle && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            to="/muscle-map"
            data-testid="three-muscle-detail-link"
            onClick={() => setSelectedMuscleId(selectedMuscle.id)}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-500 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
          >
            查看肌肉详情
          </Link>
          {relatedExercises[0] && (
            <Link
              to={`/exercises/${relatedExercises[0].exercise.id}?muscleId=${selectedMuscle.id}`}
              data-testid="three-related-actions-link"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              查看相关动作
            </Link>
          )}
        </div>
      )}
      <div>
        <dt className="text-slate-500">模型限制</dt>
        <dd data-testid="three-region-limitations" className="mt-1 text-slate-700">
          {region.limitations?.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {region.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          ) : (
            '无'
          )}
        </dd>
      </div>
    </dl>
  );
}

function DebugRows({
  region,
  loadStatus,
  meshCount,
  selectedMeshName,
  selectedMuscleId,
  tone = 'light'
}: {
  region: ThreeModelRegion;
  loadStatus: string;
  meshCount: number;
  selectedMeshName: string;
  selectedMuscleId: string | undefined;
  tone?: 'light' | 'dark';
}) {
  const valueClass = tone === 'dark' ? 'text-slate-100' : 'text-slate-950';

  return (
    <>
      <div>
        <dt className="text-slate-500">region id</dt>
        <dd className={`mt-1 font-mono text-xs ${valueClass}`}>{region.id}</dd>
      </div>
      <div>
        <dt className="text-slate-500">modelPath</dt>
        <dd data-testid="three-current-region-path" className={`mt-1 break-words font-mono text-xs ${valueClass}`}>
          {region.modelPath ?? '未配置'}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">private</dt>
        <dd data-testid="three-current-region-private" className={`mt-1 font-medium ${valueClass}`}>
          {region.isPrivateModel ? 'private' : 'public'}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">experimental</dt>
        <dd data-testid="three-current-region-experimental" className={`mt-1 font-medium ${valueClass}`}>
          {region.isExperimental ? 'experimental' : 'stable test'}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">加载状态</dt>
        <dd data-testid="glb-load-status" className={`mt-1 font-medium ${valueClass}`}>
          {loadStatus}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">mesh 数量</dt>
        <dd data-testid="glb-mesh-count" className={`mt-1 font-mono text-xs ${valueClass}`}>
          {meshCount}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">当前 mesh.name</dt>
        <dd data-testid="glb-selected-mesh-name" className={`mt-1 break-words font-mono text-xs ${valueClass}`}>
          {selectedMeshName}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">muscleId</dt>
        <dd data-testid="three-selected-muscle-id" className={`mt-1 font-mono text-xs ${valueClass}`}>
          {selectedMuscleId ?? UNMAPPED_LABEL}
        </dd>
      </div>
    </>
  );
}

function RegionBadge({ region }: { region: ThreeModelRegion }) {
  if (!region.isConfigured) {
    return <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">暂未配置</span>;
  }

  if (region.id === 'box-test') {
    return <span className="rounded bg-violet-500/20 px-2 py-1 text-xs text-violet-100">开发验证</span>;
  }

  if (region.isExperimental) {
    return <span className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-100">实验模型</span>;
  }

  return <span className="rounded bg-cyan-500/20 px-2 py-1 text-xs text-cyan-100">可用</span>;
}

function getSelectorRegionLabel(region: ThreeModelRegion) {
  if (region.id === 'front-upper') {
    return '正面上半身';
  }

  if (region.id === 'back-partial') {
    return '背部局部';
  }

  if (region.id === 'legs') {
    return '臀腿';
  }

  if (region.id === 'box-test') {
    return 'GLB 管线测试，开发验证';
  }

  return `${region.label}，暂未配置`;
}

function getSelectorRegionMeta(region: ThreeModelRegion) {
  if (region.id === 'front-upper') {
    return '简化 3D 入口，覆盖胸、肩、手臂、核心';
  }

  if (region.id === 'back-partial') {
    return '当前可选，覆盖部分背部肌群';
  }

  if (region.id === 'legs') {
    return '简化 3D 入口，覆盖臀部、大腿前侧、大腿后侧、小腿';
  }

  if (region.id === 'box-test') {
    return '不是人体模型';
  }

  return '后续扩展区域';
}

function getSelectorRegionHeading(region: ThreeModelRegion) {
  if (region.id === 'legs') {
    return '臀腿';
  }

  return region.id === 'back-partial' ? '背部局部' : region.label;
}

function getSelectorRegionDescription(region: ThreeModelRegion) {
  if (region.id === 'front-upper') {
    return '正面上半身使用简化 3D 示意区域，提供胸、肩、手臂和核心主要训练肌群的可点击入口。';
  }

  if (region.id === 'back-partial') {
    return '当前背部局部模型可用于选择部分上背、肩胛周围和竖脊肌相关区域。';
  }

  if (region.id === 'legs') {
    return '臀腿区域使用简化 3D 示意区域，提供臀大肌、股四头肌、腘绳肌和小腿三头肌的可点击入口。';
  }

  if (region.id === 'box-test') {
    return '这是 GLBLoader 管线测试区，不是人体模型，也不是正式肌群选择资源。';
  }

  return '该区域会在后续版本补齐 3D 肌群模型和可点击映射。';
}

function getSelectorLimitations(region: ThreeModelRegion) {
  if (region.id === 'back-partial') {
    return [
      '当前背部局部实验模型未包含背阔肌真实 mesh',
      '背阔肌当前使用简化 3D 示意区域，后续可替换为真实解剖模型',
      '当前模型仅覆盖部分背部肌群'
    ];
  }

  return region.limitations ?? [];
}

function isSimplifiedLatissimusTarget(meshName: string) {
  return SIMPLIFIED_LATISSIMUS_TARGETS.some((targetName) => targetName === meshName);
}

function getUniqueMuscleOptions(mappings: Record<string, string>): MuscleOption[] {
  const options = new Map<string, MuscleOption>();

  Object.entries(mappings).forEach(([meshName, muscleId]) => {
    const existing = options.get(muscleId);
    if (existing) {
      existing.meshNames.push(meshName);
      return;
    }

    options.set(muscleId, { muscleId, meshNames: [meshName] });
  });

  return Array.from(options.values());
}

function createSimplifiedLatissimusTargets(): RegionMeshInfo[] {
  return [
    createSimplifiedLatissimusTarget('Simplified_left_latissimus_dorsi', -1),
    createSimplifiedLatissimusTarget('Simplified_right_latissimus_dorsi', 1)
  ];
}

function createSimplifiedLatissimusTarget(name: string, side: -1 | 1): RegionMeshInfo {
  const shape = new THREE.Shape();
  shape.moveTo(0.02 * side, 0.62);
  shape.lineTo(0.34 * side, 0.28);
  shape.lineTo(0.3 * side, -0.42);
  shape.lineTo(0.08 * side, -0.68);
  shape.lineTo(-0.12 * side, -0.42);
  shape.lineTo(-0.1 * side, 0.22);
  shape.lineTo(0.02 * side, 0.62);

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    opacity: 0.42,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true
  });
  material.userData.baseColor = material.color.getHex();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(0.5 * side, -0.08, 0.14);
  mesh.rotation.set(0, 0, -0.08 * side);
  mesh.renderOrder = 2;

  return { name, mesh };
}

function createSimplifiedFrontUpperTargets(): RegionMeshInfo[] {
  return [
    createFrontShapeTarget('Simplified_left_pectoralis_major', 0x38bdf8, [
      [-0.08, 0.72],
      [-0.56, 0.62],
      [-0.68, 0.28],
      [-0.16, 0.18]
    ]),
    createFrontShapeTarget('Simplified_right_pectoralis_major', 0x38bdf8, [
      [0.08, 0.72],
      [0.56, 0.62],
      [0.68, 0.28],
      [0.16, 0.18]
    ]),
    createFrontShapeTarget('Simplified_left_front_deltoid', 0xf59e0b, [
      [-0.62, 0.76],
      [-0.9, 0.56],
      [-0.78, 0.24],
      [-0.54, 0.34]
    ]),
    createFrontShapeTarget('Simplified_right_front_deltoid', 0xf59e0b, [
      [0.62, 0.76],
      [0.9, 0.56],
      [0.78, 0.24],
      [0.54, 0.34]
    ]),
    createFrontShapeTarget('Simplified_left_side_deltoid', 0xfacc15, [
      [-0.88, 0.5],
      [-1.06, 0.26],
      [-0.9, 0.02],
      [-0.76, 0.24]
    ]),
    createFrontShapeTarget('Simplified_right_side_deltoid', 0xfacc15, [
      [0.88, 0.5],
      [1.06, 0.26],
      [0.9, 0.02],
      [0.76, 0.24]
    ]),
    createFrontShapeTarget('Simplified_left_biceps', 0x22c55e, [
      [-1.02, 0.0],
      [-1.22, -0.08],
      [-1.16, -0.64],
      [-0.96, -0.56]
    ]),
    createFrontShapeTarget('Simplified_right_biceps', 0x22c55e, [
      [1.02, 0.0],
      [1.22, -0.08],
      [1.16, -0.64],
      [0.96, -0.56]
    ]),
    createFrontShapeTarget('Simplified_left_triceps', 0xa78bfa, [
      [-0.82, 0.0],
      [-0.98, -0.1],
      [-0.92, -0.62],
      [-0.74, -0.48]
    ]),
    createFrontShapeTarget('Simplified_right_triceps', 0xa78bfa, [
      [0.82, 0.0],
      [0.98, -0.1],
      [0.92, -0.62],
      [0.74, -0.48]
    ]),
    createFrontShapeTarget('Simplified_rectus_abdominis', 0xfb7185, [
      [-0.22, 0.12],
      [0.22, 0.12],
      [0.24, -0.86],
      [-0.24, -0.86]
    ]),
    createFrontShapeTarget('Simplified_left_obliques', 0x14b8a6, [
      [-0.28, 0.12],
      [-0.58, 0.02],
      [-0.48, -0.82],
      [-0.24, -0.72]
    ]),
    createFrontShapeTarget('Simplified_right_obliques', 0x14b8a6, [
      [0.28, 0.12],
      [0.58, 0.02],
      [0.48, -0.82],
      [0.24, -0.72]
    ])
  ];
}

function createSimplifiedLowerBodyTargets(): RegionMeshInfo[] {
  return [
    createLowerBodyShapeTarget('Simplified_left_gluteus_maximus', 0xf97316, [
      [-0.52, 0.74],
      [-0.16, 0.7],
      [-0.12, 0.36],
      [-0.44, 0.26],
      [-0.68, 0.44]
    ]),
    createLowerBodyShapeTarget('Simplified_right_gluteus_maximus', 0xf97316, [
      [0.52, 0.74],
      [0.16, 0.7],
      [0.12, 0.36],
      [0.44, 0.26],
      [0.68, 0.44]
    ]),
    createLowerBodyShapeTarget('Simplified_left_quadriceps', 0x38bdf8, [
      [-0.58, 0.28],
      [-0.18, 0.3],
      [-0.16, -0.68],
      [-0.48, -0.72],
      [-0.7, -0.18]
    ]),
    createLowerBodyShapeTarget('Simplified_right_quadriceps', 0x38bdf8, [
      [0.58, 0.28],
      [0.18, 0.3],
      [0.16, -0.68],
      [0.48, -0.72],
      [0.7, -0.18]
    ]),
    createLowerBodyShapeTarget('Simplified_left_hamstrings', 0xa78bfa, [
      [-0.14, 0.22],
      [-0.02, 0.18],
      [-0.04, -0.58],
      [-0.14, -0.7],
      [-0.24, -0.34]
    ]),
    createLowerBodyShapeTarget('Simplified_right_hamstrings', 0xa78bfa, [
      [0.14, 0.22],
      [0.02, 0.18],
      [0.04, -0.58],
      [0.14, -0.7],
      [0.24, -0.34]
    ]),
    createLowerBodyShapeTarget('Simplified_left_calves', 0x22c55e, [
      [-0.5, -0.76],
      [-0.18, -0.74],
      [-0.16, -1.46],
      [-0.42, -1.54],
      [-0.6, -1.12]
    ]),
    createLowerBodyShapeTarget('Simplified_right_calves', 0x22c55e, [
      [0.5, -0.76],
      [0.18, -0.74],
      [0.16, -1.46],
      [0.42, -1.54],
      [0.6, -1.12]
    ])
  ];
}

function createFrontShapeTarget(name: string, color: number, points: number[][]): RegionMeshInfo {
  const shape = new THREE.Shape();
  const [firstPoint, ...restPoints] = points;
  shape.moveTo(firstPoint[0], firstPoint[1]);
  restPoints.forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color,
    opacity: 0.5,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true
  });
  material.userData.baseColor = material.color.getHex();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(0, -0.06, 0.12);
  mesh.renderOrder = 2;

  return { name, mesh };
}

function createLowerBodyShapeTarget(name: string, color: number, points: number[][]): RegionMeshInfo {
  const target = createFrontShapeTarget(name, color, points);
  target.mesh.position.set(0, 0.22, 0.12);
  return target;
}

function getRelatedExercises(muscleId: string): RelatedExercise[] {
  const primaryMatches = exercises
    .filter((exercise) => exercise.primaryMuscles.includes(muscleId))
    .map((exercise) => ({ exercise, matchType: 'primary' as const }));

  const secondaryMatches = exercises
    .filter((exercise) => !exercise.primaryMuscles.includes(muscleId) && exercise.secondaryMuscles.includes(muscleId))
    .map((exercise) => ({ exercise, matchType: 'secondary' as const }));

  return [...primaryMatches, ...secondaryMatches].slice(0, MAX_RELATED_EXERCISES);
}
