import { catalogExercise as e } from './createCatalogExercise';

const chest = ['pectoralis-major'];
const press = { force: 'push' as const, mechanic: 'compound' as const, tags: ['胸部', '推举'] };
const fly = { force: 'push' as const, mechanic: 'isolation' as const, tags: ['胸部', '飞鸟', '夹胸'] };

export const chestExercises = [
  e('incline-barbell-bench-press', '上斜杠铃卧推', 'Incline Barbell Bench Press', chest, ['杠铃', '卧推凳'], { ...press, tags: ['胸部', '卧推', '上斜卧推'] }),
  e('decline-barbell-bench-press', '下斜杠铃卧推', 'Decline Barbell Bench Press', chest, ['杠铃', '卧推凳'], press),
  e('incline-dumbbell-bench-press', '上斜哑铃卧推', 'Incline Dumbbell Bench Press', chest, ['哑铃', '卧推凳'], press),
  e('decline-dumbbell-bench-press', '下斜哑铃卧推', 'Decline Dumbbell Bench Press', chest, ['哑铃', '卧推凳'], press),
  e('neutral-grip-dumbbell-bench-press', '对握哑铃卧推', 'Neutral-grip Dumbbell Bench Press', chest, ['哑铃', '卧推凳'], press),
  e('alternating-dumbbell-bench-press', '交替哑铃卧推', 'Alternating Dumbbell Bench Press', chest, ['哑铃', '卧推凳'], press),
  e('smith-flat-bench-press', '史密斯机平板卧推', 'Smith Machine Flat Bench Press', chest, ['史密斯机', '卧推凳'], press),
  e('smith-incline-bench-press', '史密斯机上斜卧推', 'Smith Machine Incline Bench Press', chest, ['史密斯机', '卧推凳'], press),
  e('smith-decline-bench-press', '史密斯机下斜卧推', 'Smith Machine Decline Bench Press', chest, ['史密斯机', '卧推凳'], press),
  e('incline-machine-chest-press', '器械上斜推胸', 'Incline Machine Chest Press', chest, ['推胸器'], press),
  e('decline-machine-chest-press', '器械下斜推胸', 'Decline Machine Chest Press', chest, ['推胸器'], press),
  e('single-arm-machine-chest-press', '单臂器械推胸', 'Single-arm Machine Chest Press', chest, ['推胸器'], { ...press, tags: ['胸部', '推胸', '单臂'] }),
  e('plate-loaded-chest-press', '杠片式器械推胸', 'Plate-loaded Chest Press', chest, ['推胸器', '杠铃片'], press),
  e('dumbbell-floor-press', '哑铃地板卧推', 'Dumbbell Floor Press', chest, ['哑铃'], press),
  e('barbell-floor-press', '杠铃地板卧推', 'Barbell Floor Press', chest, ['杠铃'], press),
  e('dumbbell-chest-fly', '平板哑铃飞鸟', 'Flat Dumbbell Fly', chest, ['哑铃', '卧推凳'], fly),
  e('incline-dumbbell-fly', '上斜哑铃飞鸟', 'Incline Dumbbell Fly', chest, ['哑铃', '卧推凳'], fly),
  e('decline-dumbbell-fly', '下斜哑铃飞鸟', 'Decline Dumbbell Fly', chest, ['哑铃', '卧推凳'], fly),
  e('low-to-high-cable-fly', '绳索低位夹胸', 'Low-to-high Cable Fly', chest, ['绳索器械'], fly),
  e('high-to-low-cable-fly', '绳索高位夹胸', 'High-to-low Cable Fly', chest, ['绳索器械'], fly),
  e('single-arm-cable-fly', '单臂绳索夹胸', 'Single-arm Cable Fly', chest, ['绳索器械'], { ...fly, tags: ['胸部', '夹胸', '绳索', '单臂'] }),
  e('pec-deck-fly', '蝴蝶机夹胸', 'Pec Deck Fly', chest, ['蝴蝶机'], fly),
  e('band-chest-press', '弹力带推胸', 'Band Chest Press', chest, ['弹力带'], press),
  e('band-chest-fly', '弹力带夹胸', 'Band Chest Fly', chest, ['弹力带'], fly),
  e('wide-grip-push-up', '宽距俯卧撑', 'Wide-grip Push-up', chest, ['自重'], { ...press, category: 'bodyweight', tags: ['胸部', '俯卧撑', '宽距'] }),
  e('decline-push-up', '下斜俯卧撑', 'Decline Push-up', chest, ['自重'], { ...press, category: 'bodyweight', tags: ['胸部', '俯卧撑', '上胸'] }),
  e('incline-push-up', '上斜俯卧撑', 'Incline Push-up', chest, ['自重'], { ...press, category: 'bodyweight', difficulty: 'beginner' }),
  e('weighted-push-up', '负重俯卧撑', 'Weighted Push-up', chest, ['自重', '杠铃片'], { ...press, category: 'bodyweight', difficulty: 'advanced', weightType: 'bodyweight_added' })
];
