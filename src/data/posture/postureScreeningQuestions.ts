import type { PostureEvidenceReferenceOwner } from '../../types/postureScreening';

export type PosturePrimaryConcern = 'neck-upper-quarter' | 'thoracic-trunk' | 'shoulder-asymmetry' | 'unsure';

export interface PostureScreeningQuestionDefinition {
  id: string;
  stage: 'boundary' | 'safety' | 'baseline' | 'follow-up';
  prompt: string;
  answerType: 'adult-consent' | 'safety-checklist' | 'single-choice' | 'multi-choice' | 'scale';
  concerns: PosturePrimaryConcern[];
  evidenceIds: string[];
  allowedInterpretation: string;
  forbiddenInterpretation: string;
}

export const postureScreeningQuestions: readonly PostureScreeningQuestionDefinition[] = [
  {
    id: 'adult-boundary-consent-v1',
    stage: 'boundary',
    prompt: '你是否已满 18 岁，并理解本筛查只描述体态与功能表现？',
    answerType: 'adult-consent',
    concerns: ['neck-upper-quarter', 'thoracic-trunk', 'shoulder-asymmetry', 'unsure'],
    evidenceIds: ['posture-reference-values-age-context-v1'],
    allowedInterpretation: '确认当前产品人群边界，并提醒不同年龄的姿态参考背景不同。',
    forbiddenInterpretation: '年龄本身不能确认任何体态问题。',
  },
  {
    id: 'pre-activity-safety-v1',
    stage: 'safety',
    prompt: '近期是否有急性创伤、进行性麻木无力、晕厥胸痛或其他不适合继续自测的情况？',
    answerType: 'safety-checklist',
    concerns: ['neck-upper-quarter', 'thoracic-trunk', 'shoulder-asymmetry', 'unsure'],
    evidenceIds: ['pre-activity-safety-screen-v1'],
    allowedInterpretation: '决定是否暂停自测并先寻求专业评估。',
    forbiddenInterpretation: '该问题不是 PAR-Q+ 正式量表，也不判断症状病因。',
  },
  {
    id: 'primary-posture-concern-v1',
    stage: 'baseline',
    prompt: '你最想了解哪一类表现？',
    answerType: 'single-choice',
    concerns: ['neck-upper-quarter', 'thoracic-trunk', 'shoulder-asymmetry', 'unsure'],
    evidenceIds: ['head-neck-pain-association-limit-v1', 'upper-body-photogrammetry-review-v1'],
    allowedInterpretation: '选择后续最相关的少量问题，不把关注部位当作病因。',
    forbiddenInterpretation: '用户选择不能单独形成体态结论。',
  },
  {
    id: 'functional-impact-v1',
    stage: 'baseline',
    prompt: '这些表现对久坐、转身、抬臂或日常活动的影响有多明显？',
    answerType: 'scale',
    concerns: ['neck-upper-quarter', 'thoracic-trunk', 'shoulder-asymmetry', 'unsure'],
    evidenceIds: ['head-neck-pain-association-limit-v1', 'thoracic-rotation-reliability-v1'],
    allowedInterpretation: '记录用户重视的功能影响，作为主观证据。',
    forbiddenInterpretation: '功能影响程度不能定位特定组织或结构。',
  },
  {
    id: 'neck-head-position-follow-up-v1',
    stage: 'follow-up',
    prompt: '自然站立或久坐时，你是否经常注意到头部相对肩部明显前移？',
    answerType: 'single-choice',
    concerns: ['neck-upper-quarter'],
    evidenceIds: ['cva-classic-photogrammetry-review-v1', 'head-neck-pain-association-limit-v1'],
    allowedInterpretation: '记录头颈位置关注，等待功能或几何证据交叉确认。',
    forbiddenInterpretation: '不能由自我观察确认颈椎排列或疼痛原因。',
  },
  {
    id: 'neck-upper-quarter-load-follow-up-v1',
    stage: 'follow-up',
    prompt: '抬臂或久坐后，你是否更容易感觉上背与颈肩区域控制吃力？',
    answerType: 'single-choice',
    concerns: ['neck-upper-quarter'],
    evidenceIds: ['upper-body-photogrammetry-review-v1', 'head-neck-pain-association-limit-v1'],
    allowedInterpretation: '记录宽泛的上段功能负担。',
    forbiddenInterpretation: '不能推断某块肌肉无力、紧张或失衡。',
  },
  {
    id: 'thoracic-rotation-follow-up-v1',
    stage: 'follow-up',
    prompt: '坐姿向左右转身时，你是否感觉一侧明显更受限？',
    answerType: 'single-choice',
    concerns: ['thoracic-trunk'],
    evidenceIds: ['thoracic-rotation-reliability-v1'],
    allowedInterpretation: '记录旋转活动的主观侧差，等待引导观察确认。',
    forbiddenInterpretation: '不能定位到单个胸椎节段或软组织。',
  },
  {
    id: 'trunk-side-shift-follow-up-v1',
    stage: 'follow-up',
    prompt: '自然站立或抬臂时，你是否经常看到躯干向同一侧偏移？',
    answerType: 'single-choice',
    concerns: ['thoracic-trunk'],
    evidenceIds: ['upper-body-photogrammetry-review-v1', 'thoracic-kyphosis-instrument-review-v1'],
    allowedInterpretation: '记录可见的躯干外观侧偏。',
    forbiddenInterpretation: '不能确认脊柱侧弯或结构性改变。',
  },
  {
    id: 'shoulder-height-follow-up-v1',
    stage: 'follow-up',
    prompt: '自然站立时，你是否反复注意到同一侧肩峰更高或更低？',
    answerType: 'single-choice',
    concerns: ['shoulder-asymmetry'],
    evidenceIds: ['upper-body-photogrammetry-review-v1'],
    allowedInterpretation: '记录肩部外观不对称关注。',
    forbiddenInterpretation: '不能确认肩胛病变、神经损伤或肌力问题。',
  },
  {
    id: 'shoulder-reach-follow-up-v1',
    stage: 'follow-up',
    prompt: '双臂缓慢上举时，两侧节奏或舒适活动范围是否明显不同？',
    answerType: 'single-choice',
    concerns: ['shoulder-asymmetry'],
    evidenceIds: ['scapular-observation-limit-v1'],
    allowedInterpretation: '记录抬臂功能侧差，作为有限的功能证据。',
    forbiddenInterpretation: '不能确认翼状肩胛或特定稳定肌无力。',
  },
  {
    id: 'unsure-broad-observation-v1',
    stage: 'follow-up',
    prompt: '你主要注意到的是头位前移、转身受限、肩高差，还是躯干侧偏？',
    answerType: 'multi-choice',
    concerns: ['unsure'],
    evidenceIds: ['upper-body-photogrammetry-review-v1', 'thoracic-rotation-reliability-v1'],
    allowedInterpretation: '帮助选择一个最相关的引导观察，不直接形成结论。',
    forbiddenInterpretation: '多选结果不能替代功能或几何证据。',
  },
];

export const postureScreeningQuestionEvidenceReferences: PostureEvidenceReferenceOwner[] = postureScreeningQuestions.map(
  ({ id, evidenceIds }) => ({ ownerId: `question-${id}`, evidenceIds }),
);

export function getPostureFollowUpQuestions(concern: PosturePrimaryConcern): PostureScreeningQuestionDefinition[] {
  return postureScreeningQuestions.filter(({ stage, concerns }) => stage === 'follow-up' && concerns.includes(concern));
}
