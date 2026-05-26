import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import PageHeader from '../components/layout/PageHeader';
import { getMuscleById } from '../data/muscles';

type DemoMuscleRegion = {
  id: string;
  meshName: string;
  muscleId: string;
  nameZh: string;
  color: number;
  selectedColor: number;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
};

type GlbMeshInfo = {
  name: string;
  mesh: THREE.Mesh;
};

type LocalAnatomyMeshInfo = {
  name: string;
  mesh: THREE.Mesh;
};

const demoRegions: DemoMuscleRegion[] = [
  {
    id: 'left-lat-placeholder',
    meshName: 'placeholder_latissimus_dorsi_left',
    muscleId: 'latissimus-dorsi',
    nameZh: '背阔肌',
    color: 0x2563eb,
    selectedColor: 0xf59e0b,
    position: [-1.05, -0.25, 0],
    scale: [0.7, 1.75, 0.2],
    rotation: [0, 0, -0.28]
  },
  {
    id: 'rhomboids-placeholder',
    meshName: 'placeholder_rhomboids_center',
    muscleId: 'rhomboids',
    nameZh: '菱形肌',
    color: 0x16a34a,
    selectedColor: 0xf59e0b,
    position: [0, 0.55, 0.08],
    scale: [0.85, 0.75, 0.18],
    rotation: [0, 0, 0.78]
  },
  {
    id: 'rear-deltoid-placeholder',
    meshName: 'placeholder_rear_deltoid_right',
    muscleId: 'rear-deltoid',
    nameZh: '后三角肌',
    color: 0xdb2777,
    selectedColor: 0xf59e0b,
    position: [1.18, 1.05, 0],
    scale: [0.62, 0.52, 0.22],
    rotation: [0, 0, -0.35]
  }
];

const glbModelPath = '/models/demo/BoxTextured.glb';
const glbFileSizeBytes = 6540;
const glbTechnicalMuscleId = 'latissimus-dorsi';
const localAnatomyModelPath = '/models/private/local-anatomy.glb';
const localAnatomyMeshMappings: Record<string, string> = {
  // 示例：真实 mesh name 后续手动填入。
  // 'Latissimus_Dorsi_L': 'latissimus-dorsi',
  // 'Rhomboid_Major': 'rhomboids',
  // 'Trapezius_Middle_Lower': 'middle-lower-trapezius',
  // 'Erector_Spinae': 'erector-spinae',
  // 'Teres_Major': 'teres-major',
  // 'Deltoid_Posterior': 'rear-deltoid'
};
const defaultSelectedRegion = demoRegions[0];

