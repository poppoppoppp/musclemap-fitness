import type { BodyMetricDefinition, ProgressPhotoCategory, StrengthTrend } from '../types/growth';

export const strengthTrends: StrengthTrend[] = [
  {
    id: 'barbell-bench-press',
    label: '卧推',
    currentValue: 92.5,
    change: 7.5,
    unit: 'kg',
    points: [
      { label: '4/12', value: 77.5 },
      { label: '4/26', value: 79.5 },
      { label: '5/10', value: 84 },
      { label: '5/24', value: 88 },
      { label: '6/7', value: 90.5 },
      { label: '6/21', value: 94.5 },
      { label: '7/5', value: 91.5 },
      { label: '7/12', value: 92.5 }
    ]
  },
  {
    id: 'squat',
    label: '深蹲',
    currentValue: 120,
    change: 10,
    unit: 'kg',
    points: [
      { label: '4/12', value: 96 },
      { label: '4/26', value: 100 },
      { label: '5/10', value: 104 },
      { label: '5/24', value: 108 },
      { label: '6/7', value: 112 },
      { label: '6/21', value: 115 },
      { label: '7/5', value: 117.5 },
      { label: '7/12', value: 120 }
    ]
  },
  {
    id: 'deadlift',
    label: '硬拉',
    currentValue: 142.5,
    change: 12.5,
    unit: 'kg',
    points: [
      { label: '4/12', value: 112.5 },
      { label: '4/26', value: 117.5 },
      { label: '5/10', value: 122.5 },
      { label: '5/24', value: 127.5 },
      { label: '6/7', value: 132.5 },
      { label: '6/21', value: 135 },
      { label: '7/5', value: 140 },
      { label: '7/12', value: 142.5 }
    ]
  }
];

export const bodyMetricDefinitions: BodyMetricDefinition[] = [
  {
    id: 'weight',
    label: '体重',
    unit: 'kg',
    change: -1.8,
    fallbackPoints: [
      { label: '4/12', value: 75 },
      { label: '4/26', value: 75.5 },
      { label: '5/10', value: 74.6 },
      { label: '5/24', value: 74 },
      { label: '6/7', value: 73.6 },
      { label: '6/21', value: 73 },
      { label: '7/5', value: 72.5 },
      { label: '7/12', value: 72.3 }
    ]
  },
  {
    id: 'waist',
    label: '腰围',
    unit: 'cm',
    change: -2.4,
    fallbackPoints: [
      { label: '4/12', value: 82.5 },
      { label: '4/26', value: 82 },
      { label: '5/10', value: 81.7 },
      { label: '5/24', value: 81 },
      { label: '6/7', value: 80.8 },
      { label: '6/21', value: 80.4 },
      { label: '7/5', value: 80.2 },
      { label: '7/12', value: 80.1 }
    ]
  },
  {
    id: 'arm',
    label: '臂围',
    unit: 'cm',
    change: 1.2,
    fallbackPoints: [
      { label: '4/12', value: 33.5 },
      { label: '4/26', value: 33.7 },
      { label: '5/10', value: 34 },
      { label: '5/24', value: 34.1 },
      { label: '6/7', value: 34.3 },
      { label: '6/21', value: 34.5 },
      { label: '7/5', value: 34.6 },
      { label: '7/12', value: 34.7 }
    ]
  }
];

export const progressPhotoCategories: ProgressPhotoCategory[] = [
  { id: 'face', label: '面部', featured: true, earliestDate: '4/12', latestDate: '7/12' },
  { id: 'front', label: '全身正面', featured: true, earliestDate: '4/12', latestDate: '7/12' },
  { id: 'side', label: '全身侧面', featured: false, earliestDate: '4/12', latestDate: '7/12' },
  { id: 'back', label: '全身背面', featured: false, earliestDate: '4/12', latestDate: '7/12' },
  { id: 'chest', label: '胸肌', featured: false, earliestDate: '4/12', latestDate: '7/12' },
  { id: 'biceps', label: '二头', featured: false, earliestDate: '4/12', latestDate: '7/12' }
];
