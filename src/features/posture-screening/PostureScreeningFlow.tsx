import { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGuidedPostureTest } from '../../data/posture/postureScreeningTests';
import type { PosturePrimaryConcern } from '../../data/posture/postureScreeningQuestions';
import type { PostureCaptureSnapshot, PostureMovementCaptureSnapshot, PosturePhotoMeasurementSnapshot, PostureScreeningContext, PostureScreeningDraftStep, PostureScreeningRepository, PostureStaticCaptureSnapshot } from '../../repositories/postureScreeningRepository';
import { evaluatePostureScreening, type FunctionalPostureObservation, type PostureSafetyFlag, type PostureScreeningInput, type PostureTestStopSymptom, type SubjectivePostureObservation } from '../../utils/postureScreeningRules';
import { buildPostureCaptureSnapshot } from '../../utils/postureCaptureSnapshot';
import { buildPostureRecommendationSnapshots } from '../../utils/postureScreeningRecommendations';
import PostureAutomatedMovementStep from './PostureAutomatedMovementStep';
import PostureAutomatedStaticStep from './PostureAutomatedStaticStep';
import PostureBoundaryStep from './PostureBoundaryStep';
import PostureConcernStep from './PostureConcernStep';
import PostureMovementStep from './PostureMovementStep';
import PosturePhotoStep from './PosturePhotoStep';
import PostureSafetyStep from './PostureSafetyStep';
import PostureScreeningProgress from './PostureScreeningProgress';

type FlowStep = 'boundary' | 'safety' | 'concern' | 'movement' | 'photo' | 'review'
  | 'static-front' | 'static-side' | 'static-back'
  | 'dynamic-arm-raise' | 'dynamic-squat' | 'dynamic-neck-retraction';
type FlowAction = { type: 'go'; step: FlowStep };

