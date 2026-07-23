import type { PostureScreeningSession } from '../repositories/postureScreeningRepository';
import type { PostureMeasurementError } from '../types/postureScreening';
import { postureScreeningEvidence } from '../data/posture/postureScreeningEvidence';

export interface PostureMeasurementComparison {
  kind: 'within-error' | 'beyond-error' | 'uncertain' | 'not-comparable';
  difference: number;
  summary: string;
  metricId?: string;
  method?: string;
  valueLabel?: string;
  comparisonKey?: string;
  baseline?: number;
  current?: number;
  unit?: string;
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
  if (current.context?.baselineSessionId !== baseline.id) {
    return { status: 'not-comparable', summary: '当前记录未关联这次基线筛查，不能做趋势判断。', measurements: [] };
  }
  if (baseline.captureSnapshot || current.captureSnapshot) return compareCaptureSnapshots(baseline, current);
  if (baseline.result.algorithmVersion !== current.result.algorithmVersion || baseline.result.protocolVersion !== current.result.protocolVersion) {
    return { status: 'not-comparable', summary: '算法或筛查协议版本不一致，不能做趋势判断。', measurements: [] };
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

function compareCaptureSnapshots(baseline: PostureScreeningSession, current: PostureScreeningSession): PostureSessionComparison {
  if (!baseline.captureSnapshot || !current.captureSnapshot || baseline.captureSnapshot.protocolVersion !== current.captureSnapshot.protocolVersion) {
    return { status: 'not-comparable', summary: '自动采集协议不一致，不能比较数值。', measurements: [] };
  }
  const baselineMetrics = flattenCaptureMetrics(baseline);
  const measurements = flattenCaptureMetrics(current).flatMap((currentMetric) => {
    const baselineMetric = baselineMetrics.find(({ key }) => key === currentMetric.key);
    if (!baselineMetric) return [];
    const difference = currentMetric.value - baselineMetric.value;
    return [{
      kind: 'uncertain' as const,
      difference,
      summary: `数值差异 ${formatAutomatedDifference(difference, currentMetric.unit)}；仅表示同方法指标的数值变化，不代表改善、恶化或诊断。`,
      metricId: currentMetric.metricId,
      method: currentMetric.method,
      valueLabel: currentMetric.valueLabel,
      comparisonKey: currentMetric.key,
      baseline: baselineMetric.value,
      current: currentMetric.value,
      unit: currentMetric.unit,
    }];
  });
  return measurements.length
    ? { status: 'comparable', summary: '仅比较采集协议、方法、动作、视角、指标、单位和算法版本完全一致的保存快照。', measurements }
    : { status: 'not-comparable', summary: '两次自动采集没有方法与版本完全一致的可计算指标。', measurements: [] };
}

interface FlattenedCaptureMetric {
  key: string;
  method: string;
  metricId: string;
  valueLabel: string;
  value: number;
  unit: string;
}

function flattenCaptureMetrics(session: PostureScreeningSession): FlattenedCaptureMetric[] {
  const snapshot = session.captureSnapshot;
  if (!snapshot) return [];
  const rows: FlattenedCaptureMetric[] = [];
  for (const capture of snapshot.staticCaptures) {
    if (capture.status === 'unavailable') continue;
    addMetrics(rows, snapshot.protocolVersion, `static:${capture.view}:${capture.visibleSide ?? 'none'}`, capture.metrics);
  }
  for (const movement of snapshot.movements) {
    if (movement.status !== 'valid') continue;
    addMetrics(rows, snapshot.protocolVersion, `movement:${movement.action}:${movement.view}:${movement.visibleSide ?? 'none'}`, movement.metrics);
  }
  return rows;
}

function addMetrics(rows: FlattenedCaptureMetric[], protocolVersion: string, method: string, metrics: NonNullable<PostureScreeningSession['captureSnapshot']>['movements'][number]['metrics']): void {
  for (const metric of metrics) {
    if (metric.status !== 'valid' || metric.quality !== 'valid') continue;
    for (const value of metric.values) {
      const key = [protocolVersion, method, metric.metricId, value.label, value.unit, metric.analysisVersion].join('|');
      rows.push({ key, method, metricId: metric.metricId, valueLabel: value.label, value: value.value, unit: value.unit });
    }
  }
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

function formatAutomatedDifference(value: number, unit: string): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value.toFixed(3))} ${unit}`;
}

function formatDifference(value: number, unit: 'deg' | 'ratio', includePlus: boolean): string {
  const sign = includePlus && value > 0 ? '+' : '';
  return `${sign}${formatValue(value, unit)}`;
}

function formatValue(value: number, unit: 'deg' | 'ratio'): string {
  return unit === 'deg' ? `${value.toFixed(1)}°` : `${value.toFixed(3)}（图像比例）`;
}
