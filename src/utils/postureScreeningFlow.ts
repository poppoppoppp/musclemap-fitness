import type { PostureCaptureSnapshot, PostureScreeningDraft, PostureScreeningDraftStep } from '../repositories/postureScreeningRepository';

export const POSTURE_AUTOMATED_CAPTURE_STEPS = [
  { id: 'static-front', label: '正面静态', kind: 'static', value: 'front' },
  { id: 'static-side', label: '侧面静态', kind: 'static', value: 'side' },
  { id: 'static-back', label: '背面静态', kind: 'static', value: 'back' },
  { id: 'dynamic-arm-raise', label: '双臂上举', kind: 'movement', value: 'bilateral-arm-raise' },
  { id: 'dynamic-squat', label: '徒手深蹲', kind: 'movement', value: 'bodyweight-squat' },
  { id: 'dynamic-neck-retraction', label: '颈部回缩', kind: 'movement', value: 'neck-retraction' },
] as const;

export type PostureAutomatedCaptureStep = typeof POSTURE_AUTOMATED_CAPTURE_STEPS[number]['id'];
export type PostureScreeningActiveStep = 'boundary' | 'safety' | 'concern' | 'movement' | PostureAutomatedCaptureStep;

export function resolvePostureScreeningDraftStep(draft: PostureScreeningDraft | null | undefined): PostureScreeningActiveStep {
  const step = draft?.currentStep;
  if (step === 'safety' || step === 'concern' || step === 'movement') return step;
  if (step === 'follow-up') return 'concern';
  if (step === 'photo' || step === 'review') return 'static-front';
  if (!isAutomatedCaptureStep(step)) return 'boundary';

  const desiredIndex = POSTURE_AUTOMATED_CAPTURE_STEPS.findIndex(({ id }) => id === step);
  const missingPrerequisite = POSTURE_AUTOMATED_CAPTURE_STEPS
    .slice(0, desiredIndex)
    .find((candidate) => !hasCaptureEvidence(draft?.captureSnapshot, candidate));
  return missingPrerequisite?.id ?? step;
}

export function nextPostureCaptureStep(step: PostureAutomatedCaptureStep): PostureAutomatedCaptureStep | null {
  const index = POSTURE_AUTOMATED_CAPTURE_STEPS.findIndex(({ id }) => id === step);
  return POSTURE_AUTOMATED_CAPTURE_STEPS[index + 1]?.id ?? null;
}

export function previousPostureCaptureStep(step: PostureAutomatedCaptureStep): PostureScreeningActiveStep {
  const index = POSTURE_AUTOMATED_CAPTURE_STEPS.findIndex(({ id }) => id === step);
  return POSTURE_AUTOMATED_CAPTURE_STEPS[index - 1]?.id ?? 'movement';
}

export function isPostureCaptureSequenceComplete(snapshot: PostureCaptureSnapshot | undefined): boolean {
  if (!snapshot || snapshot.staticCaptures.length !== 3 || snapshot.movements.length !== 3) return false;
  return POSTURE_AUTOMATED_CAPTURE_STEPS.every((step) => hasCaptureEvidence(snapshot, step));
}

function hasCaptureEvidence(snapshot: PostureCaptureSnapshot | undefined, step: typeof POSTURE_AUTOMATED_CAPTURE_STEPS[number]): boolean {
  if (!snapshot) return false;
  return step.kind === 'static'
    ? snapshot.staticCaptures.some(({ view }) => view === step.value)
    : snapshot.movements.some(({ action }) => action === step.value);
}

function isAutomatedCaptureStep(step: PostureScreeningDraftStep | undefined): step is PostureAutomatedCaptureStep {
  return POSTURE_AUTOMATED_CAPTURE_STEPS.some(({ id }) => id === step);
}