export default function PostureScreeningFlow({ repository, entryContext }: { repository: PostureScreeningRepository; entryContext?: PostureScreeningContext }) {
  const navigate = useNavigate();
  const [draftRead] = useState(() => repository.readDraft());
  const replacingDraft = Boolean(entryContext && draftRead.value && !sameContext(entryContext, draftRead.value.context));
  const resumedDraft = replacingDraft ? null : draftRead.value;
  const answers = resumedDraft?.answers;
  const restoredStep = normalizeStep(resumedDraft?.currentStep);
  const [step, dispatch] = useReducer(flowReducer, restoredStep);
  const [age, setAge] = useState(answers?.age ? String(answers.age) : '');
  const [boundaryAccepted, setBoundaryAccepted] = useState(answers?.boundaryAccepted ?? false);
  const [safetyFlags, setSafetyFlags] = useState<PostureSafetyFlag[]>(answers?.safetyFlags ?? []);
  const [primaryConcern, setPrimaryConcern] = useState<PosturePrimaryConcern>(normalizeConcern(answers?.primaryConcern));
  const [functionalImpact, setFunctionalImpact] = useState(answers?.functionalImpact ?? 0);
  const [subjectiveObservations, setSubjectiveObservations] = useState<SubjectivePostureObservation[]>(answers?.subjectiveObservations ?? []);
  const [stopSymptoms, setStopSymptoms] = useState<PostureTestStopSymptom[]>(answers?.movement?.stopSymptoms ?? []);
  const [movementObservations, setMovementObservations] = useState<FunctionalPostureObservation[]>(answers?.movement?.observations ?? []);
  const [photoInput, setPhotoInput] = useState<PostureScreeningInput['photo']>(answers?.photo ?? { status: 'skipped', observations: [], reasonCodes: [] });
  const [photoMeasurements, setPhotoMeasurements] = useState<PosturePhotoMeasurementSnapshot[]>(resumedDraft?.photoMeasurements ?? []);
  const [captureSnapshot, setCaptureSnapshot] = useState<PostureCaptureSnapshot | undefined>(resumedDraft?.captureSnapshot);
  const [draftId, setDraftId] = useState(resumedDraft?.id ?? 'posture-screening-draft-local');
  const [context] = useState(entryContext ?? resumedDraft?.context);
  const [error, setError] = useState(draftRead.ok ? '' : '上次未完成的筛查草稿已损坏，本次已从头开始。');
  const [preparation, setPreparation] = useState<'preparing' | 'ready' | 'failed'>(replacingDraft ? 'preparing' : 'ready');
  const completionLock = useRef(false);

  useEffect(() => {
    if (draftRead.ok) return;
    const cleared = repository.clearDraft();
    if (!cleared.ok) setError('上次未完成的筛查草稿已损坏，且无法自动清除。请清除浏览器站点数据后重试。');
  }, [draftRead, repository]);

  useEffect(() => {
    if (!replacingDraft) return;
    let active = true;
    void repository.discardDraft().then((result) => {
      if (!active) return;
      if (result.ok) setPreparation('ready');
      else setPreparation('failed');
    });
    return () => { active = false; };
  }, [replacingDraft, repository]);

  const buildInput = (patch: Partial<PostureScreeningInput> = {}): PostureScreeningInput => ({
    age: Number(age),
    boundaryAccepted,
    safetyFlags,
    primaryConcern,
    functionalImpact,
    subjectiveObservations,
    movement: {
      testId: getGuidedPostureTest(primaryConcern).id,
      status: stopSymptoms.length > 0 ? 'stopped' : 'completed',
      stopSymptoms,
      observations: movementObservations,
    },
    photo: photoInput,
    ...patch,
  });

  const persist = (nextStep: FlowStep, input = buildInput(), measurements = photoMeasurements, capture = captureSnapshot) => {
    const saved = repository.saveDraft({ currentStep: nextStep, answers: input, photoMeasurements: measurements, captureSnapshot: capture, context });
    if (!saved.ok) {
      setError(saved.error === 'damaged-storage' ? '草稿数据异常，无法继续保存。请清除浏览器站点数据后重试。' : '无法保存当前进度，请检查浏览器存储设置后重试。');
      return false;
    }
    setError('');
    setDraftId(saved.draft.id);
    setPhotoMeasurements(measurements);
    setCaptureSnapshot(capture);
    dispatch({ type: 'go', step: nextStep });
    return true;
  };

  const complete = (input: PostureScreeningInput, measurements = photoMeasurements, capture = captureSnapshot) => {
    if (completionLock.current) return;
    completionLock.current = true;
    const result = evaluatePostureScreening(input);
    const recommendationSnapshots = buildPostureRecommendationSnapshots(result);
    const saved = repository.saveSession({ input, result, photoMeasurements: measurements, captureSnapshot: capture, recommendationSnapshots, context });
    if (!saved.ok) {
      completionLock.current = false;
      setError(saved.error === 'damaged-storage' ? '已有筛查记录损坏，暂时无法保存本次结果。' : '结果保存失败，请检查浏览器存储设置后重试。');
      return;
    }
    repository.clearDraft();
    setError('');
    navigate(`/growth/posture/results/${saved.session.id}`);
  };

  const continueBoundary = () => {
    const input = buildInput();
    if (input.age < 18 || !input.boundaryAccepted) complete(input);
    else persist('safety', input);
  };

  const continueSafety = () => {
    const input = buildInput();
    if (safetyFlags.length > 0) complete(input);
    else persist('concern', input);
  };

  const changeConcern = (concern: PosturePrimaryConcern) => {
    setPrimaryConcern(concern);
    setSubjectiveObservations([]);
    setStopSymptoms([]);
    setMovementObservations([]);
  };

  const continueConcern = () => {
    const input = buildInput({
      movement: { testId: getGuidedPostureTest(primaryConcern).id, status: 'completed', stopSymptoms: [], observations: [] },
    });
    setStopSymptoms([]);
    setMovementObservations([]);
    persist('movement', input);
  };

  const continueMovement = () => {
    const movement: PostureScreeningInput['movement'] = {
      testId: getGuidedPostureTest(primaryConcern).id,
      status: stopSymptoms.length > 0 ? 'stopped' : 'completed',
      stopSymptoms,
      observations: movementObservations,
    };
    const input = buildInput({ movement });
    if (movement.status === 'stopped') complete(input);
    else persist('static-front', input);
  };

  const useStaticCapture = (capture: PostureStaticCaptureSnapshot, nextStep: FlowStep) => {
    const staticCaptures = replaceBy(captureSnapshot?.staticCaptures ?? [], capture, ({ view }) => view);
    const nextCapture = buildPostureCaptureSnapshot(staticCaptures, captureSnapshot?.movements ?? []);
    persist(nextStep, buildInput({ photo: { status: 'skipped', observations: [], reasonCodes: [] } }), [], nextCapture);
  };

  const useMovementCapture = (movementCapture: PostureMovementCaptureSnapshot, nextStep?: FlowStep) => {
    const movements = replaceBy(captureSnapshot?.movements ?? [], movementCapture, ({ action }) => action);
    const nextCapture = buildPostureCaptureSnapshot(captureSnapshot?.staticCaptures ?? [], movements);
    const input = buildInput({ photo: { status: 'skipped', observations: [], reasonCodes: [] } });
    if (nextStep) persist(nextStep, input, [], nextCapture);
    else complete(input, [], nextCapture);
  };

  const skipAutomatedCapture = () => {
    const photo: PostureScreeningInput['photo'] = { status: 'skipped', observations: [], reasonCodes: [] };
    setPhotoInput(photo);
    setPhotoMeasurements([]);
    setCaptureSnapshot(undefined);
    complete(buildInput({ photo }), [], undefined);
  };

  const skipPhoto = () => {
    const photo: PostureScreeningInput['photo'] = { status: 'skipped', observations: [], reasonCodes: [] };
    const input = buildInput({ photo });
    setPhotoInput(photo);
    setPhotoMeasurements([]);
    complete(input, []);
  };

  const usePhoto = (measurement: PosturePhotoMeasurementSnapshot) => {
    const photo: PostureScreeningInput['photo'] = { status: 'completed', observations: [], reasonCodes: [] };
    const measurements = [measurement];
    const input = buildInput({ photo });
    setPhotoInput(photo);
    setPhotoMeasurements(measurements);
    persist('review', input, measurements);
  };

  if (preparation !== 'ready') {
    return preparation === 'preparing'
      ? <p role="status" className="mt-7 text-sm leading-6 text-zinc-300">正在准备本次筛查…</p>
      : <div className="mt-7"><p role="alert" className="rounded-xl border border-red-300/25 bg-red-300/[0.06] px-3 py-3 text-sm leading-5 text-red-100">无法安全清理上次未完成筛查的本地数据，请检查浏览器站点存储后重试。</p><button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-12 w-full rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-lime-200">重新尝试</button></div>;
  }

  return (
    <>
      <PostureScreeningProgress currentStep={step} />
      {error ? <p role="alert" className="mt-5 rounded-xl border border-red-300/25 bg-red-300/[0.06] px-3 py-3 text-sm leading-5 text-red-100">{error}</p> : null}
      {step === 'boundary' ? <PostureBoundaryStep age={age} boundaryAccepted={boundaryAccepted} onAgeChange={setAge} onBoundaryChange={setBoundaryAccepted} onContinue={continueBoundary} /> : null}
      {step === 'safety' ? <PostureSafetyStep flags={safetyFlags} onToggle={(flag) => setSafetyFlags((current) => toggle(current, flag))} onBack={() => persist('boundary')} onContinue={continueSafety} /> : null}
      {step === 'concern' ? <PostureConcernStep concern={primaryConcern} functionalImpact={functionalImpact} observations={subjectiveObservations} onConcernChange={changeConcern} onImpactChange={setFunctionalImpact} onToggleObservation={(observation) => setSubjectiveObservations((current) => toggle(current, observation))} onBack={() => persist('safety')} onContinue={continueConcern} /> : null}
      {step === 'movement' ? <PostureMovementStep concern={primaryConcern} stopSymptoms={stopSymptoms} observations={movementObservations} onToggleStop={(symptom) => setStopSymptoms((current) => toggle(current, symptom))} onToggleObservation={(observation) => setMovementObservations((current) => toggle(current, observation))} onBack={() => persist('concern')} onContinue={continueMovement} /> : null}
      {step === 'static-front' ? <PostureAutomatedStaticStep view="front" stepNumber={1} onBack={() => persist('movement')} onComplete={(capture) => useStaticCapture(capture, 'static-side')} onSkipAll={skipAutomatedCapture} /> : null}
      {step === 'static-side' ? <PostureAutomatedStaticStep view="side" stepNumber={2} onBack={() => persist('static-front')} onComplete={(capture) => useStaticCapture(capture, 'static-back')} /> : null}
      {step === 'static-back' ? <PostureAutomatedStaticStep view="back" stepNumber={3} onBack={() => persist('static-side')} onComplete={(capture) => useStaticCapture(capture, 'dynamic-arm-raise')} /> : null}
      {step === 'dynamic-arm-raise' ? <PostureAutomatedMovementStep action="bilateral-arm-raise" stepNumber={4} onBack={() => persist('static-back')} onComplete={(capture) => useMovementCapture(capture, 'dynamic-squat')} /> : null}
      {step === 'dynamic-squat' ? <PostureAutomatedMovementStep action="bodyweight-squat" stepNumber={5} onBack={() => persist('dynamic-arm-raise')} onComplete={(capture) => useMovementCapture(capture, 'dynamic-neck-retraction')} /> : null}
      {step === 'dynamic-neck-retraction' ? <PostureAutomatedMovementStep action="neck-retraction" stepNumber={6} onBack={() => persist('dynamic-squat')} onComplete={(capture) => useMovementCapture(capture)} /> : null}
      {step === 'photo' ? <PosturePhotoStep draftId={draftId} repository={repository} onBack={() => persist('movement')} onSkip={skipPhoto} onUsePhoto={usePhoto} /> : null}
      {step === 'review' ? <ReviewStep hasPhoto={photoInput.status === 'completed'} onBack={() => persist('photo')} onComplete={() => complete(buildInput())} /> : null}
    </>
  );
}

