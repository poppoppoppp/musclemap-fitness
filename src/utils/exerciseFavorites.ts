import { readStorage, writeStorage } from './storage';

export const EXERCISE_FAVORITES_KEY = 'musclemap.exerciseFavorites.v1';

export function readExerciseFavorites() {
  const value = readStorage<unknown>(EXERCISE_FAVORITES_KEY, []);
  if (!Array.isArray(value)) return new Set<string>();
  return new Set(value.filter((item): item is string => typeof item === 'string'));
}

export function toggleExerciseFavorite(exerciseId: string) {
  const favorites = readExerciseFavorites();
  if (favorites.has(exerciseId)) favorites.delete(exerciseId);
  else favorites.add(exerciseId);
  writeStorage(EXERCISE_FAVORITES_KEY, [...favorites]);
  return favorites.has(exerciseId);
}
