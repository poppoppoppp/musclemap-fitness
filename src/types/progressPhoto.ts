export const progressPhotoCategories = [
  'face', 'full_front', 'full_side', 'full_back', 'shoulders', 'chest', 'biceps', 'forearms', 'abs',
  'front_thigh', 'front_calf', 'back', 'triceps', 'glutes', 'rear_thigh', 'rear_calf'
] as const;

export type ProgressPhotoCategory = typeof progressPhotoCategories[number];
export type ProgressPhotoGroup = 'face' | 'full' | 'local';

export interface ProgressPhotoRecord {
  id: string;
  category: ProgressPhotoCategory;
  date: string;
  blobId: string;
  note?: string;
  width?: number;
  height?: number;
  orientation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressPhotoInput {
  category: ProgressPhotoCategory;
  date: string;
  blob: Blob;
  note?: string;
  width?: number;
  height?: number;
  orientation?: string;
}

export const progressPhotoCategoryLabels: Record<ProgressPhotoCategory, string> = {
  face: '面部', full_front: '全身正面', full_side: '全身侧面', full_back: '全身背面', shoulders: '肩部',
  chest: '胸部', biceps: '二头', forearms: '前臂', abs: '腹部', front_thigh: '大腿前侧', front_calf: '小腿前侧',
  back: '背部', triceps: '三头', glutes: '臀部', rear_thigh: '大腿后侧', rear_calf: '小腿后侧'
};

export function getProgressPhotoGroup(category: ProgressPhotoCategory): ProgressPhotoGroup {
  if (category === 'face') return 'face';
  if (category.startsWith('full_')) return 'full';
  return 'local';
}