function ReviewStep({ hasPhoto, onBack, onComplete }: { hasPhoto: boolean; onBack: () => void; onComplete: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return (
    <section className="mt-7" aria-labelledby="review-title">
      <h2 ref={titleRef} tabIndex={-1} id="review-title" className="text-xl font-black outline-none">生成本次筛查结果</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">主观描述与引导观察已完成。照片测量是可选证据，下一阶段开放后仍可补充，不影响先生成基于功能表现的结果。</p>
      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
        <p className="text-xs font-black tracking-[0.08em] text-lime-300">本次证据范围</p>
        <p className="mt-2 text-sm leading-6 text-zinc-200">用户描述 + 引导动作观察；不包含医疗诊断，也不推断特定肌肉、关节或病因。</p>
      </div>
      <button type="button" onClick={onComplete} className="mt-5 min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-black text-[#10130d] outline-none focus-visible:ring-2 focus-visible:ring-lime-100">{hasPhoto ? '使用照片测量，生成结果' : '暂不使用照片，生成结果'}</button>
      <button type="button" onClick={onBack} className="mt-3 min-h-12 w-full rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-lime-200">返回修改观察</button>
    </section>
  );
}

function normalizeStep(step?: PostureScreeningDraftStep): FlowStep {
  if (step === 'safety' || step === 'concern' || step === 'movement' || step === 'photo' || step === 'review'
    || step === 'static-front' || step === 'static-side' || step === 'static-back'
    || step === 'dynamic-arm-raise' || step === 'dynamic-squat' || step === 'dynamic-neck-retraction') return step;
  if (step === 'follow-up') return 'concern';
  return 'boundary';
}

function sameContext(left: PostureScreeningContext, right: PostureScreeningContext | undefined): boolean {
  return left.planId === right?.planId && left.baselineSessionId === right?.baselineSessionId;
}

function normalizeConcern(concern?: PosturePrimaryConcern): PosturePrimaryConcern {
  return concern === 'neck-upper-quarter' || concern === 'thoracic-trunk' || concern === 'shoulder-asymmetry' || concern === 'unsure' ? concern : 'unsure';
}

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function flowReducer(state: FlowStep, action: FlowAction): FlowStep {
  return action.type === 'go' ? action.step : state;
}

function replaceBy<T, K>(items: T[], value: T, key: (item: T) => K): T[] {
  return [...items.filter((item) => key(item) !== key(value)), value];
}
