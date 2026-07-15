const muscleMap: Record<string, string[]> = {
  'pectoralis-major': ['chest'],
  'anterior-deltoid': ['shoulders'],
  'lateral-deltoid': ['shoulders'],
  'rear-deltoid': ['shoulders'],
  'biceps-brachii': ['biceps'],
  'triceps-brachii': ['triceps'],
  'brachialis': ['biceps'],
  'forearms': ['forearms'],
  'latissimus-dorsi': ['lats'],
  'teres-major': ['lats'],
  'rhomboids': ['middle back'],
  'middle-lower-trapezius': ['middle back', 'traps'],
  'upper-trapezius': ['traps'],
  'erector-spinae': ['lower back'],
  'rectus-abdominis': ['abdominals'],
  'transverse-abdominis': ['abdominals'],
  obliques: ['abdominals'],
  quadriceps: ['quadriceps'],
  hamstrings: ['hamstrings'],
  'gluteus-maximus': ['glutes'],
  'gluteus-medius': ['glutes', 'abductors'],
  'hip-adductors': ['adductors'],
  'hip-abductors': ['abductors'],
  gastrocnemius: ['calves'],
  soleus: ['calves'],
  neck: ['neck']
};

export function mapProjectMuscles(muscles: string[]): Set<string> {
  return new Set(muscles.flatMap((muscle) => muscleMap[muscle] ?? []));
}

export function muscleCompatibility(projectMuscles: Set<string>, sourceMuscles: string[]): number {
  if (projectMuscles.size === 0 || sourceMuscles.length === 0) return 0.4;
  const normalizedSource = new Set(sourceMuscles.map((muscle) => muscle.toLowerCase()));
  const intersection = [...projectMuscles].filter((muscle) => normalizedSource.has(muscle)).length;
  return intersection === 0 ? 0 : intersection / projectMuscles.size;
}
