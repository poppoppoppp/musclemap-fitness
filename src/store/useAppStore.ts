import { create } from 'zustand';
import type { BodyView } from '../types/common';

interface AppState {
  bodyView: BodyView;
  selectedMuscleId: string;
  exerciseSearch: string;
  selectedMuscleFilter: string;
  selectedEquipmentFilter: string;
  setBodyView: (bodyView: BodyView) => void;
  setSelectedMuscleId: (muscleId: string) => void;
  setExerciseSearch: (query: string) => void;
  setSelectedMuscleFilter: (muscleId: string) => void;
  setSelectedEquipmentFilter: (equipment: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  bodyView: 'back',
  selectedMuscleId: 'latissimus-dorsi',
  exerciseSearch: '',
  selectedMuscleFilter: '',
  selectedEquipmentFilter: '',
  setBodyView: (bodyView) => set({ bodyView }),
  setSelectedMuscleId: (selectedMuscleId) => set({ selectedMuscleId }),
  setExerciseSearch: (exerciseSearch) => set({ exerciseSearch }),
  setSelectedMuscleFilter: (selectedMuscleFilter) => set({ selectedMuscleFilter }),
  setSelectedEquipmentFilter: (selectedEquipmentFilter) => set({ selectedEquipmentFilter })
}));
