# 体态改善方案接入 Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 将真实体态改善数据安全地接入添加动作抽屉、当前训练、动作详情和历史快照。

**Architecture:** 使用集中数据选择器过滤可发布方案；在现有扁平训练动作上增加可选方案上下文，并在训练与历史顶层保存方案快照。UI 继续复用现有抽屉、动作详情和动作记录组件。

**Tech Stack:** React 19、TypeScript、Zustand 现有应用状态、localStorage、Tailwind CSS、Playwright。

---

### Task 1：定义体态数据域与发布过滤

**Files:**
- Create: `src/types/posture.ts`
- Create: `src/utils/postureProtocols.ts`
- Test: `src/tests/posture-protocols.spec.ts`

1. 先编写过滤、问题去重、动作排序、hold 排除和空数据测试。
2. 运行目标测试，确认因模块不存在而失败。
3. 实现最小类型和纯函数，导入真实 JSON。
4. 运行目标测试至通过。

### Task 2：定义训练与历史快照行为

**Files:**
- Modify: `src/types/activeWorkout.ts`
- Modify: `src/types/workout.ts`
- Modify: `src/utils/activeWorkout.ts`
- Test: `src/tests/posture-protocols.spec.ts`

1. 先增加加入独立快照、源数据不变、修改标记、排序、删除、归档和旧数据兼容测试。
2. 运行目标测试，确认新 API 缺失导致失败。
3. 实现加入、组内/组外移动、删除和归档复制。
4. 运行目标测试至通过。

### Task 3：复用动作详情数据

**Files:**
- Modify: `src/types/exercise.ts`
- Modify: `src/data/exercises.ts`
- Modify: `src/pages/ExerciseDetail.tsx`
- Modify: `src/features/workout-log/CurrentExerciseCard.tsx`
- Modify: `src/features/workout-log/CompletedExercisesList.tsx`

1. 为体态标准动作增加只读详情映射，不加入普通动作目录。
2. 在详情页显示标准内容和方案上下文。
3. 根据 `from` 查询参数处理动作库、训练中和方案详情返回路径。

### Task 4：实现同抽屉体态浏览流程

**Files:**
- Modify: `src/components/workout/ExercisePickerSheet.tsx`
- Create: `src/components/workout/PostureProtocolBrowser.tsx`
- Test: `src/tests/posture-workout-flow.spec.ts`

1. 先编写入口并列、问题/详情、动作详情返回、吸底按钮和移动端溢出测试。
2. 运行测试，确认入口不存在导致失败。
3. 实现四级抽屉视图、动态内容和滚动恢复。
4. 运行目标测试至通过。

### Task 5：实现训练分组和历史展示

**Files:**
- Modify: `src/features/workout-log/ActiveWorkoutView.tsx`
- Create: `src/features/workout-log/PostureProtocolGroupCard.tsx`
- Modify: `src/pages/WorkoutLogDetail.tsx`
- Test: `src/tests/posture-workout-flow.spec.ts`

1. 先覆盖加入、滚动、刷新、修改标记、内外排序、删除整组和历史快照。
2. 实现分组卡片和动作实例复用。
3. 归档详情展示方案名称和体态标签。
4. 运行目标测试至通过。

### Task 6：回归、构建和视觉 QA

**Files:**
- Modify only files required by defects found during verification.

1. 运行 `npx playwright test src/tests/posture-protocols.spec.ts src/tests/posture-workout-flow.spec.ts --project=chromium`。
2. 运行 `npm test`。
3. 运行 `npm run build`。
4. 在 320px、390px 和桌面宽度检查抽屉、详情、训练分组和历史，确认无横向溢出、吸底按钮不遮挡内容。
