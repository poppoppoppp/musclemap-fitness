import { expect, test } from '@playwright/test';
import { postureScreeningEvidence } from '../data/posture/postureScreeningEvidence';
import type { PostureScreeningEvidenceRecord } from '../types/postureScreening';
import { validatePostureScreeningEvidence } from '../utils/postureScreeningEvidence';

const expectedSourceIdentifiers = [
  'APTA-PAR-Q-PLUS',
  'PMID:35935117',
  'PMID:41509052',
  'PMID:28559753',
  'PMID:38610914',
  'PMID:36825268',
  'PMID:22488230',
  'PMID:33155568',
  'PMID:24982755',
  'PMID:19119397',
  'PMID:40780025',
  'PMID:36901144',
  'PMID:38665167',
];

test('registers the approved screening evidence with explicit interpretation limits', () => {
  expect(validatePostureScreeningEvidence(postureScreeningEvidence)).toEqual([]);
  expect(postureScreeningEvidence.map(({ source }) => source.identifier)).toEqual(
    expect.arrayContaining(expectedSourceIdentifiers),
  );

  for (const evidence of postureScreeningEvidence) {
    expect(evidence.id).toMatch(/-v\d+$/);
    expect(evidence.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(evidence.construct.trim()).not.toBe('');
    expect(evidence.population.trim()).not.toBe('');
    expect(evidence.method.trim()).not.toBe('');
    expect(evidence.source.title.trim()).not.toBe('');
    expect(evidence.source.url).toMatch(/^https?:\/\//);
    expect(evidence.evidenceGrade.basis.trim()).not.toBe('');
    expect(evidence.measurementError.status).toMatch(/^(reported|not-established|not-applicable)$/);
    expect(evidence.allowedConclusions.length).toBeGreaterThan(0);
    expect(evidence.forbiddenConclusions.length).toBeGreaterThan(0);
    expect(evidence.contraindications).toBeDefined();
    expect(evidence.allowedConclusions.join(' ')).not.toMatch(/诊断|确诊|diagnos/i);
  }
});

test('keeps custom screening questions distinct from validated instruments', () => {
  const safetyEvidence = postureScreeningEvidence.find(({ id }) => id === 'pre-activity-safety-screen-v1');
  expect(safetyEvidence).toMatchObject({
    method: expect.stringContaining('自定义'),
    allowedConclusions: expect.arrayContaining([expect.stringContaining('暂停')]),
  });
  expect(safetyEvidence?.forbiddenConclusions.join(' ')).toContain('PAR-Q+ 原题');
});

test('freezes registry data and marks whether published error transfers to this app protocol', () => {
  expect(Object.isFrozen(postureScreeningEvidence)).toBe(true);
  expect(Object.isFrozen(postureScreeningEvidence[0])).toBe(true);
  expect(Object.isFrozen(postureScreeningEvidence[0].source)).toBe(true);
  expect(Object.isFrozen(postureScreeningEvidence[0].allowedConclusions)).toBe(true);

  const cvaReliability = postureScreeningEvidence.find(({ id }) => id === 'cva-image-reliability-v1');
  expect(cvaReliability?.measurementError).toMatchObject({
    status: 'reported',
    applicability: 'conditional',
  });
});

test('collects duplicate, incomplete, and dangling-reference errors deterministically', () => {
  const invalid = structuredClone(postureScreeningEvidence) as PostureScreeningEvidenceRecord[];
  invalid.push(structuredClone(invalid[0]));
  invalid[1].source.title = '';
  invalid[2].allowedConclusions = [];

  const errors = validatePostureScreeningEvidence(invalid, [
    { ownerId: 'question-neck-impact-v1', evidenceIds: [invalid[0].id, 'missing-evidence-v1'] },
  ]);

  expect(errors.map(({ code }) => code)).toEqual([
    'duplicate-evidence-id',
    'missing-source-title',
    'missing-allowed-conclusion',
    'missing-evidence-reference',
  ]);
  expect(errors.at(-1)).toMatchObject({ ownerId: 'question-neck-impact-v1', evidenceId: 'missing-evidence-v1' });
});
