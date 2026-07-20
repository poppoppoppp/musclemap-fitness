import type { CaptureLabError } from './captureLabTypes';

export function describeCameraError(error: unknown): CaptureLabError {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { code: 'CAMERA_PERMISSION_DENIED', title: '未获得摄像头权限', message: '浏览器拒绝了摄像头访问。请在站点权限中允许摄像头后重试。', recoverable: true };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return { code: 'CAMERA_NOT_FOUND', title: '没有可用摄像头', message: '当前设备没有检测到可用的视频输入设备。', recoverable: false };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return { code: 'CAMERA_BUSY', title: '摄像头无法启动', message: '摄像头可能被其他应用占用，或设备暂时不可读。', recoverable: true };
  }
  if (name === 'OverconstrainedError') {
    return { code: 'CAMERA_CONSTRAINT_FAILED', title: '摄像头规格不兼容', message: '设备无法满足当前视频规格，请更换摄像头或浏览器。', recoverable: true };
  }
  return {
    code: 'CAMERA_START_FAILED',
    title: '摄像头启动失败',
    message: error instanceof Error ? error.message : '浏览器返回了未知摄像头错误。',
    recoverable: true,
  };
}
