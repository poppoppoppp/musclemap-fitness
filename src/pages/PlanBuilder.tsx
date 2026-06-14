import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Notice from '../components/ui/Notice';
import Select from '../components/ui/Select';
import { getExerciseById } from '../data/exercises';
import { getMuscleById } from '../data/muscles';
import type { DaysPerWeek, EquipmentCategory, FocusBodyPart, GeneratedPlan, PlanGoal, PlanInput, TrainingLevel } from '../types/workout';
import {
  daysPerWeekOptions,
  equipmentCategoryOptions,
  focusBodyPartOptions,
  generatePlan,
  PLAN_STORAGE_KEY,
  planGoalOptions,
  trainingLevelOptions
} from '../utils/planRules';
import { readStorage, removeStorage, writeStorage } from '../utils/storage';

const defaultInput: PlanInput = {
  goal: 'hypertrophy',
  daysPerWeek: 3,
  level: 'beginner',
  availableEquipment: 'fullGym',
  focusBodyParts: []
};

export default function PlanBuilder() {
  const [input, setInput] = useState<PlanInput>(defaultInput);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);

  useEffect(() => {
    setPlan(readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null));
  }, []);

  const updateInput = <K extends keyof PlanInput>(key: K, value: PlanInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const toggleFocus = (bodyPart: FocusBodyPart) => {
    setInput((current) => ({
      ...current,
      focusBodyParts: current.focusBodyParts.includes(bodyPart)
        ? current.focusBodyParts.filter((item) => item !== bodyPart)
        : [...current.focusBodyParts, bodyPart]
    }));
  };

  const handleGenerate = () => {
    const generated = generatePlan(input);
    setPlan(generated);
    writeStorage(PLAN_STORAGE_KEY, generated);
  };

  const handleClear = () => {
    setPlan(null);
    removeStorage(PLAN_STORAGE_KEY);
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <PageHeader title="训练计划生成器" description="根据目标、训练水平和器械条件生成基础训练安排。" />

      <Notice>当前计划由本地规则生成，仅作为基础训练安排参考，不替代专业教练指导。</Notice>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit">
            <h2 className="text-lg font-semibold text-app-text">计划条件</h2>
          <div className="mt-4 space-y-4">
            <Select
              label="训练目标"
              value={input.goal}
              onChange={(value) => updateInput('goal', value as PlanGoal)}
              options={planGoalOptions}
            />
            <Select
              label="每周训练天数"
              value={String(input.daysPerWeek)}
              onChange={(value) => updateInput('daysPerWeek', Number(value) as DaysPerWeek)}
              options={daysPerWeekOptions.map((option) => ({ value: String(option.value), label: option.label }))}
            />
            <Select
              label="训练水平"
              value={input.level}
              onChange={(value) => updateInput('level', value as TrainingLevel)}
              options={trainingLevelOptions}
            />
            <Select
              label="可用器械"
              value={input.availableEquipment}
              onChange={(value) => updateInput('availableEquipment', value as EquipmentCategory)}
              options={equipmentCategoryOptions}
            />

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-app-muted">重点肌群</legend>
              <div className="grid grid-cols-2 gap-2">
                {focusBodyPartOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-app-line bg-app-surface px-3 py-2 text-sm text-app-text transition hover:border-app-accent/35"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={input.focusBodyParts.includes(option.value)}
                      onChange={() => toggleFocus(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={handleGenerate}>
                生成计划
              </Button>
              {plan ? (
                <Button type="button" variant="ghost" onClick={handleClear}>
                  清除当前计划
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <PlanResult plan={plan} />
      </div>
    </div>
  );
}

function PlanResult({ plan }: { plan: GeneratedPlan | null }) {
  if (!plan) {
    return (
      <EmptyState
        title="还没有生成训练计划"
        description="选择训练目标、天数、水平、器械和重点肌群后，点击生成计划查看安排。"
      />
    );
  }

  return (
    <div data-testid="generated-plan-result" className="space-y-4">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-app-accent">最近生成计划</p>
            <h2 className="mt-1 text-2xl font-semibold text-app-text">{plan.name}</h2>
          </div>
          <p className="text-sm text-app-muted">{new Date(plan.createdAt).toLocaleString('zh-CN')}</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-app-muted">
          {labelOf(planGoalOptions, plan.input.goal)} / 每周 {plan.input.daysPerWeek} 天 / {labelOf(trainingLevelOptions, plan.input.level)} /{' '}
          {labelOf(equipmentCategoryOptions, plan.input.availableEquipment)}
        </p>
      </Card>

      {plan.days.map((day) => (
        <Card key={day.id} className="space-y-4">
          <article data-testid="generated-workout-day">
            <div data-testid={`workout-day-${day.id.replace(/-\d+$/, '')}`}>
              <div className="border-b border-app-line pb-3">
                <h3 className="text-xl font-semibold text-app-text">{day.name}</h3>
                <p className="mt-1 text-sm leading-6 text-app-muted">训练重点：{day.focus}</p>
                {day.notice ? <Notice tone="warning" className="mt-2">{day.notice}</Notice> : null}
              </div>

              <div className="mt-4 grid gap-3">
                {day.items.map((item) => {
                  const exercise = getExerciseById(item.exerciseId);
                  if (!exercise) return null;

                  return (
                    <div
                      key={item.exerciseId}
                      data-testid="generated-plan-item"
                      className="rounded-xl border border-app-line bg-app-surfaceMuted p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <Link to={`/exercises/${exercise.id}`} className="font-semibold text-app-text hover:text-app-accent">
                          {exercise.name}
                        </Link>
                        <div className="flex flex-wrap gap-2 text-xs text-app-muted">
                          <Badge>{item.sets} 组</Badge>
                          <Badge>{item.repRange}</Badge>
                          <Badge>休息 {item.restSeconds} 秒</Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-app-muted">主要刺激：{item.targetMuscles.map(formatMuscle).join('、')}</p>
                      {item.note ? <p className="mt-2 text-sm leading-6 text-app-accent">{item.note}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        </Card>
      ))}
    </div>
  );
}

function labelOf<T extends string | number>(options: { value: T; label: string }[], value: T) {
  return options.find((option) => option.value === value)?.label ?? String(value);
}

function formatMuscle(muscleId: string) {
  return getMuscleById(muscleId)?.nameZh ?? muscleId;
}
