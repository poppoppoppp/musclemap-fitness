# Playful Homepage Design

## Goal

Redesign the mobile homepage from a repeated navigation list into a playful MuscleMap training map that helps users start or continue planned training.

## Accepted Direction

The homepage follows the user's supplied concept image:

- Brand header with a playful gradient "Fitness" treatment.
- Large headline: "今天点亮哪块肌肉？"
- Artistic muscle map hero card with six labeled body-part shortcuts: 胸、背、肩、腿、手臂、核心.
- One primary action: "开始记录".
- Recent plan panel with plan name, next executable day, and actions to visit the plan page or start from plan.
- Recent workout panel with date, exercise count, and valid set count.

## Intentional Removals

- Remove homepage action cards for 动作库 and 训练计划 because both are already available in bottom navigation.
- Remove the duplicate "3D 肌群选择" button; keep the hero muscle map as the 3D selection entry.
- Do not add "今日训练灵感" because most users follow their own plan.

## Implementation Notes

- Use existing React Router routes and local storage utilities.
- Read active workout from `readActiveWorkout`.
- Read latest plan from `PLAN_STORAGE_KEY`.
- Read workout logs from `readWorkoutLogs`.
- Keep changes focused on `Dashboard.tsx`, `BottomNav.tsx`, and tests unless a shared style hook is needed.
