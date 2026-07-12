import { armExercises } from './arms';
import { backExercises } from './back';
import { chestExercises } from './chest';
import { coreExercises } from './core';
import { fullBodyExercises } from './fullBody';
import { lowerBodyExercises } from './lowerBody';
import { shoulderExercises } from './shoulders';

export const catalogExercises = [
  ...chestExercises,
  ...backExercises,
  ...shoulderExercises,
  ...armExercises,
  ...coreExercises,
  ...lowerBodyExercises,
  ...fullBodyExercises
];
