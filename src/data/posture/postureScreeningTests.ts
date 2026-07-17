import type { PostureEvidenceReferenceOwner } from '../../types/postureScreening';
import type { PosturePrimaryConcern } from './postureScreeningQuestions';

export interface GuidedPostureTestDefinition {
  id: 'upper-quarter-reach-observation-v1' | 'seated-thoracic-rotation-observation-v1';
  concerns: PosturePrimaryConcern[];
  title: string;
  estimatedSeconds: number;
  instructions: string[];
  stopConditions: string[];
  evidenceIds: string[];
  allowedInterpretation: string;
  forbiddenInterpretation: string;
}

export const guidedPostureTests: readonly GuidedPostureTestDefinition[] = [
  {
    id: 'upper-quarter-reach-observation-v1',
    concerns: ['neck-upper-quarter', 'shoulder-asymmetry', 'unsure'],
    title: '自然站立双臂慢速上举观察',
    estimatedSeconds: 30,
    instructions: ['自然站立，不刻意收下巴或夹肩。', '在舒适范围内缓慢上举双臂两次。', '观察头部是否前移、两侧节奏是否明显不同或躯干是否代偿侧偏。'],
    stopConditions: ['眩晕', '麻木或放射感', '明显疼痛加重', '突然无力'],
    evidenceIds: ['upper-body-photogrammetry-review-v1', 'scapular-observation-limit-v1', 'pre-activity-safety-screen-v1'],
    allowedInterpretation: '记录宽泛的上段协调与抬臂侧差，作为功能证据。',
    forbiddenInterpretation: '该自我观察未被声明为验证量表，不能定位肌肉、神经或关节病变。',
  },
  {
    id: 'seated-thoracic-rotation-observation-v1',
    concerns: ['thoracic-trunk'],
    title: '坐姿胸廓左右旋转观察',
    estimatedSeconds: 30,
    instructions: ['稳定坐在椅子前部，双臂交叉放在胸前。', '骨盆尽量保持朝前，在舒适范围内缓慢向左右转动。', '比较两侧是否存在明显且可重复的活动差异。'],
    stopConditions: ['眩晕', '麻木或放射感', '明显疼痛加重', '突然无力'],
    evidenceIds: ['thoracic-rotation-reliability-v1', 'pre-activity-safety-screen-v1'],
    allowedInterpretation: '无测角工具时仅记录左右旋转功能观察。',
    forbiddenInterpretation: '不能把自我观察套用实验室 MDC，也不能定位单一节段或组织。',
  },
];

export const postureScreeningTestEvidenceReferences: PostureEvidenceReferenceOwner[] = guidedPostureTests.map(
  ({ id, evidenceIds }) => ({ ownerId: `test-${id}`, evidenceIds }),
);

export function getGuidedPostureTest(concern: PosturePrimaryConcern): GuidedPostureTestDefinition {
  return concern === 'thoracic-trunk' ? guidedPostureTests[1] : guidedPostureTests[0];
}
