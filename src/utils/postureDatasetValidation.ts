import type { PostureDataset, PostureDatasetSource } from '../types/posture';

export interface PostureDatasetValidationIssue {
  code: string;
  path: string;
  message: string;
}

export function validatePostureDataset(dataset: PostureDatasetSource | PostureDataset): PostureDatasetValidationIssue[] {
  const issues: PostureDatasetValidationIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });

  if (dataset.protocols.length !== 12) add('protocol-count', 'protocols', 'Expected exactly 12 posture protocols.');
  if (dataset.theoryMaterials.length !== 2) add('theory-count', 'theoryMaterials', 'Expected exactly 2 theory materials.');
  if (dataset.guidanceMaterials.length !== 1) add('guidance-count', 'guidanceMaterials', 'Expected exactly 1 guidance material.');

  findDuplicates(dataset.protocols.map(({ id }) => id)).forEach((id) =>
    add('duplicate-protocol-id', `protocols.${id}`, `Duplicate protocol ID: ${id}`)
  );
  findDuplicates(dataset.standardExercises.map(({ id }) => id)).forEach((id) =>
    add('duplicate-exercise-id', `standardExercises.${id}`, `Duplicate exercise ID: ${id}`)
  );
  findDuplicates(dataset.observations.map(({ id }) => id)).forEach((id) =>
    add('duplicate-observation-id', `observations.${id}`, `Duplicate observation ID: ${id}`)
  );

  const exerciseById = new Map(dataset.standardExercises.map((exercise) => [exercise.id, exercise]));
  const observationIds = new Set(dataset.observations.map(({ id }) => id));
  const categoryIds = new Set(dataset.categories.map(({ id }) => id));
  const familyById = new Map(dataset.exerciseFamilies.map((family) => [family.id, family]));

  for (const family of dataset.exerciseFamilies) {
    for (const variantId of family.variantIds) {
      const exercise = exerciseById.get(variantId);
      if (!exercise) {
        add('missing-family-variant', `exerciseFamilies.${family.id}`, `Unknown family variant: ${variantId}`);
      } else if (exercise.familyId !== family.id) {
        add('invalid-family-link', `standardExercises.${variantId}.familyId`, `${variantId} must link back to ${family.id}.`);
      }
    }
  }

  for (const exercise of dataset.standardExercises) {
    if (exercise.familyId && !familyById.has(exercise.familyId)) {
      add('missing-exercise-family', `standardExercises.${exercise.id}.familyId`, `Unknown family: ${exercise.familyId}`);
    }
    if (exercise.variantOf) {
      const parent = exerciseById.get(exercise.variantOf);
      if (!parent || parent.familyId !== exercise.familyId) {
        add('invalid-variant-reference', `standardExercises.${exercise.id}.variantOf`, `Invalid variant parent: ${exercise.variantOf}`);
      }
    }
  }

  for (const protocol of dataset.protocols) {
    if (!categoryIds.has(protocol.category)) {
      add('missing-category-reference', `protocols.${protocol.id}.category`, `Unknown category: ${protocol.category}`);
    }
    for (const step of protocol.steps) {
      const path = `protocols.${protocol.id}.steps.${step.id}`;
      if (step.kind === 'exercise') {
        if (!step.exerciseId || !exerciseById.has(step.exerciseId)) {
          add('missing-exercise-reference', `${path}.exerciseId`, `Unknown exercise: ${step.exerciseId ?? '(missing)'}`);
        }
        if (step.observationId) add('mixed-step-kind', path, 'Exercise steps cannot reference an observation.');
      } else {
        if (!step.observationId || !observationIds.has(step.observationId)) {
          add('missing-observation-reference', `${path}.observationId`, `Unknown observation: ${step.observationId ?? '(missing)'}`);
        }
        if (step.exerciseId || (step.dose && Object.keys(step.dose).length > 0)) {
          add('observation-counted-as-exercise', path, 'Observation steps cannot carry an exercise or dose.');
        }
      }
    }

    if (protocol.sourceClaims.some((claim) => claim.trim() === protocol.userFacingGoal.trim())) {
      add('source-claim-used-as-goal', `protocols.${protocol.id}.userFacingGoal`, 'A source claim cannot be used directly as the public goal.');
    }
  }

  const cervical = dataset.protocols.find(({ id }) => id === 'CERVICAL_002');
  if (cervical?.steps.some(({ dose }) => !dose || Object.keys(dose).length > 0)) {
    add('missing-dose-filled', 'protocols.CERVICAL_002.steps', 'CERVICAL_002 must preserve all missing doses.');
  }

  const orofacialGoal = dataset.protocols.find(({ id }) => id === 'OROFACIAL_001')?.userFacingGoal ?? '';
  if (orofacialGoal.includes('改善大小脸') || orofacialGoal.includes('大小脸矫正')) {
    add('unsafe-orofacial-goal', 'protocols.OROFACIAL_001.userFacingGoal', 'Orofacial care cannot promise facial asymmetry correction.');
  }
  const pelvisGoal = dataset.protocols.find(({ id }) => id === 'PELVIS_002')?.userFacingGoal ?? '';
  if (pelvisGoal.includes('同时改善骨盆前倾和骨盆后倾')) {
    add('unsafe-pelvis-goal', 'protocols.PELVIS_002.userFacingGoal', 'PELVIS_002 cannot be presented as a universal pelvic correction.');
  }
  const scapulaGoal = dataset.protocols.find(({ id }) => id === 'WINGED_SCAPULA_002')?.userFacingGoal ?? '';
  if (scapulaGoal.includes('菱形肌')) {
    add('unsafe-scapula-goal', 'protocols.WINGED_SCAPULA_002.userFacingGoal', 'The protraction exercise cannot be presented as rhomboid-specific training.');
  }

  return issues;
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}
