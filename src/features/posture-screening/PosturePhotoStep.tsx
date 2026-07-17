import { useEffect, useRef, useState } from 'react';
import type { PosturePhotoMeasurementSnapshot, PostureScreeningRepository } from '../../repositories/postureScreeningRepository';
import {
  calculateCraniovertebralAngle,
  calculateFrontalHeadTilt,
  calculateFrontalShoulderHeightDifference,
  calculateFrontalTrunkDeviation,
  calculateLateralShoulderAngle,
  calculateLateralTrunkInclination,
  validatePosturePhotoCapture,
  type NormalizedPoint,
  type PostureLandmarkId,
  type PostureMeasurementResult,
  type PosturePhotoView,
} from '../../utils/posturePhotogrammetry';
import PostureLandmarkEditor, { getPostureLandmarkDefinitions } from './PostureLandmarkEditor';
import PosturePhotoGuide from './PosturePhotoGuide';
import useLocalPosturePhoto from './useLocalPosturePhoto';

interface Props {
  draftId: string;
  repository: PostureScreeningRepository;
  onBack: () => void;
  onSkip: () => void;
  onUsePhoto: (measurement: PosturePhotoMeasurementSnapshot) => void;
}

export default function PosturePhotoStep({ draftId, repository, onBack, onSkip, onUsePhoto }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const saveLock = useRef(false);
  const [view, setView] = useState<PosturePhotoView>('front');
  const [standingConfirmed, setStandingConfirmed] = useState(false);
  const [landmarks, setLandmarks] = useState<Partial<Record<PostureLandmarkId, NormalizedPoint>>>({});
  const [qualityError, setQualityError] = useState('');
  const [saving, setSaving] = useState(false);
  const localPhoto = useLocalPosturePhoto();
  useEffect(() => { titleRef.current?.focus(); }, []);

  const changeView = (nextView: PosturePhotoView) => {
    if (nextView === view) return;
    localPhoto.clear();
    setView(nextView);
    setStandingConfirmed(false);
    setLandmarks({});
    setQualityError('');
  };

  const selectFile = async (file?: File) => {
    if (!file) return;
    setLandmarks({});
    setQualityError('');
    await localPhoto.selectFile(file);
  };

  const save = async () => {
    if (saveLock.current) return;
    if (!localPhoto.photo) {
      setQualityError('请先拍摄或选择照片。');
      return;
    }
    const quality = validatePosturePhotoCapture({
      view,
      imageWidth: localPhoto.photo.width,
      imageHeight: localPhoto.photo.height,
      standingConfirmed,
      landmarks,
    });
    if (!quality.ok) {
      setQualityError(formatQualityErrors(view, quality.reasonCodes));
      return;
    }

    saveLock.current = true;
    setSaving(true);
    setQualityError('');
    const saved = await repository.savePhotoAsset({
      ownerId: draftId,
      view,
      blob: localPhoto.photo.file,
      width: localPhoto.photo.width,
      height: localPhoto.photo.height,
    });
    if (!saved.ok) {
      saveLock.current = false;
      setSaving(false);
      setQualityError('照片无法保存到当前设备，请重试或跳过照片。');
      return;
    }
    onUsePhoto({
      view,
      protocolVersion: 'posture-photo-standard-v1',
      photoAssetId: saved.asset.id,
      photoAssetAvailable: true,
      landmarks,
      measurements: calculateMeasurements(view, landmarks),
      quality: 'valid',
    });
  };

  return (
    <section className="mt-7" aria-labelledby="photo-step-title">
      <h2 ref={titleRef} tabIndex={-1} id="photo-step-title" className="text-xl font-black outline-none">可选照片测量</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">照片只用于手动几何测量。系统不会自动识别身体结构，也不会仅凭照片确认体态问题。</p>
      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4"><PosturePhotoGuide view={view} onChange={changeView} /></div>
      <div className="mt-5">
        <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-black text-zinc-100 outline-none focus-within:ring-2 focus-within:ring-lime-200">
          拍摄或从相册选择照片
          <input type="file" accept="image/*" capture="environment" aria-label="拍摄或从相册选择照片" onChange={(event) => { void selectFile(event.target.files?.[0]); event.currentTarget.value = ''; }} className="sr-only" />
        </label>
        <p className="mt-2 text-center text-xs leading-5 text-zinc-400">照片仅保存在当前设备，不会随备份导出。</p>
      </div>
      {localPhoto.loading ? <p role="status" className="mt-4 text-sm text-zinc-300">正在读取照片…</p> : null}
      {localPhoto.error || qualityError ? <p role="alert" className="mt-4 rounded-xl border border-red-300/25 bg-red-300/[0.06] px-3 py-3 text-sm leading-5 text-red-100">{localPhoto.error || qualityError}</p> : null}
      {localPhoto.photo ? <>
        <PostureLandmarkEditor view={view} imageUrl={localPhoto.photo.url} imageWidth={localPhoto.photo.width} imageHeight={localPhoto.photo.height} landmarks={landmarks} onChange={(value) => { setLandmarks(value); setQualityError(''); }} />
        <label className="mt-4 flex min-h-12 items-start gap-3 rounded-xl border border-white/10 px-3 py-3 text-sm font-semibold leading-5 text-zinc-100"><input type="checkbox" checked={standingConfirmed} onChange={(event) => { setStandingConfirmed(event.target.checked); setQualityError(''); }} className="mt-0.5 h-5 w-5 shrink-0 accent-lime-300" />我已按引导自然站立，未刻意调整体态</label>
        <button type="button" disabled={saving} onClick={() => { void save(); }} className="mt-4 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] outline-none focus-visible:ring-2 focus-visible:ring-lime-100 disabled:bg-zinc-700 disabled:text-zinc-400">{saving ? '正在保存照片…' : '保存照片并继续'}</button>
      </> : null}
      <button type="button" onClick={onSkip} className="mt-3 min-h-12 w-full rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-lime-200">暂不使用照片，生成结果</button>
      <button type="button" onClick={onBack} className="mt-2 min-h-11 w-full px-4 text-sm font-bold text-zinc-400 outline-none focus-visible:text-white focus-visible:ring-2 focus-visible:ring-lime-200">返回修改观察</button>
    </section>
  );
}

