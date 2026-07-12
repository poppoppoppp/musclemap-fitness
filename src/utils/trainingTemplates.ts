import type { TrainingTemplate } from '../types/trainingTemplate';
import { readStorage, writeStorage } from './storage';

export const TRAINING_TEMPLATES_STORAGE_KEY = 'musclemap.trainingTemplates.v1';

export function readTrainingTemplates(): TrainingTemplate[] {
  const templates = readStorage<TrainingTemplate[]>(TRAINING_TEMPLATES_STORAGE_KEY, []);
  return Array.isArray(templates) ? templates : [];
}

export function writeTrainingTemplates(templates: TrainingTemplate[]): void {
  writeStorage(TRAINING_TEMPLATES_STORAGE_KEY, templates);
}

export function createTrainingTemplate(input: Pick<TrainingTemplate, 'name' | 'focusTags'>): TrainingTemplate {
  const timestamp = new Date().toISOString();
  const template: TrainingTemplate = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    focusTags: [...input.focusTags],
    items: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };

  writeTrainingTemplates([...readTrainingTemplates(), template]);
  return template;
}
