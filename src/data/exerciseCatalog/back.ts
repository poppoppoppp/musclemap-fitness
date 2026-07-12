import { catalogExercise as e } from './createCatalogExercise';

const lats = ['latissimus-dorsi'];
const upperBack = ['rhomboids', 'middle-lower-trapezius'];
const pull = { force: 'pull' as const, mechanic: 'compound' as const, tags: ['背部', '拉'] };

export const backExercises = [
  e('wide-grip-lat-pulldown', '宽握高位下拉', 'Wide-grip Lat Pulldown', lats, ['高位下拉器'], { ...pull, tags: ['背部', '下拉', '宽握'] }),
  e('reverse-grip-lat-pulldown', '反握高位下拉', 'Reverse-grip Lat Pulldown', lats, ['高位下拉器'], { ...pull, tags: ['背部', '下拉', '反握'] }),
  e('single-arm-lat-pulldown', '单臂高位下拉', 'Single-arm Lat Pulldown', lats, ['高位下拉器'], { ...pull, tags: ['背部', '下拉', '单臂'] }),
  e('kneeling-single-arm-pulldown', '跪姿单臂下拉', 'Kneeling Single-arm Pulldown', lats, ['绳索器械'], { ...pull, tags: ['背部', '下拉', '绳索', '单臂'] }),
  e('assisted-pull-up', '辅助引体向上', 'Assisted Pull-up', lats, ['辅助引体机'], { ...pull, difficulty: 'beginner' }),
  e('neutral-grip-pull-up', '对握引体向上', 'Neutral-grip Pull-up', lats, ['单杠'], { ...pull, category: 'bodyweight' }),
  e('chin-up', '反握引体向上', 'Chin-up', lats, ['单杠'], { ...pull, category: 'bodyweight', secondaryMuscles: ['biceps-brachii'] }),
  e('wide-grip-pull-up', '宽握引体向上', 'Wide-grip Pull-up', lats, ['单杠'], { ...pull, category: 'bodyweight', difficulty: 'advanced' }),
  e('sternum-pull-up', '胸触杠引体向上', 'Sternum Pull-up', upperBack, ['单杠'], { ...pull, category: 'bodyweight', difficulty: 'advanced', secondaryMuscles: lats }),
  e('machine-high-row', '器械高位划船', 'Machine High Row', lats, ['胸托划船机'], pull),
  e('machine-low-row', '器械低位划船', 'Machine Low Row', upperBack, ['坐姿划船器'], { ...pull, secondaryMuscles: lats }),
  e('single-arm-cable-row', '单臂绳索划船', 'Single-arm Cable Row', lats, ['绳索器械'], { ...pull, tags: ['背部', '划船', '绳索', '单臂'] }),
  e('standing-cable-row', '站姿绳索划船', 'Standing Cable Row', upperBack, ['绳索器械'], { ...pull, secondaryMuscles: lats }),
  e('neutral-grip-seated-row', '坐姿对握划船', 'Neutral-grip Seated Row', lats, ['坐姿划船器'], { ...pull, tags: ['背部', '划船', '对握'] }),
  e('underhand-seated-row', '坐姿反握划船', 'Underhand Seated Row', lats, ['坐姿划船器'], { ...pull, tags: ['背部', '划船', '反握'] }),
  e('seal-row', '俯卧杠铃划船', 'Seal Row', upperBack, ['杠铃', '卧推凳'], { ...pull, secondaryMuscles: lats }),
  e('incline-dumbbell-row', '上斜凳哑铃划船', 'Incline Bench Dumbbell Row', upperBack, ['哑铃', '卧推凳'], { ...pull, secondaryMuscles: lats }),
  e('renegade-row', '俯卧撑位哑铃划船', 'Renegade Row', lats, ['哑铃'], { ...pull, secondaryMuscles: ['transverse-abdominis'], tags: ['背部', '划船', '核心稳定'] }),
  e('landmine-row', '地雷架双臂划船', 'Landmine Row', upperBack, ['地雷架', '杠铃'], { ...pull, secondaryMuscles: lats }),
  e('single-arm-landmine-row', '地雷架单臂划船', 'Single-arm Landmine Row', lats, ['地雷架', '杠铃'], { ...pull, tags: ['背部', '划船', '地雷架', '单臂'] }),
  e('pendlay-row', '彭德雷划船', 'Pendlay Row', upperBack, ['杠铃'], { ...pull, secondaryMuscles: lats, difficulty: 'advanced' }),
  e('underhand-barbell-row', '反握杠铃划船', 'Underhand Barbell Row', lats, ['杠铃'], { ...pull, tags: ['背部', '划船', '反握'] }),
  e('bilateral-dumbbell-row', '双臂哑铃划船', 'Bilateral Dumbbell Row', upperBack, ['哑铃'], { ...pull, secondaryMuscles: lats }),
  e('kettlebell-row', '壶铃划船', 'Kettlebell Row', lats, ['壶铃'], { ...pull, tags: ['背部', '划船', '壶铃'] }),
  e('smith-machine-row', '史密斯机划船', 'Smith Machine Row', upperBack, ['史密斯机'], { ...pull, secondaryMuscles: lats }),
  e('meadows-row', '梅多斯划船', 'Meadows Row', lats, ['地雷架', '杠铃'], { ...pull, tags: ['背部', '划船', '地雷架', '单臂'] }),
  e('feet-elevated-inverted-row', '抬脚反向划船', 'Feet-elevated Inverted Row', upperBack, ['自重'], { ...pull, category: 'bodyweight', secondaryMuscles: lats }),
  e('trx-row', 'TRX 划船', 'TRX Row', upperBack, ['TRX 悬挂带'], { ...pull, category: 'bodyweight', secondaryMuscles: lats }),
  e('band-row', '弹力带划船', 'Band Row', upperBack, ['弹力带'], { ...pull, secondaryMuscles: lats }),
  e('band-straight-arm-pulldown', '弹力带直臂下拉', 'Band Straight-arm Pulldown', lats, ['弹力带'], { force: 'pull', mechanic: 'isolation', tags: ['背部', '下拉', '弹力带'] }),
  e('machine-pullover', '器械直臂上拉', 'Machine Pullover', lats, ['固定器械'], { force: 'pull', mechanic: 'isolation', tags: ['背部', '背阔肌', '孤立'] }),
  e('dumbbell-pullover-back', '哑铃直臂上拉', 'Dumbbell Pullover', lats, ['哑铃', '卧推凳'], { force: 'pull', mechanic: 'isolation', tags: ['背部', '背阔肌', '哑铃'] }),
  e('rack-pull', '架上硬拉', 'Rack Pull', ['erector-spinae'], ['杠铃', '深蹲架'], { force: 'hinge', mechanic: 'compound', secondaryMuscles: ['upper-trapezius', 'gluteus-maximus'], difficulty: 'advanced', tags: ['背部', '髋铰链', '硬拉'] }),
  e('barbell-good-morning', '杠铃早安式', 'Barbell Good Morning', ['erector-spinae'], ['杠铃', '深蹲架'], { force: 'hinge', mechanic: 'compound', secondaryMuscles: ['hamstrings', 'gluteus-maximus'], tags: ['背部', '后链', '髋铰链'] })
];
