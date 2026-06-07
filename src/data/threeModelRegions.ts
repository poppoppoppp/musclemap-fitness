import { upperBodyLocalMeshMappings } from './upperBodyLocalMeshMappings';
import { lowerBodyLocalMeshMappings } from './lowerBodyLocalMeshMappings';

export type ThreeModelRegionId =
  | 'back-partial'
  | 'box-test'
  | 'front-upper'
  | 'chest'
  | 'legs'
  | 'shoulders-arms'
  | 'core';

export type ThreeModelRegionView = 'posterior' | 'anterior' | 'side' | 'test';

export interface ThreeModelRegion {
  id: ThreeModelRegionId;
  label: string;
  view: ThreeModelRegionView;
  modelPath?: string;
  isPrivateModel: boolean;
  isConfigured: boolean;
  isExperimental: boolean;
  description: string;
  limitations?: string[];
  mappings: Record<string, string>;
}

const backPartialMappings: Record<string, string> = {
  Simplified_left_latissimus_dorsi: 'latissimus-dorsi',
  Simplified_right_latissimus_dorsi: 'latissimus-dorsi',
  Right_rhomboid_major: 'rhomboids',
  Left_rhomboid_major: 'rhomboids',
  Right_rhomboid_minor: 'rhomboids',
  Left_rhomboid_minor: 'rhomboids',
  Ascending_part_of_right_trapezius: 'middle-lower-trapezius',
  Ascending_part_of_left_trapezius: 'middle-lower-trapezius',
  Transverse_part_of_right_trapezius: 'middle-lower-trapezius',
  Transverse_part_of_left_trapezius: 'middle-lower-trapezius',
  Right_teres_major: 'teres-major',
  Left_teres_major: 'teres-major',
  Spinal_part_of_right_deltoid: 'rear-deltoid',
  Spinal_part_of_left_deltoid: 'rear-deltoid',
  Right_iliocostalis_lumborum: 'erector-spinae',
  Left_iliocostalis_lumborum: 'erector-spinae',
  Right_iliocostalis_thoracis: 'erector-spinae',
  Left_iliocostalis_thoracis: 'erector-spinae',
  Right_longissimus_thoracis: 'erector-spinae',
  Left_longissimus_thoracis: 'erector-spinae',
  Right_spinalis_thoracis: 'erector-spinae',
  Left_spinalis_thoracis: 'erector-spinae'
};

const placeholderDescription = '暂未配置模型资源';

const frontUpperMappings: Record<string, string> = {
  ...upperBodyLocalMeshMappings,
  Simplified_left_pectoralis_major: 'pectoralis-major',
  Simplified_right_pectoralis_major: 'pectoralis-major',
  Simplified_left_front_deltoid: 'anterior-deltoid',
  Simplified_right_front_deltoid: 'anterior-deltoid',
  Simplified_left_side_deltoid: 'lateral-deltoid',
  Simplified_right_side_deltoid: 'lateral-deltoid',
  Simplified_left_biceps: 'biceps-brachii',
  Simplified_right_biceps: 'biceps-brachii',
  Simplified_left_triceps: 'triceps-brachii',
  Simplified_right_triceps: 'triceps-brachii',
  Simplified_rectus_abdominis: 'rectus-abdominis',
  Simplified_left_obliques: 'obliques',
  Simplified_right_obliques: 'obliques'
};

const lowerBodyMappings: Record<string, string> = {
  ...lowerBodyLocalMeshMappings,
  Simplified_left_gluteus_maximus: 'gluteus-maximus',
  Simplified_right_gluteus_maximus: 'gluteus-maximus',
  Simplified_left_quadriceps: 'quadriceps',
  Simplified_right_quadriceps: 'quadriceps',
  Simplified_left_hamstrings: 'hamstrings',
  Simplified_right_hamstrings: 'hamstrings',
  Simplified_left_calves: 'calves',
  Simplified_right_calves: 'calves'
};

export const threeModelRegions: ThreeModelRegion[] = [
  {
    id: 'back-partial',
    label: '背部局部模型',
    view: 'posterior',
    modelPath: '/models/private/local-anatomy.glb',
    isPrivateModel: true,
    isConfigured: true,
    isExperimental: true,
    description: '该模型仅用于本地真实模型实验，用于验证 mesh 点击、高亮和映射。',
    limitations: [
      '当前模型未包含 latissimus-dorsi / 背阔肌真实 mesh',
      '背阔肌当前使用简化 3D 示意区域补充选择入口',
      '仅用于本地实验',
      '不进入正式产品资源'
    ],
    mappings: backPartialMappings
  },
  {
    id: 'box-test',
    label: 'GLB 管线测试',
    view: 'test',
    modelPath: '/models/demo/BoxTextured.glb',
    isPrivateModel: false,
    isConfigured: true,
    isExperimental: false,
    description: '用于验证 GLBLoader 管线，不代表真实人体或肌群结构。',
    mappings: {}
  },
  {
    id: 'front-upper',
    label: '正面上半身',
    view: 'anterior',
    isPrivateModel: false,
    isConfigured: true,
    isExperimental: true,
    description:
      '当前使用产品级简化 3D 示意区域和可点击 hotspot，让用户先通过 3D 入口选择胸、肩、手臂和核心训练部位；不是精确真实解剖模型，后续可替换为真实模型资源。',
    limitations: [
      '当前使用简化 3D 示意区域 / hotspot，不依赖真实模型文件',
      '不是精确真实解剖模型，肌群位置用于训练部位入口而非解剖教学',
      '后续可逐步替换为真实人体或肌群模型资源'
    ],
    mappings: frontUpperMappings
  },
  {
    id: 'chest',
    label: '胸部',
    view: 'anterior',
    isPrivateModel: false,
    isConfigured: false,
    isExperimental: false,
    description: placeholderDescription,
    mappings: {}
  },
  {
    id: 'legs',
    label: '臀腿',
    view: 'anterior',
    modelPath: '/models/private/lower-body-local.glb',
    isPrivateModel: true,
    isConfigured: true,
    isExperimental: true,
    description:
      '有本地 lower-body-local.glb 时使用 BodyParts3D 臀腿真实肌肉 mesh；缺少本地模型时自动回退到简化 hotspot。',
    limitations: [
      '本地 lower-body-local.glb 来源于 BodyParts3D OBJ，仅用于本地自用',
      '模型文件位于 public/models/private/，被 Git 忽略，不进入正式 build',
      '缺少本地模型时自动回退到简化 hotspot，保证手机自用主流程不断'
    ],
    mappings: lowerBodyMappings
  },
  {
    id: 'shoulders-arms',
    label: '肩臂',
    view: 'side',
    isPrivateModel: false,
    isConfigured: false,
    isExperimental: false,
    description: placeholderDescription,
    mappings: {}
  },
  {
    id: 'core',
    label: '核心',
    view: 'anterior',
    isPrivateModel: false,
    isConfigured: false,
    isExperimental: false,
    description: placeholderDescription,
    mappings: {}
  }
];
