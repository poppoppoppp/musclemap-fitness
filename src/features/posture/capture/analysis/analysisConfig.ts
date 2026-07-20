import type { PostureMovementAction } from '../../../../types/postureAnalysis';

export interface MovementPaceCue {
  label: string;
  instruction: string;
  startRatio: number;
  endRatio: number;
}

export interface DynamicMovementConfig {
  id: PostureMovementAction;
  label: string;
  help: string;
  view: 'front' | 'side';
  durationMs: number;
  analysisFps: 5;
  captureFps: 15;
  maxFrames: 40;
  countdownMs: 3000;
  paceCues: readonly MovementPaceCue[];
}

export const DYNAMIC_MOVEMENT_CONFIGS: Record<PostureMovementAction, DynamicMovementConfig> = {
  'bilateral-arm-raise': {
    id: 'bilateral-arm-raise', label: '双臂上举', help: '正面：缓慢抬起、短暂停留、缓慢放下', view: 'front',
    durationMs: 6000, analysisFps: 5, captureFps: 15, maxFrames: 40, countdownMs: 3000,
    paceCues: [
      { label: '抬起', instruction: '缓慢将双臂举过头顶', startRatio: 0, endRatio: 0.42 },
      { label: '停留', instruction: '在最高位置短暂停留', startRatio: 0.42, endRatio: 0.60 },
      { label: '放下', instruction: '缓慢放回起始位置', startRatio: 0.60, endRatio: 1 },
    ],
  },
  'bodyweight-squat': {
    id: 'bodyweight-squat', label: '徒手深蹲', help: '正面：缓慢下蹲、短暂停留、缓慢站起', view: 'front',
    durationMs: 8000, analysisFps: 5, captureFps: 15, maxFrames: 40, countdownMs: 3000,
    paceCues: [
      { label: '下蹲', instruction: '缓慢下蹲', startRatio: 0, endRatio: 0.42 },
      { label: '停留', instruction: '在最低位置短暂停留', startRatio: 0.42, endRatio: 0.58 },
      { label: '站起', instruction: '缓慢站回起始位置', startRatio: 0.58, endRatio: 1 },
    ],
  },
  'neck-retraction': {
    id: 'neck-retraction', label: '颈部回缩', help: '侧面：回缩、短暂停留、恢复', view: 'side',
    durationMs: 6000, analysisFps: 5, captureFps: 15, maxFrames: 40, countdownMs: 3000,
    paceCues: [
      { label: '回缩', instruction: '头部保持水平，缓慢向后回缩', startRatio: 0, endRatio: 0.42 },
      { label: '停留', instruction: '在回缩位置短暂停留', startRatio: 0.42, endRatio: 0.60 },
      { label: '恢复', instruction: '缓慢恢复起始位置', startRatio: 0.60, endRatio: 1 },
    ],
  },
};
