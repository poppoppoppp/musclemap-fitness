import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import PageHeader from '../components/layout/PageHeader';
import { getMuscleById } from '../data/muscles';
import { threeModelRegions, type ThreeModelRegion } from '../data/threeModelRegions';

type RegionMeshInfo = {
  name: string;
  mesh: THREE.Mesh;
};

const DEFAULT_REGION_ID = 'back-partial';
const UNSELECTED_MESH_LABEL = '未选择';
const UNMAPPED_LABEL = '未映射';

export default function ThreeMuscleDemo() {
  const [selectedRegionId, setSelectedRegionId] = useState(DEFAULT_REGION_ID);
  const selectedRegion = useMemo(
    () => threeModelRegions.find((region) => region.id === selectedRegionId) ?? threeModelRegions[0],
    [selectedRegionId]
  );

  return (
    <div className="space-y-4 overflow-x-hidden">
      <PageHeader
        title="3D 肌群模型技术预研"
        description="该页面为实验 Demo，不影响正式肌群地图。当前模型区域由本地注册表管理，用于验证 GLB 加载、mesh 点击、高亮和映射。"
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">模型区域</h2>
        <div data-testid="three-region-selector" className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {threeModelRegions.map((region) => (
            <button
              key={region.id}
              type="button"
              data-testid={`select-three-region-${region.id}`}
              onClick={() => setSelectedRegionId(region.id)}
              className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition ${
                selectedRegion.id === region.id
                  ? 'border-amber-500 bg-amber-50 text-amber-950'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="block">{region.label}</span>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {region.isConfigured ? region.id : `${region.id} · 未配置`}
              </span>
            </button>
          ))}
        </div>
      </section>

      <RegionModelExperiment key={selectedRegion.id} region={selectedRegion} />
    </div>
  );
}

function RegionModelExperiment({ region }: { region: ThreeModelRegion }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const meshesRef = useRef<RegionMeshInfo[]>([]);
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);
  const [loadStatus, setLoadStatus] = useState(region.isConfigured ? '等待加载' : '未配置');
  const [modelAvailable, setModelAvailable] = useState(false);
  const [meshCount, setMeshCount] = useState(0);
  const [selectedMeshName, setSelectedMeshName] = useState(UNSELECTED_MESH_LABEL);

  const selectedMuscleId =
    selectedMeshName === UNSELECTED_MESH_LABEL ? undefined : region.mappings[selectedMeshName];
  const selectedMuscle = selectedMuscleId ? getMuscleById(selectedMuscleId) : undefined;
  const hasSelectedMesh = selectedMeshName !== UNSELECTED_MESH_LABEL;

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

  useEffect(() => {
    setSelectedMeshName(UNSELECTED_MESH_LABEL);
    setMeshCount(0);
    setModelAvailable(false);
    meshesRef.current = [];
    selectedMeshRef.current = null;

    const mount = mountRef.current;
    if (!mount || !region.isConfigured || !region.modelPath) {
      setLoadStatus('未配置');
      return undefined;
    }

    const modelPath = region.modelPath;
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
  }, [region]);

  const firstMesh = meshesRef.current[0];
  const mappedMuscleLabel = selectedMuscle?.nameZh ?? (hasSelectedMesh ? UNMAPPED_LABEL : UNMAPPED_LABEL);

  return (
    <section
      data-testid="region-model-experiment"
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="min-w-0">
        <div className="mb-3">
          <h2 data-testid="three-current-region-label" className="text-lg font-semibold text-slate-950">
            {region.label}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{region.description}</p>
        </div>

        {!region.isConfigured && (
          <div data-testid="three-region-placeholder" className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            暂未配置模型资源
          </div>
        )}

        {region.isConfigured && !modelAvailable && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">{region.isPrivateModel ? '未检测到模型文件。' : '模型文件暂不可用。'}</p>
            <p className="mt-2">
              {region.isPrivateModel
                ? `请将本地实验用 .glb 放到 ${region.modelPath}。`
                : `请检查模型路径 ${region.modelPath}。`}
            </p>
            {region.isPrivateModel && <p className="mt-2">该目录已被 Git 忽略，模型不会进入提交。</p>}
          </div>
        )}

        <div
          ref={mountRef}
          data-testid="three-muscle-canvas"
          className={
            region.isConfigured && modelAvailable
              ? 'h-[320px] w-full touch-none rounded-md border border-slate-100 bg-slate-50 sm:h-[420px]'
              : 'hidden'
          }
          aria-label={`${region.label} 3D 模型画布`}
        />

        <button
          type="button"
          data-testid="select-glb-test-mesh"
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
      </div>

      <aside className="min-w-0">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">region id</dt>
            <dd className="mt-1 font-mono text-xs text-slate-950">{region.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500">modelPath</dt>
            <dd data-testid="three-current-region-path" className="mt-1 break-words font-mono text-xs text-slate-950">
              {region.modelPath ?? '未配置'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">private</dt>
            <dd data-testid="three-current-region-private" className="mt-1 font-medium text-slate-950">
              {region.isPrivateModel ? 'private' : 'public'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">experimental</dt>
            <dd data-testid="three-current-region-experimental" className="mt-1 font-medium text-slate-950">
              {region.isExperimental ? 'experimental' : 'stable test'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">加载状态</dt>
            <dd data-testid="glb-load-status" className="mt-1 font-medium text-slate-950">
              {loadStatus}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">mesh 数量</dt>
            <dd data-testid="glb-mesh-count" className="mt-1 font-mono text-xs text-slate-950">
              {meshCount}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">当前 mesh.name</dt>
            <dd data-testid="glb-selected-mesh-name" className="mt-1 break-words font-mono text-xs text-slate-950">
              {selectedMeshName}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">muscleId</dt>
            <dd data-testid="three-selected-muscle-id" className="mt-1 font-mono text-xs text-slate-950">
              {selectedMuscleId ?? UNMAPPED_LABEL}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">中文肌肉名</dt>
            <dd data-testid="three-selected-muscle-name" className="mt-1 font-medium text-slate-950">
              {mappedMuscleLabel}
            </dd>
          </div>
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
      </aside>
    </section>
  );
}
