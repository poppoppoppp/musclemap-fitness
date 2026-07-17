import { useEffect, useRef } from 'react';
import type { PostureScreeningRepository, PostureScreeningSession } from '../../repositories/postureScreeningRepository';
import type { PostureEvidenceClass } from '../../types/postureScreening';
import PostureEvidenceDetails from './PostureEvidenceDetails';
import PostureNextActions from './PostureNextActions';

interface Props {
  session: PostureScreeningSession;
  repository: PostureScreeningRepository;
  onSessionChange: (session: PostureScreeningSession) => void;
}

const subjectiveLabels: Record<string, string> = {
  'head-position-concern': '头部位置关注',
  'neck-upper-quarter-impact': '颈肩与上背控制负担',
  'thoracic-stiffness-or-rotation-concern': '胸廓旋转侧差关注',
  'trunk-side-shift-concern': '躯干侧偏关注',
  'shoulder-height-concern': '肩部高度侧差关注',
  'overhead-asymmetry-concern': '双臂上举侧差关注',
};

const functionalLabels: Record<string, string> = {
  'head-advances-during-reach': '上举时头部前移',
  'upper-quarter-control-limited': '上段控制明显吃力',
  'thoracic-rotation-limited': '左右旋转存在可重复侧差',
  'trunk-side-shift-during-reach': '上举时躯干侧移',
  'arm-raise-asymmetry': '双臂上举节奏或范围侧差',
};

const metricLabels: Record<string, string> = {
  'craniovertebral-angle': '颅椎角',
  'frontal-head-tilt': '正面头部倾斜角',
  'frontal-shoulder-height-difference': '正面肩高差',
  'lateral-shoulder-angle': '侧面肩部角度',
  'lateral-trunk-inclination': '侧面躯干倾角',
  'frontal-trunk-deviation': '正面躯干偏移角',
};

