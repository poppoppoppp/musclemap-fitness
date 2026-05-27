export type ThreeModelRegionId =
  | 'back-partial'
  | 'box-test'
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
    label: '腿部',
    view: 'anterior',
    isPrivateModel: false,
    isConfigured: false,
    isExperimental: false,
    description: placeholderDescription,
    mappings: {}
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
