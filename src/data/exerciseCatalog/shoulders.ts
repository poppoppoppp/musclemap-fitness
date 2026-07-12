import { catalogExercise as e } from './createCatalogExercise';

const frontSide = ['anterior-deltoid', 'lateral-deltoid'];
const press = { force: 'push' as const, mechanic: 'compound' as const, tags: ['肩部', '推举'] };
const raise = { force: 'push' as const, mechanic: 'isolation' as const, tags: ['肩部', '平举'] };

export const shoulderExercises = [
  e('barbell-overhead-press', '站姿杠铃推举', 'Standing Barbell Overhead Press', frontSide, ['杠铃'], press),
  e('seated-barbell-shoulder-press', '坐姿杠铃推举', 'Seated Barbell Shoulder Press', frontSide, ['杠铃', '卧推凳'], press),
  e('arnold-press', '阿诺德推举', 'Arnold Press', frontSide, ['哑铃'], press),
  e('single-arm-dumbbell-press', '单臂哑铃推举', 'Single-arm Dumbbell Press', frontSide, ['哑铃'], { ...press, tags: ['肩部', '推举', '哑铃', '单臂'] }),
  e('alternating-dumbbell-press', '交替哑铃推举', 'Alternating Dumbbell Press', frontSide, ['哑铃'], press),
  e('smith-shoulder-press', '史密斯机肩推', 'Smith Machine Shoulder Press', frontSide, ['史密斯机', '卧推凳'], press),
  e('landmine-press', '地雷架推举', 'Landmine Press', ['anterior-deltoid'], ['地雷架', '杠铃'], { ...press, secondaryMuscles: ['pectoralis-major'] }),
  e('half-kneeling-landmine-press', '半跪姿地雷架推举', 'Half-kneeling Landmine Press', ['anterior-deltoid'], ['地雷架', '杠铃'], { ...press, secondaryMuscles: ['transverse-abdominis'] }),
  e('single-arm-cable-shoulder-press', '单臂绳索肩推', 'Single-arm Cable Shoulder Press', frontSide, ['绳索器械'], { ...press, tags: ['肩部', '推举', '绳索', '单臂'] }),
  e('band-shoulder-press', '弹力带肩推', 'Band Shoulder Press', frontSide, ['弹力带'], press),
  e('handstand-push-up', '倒立撑', 'Handstand Push-up', frontSide, ['自重'], { ...press, category: 'bodyweight', difficulty: 'advanced' }),
  e('pike-push-up', '折刀俯卧撑', 'Pike Push-up', frontSide, ['自重'], { ...press, category: 'bodyweight' }),
  e('machine-lateral-raise', '器械侧平举', 'Machine Lateral Raise', ['lateral-deltoid'], ['固定器械'], raise),
  e('leaning-dumbbell-lateral-raise', '侧倾哑铃侧平举', 'Leaning Dumbbell Lateral Raise', ['lateral-deltoid'], ['哑铃'], raise),
  e('incline-lateral-raise', '上斜凳侧平举', 'Incline Bench Lateral Raise', ['lateral-deltoid'], ['哑铃', '卧推凳'], raise),
  e('lying-cable-lateral-raise', '侧卧绳索侧平举', 'Lying Cable Lateral Raise', ['lateral-deltoid'], ['绳索器械'], raise),
  e('behind-back-cable-lateral-raise', '身后绳索侧平举', 'Behind-the-back Cable Lateral Raise', ['lateral-deltoid'], ['绳索器械'], raise),
  e('band-lateral-raise', '弹力带侧平举', 'Band Lateral Raise', ['lateral-deltoid'], ['弹力带'], raise),
  e('plate-front-raise', '杠铃片前平举', 'Plate Front Raise', ['anterior-deltoid'], ['杠铃片'], raise),
  e('dumbbell-front-raise', '哑铃前平举', 'Dumbbell Front Raise', ['anterior-deltoid'], ['哑铃'], raise),
  e('cable-front-raise', '绳索前平举', 'Cable Front Raise', ['anterior-deltoid'], ['绳索器械'], raise),
  e('upright-row', '杠铃直立划船', 'Barbell Upright Row', ['lateral-deltoid', 'upper-trapezius'], ['杠铃'], { force: 'pull', mechanic: 'compound', tags: ['肩部', '直立划船', '杠铃'] }),
  e('cable-upright-row', '绳索直立划船', 'Cable Upright Row', ['lateral-deltoid', 'upper-trapezius'], ['绳索器械'], { force: 'pull', mechanic: 'compound', tags: ['肩部', '直立划船', '绳索'] }),
  e('rear-delt-machine-fly', '蝴蝶机反向飞鸟', 'Reverse Pec Deck Fly', ['rear-deltoid'], ['蝴蝶机'], { force: 'pull', mechanic: 'isolation', tags: ['肩部', '后束', '飞鸟'] }),
  e('cable-rear-delt-row', '绳索后束划船', 'Cable Rear Delt Row', ['rear-deltoid'], ['绳索器械'], { force: 'pull', mechanic: 'compound', secondaryMuscles: ['rhomboids'], tags: ['肩部', '后束', '划船'] }),
  e('band-pull-apart', '弹力带水平拉开', 'Band Pull-apart', ['rear-deltoid', 'middle-lower-trapezius'], ['弹力带'], { force: 'pull', mechanic: 'isolation', category: 'activation', tags: ['肩部', '后束', '弹力带'] })
];
