import { catalogExercise as e } from './createCatalogExercise';

const abs = ['rectus-abdominis'];
const deepCore = ['transverse-abdominis'];
const bodyweight = { force: 'pull' as const, mechanic: 'isolation' as const, category: 'bodyweight' as const, tags: ['核心', '自重'] };

export const coreExercises = [
  e('reverse-crunch', '反向卷腹', 'Reverse Crunch', abs, ['自重'], bodyweight),
  e('bicycle-crunch', '自行车卷腹', 'Bicycle Crunch', abs, ['自重'], { ...bodyweight, secondaryMuscles: ['obliques'] }),
  e('standing-cable-crunch', '站姿绳索卷腹', 'Standing Cable Crunch', abs, ['绳索器械'], { force: 'pull', mechanic: 'isolation', tags: ['核心', '卷腹', '绳索'] }),
  e('kneeling-cable-crunch', '跪姿绳索卷腹', 'Kneeling Cable Crunch', abs, ['绳索器械'], { force: 'pull', mechanic: 'isolation', tags: ['核心', '卷腹', '绳索'] }),
  e('machine-crunch', '器械卷腹', 'Machine Crunch', abs, ['腹肌训练机'], { force: 'pull', mechanic: 'isolation', tags: ['核心', '卷腹', '器械'] }),
  e('ab-wheel-rollout', '健腹轮跪姿滚动', 'Kneeling Ab Wheel Rollout', deepCore, ['健腹轮'], { force: 'pull', mechanic: 'compound', secondaryMuscles: abs, tags: ['核心', '抗伸展', '健腹轮'] }),
  e('standing-ab-wheel-rollout', '健腹轮站姿滚动', 'Standing Ab Wheel Rollout', deepCore, ['健腹轮'], { force: 'pull', mechanic: 'compound', secondaryMuscles: abs, difficulty: 'advanced', tags: ['核心', '抗伸展', '健腹轮'] }),
  e('stability-ball-crunch', '健身球卷腹', 'Stability Ball Crunch', abs, ['健身球'], bodyweight),
  e('stability-ball-rollout', '健身球前滚', 'Stability Ball Rollout', deepCore, ['健身球'], { force: 'pull', mechanic: 'compound', category: 'bodyweight', tags: ['核心', '抗伸展', '健身球'] }),
  e('decline-sit-up', '下斜仰卧起坐', 'Decline Sit-up', abs, ['卧推凳'], bodyweight),
  e('weighted-sit-up', '负重仰卧起坐', 'Weighted Sit-up', abs, ['杠铃片'], { force: 'pull', mechanic: 'isolation', tags: ['核心', '腹直肌', '负重'] }),
  e('v-up', 'V 字两头起', 'V-up', abs, ['自重'], bodyweight),
  e('toe-touch-crunch', '触足卷腹', 'Toe-touch Crunch', abs, ['自重'], bodyweight),
  e('lying-leg-raise', '仰卧举腿', 'Lying Leg Raise', abs, ['自重'], bodyweight),
  e('captains-chair-knee-raise', '双杠屈膝举腿', 'Captain Chair Knee Raise', abs, ['双杠'], { ...bodyweight, tags: ['核心', '举腿', '双杠'] }),
  e('hanging-knee-raise', '悬垂屈膝举腿', 'Hanging Knee Raise', abs, ['单杠'], { ...bodyweight, tags: ['核心', '举腿', '悬垂'] }),
  e('hanging-windshield-wiper', '悬垂雨刷式摆腿', 'Hanging Windshield Wiper', ['obliques'], ['单杠'], { ...bodyweight, secondaryMuscles: abs, difficulty: 'advanced' }),
  e('stability-ball-knee-tuck', '健身球屈膝收腹', 'Stability Ball Knee Tuck', deepCore, ['健身球'], { force: 'pull', mechanic: 'compound', category: 'bodyweight', secondaryMuscles: abs, tags: ['核心', '抗伸展', '健身球'] }),
  e('mountain-climber', '登山跑', 'Mountain Climber', deepCore, ['自重'], { force: 'pull', mechanic: 'compound', category: 'bodyweight', tags: ['核心', '动态稳定', '自重'] }),
  e('bird-dog', '鸟狗式', 'Bird Dog', deepCore, ['自重'], { force: 'static', mechanic: 'compound', category: 'activation', secondaryMuscles: ['erector-spinae', 'gluteus-maximus'], tags: ['核心', '稳定', '激活'] }),
  e('hollow-body-hold', '中空支撑', 'Hollow Body Hold', deepCore, ['自重'], { force: 'static', mechanic: 'isolation', category: 'bodyweight', secondaryMuscles: abs, tags: ['核心', '静态', '抗伸展'] }),
  e('trx-body-saw', 'TRX 锯式平板支撑', 'TRX Body Saw', deepCore, ['TRX 悬挂带'], { force: 'static', mechanic: 'compound', category: 'bodyweight', tags: ['核心', '平板支撑', 'TRX'] }),
  e('plank-shoulder-tap', '平板支撑交替触肩', 'Plank Shoulder Tap', deepCore, ['自重'], { force: 'static', mechanic: 'compound', category: 'bodyweight', secondaryMuscles: ['obliques'], tags: ['核心', '平板支撑', '抗旋转'] }),
  e('copenhagen-plank', '哥本哈根侧桥', 'Copenhagen Plank', ['hip-adductors', 'obliques'], ['自重', '卧推凳'], { force: 'static', mechanic: 'compound', category: 'bodyweight', tags: ['核心', '侧桥', '内收肌'] }),
  e('pallof-press', '站姿绳索抗旋推', 'Standing Pallof Press', ['obliques', 'transverse-abdominis'], ['绳索器械'], { force: 'push', mechanic: 'isolation', tags: ['核心', '抗旋转', '绳索'] }),
  e('half-kneeling-pallof-press', '半跪姿绳索抗旋推', 'Half-kneeling Pallof Press', ['obliques', 'transverse-abdominis'], ['绳索器械'], { force: 'push', mechanic: 'isolation', tags: ['核心', '抗旋转', '绳索'] }),
  e('cable-woodchop', '绳索伐木转体', 'Cable Woodchop', ['obliques'], ['绳索器械'], { force: 'pull', mechanic: 'compound', tags: ['核心', '旋转', '绳索'] }),
  e('landmine-rotation', '地雷架转体', 'Landmine Rotation', ['obliques'], ['地雷架', '杠铃'], { force: 'push', mechanic: 'compound', secondaryMuscles: deepCore, tags: ['核心', '旋转', '地雷架'] })
];
