# 动作数据与入口结构调整实施计划

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 将动作数据扩充到 260 项，并将动作库从底部一级入口调整为“我的 → 动作管理”二级入口。

**Architecture:** 保留 `src/data/exercises.ts` 作为唯一公共出口，现有 48 项不搬迁，新增动作按部位拆分后聚合。复用现有动作库页面和筛选组件，保持动作详情、抽屉和训练流程的导入路径不变。

**Tech Stack:** React 19、TypeScript 5.9、React Router 7、Zustand、Playwright、Vite/PWA、Tailwind CSS。

---

### Task 1: 建立动作目录数据质量门槛

**Files:**
- Create: `src/tests/exercise-catalog.spec.ts`
- Read: `src/data/exercises.ts`
- Read: `src/data/muscles.ts`
- Read: `src/data/equipment.ts`
- Read: `src/types/common.ts`

1. 写入测试，断言最终总数为 260、现有 48 个 ID 全部保留、ID/中文名唯一且非空。
2. 增加主肌群非空、所有主次肌群 ID 已注册、所有器械来自 `equipmentOptions` 的断言。
3. 增加 `difficulty`、`force`、`mechanic`、`category` 合法值断言。
4. 增加目标部位覆盖断言，明确前臂、内收肌、外展肌和全身复合动作必须存在。
5. 运行 `npx playwright test src/tests/exercise-catalog.spec.ts`，确认因总数仅 48 和缺失肌群而失败。

### Task 2: 扩充肌群与器械注册表

**Files:**
- Modify: `src/data/muscles.ts`
- Modify: `src/data/equipment.ts`
- Test: `src/tests/exercise-catalog.spec.ts`

1. 在肌群注册表新增 `forearm-flexors`、`forearm-extensors`、`hip-adductors`、`hip-abductors`，沿用完整 `Muscle` 结构，`mapRegionIds` 为空。
2. 在器械选项新增史密斯机、壶铃、双杠、地雷架、健身球、哈克深蹲机、牧师凳、蝴蝶机、辅助引体机等实际使用值。
3. 运行数据测试，确认注册表相关断言通过而总数断言仍失败。

### Task 3: 按部位新增 212 个动作

**Files:**
- Create: `src/data/exerciseCatalog/createCatalogExercise.ts`
- Create: `src/data/exerciseCatalog/chest.ts`
- Create: `src/data/exerciseCatalog/back.ts`
- Create: `src/data/exerciseCatalog/shoulders.ts`
- Create: `src/data/exerciseCatalog/arms.ts`
- Create: `src/data/exerciseCatalog/core.ts`
- Create: `src/data/exerciseCatalog/lowerBody.ts`
- Create: `src/data/exerciseCatalog/fullBody.ts`
- Create: `src/data/exerciseCatalog/index.ts`
- Modify: `src/data/exercises.ts`
- Test: `src/tests/exercise-catalog.spec.ts`

1. 创建 `createCatalogExercise`，要求核心字段显式提供，仅为 `secondaryMuscles`、`steps`、`cues`、`commonMistakes`、`alternatives` 提供空数组默认值。
2. 按统一中文命名规则录入 212 个非重复动作，合理区分器械、角度、握法、单侧和双侧变式。
3. 在目录 `index.ts` 合并各部位数组。
4. 将现有数组改名为内部 `existingExercises`，导出 `const exercises = [...existingExercises, ...catalogExercises]`；保留 `getExerciseById` API。
5. 运行数据测试，确认 260 项及全部数据质量断言通过。

### Task 4: 验证共享搜索和肌群映射

**Files:**
- Modify: `src/tests/exercise-catalog.spec.ts`
- Modify if required: `src/utils/exerciseFilters.ts`
- Modify if required: `src/utils/filters.ts`

1. 先新增失败测试，覆盖“卧推”“侧平举”“下拉”“绳索”“哑铃”“单臂”以及前臂/内收/外展筛选。
2. 运行测试并确认缺失行为的具体失败原因。
3. 只在现有搜索实现无法满足断言时补充匹配字段；别名继续使用 `tags`，不新增第二套索引。
4. 重跑数据测试与 `src/tests/exercise-picker.spec.ts`。

### Task 5: 将底部导航调整为三项

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/tests/user-flow.spec.ts`

1. 将现有四项导航测试改为失败测试：只允许首页、记录、我的三项，并断言动作库不存在。
2. 运行目标测试，确认因当前四项导航失败。
3. 删除动作库导航配置及无用图标 import，将网格改为三列。
4. 为 `/exercises` 精确路径加入“我的”高亮逻辑，保留其他已有父级高亮规则。
5. 重跑目标导航测试。

### Task 6: 复用原页面实现动作管理

**Files:**
- Modify: `src/pages/ExerciseLibrary.tsx`
- Modify: `src/pages/DataManagement.tsx`
- Modify: `src/tests/user-flow.spec.ts`

1. 新增失败测试：我的页面存在“动作管理”，链接到 `/exercises`；页面标题为“动作管理”，可返回、显示总数 260、搜索和筛选。
2. 新增 390px 视口测试，检查列表与底部导航没有横向溢出。
3. 运行目标测试并确认入口和标题缺失。
4. 在“训练管理”分组加入复用 `EntryRow` 的动作管理入口。
5. 将 `ExerciseLibrary` 标题改为“动作管理”，增加返回 `/data-management`、总数与筛选结果数，复用现有 `ExerciseFilter`、`ExerciseCard` 和空状态。
6. 重跑动作管理目标测试。

### Task 7: 验证抽屉读取完整数据和训练加入流程

**Files:**
- Modify: `src/tests/exercise-picker.spec.ts`
- Modify if required: `src/components/workout/ExercisePickerSheet.tsx`

1. 新增失败测试，从抽屉搜索新增动作和器械关键词，并验证正确肌群映射。
2. 新增测试，将一个新增动作加入当前训练并在刷新后保留。
3. 运行目标测试，确认新增数据接入前失败。
4. 若统一聚合已让测试直接通过，不改抽屉生产代码；否则仅修正共享筛选接入。
5. 运行完整 `src/tests/exercise-picker.spec.ts`。

### Task 8: 完整验证与交付统计

**Files:**
- Modify: `docs/plans/task.md`

1. 运行 `npx playwright test src/tests/exercise-catalog.spec.ts src/tests/exercise-picker.spec.ts`。
2. 运行 `npm test`，记录通过/失败数量和任何既有失败。
3. 运行 `npm run build`，确认 TypeScript 与 Vite 构建通过。
4. 运行只读统计脚本，输出新增数、最终总数和部位分布。
5. 检查 `git diff --check`、`git status --short`、`git diff --stat`，确认没有修改用户的既有未跟踪文件。
6. 更新任务追踪表并给出完整交付说明。

本计划按用户要求省略所有 commit、push 和 PR 步骤。
