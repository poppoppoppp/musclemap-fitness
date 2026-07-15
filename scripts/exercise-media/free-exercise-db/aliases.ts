export const aliasGroups = [
  ['seated row', 'seated cable row', 'seated cable rows'],
  ['barbell row', 'bent over barbell row'],
  ['glute bridge', 'butt lift bridge'],
  ['triceps pushdown', 'cable triceps pushdown', 'triceps pushdown rope attachment'],
  ['standing calf raise', 'standing calf raises'],
  ['lateral raise', 'side lateral raise'],
  ['rear delt fly', 'reverse fly', 'reverse machine fly'],
  ['hanging leg raise', 'hanging leg raises'],
  ['back extension', 'hyperextensions back extensions']
] as const;

export function findMatchedAlias(left: string, right: string): string | null {
  const group = aliasGroups.find((items) => items.includes(left as never) && items.includes(right as never));
  return group ? `${left} ↔ ${right}` : null;
}
