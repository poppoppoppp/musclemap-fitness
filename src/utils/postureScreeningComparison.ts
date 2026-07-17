import type { PostureScreeningSession } from '../repositories/postureScreeningRepository';
import type { PostureMeasurementError } from '../types/postureScreening';
import { postureScreeningEvidence } from '../data/posture/postureScreeningEvidence';

export interface PostureMeasurementComparison {
  kind: 'within-error' | 'beyond-error' | 'uncertain' | 'not-comparable';
  difference: number;
  summary: string;
  metricId?: string;
  baseline?: number;
  current?: number;
  unit?: 'deg' | 'ratio';
}

export interface PostureSessionComparison {
  status: 'comparable' | 'not-comparable';
  summary: string;
  measurements: PostureMeasurementComparison[];
}

export function describePostureMeasurementChange(baseline: number, current: number, measurementError: PostureMeasurementError): PostureMeasurementComparison {
  const difference = current - baseline;
  const unit = measurementError.status === 'reported' ? measurementError.unit : 'deg';
  const formattedDifference = formatDifference(difference, unit, true);
  if (measurementError.status !== 'reported' || measurementError.applicability !== 'direct') {
    return { kind: 'uncertain', difference, summary: `数值差异 ${formattedDifference}；当前协议缺少可直接使用的测量误差，不能判断是否为明确变化。` };
  }
  if (Math.abs(difference) <= measurementError.value) {
    return { kind: 'within-error', difference, summary: `未见明确变化（差值 ${formattedDifference}，处于测量误差 ±${formatValue(measurementError.value, unit)} 内）。` };
  }
  const direction = difference > 0 ? '上升' : '下降';
  return { kind: 'beyond-error', difference, summary: `数值${direction} ${formatValue(Math.abs(difference), unit)}，超出测量误差 ±${formatValue(measurementError.value, unit)}；不等同于改善或恶化。` };
}

export function comparePostureScreeningSessions(baseline: PostureScreeningSession, current: PostureScreeningSession): PostureSessionComparison {
  if (baseline.result.algorithmVersion !== current.result.algorithmVersion || baseline.result.protocolVersion !== current.result.protocolVersion) {
    return { status: 'not-comparable', summary: '算法或筛查协议版本不一致，不能做趋势判断。', measurements: [] };
  }
  if (current.context?.baselineSessionId !== baseline.id) {
    return { status: 'not-comparable', summary: '当前记录未关联这次基线筛查，不能做趋势判断。', measurements: [] };
  }
  if (!baseline.photoMeasurements.length || !current.photoMeasurements.length) {
    return { status: 'not-comparable', summary: '两次记录没有成对的照片测量，不能做数值趋势判断。', measurements: [] };
  }

  const measurements: PostureMeasurementComparison[] = [];
  for (const currentPhoto of current.photoMeasurements) {
    const baselinePhoto = baseline.photoMeasurements.find((photo) => photo.view === currentPhoto.view);
    if (!baselinePhoto || !baselinePhoto.protocolVersion || baselinePhoto.protocolVersion !== currentPhoto.protocolVersion) {
      return { status: 'not-comparable', summary: '照片测量方法或版本不一致，不能做趋势判断。', measurements: [] };
    }
    if (baselinePhoto.quality !== 'valid' || currentPhoto.quality !== 'valid') {
      return { status: 'not-comparable', summary: '任一次照片测量质量无效，不能做趋势判断。', measurements: [] };
    }
    for (const currentMeasurement of currentPhoto.measurements) {
      const baselineMeasurement = baselinePhoto.measurements.find((measurement) => measurement.metricId === currentMeasurement.metricId && measurement.unit === currentMeasurement.unit);
      if (!baselineMeasurement) continue;
      const measurementError = findMeasurementError([...baselineMeasurement.evidenceIds, ...currentMeasurement.evidenceIds]);
      const description = describePostureMeasurementChange(baselineMeasurement.value, currentMeasurement.value, measurementError);
      measurements.push({ ...description, metricId: currentMeasurement.metricId, baseline: baselineMeasurement.value, current: currentMeasurement.value, unit: currentMeasurement.unit });
    }
  }
  return measurements.length
    ? { status: 'comparable', summary: '两次记录使用相同方法；数值差需结合当前协议可用的测量误差解释。', measurements }
    : { status: 'not-comparable', summary: '两次记录没有相同指标，不能做趋势判断。', measurements: [] };
}

function findMeasurementError(evidenceIds: string[]): PostureMeasurementError {
  let reported: PostureMeasurementError | undefined;
  for (const id of [...new Set(evidenceIds)]) {
    const record = postureScreeningEvidence.find((item) => item.id === id);
    if (!record) continue;
    const measurementError: PostureMeasurementError = record.measurementError;
    if (measurementError.status !== 'reported') continue;
    if (measurementError.applicability === 'direct') return measurementError;
    reported ??= measurementError;
  }
  return reported ?? { status: 'not-established', context: '当前指标没有可直接用于本协议的测量误差。' };
}

function formatDifference(value: number, unit: 'deg' | 'ratio', includePlus: boolean): string {
  const sign = includePlus && value > 0 ? '+' : '';
  return `${sign}${formatValue(value, unit)}`;
}

function formatValue(value: number, unit: 'deg' | 'ratio'): string {
  return unit === 'deg' ? `${value.toFixed(1)}°` : `${value.toFixed(3)}（图像比例）`;
}
