const equipmentTerms: Array<[RegExp, string]> = [
  [/哑铃|dumbbell|\bdb\b/i, 'dumbbell'],
  [/杠铃|barbell|\bbb\b/i, 'barbell'],
  [/壶铃|kettlebell/i, 'kettlebells'],
  [/弹力带|阻力带|band/i, 'bands'],
  [/药球|medicine ball/i, 'medicine ball'],
  [/泡沫轴|foam roll/i, 'foam roll'],
  [/绳索|龙门架|cable/i, 'cable'],
  [/史密斯|smith/i, 'machine'],
  [/器械|machine|腿举机|夹胸机|划船机|下拉器|哈克|腿屈伸|腿弯举|提踵机/i, 'machine'],
  [/自重|单杠|双杠|徒手|bodyweight|body only|pull-up bar/i, 'body only'],
  [/瑞士球|健身球|exercise ball|stability ball/i, 'exercise ball'],
  [/ez|曲杆/i, 'e-z curl bar'],
  [/trx|悬挂带|腹肌轮|罗马椅|长凳|卧推凳|瑜伽垫|墙面|毛巾/i, 'other']
];

export function mapProjectEquipment(equipment: string[], nameEn = ''): Set<string> {
  const values = new Set<string>();
  for (const value of [...equipment, nameEn]) {
    for (const [pattern, mapped] of equipmentTerms) {
      if (pattern.test(value)) values.add(mapped);
    }
  }
  return values;
}

export function equipmentCompatibility(projectEquipment: Set<string>, sourceEquipment: string | null): number {
  if (!sourceEquipment || projectEquipment.size === 0) return 0.5;
  const normalized = sourceEquipment.toLowerCase();
  if (projectEquipment.has(normalized)) return 1;
  if ((projectEquipment.size === 1 && projectEquipment.has('other')) || normalized === 'other') return 0.45;
  return 0;
}
