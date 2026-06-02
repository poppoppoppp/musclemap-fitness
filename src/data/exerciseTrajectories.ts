export type ExerciseTrajectoryPoint = {
  x: number;
  y: number;
  z: number;
  label?: string;
};

export type ExerciseTrajectory = {
  exerciseId: string;
  label: string;
  viewHint?: string;
  directionLabel: string;
  targetMuscleIds: string[];
  secondaryMuscleIds?: string[];
  points: ExerciseTrajectoryPoint[];
  durationMs?: number;
  phaseLabels?: string[];
  cues?: string[];
};

export const exerciseTrajectories: ExerciseTrajectory[] = [
  {
    exerciseId: 'lat-pulldown',
    label: '下拉路径示意',
    viewHint: '上方起点，下拉到锁骨附近',
    directionLabel: '从头顶上方下拉到上胸',
    targetMuscleIds: ['latissimus-dorsi'],
    secondaryMuscleIds: ['teres-major', 'middle-lower-trapezius', 'rhomboids'],
    points: [
      { x: 0, y: 0.8, z: -0.2, label: '上方握杆' },
      { x: 0, y: -0.35, z: 0.15, label: '锁骨附近' }
    ],
    cues: ['先下沉肩胛，再向下拉。', '手肘沿身体两侧向下走。']
  },
  {
    exerciseId: 'seated-row',
    label: '划船路径示意',
    viewHint: '前方伸展，向躯干拉回',
    directionLabel: '从身体前方拉回到躯干',
    targetMuscleIds: ['rhomboids', 'latissimus-dorsi'],
    secondaryMuscleIds: ['middle-lower-trapezius', 'teres-major'],
    points: [
      { x: 0, y: 0.05, z: -0.8, label: '前方伸展' },
      { x: 0, y: 0.05, z: 0.45, label: '躯干前方' }
    ],
    cues: ['保持躯干稳定。', '让肩胛自然前伸和后缩。']
  },
  {
    exerciseId: 'machine-chest-press',
    label: '推胸路径示意',
    viewHint: '胸前起点，向前推出',
    directionLabel: '从胸前向正前方推出',
    targetMuscleIds: ['pectoralis-major'],
    secondaryMuscleIds: ['anterior-deltoid', 'triceps-brachii'],
    points: [
      { x: 0, y: 0.08, z: 0.35, label: '胸前起点' },
      { x: 0, y: 0.08, z: -0.85, label: '向前推出' }
    ],
    cues: ['肩胛贴住靠垫。', '推到接近伸直但不锁死手肘。']
  },
  {
    exerciseId: 'dumbbell-shoulder-press',
    label: '肩推路径示意',
    viewHint: '肩部起点，向上推起',
    directionLabel: '从肩部向头顶上方推起',
    targetMuscleIds: ['anterior-deltoid', 'lateral-deltoid'],
    secondaryMuscleIds: ['triceps-brachii', 'upper-trapezius'],
    points: [
      { x: -0.2, y: -0.25, z: 0.1, label: '肩部起点' },
      { x: -0.08, y: 0.75, z: -0.05, label: '头顶上方' },
      { x: 0.2, y: -0.25, z: 0.1, label: '另一侧肩部' },
      { x: 0.08, y: 0.75, z: -0.05, label: '另一侧顶点' }
    ],
    cues: ['肋骨不要外翻。', '手腕保持在手肘上方。']
  },
  {
    exerciseId: 'dumbbell-curl',
    label: '弯举路径示意',
    viewHint: '手臂下方，向肩部弯举',
    directionLabel: '从手臂下方向肩部弯举',
    targetMuscleIds: ['biceps-brachii'],
    secondaryMuscleIds: ['brachialis'],
    points: [
      { x: -0.2, y: -0.65, z: 0.05, label: '手臂下方' },
      { x: -0.12, y: 0.35, z: 0.18, label: '肩部附近' }
    ],
    cues: ['手肘贴近身体。', '下降阶段保持控制。']
  },
  {
    exerciseId: 'squat',
    label: '下蹲路径示意',
    viewHint: '站立上方，下蹲，再起身',
    directionLabel: '身体重心下蹲后再起身',
    targetMuscleIds: ['quadriceps', 'gluteus-maximus'],
    secondaryMuscleIds: ['hamstrings', 'erector-spinae'],
    points: [
      { x: 0, y: 0.65, z: 0, label: '站立起点' },
      { x: 0, y: -0.45, z: 0.12, label: '下蹲底部' },
      { x: 0, y: 0.65, z: 0, label: '起身终点' }
    ],
    cues: ['脚掌均匀压地。', '膝盖跟随脚尖方向。']
  }
];

export const getExerciseTrajectoryByExerciseId = (exerciseId: string) =>
  exerciseTrajectories.find((trajectory) => trajectory.exerciseId === exerciseId);