export default function ThreeMuscleDemo() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const selectedRegionRef = useRef<DemoMuscleRegion>(defaultSelectedRegion);
  const [selectedRegion, setSelectedRegion] = useState(defaultSelectedRegion);

  const selectedMuscle = useMemo(() => getMuscleById(selectedRegion.muscleId), [selectedRegion.muscleId]);

  const selectRegion = (region: DemoMuscleRegion) => {
    selectedRegionRef.current = region;
    setSelectedRegion(region);

    meshRefs.current.forEach((mesh) => {
      const material = mesh.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.set(mesh.userData.baseColor as number);
        material.emissive.set(0x000000);
      }
    });

    const selectedMesh = meshRefs.current.get(region.id);
    const selectedMaterial = selectedMesh?.material;
    if (selectedMaterial instanceof THREE.MeshStandardMaterial) {
      selectedMaterial.color.set(region.selectedColor);
      selectedMaterial.emissive.set(0x3b2200);
    }
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.35, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 8;
    controls.target.set(0, 0.25, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(2.5, 3.5, 4);
    scene.add(ambientLight, keyLight);

    const torsoMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.8,
      metalness: 0.05
    });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.82, 1.75, 8, 18), torsoMaterial);
    torso.position.set(0, -0.1, -0.18);
    torso.scale.set(1.0, 1.08, 0.42);
    scene.add(torso);

    demoRegions.forEach((region) => {
      const material = new THREE.MeshStandardMaterial({
        color: region.color,
        roughness: 0.55,
        metalness: 0.03
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      mesh.name = region.meshName;
      mesh.position.set(...region.position);
      mesh.scale.set(...region.scale);
      mesh.rotation.set(...region.rotation);
      mesh.userData = {
        regionId: region.id,
        muscleId: region.muscleId,
        baseColor: region.color
      };
      meshRefs.current.set(region.id, mesh);
      scene.add(mesh);
    });

    selectRegion(selectedRegionRef.current);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const updateSize = () => {
      const { clientWidth, clientHeight } = mount;
      const width = Math.max(clientWidth, 1);
      const height = Math.max(clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const intersections = raycaster.intersectObjects(Array.from(meshRefs.current.values()), false);
      const muscleId = intersections[0]?.object.userData.muscleId as string | undefined;
      const region = demoRegions.find((candidate) => candidate.muscleId === muscleId);
      if (region) {
        selectRegion(region);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', updateSize);
    updateSize();

    let animationFrame = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updateSize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();

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

      meshRefs.current.clear();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const isMatched = Boolean(selectedMuscle);

  return (
    <div className="space-y-4 overflow-x-hidden">
      <PageHeader
        title="3D 肌群模型技术预研"
        description="该页面为实验 Demo，不影响正式肌群地图。当前模型为占位几何体，不代表真实解剖结构。"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div
            ref={mountRef}
            data-testid="three-muscle-canvas"
            className="h-[420px] w-full touch-none sm:h-[520px]"
            aria-label="3D 肌群占位模型"
          />
          <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
            {demoRegions.map((region) => (
              <button
                key={region.id}
                type="button"
                data-testid={`select-three-muscle-${region.muscleId}`}
                onClick={() => selectRegion(region)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                  selectedRegion.id === region.id
                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                {region.nameZh}
              </button>
            ))}
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">选中区域</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">当前选中区域</dt>
              <dd className="mt-1 font-medium text-slate-950">{selectedRegion.id}</dd>
            </div>
            <div>
              <dt className="text-slate-500">mesh name</dt>
              <dd className="mt-1 break-words font-mono text-xs text-slate-950">{selectedRegion.meshName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">muscleId</dt>
              <dd data-testid="three-selected-muscle-id" className="mt-1 font-mono text-xs text-slate-950">
                {selectedRegion.muscleId}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">中文肌群名</dt>
              <dd data-testid="three-selected-muscle-name" className="mt-1 font-medium text-slate-950">
                {selectedRegion.nameZh}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">是否匹配现有 muscles.ts</dt>
              <dd
                data-testid="three-selected-muscle-match"
                className={`mt-1 font-medium ${isMatched ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {isMatched ? '已匹配' : '未匹配'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <GlbPipelineExperiment />
      <LocalAnatomyExperiment />
    </div>
  );
}

function LocalAnatomyExperiment() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const meshesRef = useRef<LocalAnatomyMeshInfo[]>([]);
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);
  const [loadStatus, setLoadStatus] = useState('等待检测');
  const [modelAvailable, setModelAvailable] = useState(false);
  const [meshCount, setMeshCount] = useState(0);
  const [selectedMeshName, setSelectedMeshName] = useState('未选择');

  const selectedMuscleId = selectedMeshName === '未选择' ? undefined : localAnatomyMeshMappings[selectedMeshName];
  const selectedMuscle = selectedMuscleId ? getMuscleById(selectedMuscleId) : undefined;

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

  const highlightMesh = (meshInfo: LocalAnatomyMeshInfo) => {
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

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    let disposed = false;
    let animationFrame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let scene: THREE.Scene | null = null;

    const disposeScene = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

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
      setLoadStatus('检测本地模型');

      try {
        const response = await fetch(localAnatomyModelPath, { method: 'HEAD' });
        const contentType = response.headers.get('content-type') ?? '';
        if (!response.ok || contentType.includes('text/html')) {
          if (!disposed) {
            setLoadStatus('未检测到本地真实模型');
          }
          return;
        }
      } catch {
        if (!disposed) {
          setLoadStatus('未检测到本地真实模型');
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
      camera.position.set(1.8, 1.4, 3.2);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 0.5;
      controls.maxDistance = 12;

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

      const loader = new GLTFLoader();
      loader.load(
        localAnatomyModelPath,
        (gltf) => {
          if (disposed || !scene || !controls) {
            return;
          }

          const loadedMeshes: LocalAnatomyMeshInfo[] = [];
          gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              const meshName = object.name || `local-anatomy-mesh-${loadedMeshes.length + 1}`;
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
          gltf.scene.position.sub(center);
          gltf.scene.scale.setScalar(2.4 / maxAxis);

          controls.target.set(0, 0, 0);
          camera.position.set(0, 0.25, 4.2);
          scene.add(gltf.scene);
          meshesRef.current = loadedMeshes;
          setMeshCount(loadedMeshes.length);
          setLoadStatus('加载成功');
        },
        undefined,
        () => {
          if (!disposed) {
            setLoadStatus('加载失败');
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

      return () => {
        renderer?.domElement.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('resize', updateSize);
      };
    };

    let removeListeners: (() => void) | undefined;
    void loadModel().then((cleanup) => {
      removeListeners = cleanup;
    });

    return () => {
      disposed = true;
      removeListeners?.();
      disposeScene();
    };
  }, []);

  return (
    <section
      data-testid="local-anatomy-experiment-panel"
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="min-w-0">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-slate-950">本地真实模型实验区</h2>
          <p className="mt-1 text-sm text-slate-600">
            该区域仅用于本地真实模型技术实验。模型文件不会进入正式产品，也不会随项目发布。
          </p>
        </div>

        <div
          ref={mountRef}
          data-testid="local-anatomy-canvas"
          className={
            modelAvailable
              ? 'h-[320px] w-full touch-none rounded-md border border-slate-100 bg-slate-50 sm:h-[420px]'
              : 'hidden'
          }
          aria-label="本地真实人体模型实验画布"
        />

        {!modelAvailable && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">未检测到本地真实模型。</p>
            <p className="mt-2">请将本地实验用 .glb 放到 public/models/private/local-anatomy.glb。</p>
            <p className="mt-2">该目录已被 Git 忽略，模型不会进入提交。</p>
            <p className="mt-2">模型不会随项目发布。</p>
            <dl className="mt-4 space-y-2">
              <div>
                <dt className="text-amber-800">当前期望路径</dt>
                <dd data-testid="local-anatomy-expected-path" className="break-words font-mono text-xs">
                  {localAnatomyModelPath}
                </dd>
              </div>
              <div>
                <dt className="text-amber-800">推荐格式</dt>
                <dd>推荐格式：.glb</dd>
              </div>
              <div>
                <dt className="text-amber-800">格式处理</dt>
                <dd>不建议直接使用 .obj，优先用 Blender 转 .glb</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <aside className="min-w-0">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">模型路径</dt>
            <dd className="mt-1 break-words font-mono text-xs text-slate-950">{localAnatomyModelPath}</dd>
          </div>
          <div>
            <dt className="text-slate-500">加载状态</dt>
            <dd data-testid="local-anatomy-load-status" className="mt-1 font-medium text-slate-950">
              {loadStatus}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">mesh 数量</dt>
            <dd data-testid="local-anatomy-mesh-count" className="mt-1 font-mono text-xs text-slate-950">
              {meshCount}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">当前选中 mesh.name</dt>
            <dd data-testid="local-anatomy-selected-mesh-name" className="mt-1 break-words font-mono text-xs text-slate-950">
              {selectedMeshName}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">映射 muscleId</dt>
            <dd data-testid="local-anatomy-selected-muscle-id" className="mt-1 font-mono text-xs text-slate-950">
              {selectedMuscleId ?? '未映射'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">中文肌肉名</dt>
            <dd data-testid="local-anatomy-selected-muscle-name" className="mt-1 font-medium text-slate-950">
              {selectedMuscle?.nameZh ?? '未映射'}
            </dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}

function GlbPipelineExperiment() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const meshesRef = useRef<GlbMeshInfo[]>([]);
  const [loadStatus, setLoadStatus] = useState('等待加载');
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const [meshCount, setMeshCount] = useState(0);
  const [selectedMeshName, setSelectedMeshName] = useState('未选择');
  const [clickVerified, setClickVerified] = useState(false);

  const selectMesh = (meshInfo: GlbMeshInfo) => {
    meshesRef.current.forEach(({ mesh }) => {
      const material = mesh.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.set(0x000000);
      }
    });

    const material = meshInfo.mesh.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.emissive.set(0x5a3600);
    }

    setSelectedMeshName(meshInfo.name);
    setClickVerified(true);
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(1.8, 1.4, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 6;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const updateSize = () => {
      const { clientWidth, clientHeight } = mount;
      const width = Math.max(clientWidth, 1);
      const height = Math.max(clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const loader = new GLTFLoader();
    const startedAt = performance.now();
    setLoadStatus('加载中');

    loader.load(
      glbModelPath,
      (gltf) => {
        if (disposed) {
          return;
        }

        const loadedMeshes: GlbMeshInfo[] = [];
        gltf.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const meshName = object.name || `BoxTextured-mesh-${loadedMeshes.length + 1}`;
            object.name = meshName;
            if (object.material instanceof THREE.Material) {
              object.material = object.material.clone();
            }
            object.userData.technicalMuscleId = glbTechnicalMuscleId;
            loadedMeshes.push({ name: meshName, mesh: object });
          }
        });

        gltf.scene.scale.set(1.2, 1.2, 1.2);
        scene.add(gltf.scene);
        meshesRef.current = loadedMeshes;
        setMeshCount(loadedMeshes.length);
        setLoadTimeMs(Math.round(performance.now() - startedAt));
        setLoadStatus('加载成功');
      },
      undefined,
      () => {
        if (!disposed) {
          setLoadStatus('加载失败');
        }
      }
    );

    const handlePointerDown = (event: PointerEvent) => {
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
        selectMesh(meshInfo);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', updateSize);
    updateSize();

    let animationFrame = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updateSize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();

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

      meshesRef.current = [];
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const firstMesh = meshesRef.current[0];

  return (
    <section
      data-testid="glb-experiment-panel"
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="min-w-0">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-slate-950">GLB 加载管线测试</h2>
          <p className="mt-1 text-sm text-slate-600">模型文件：BoxTextured.glb</p>
          <p className="mt-1 text-sm text-slate-600">用途：仅用于 GLBLoader 管线测试</p>
          <p className="mt-1 text-sm text-slate-600">
            说明：该模型不是人体模型，也不是肌肉模型，不代表真实解剖结构。
          </p>
          <p className="mt-1 text-sm text-slate-600">
            当前 GLB 模型仅用于加载管线测试，不代表真实人体或肌群结构。
          </p>
          <p className="mt-1 text-sm text-slate-600">
            当前 mesh 到 muscleId 的映射仅用于验证技术链路，不代表真实解剖关系。
          </p>
        </div>
        <div
          ref={mountRef}
          data-testid="glb-experiment-canvas"
          className="h-[280px] w-full touch-none rounded-md border border-slate-100 bg-slate-50 sm:h-[340px]"
          aria-label="Khronos BoxTextured GLB 管线测试模型"
        />
      </div>

      <aside className="min-w-0">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">GLB 加载状态</dt>
            <dd data-testid="glb-load-status" className="mt-1 font-medium text-slate-950">
              {loadStatus}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">文件大小</dt>
            <dd className="mt-1 font-mono text-xs text-slate-950">{glbFileSizeBytes.toLocaleString()} bytes</dd>
          </div>
          <div>
            <dt className="text-slate-500">加载耗时</dt>
            <dd className="mt-1 font-mono text-xs text-slate-950">{loadTimeMs === null ? '-' : `${loadTimeMs} ms`}</dd>
          </div>
          <div>
            <dt className="text-slate-500">mesh 数量</dt>
            <dd data-testid="glb-mesh-count" className="mt-1 font-mono text-xs text-slate-950">
              {meshCount}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">当前选中 mesh.name</dt>
            <dd data-testid="glb-selected-mesh-name" className="mt-1 break-words font-mono text-xs text-slate-950">
              {selectedMeshName}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">是否能点击 mesh</dt>
            <dd className={`mt-1 font-medium ${clickVerified ? 'text-emerald-700' : 'text-slate-600'}`}>
              {clickVerified ? '已验证' : '等待点击'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">技术映射 muscleId</dt>
            <dd data-testid="glb-technical-muscle-id" className="mt-1 font-mono text-xs text-slate-950">
              {selectedMeshName === '未选择' ? '-' : glbTechnicalMuscleId}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          data-testid="select-glb-test-mesh"
          disabled={!firstMesh}
          onClick={() => {
            if (firstMesh) {
              selectMesh(firstMesh);
            }
          }}
          className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          选择首个 GLB mesh
        </button>
      </aside>
    </section>
  );
}
