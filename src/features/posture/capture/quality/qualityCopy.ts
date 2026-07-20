import type { CaptureQualityEvaluation } from '../captureLabTypes';

export const QUALITY_RULE_LABELS: Record<keyof CaptureQualityEvaluation['rules'], string> = {
  wholeBody: '全身入镜',
  head: '头部可见',
  shoulders: '肩部可见',
  hips: '髋部可见',
  knees: '膝部可见',
  ankles: '踝部可见',
  distance: '拍摄距离',
  centering: '画面居中',
  stance: '站位方向',
  occlusion: '关键点遮挡',
  stability: '身体稳定',
  lighting: '环境亮度',
  sharpness: '画面清晰',
};

export const QUALITY_REASON_COPY: Record<string, string> = {
  WHOLE_BODY_INCOMPLETE: '请确保头、肩、髋、膝和脚踝完整入镜',
  BODY_TOO_FAR: '距离较远，请向镜头靠近一些',
  BODY_TOO_NEAR: '距离过近，请后退并保留身体边缘空间',
  BODY_OFF_CENTER: '身体偏离画面中心，请横向调整位置',
  FRONT_STANCE_NOT_PLAUSIBLE: '请正对镜头自然站立',
  SIDE_STANCE_NOT_PLAUSIBLE: '请侧对镜头，肩部和髋部保持侧向',
  BACK_DIRECTION_USER_SELECTED: '背面方向由你确认，系统仅检查构图与稳定性',
  KEYPOINT_OCCLUDED_OR_UNRELIABLE: '部分关键点可能被衣物、手臂或物体遮挡',
  BODY_NOT_STABLE: '请保持自然站立，暂时不要移动',
  IMAGE_TOO_DARK: '画面过暗，请增加正面或侧前方光线',
  IMAGE_TOO_BLURRY: '画面明显模糊，请固定手机并清洁镜头',
  BODY_CENTER_UNKNOWN: '尚未获得可靠的肩髋中心',
  BODY_DISTANCE_UNKNOWN: '尚未获得可靠的全身范围',
  STANCE_POINTS_UNRELIABLE: '肩部或髋部关键点不足，无法检查站位',
};

export function describeQualityReason(reasonCode?: string) {
  if (!reasonCode) return '通过';
  if (QUALITY_REASON_COPY[reasonCode]) return QUALITY_REASON_COPY[reasonCode];
  if (reasonCode.includes('SHOULDER')) return '肩部关键点不可见或不可靠';
  if (reasonCode.includes('HIP')) return '髋部关键点不可见或不可靠';
  if (reasonCode.includes('KNEE')) return '膝部关键点不可见或不可靠';
  if (reasonCode.includes('ANKLE') || reasonCode.includes('HEEL') || reasonCode.includes('FOOT')) return '脚踝或足部关键点不可见或靠近边缘';
  if (reasonCode.includes('EAR') || reasonCode.includes('NOSE')) return '头部关键点不可见或靠近边缘';
  return reasonCode;
}
