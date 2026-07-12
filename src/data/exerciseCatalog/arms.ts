import { catalogExercise as e } from './createCatalogExercise';

const biceps = ['biceps-brachii'];
const triceps = ['triceps-brachii'];
const curl = { force: 'pull' as const, mechanic: 'isolation' as const, tags: ['手臂', '弯举', '肱二头肌'] };
const extension = { force: 'push' as const, mechanic: 'isolation' as const, tags: ['手臂', '臂屈伸', '肱三头肌'] };

export const armExercises = [
  e('barbell-curl', '杠铃弯举', 'Barbell Curl', biceps, ['杠铃'], curl),
  e('ez-bar-curl', '曲杆弯举', 'EZ-bar Curl', biceps, ['杠铃'], curl),
  e('incline-dumbbell-curl', '上斜哑铃弯举', 'Incline Dumbbell Curl', biceps, ['哑铃', '卧推凳'], curl),
  e('preacher-curl', '牧师凳杠铃弯举', 'Barbell Preacher Curl', biceps, ['杠铃', '牧师凳'], curl),
  e('machine-preacher-curl', '器械牧师凳弯举', 'Machine Preacher Curl', biceps, ['固定器械', '牧师凳'], curl),
  e('cable-curl', '绳索弯举', 'Cable Curl', biceps, ['绳索器械'], curl),
  e('high-cable-curl', '绳索高位弯举', 'High Cable Curl', biceps, ['绳索器械'], curl),
  e('concentration-curl', '哑铃集中弯举', 'Dumbbell Concentration Curl', biceps, ['哑铃'], curl),
  e('spider-curl', '蜘蛛弯举', 'Spider Curl', biceps, ['哑铃', '卧推凳'], curl),
  e('alternating-dumbbell-curl', '交替哑铃弯举', 'Alternating Dumbbell Curl', biceps, ['哑铃'], curl),
  e('cross-body-hammer-curl', '交叉锤式弯举', 'Cross-body Hammer Curl', ['brachialis', 'biceps-brachii'], ['哑铃'], curl),
  e('reverse-curl', '杠铃反握弯举', 'Barbell Reverse Curl', ['forearm-extensors', 'brachialis'], ['杠铃'], { ...curl, tags: ['手臂', '反握弯举', '前臂'] }),
  e('close-grip-bench-press', '窄握杠铃卧推', 'Close-grip Barbell Bench Press', triceps, ['杠铃', '卧推凳'], { force: 'push', mechanic: 'compound', secondaryMuscles: ['pectoralis-major'], tags: ['手臂', '肱三头肌', '窄握卧推'] }),
  e('dip-triceps-focus', '双杠肱三头肌臂屈伸', 'Triceps Dip', triceps, ['双杠'], { force: 'push', mechanic: 'compound', category: 'bodyweight', tags: ['手臂', '肱三头肌', '双杠'] }),
  e('bench-dip', '凳上臂屈伸', 'Bench Dip', triceps, ['自重', '卧推凳'], { ...extension, category: 'bodyweight' }),
  e('overhead-dumbbell-triceps-extension', '双手哑铃过顶臂屈伸', 'Two-hand Dumbbell Overhead Triceps Extension', triceps, ['哑铃'], extension),
  e('single-arm-overhead-dumbbell-extension', '单臂哑铃过顶臂屈伸', 'Single-arm Dumbbell Overhead Triceps Extension', triceps, ['哑铃'], { ...extension, tags: ['手臂', '肱三头肌', '哑铃', '单臂'] }),
  e('cable-overhead-triceps-extension', '绳索过顶臂屈伸', 'Cable Overhead Triceps Extension', triceps, ['绳索器械'], extension),
  e('single-arm-cable-pushdown', '单臂绳索下压', 'Single-arm Cable Pushdown', triceps, ['绳索器械'], { ...extension, tags: ['手臂', '肱三头肌', '下压', '单臂'] }),
  e('straight-bar-pushdown', '直杆下压', 'Straight-bar Pushdown', triceps, ['绳索器械'], { ...extension, tags: ['手臂', '肱三头肌', '下压'] }),
  e('reverse-grip-pushdown', '反握绳索下压', 'Reverse-grip Cable Pushdown', triceps, ['绳索器械'], { ...extension, tags: ['手臂', '肱三头肌', '下压', '反握'] }),
  e('dumbbell-skull-crusher', '哑铃仰卧臂屈伸', 'Dumbbell Skull Crusher', triceps, ['哑铃', '卧推凳'], extension),
  e('cable-skull-crusher', '绳索仰卧臂屈伸', 'Cable Skull Crusher', triceps, ['绳索器械', '卧推凳'], extension),
  e('diamond-push-up', '钻石俯卧撑', 'Diamond Push-up', triceps, ['自重'], { force: 'push', mechanic: 'compound', category: 'bodyweight', secondaryMuscles: ['pectoralis-major'], tags: ['手臂', '肱三头肌', '俯卧撑'] }),
  e('barbell-wrist-curl', '杠铃屈腕', 'Barbell Wrist Curl', ['forearm-flexors'], ['杠铃'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '屈腕'] }),
  e('dumbbell-wrist-curl', '哑铃屈腕', 'Dumbbell Wrist Curl', ['forearm-flexors'], ['哑铃'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '屈腕'] }),
  e('cable-wrist-curl', '绳索屈腕', 'Cable Wrist Curl', ['forearm-flexors'], ['绳索器械'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '屈腕'] }),
  e('behind-back-wrist-curl', '身后杠铃屈腕', 'Behind-the-back Barbell Wrist Curl', ['forearm-flexors'], ['杠铃'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '屈腕'] }),
  e('barbell-reverse-wrist-curl', '杠铃伸腕', 'Barbell Reverse Wrist Curl', ['forearm-extensors'], ['杠铃'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '伸腕'] }),
  e('dumbbell-reverse-wrist-curl', '哑铃伸腕', 'Dumbbell Reverse Wrist Curl', ['forearm-extensors'], ['哑铃'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '伸腕'] }),
  e('cable-reverse-wrist-curl', '绳索伸腕', 'Cable Reverse Wrist Curl', ['forearm-extensors'], ['绳索器械'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '伸腕'] }),
  e('wrist-roller', '卷绳器腕屈伸', 'Wrist Roller', ['forearm-flexors', 'forearm-extensors'], ['腕力器'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '握力'] }),
  e('plate-pinch', '杠铃片捏握', 'Plate Pinch', ['forearm-flexors'], ['杠铃片'], { force: 'static', mechanic: 'isolation', tags: ['手臂', '前臂', '握力', '静态'] }),
  e('dumbbell-farmer-hold', '哑铃农夫静态握持', 'Dumbbell Farmer Hold', ['forearm-flexors'], ['哑铃'], { force: 'static', mechanic: 'compound', secondaryMuscles: ['upper-trapezius'], tags: ['手臂', '前臂', '握力', '静态'] }),
  e('bar-hang', '单杠悬垂', 'Dead Hang', ['forearm-flexors'], ['单杠'], { force: 'static', mechanic: 'compound', category: 'bodyweight', tags: ['手臂', '前臂', '握力', '悬垂'] }),
  e('towel-hang', '毛巾悬垂', 'Towel Hang', ['forearm-flexors'], ['单杠'], { force: 'static', mechanic: 'compound', category: 'bodyweight', difficulty: 'advanced', tags: ['手臂', '前臂', '握力', '毛巾'] }),
  e('dumbbell-pronation', '哑铃前臂旋前', 'Dumbbell Forearm Pronation', ['forearm-extensors'], ['哑铃'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '旋前'] }),
  e('dumbbell-supination', '哑铃前臂旋后', 'Dumbbell Forearm Supination', ['forearm-flexors'], ['哑铃'], { force: 'pull', mechanic: 'isolation', tags: ['手臂', '前臂', '旋后'] })
];
