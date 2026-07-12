import { catalogExercise as e } from './createCatalogExercise';

const fullBodyTags = ['全身复合'];
const posterior = ['gluteus-maximus', 'hamstrings'];

export const fullBodyExercises = [
  e('kettlebell-swing', '壶铃摆动', 'Kettlebell Swing', posterior, ['壶铃'], { force: 'hinge', mechanic: 'compound', secondaryMuscles: ['erector-spinae', 'transverse-abdominis'], tags: [...fullBodyTags, '壶铃', '髋铰链'] }),
  e('kettlebell-clean', '壶铃翻举', 'Kettlebell Clean', posterior, ['壶铃'], { force: 'hinge', mechanic: 'compound', secondaryMuscles: ['upper-trapezius', 'anterior-deltoid'], tags: [...fullBodyTags, '壶铃', '翻举'] }),
  e('kettlebell-clean-and-press', '壶铃翻举推举', 'Kettlebell Clean and Press', ['anterior-deltoid', 'gluteus-maximus'], ['壶铃'], { force: 'push', mechanic: 'compound', secondaryMuscles: ['quadriceps', 'hamstrings', 'triceps-brachii'], tags: [...fullBodyTags, '壶铃', '推举'] }),
  e('kettlebell-snatch', '壶铃抓举', 'Kettlebell Snatch', posterior, ['壶铃'], { force: 'hinge', mechanic: 'compound', secondaryMuscles: ['anterior-deltoid', 'upper-trapezius'], difficulty: 'advanced', tags: [...fullBodyTags, '壶铃', '抓举'] }),
  e('dumbbell-thruster', '哑铃深蹲推举', 'Dumbbell Thruster', ['quadriceps', 'anterior-deltoid'], ['哑铃'], { force: 'push', mechanic: 'compound', secondaryMuscles: ['gluteus-maximus', 'triceps-brachii'], tags: [...fullBodyTags, '哑铃', '深蹲推举'] }),
  e('barbell-thruster', '杠铃深蹲推举', 'Barbell Thruster', ['quadriceps', 'anterior-deltoid'], ['杠铃'], { force: 'push', mechanic: 'compound', secondaryMuscles: ['gluteus-maximus', 'triceps-brachii'], tags: [...fullBodyTags, '杠铃', '深蹲推举'] }),
  e('barbell-clean-and-press', '杠铃翻举推举', 'Barbell Clean and Press', ['anterior-deltoid', 'gluteus-maximus'], ['杠铃'], { force: 'push', mechanic: 'compound', secondaryMuscles: ['quadriceps', 'hamstrings', 'upper-trapezius'], difficulty: 'advanced', tags: [...fullBodyTags, '杠铃', '翻举'] }),
  e('power-clean', '杠铃力量翻', 'Barbell Power Clean', posterior, ['杠铃'], { force: 'hinge', mechanic: 'compound', secondaryMuscles: ['quadriceps', 'upper-trapezius'], difficulty: 'advanced', tags: [...fullBodyTags, '杠铃', '翻举'] }),
  e('hang-clean', '杠铃悬垂翻', 'Barbell Hang Clean', posterior, ['杠铃'], { force: 'hinge', mechanic: 'compound', secondaryMuscles: ['quadriceps', 'upper-trapezius'], difficulty: 'advanced', tags: [...fullBodyTags, '杠铃', '翻举'] }),
  e('burpee', '波比跳', 'Burpee', ['quadriceps', 'pectoralis-major'], ['自重'], { force: 'push', mechanic: 'compound', category: 'bodyweight', secondaryMuscles: ['gluteus-maximus', 'anterior-deltoid', 'transverse-abdominis'], tags: [...fullBodyTags, '自重', '波比跳'] }),
  e('battle-rope-slams', '战绳双臂砸绳', 'Battle Rope Slams', ['anterior-deltoid', 'rectus-abdominis'], ['战绳'], { force: 'pull', mechanic: 'compound', secondaryMuscles: ['latissimus-dorsi', 'quadriceps'], tags: [...fullBodyTags, '战绳'] }),
  e('sled-push', '负重雪橇推行', 'Weighted Sled Push', ['quadriceps', 'gluteus-maximus'], ['雪橇'], { force: 'push', mechanic: 'compound', secondaryMuscles: ['calves', 'pectoralis-major'], tags: [...fullBodyTags, '雪橇', '推行'] })
];