function calculateMeasurements(view: PosturePhotoView, landmarks: Partial<Record<PostureLandmarkId, NormalizedPoint>>): PosturePhotoMeasurementSnapshot['measurements'] {
  const results: PostureMeasurementResult[] = view === 'left-lateral'
    ? [
        calculateCraniovertebralAngle(landmarks.c7!, landmarks.tragus!),
        calculateLateralShoulderAngle(landmarks.c7!, landmarks.acromion!),
        calculateLateralTrunkInclination(landmarks.upperTrunk!, landmarks.lowerTrunk!),
      ]
    : [
        calculateFrontalHeadTilt(landmarks.leftEar!, landmarks.rightEar!),
        calculateFrontalShoulderHeightDifference(landmarks.leftAcromion!, landmarks.rightAcromion!),
        calculateFrontalTrunkDeviation(landmarks.upperTrunkMidline!, landmarks.lowerTrunkMidline!),
      ];
  return results.flatMap((result) => result.ok ? [{ metricId: result.metricId, value: result.value, unit: result.unit, evidenceIds: result.evidenceIds }] : []);
}

function formatQualityErrors(view: PosturePhotoView, reasonCodes: string[]): string {
  const definitions = getPostureLandmarkDefinitions(view);
  const labels = new Map(definitions.map(({ id, label }) => [toReasonLabel(id), label]));
  const missing = reasonCodes.flatMap((code) => code.startsWith('LANDMARK_MISSING_') ? [labels.get(code.slice('LANDMARK_MISSING_'.length)) ?? code] : []);
  const messages: string[] = [];
  if (missing.length) messages.push(`请标记：${missing.join('、')}。`);
  if (reasonCodes.includes('IMAGE_TOO_SMALL')) messages.push('照片短边至少需要 320 像素。');
  if (reasonCodes.includes('CAPTURE_PROTOCOL_UNCONFIRMED')) messages.push('请确认已按引导自然站立。');
  const outOfRange = reasonCodes.flatMap((code) => code.startsWith('POINT_OUT_OF_RANGE_') ? [labels.get(code.slice('POINT_OUT_OF_RANGE_'.length)) ?? code] : []);
  if (outOfRange.length) messages.push(`${outOfRange.join('、')}标点超出照片范围，请重新放置。`);
  for (let first = 0; first < definitions.length; first += 1) {
    for (let second = first + 1; second < definitions.length; second += 1) {
      const firstCode = toReasonLabel(definitions[first].id);
      const secondCode = toReasonLabel(definitions[second].id);
      const reasonCode = `POINTS_TOO_CLOSE_${[firstCode, secondCode].sort().join('_')}`;
      if (reasonCodes.includes(reasonCode)) messages.push(`${definitions[first].label}与 ${definitions[second].label} 标点过近，请分开。`);
    }
  }
  return messages.join(' ');
}

function toReasonLabel(landmark: PostureLandmarkId): string {
  return landmark.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}
