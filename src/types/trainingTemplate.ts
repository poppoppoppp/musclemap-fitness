import type { PostureProtocolWorkoutSnapshot } from './posture';

export type TrainingTemplate = {
  id: string;
  name: string;
  focusTags: string[];
  items: TrainingTemplateItem[];
  postureProtocolGroups?: PostureProtocolWorkoutSnapshot[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
};

export type TrainingTemplateItem = {
  id: string;
  exerciseId: string;
  order: number;
  sets: number;
  repRange: string;
  restSeconds: number;
  note?: string;
};

export type TrainingTemplateInput = Pick<TrainingTemplate, 'name' | 'focusTags' | 'items' | 'postureProtocolGroups'>;

export type TrainingTemplateDraft = TrainingTemplateInput & {
  key: string;
  savedAt: string;
};