export default function PostureAssessmentReport({ session, repository, onSessionChange }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const classes = evidenceClasses(session);
  const limits = unique([
    ...session.result.findings.flatMap((finding) => finding.forbiddenConclusions),
    session.result.status === 'safety-review' ? '安全信号只能决定暂停自测，不能判断症状原因。' : '',
    session.result.status === 'measurement-invalid' ? '无效照片或标点不会参与体态倾向判断。' : '',
    session.result.findings.length === 0 ? '证据不足不等于不存在任何问题，也不能据此排除疾病。' : '',
    '本筛查不构成医疗诊断，也不定位特定关节、神经、肌肉或疼痛病因。',
  ].filter(Boolean));
  const evidenceIds = unique([
    ...session.result.evidenceIds,
    ...session.result.findings.flatMap((finding) => finding.evidenceIds),
    ...session.photoMeasurements.flatMap((photo) => photo.measurements.flatMap((measurement) => measurement.evidenceIds)),
  ]);

  return (
    <article data-testid="screening-terminal">
      <header className="mt-7">
        <span className="inline-flex min-h-7 items-center rounded-full border border-lime-300/30 px-2.5 text-xs font-black text-lime-300">{statusLabel(session.result.status)}</span>
        <h1 ref={titleRef} tabIndex={-1} className="mt-3 text-2xl font-black leading-8 outline-none">{terminalTitle(session.result.status)}</h1>
        <p className="mt-3 text-base font-bold leading-7 text-white">{session.result.summary}</p>
        {session.result.status === 'functional-only' ? <p className="mt-2 text-sm leading-6 text-zinc-300">未使用照片，本次结论仅基于主观描述与引导动作。</p> : null}
      </header>

      <section className="mt-8" aria-labelledby="basis-title">
        <h2 id="basis-title" className="text-lg font-black">判断依据</h2>
        {classes.length ? <div className="mt-3 flex flex-wrap gap-2">{classes.map((value) => <span key={value} className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-bold text-zinc-300">{classLabel(value)}</span>)}</div> : null}
        <div className="mt-5 space-y-5">
          {session.input.subjectiveObservations.length ? <EvidenceList title="用户描述" values={session.input.subjectiveObservations.map((value) => subjectiveLabels[value] ?? value)} /> : null}
          {session.input.movement.observations.length ? <EvidenceList title="引导动作观察" values={session.input.movement.observations.map((value) => functionalLabels[value] ?? value)} /> : null}
          {session.photoMeasurements.length ? <div><h3 className="text-sm font-black text-zinc-100">照片几何测量</h3><p className="mt-1 text-xs leading-5 text-zinc-400">照片角度仅作几何记录，本版本未用固定阈值将其转换为体态分类。</p><ul className="mt-2 space-y-2">{session.photoMeasurements.flatMap((photo) => photo.measurements).map((measurement) => <li key={measurement.metricId} className="text-sm leading-6 text-zinc-300">{metricLabels[measurement.metricId] ?? measurement.metricId}：{formatMeasurement(measurement.value, measurement.unit)}</li>)}</ul></div> : null}
          {!session.input.subjectiveObservations.length && !session.input.movement.observations.length && !session.photoMeasurements.length ? <p className="text-sm leading-6 text-zinc-300">本次只记录了安全分流或测量质量信息，没有形成体态表现证据。</p> : null}
        </div>
        {session.result.findings.length ? <div className="mt-6 space-y-3">{session.result.findings.map((finding) => <section key={finding.patternId} className="rounded-xl border border-lime-300/25 bg-lime-300/[0.05] px-4 py-4"><h3 className="font-black text-white">{finding.label}</h3><p className="mt-2 text-sm leading-6 text-zinc-300">{finding.allowedConclusion}</p></section>)}</div> : null}
      </section>

      <section className="mt-8" aria-labelledby="limits-title">
        <h2 id="limits-title" className="text-lg font-black">不能说明什么</h2>
        <ul className="mt-3 space-y-2">{limits.map((limit) => <li key={limit} className="flex gap-2 text-sm leading-6 text-zinc-300"><span aria-hidden="true" className="text-zinc-500">•</span><span>{limit}</span></li>)}</ul>
      </section>

      <PostureEvidenceDetails evidenceIds={evidenceIds} />
      <section className="mt-7 border-y border-white/10 py-4 text-xs leading-5 text-zinc-400" aria-label="结果版本">
        <p>算法 {session.result.algorithmVersion}</p>
        <p>筛查协议 {session.result.protocolVersion}</p>
        {unique(session.photoMeasurements.flatMap((photo) => photo.protocolVersion ? [photo.protocolVersion] : [])).map((version) => <p key={version}>照片协议 {version}</p>)}
      </section>
      <PostureNextActions session={session} repository={repository} onSessionChange={onSessionChange} />
    </article>
  );
}

function EvidenceList({ title, values }: { title: string; values: string[] }) {
  return <div><h3 className="text-sm font-black text-zinc-100">{title}</h3><ul className="mt-2 space-y-2">{values.map((value) => <li key={value} className="text-sm leading-6 text-zinc-300">{value}</li>)}</ul></div>;
}

function evidenceClasses(session: PostureScreeningSession): PostureEvidenceClass[] {
  const values: PostureEvidenceClass[] = [];
  if (session.input.subjectiveObservations.length) values.push('subjective');
  if (session.input.movement.observations.length) values.push('functional');
  if (session.photoMeasurements.some((photo) => photo.quality === 'valid' && photo.measurements.length)) values.push('geometry');
  return values;
}

function classLabel(value: PostureEvidenceClass): string {
  if (value === 'subjective') return '主观描述';
  if (value === 'functional') return '引导动作';
  return '照片几何';
}

function statusLabel(status: PostureScreeningSession['status']): string {
  if (status === 'completed') return '完整流程';
  if (status === 'functional-only') return '功能证据';
  if (status === 'mixed-evidence') return '证据不一致';
  if (status === 'safety-review') return '安全分流';
  return '测量需处理';
}

function terminalTitle(status: PostureScreeningSession['status']): string {
  if (status === 'safety-review') return '本次筛查已停止';
  if (status === 'measurement-invalid') return '照片测量需要处理';
  return '本次筛查已完成';
}

function formatMeasurement(value: number, unit: 'deg' | 'ratio'): string {
  return unit === 'deg' ? `${value.toFixed(1)}°` : `${value.toFixed(3)}（图像比例）`;
}

function unique(values: string[]): string[] { return [...new Set(values)]; }
