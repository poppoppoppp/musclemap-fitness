export type TrainingTemplate = {
  id: string;
  name: string;
  focusTags: string[];
  items: TrainingTemplateItem[];
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
