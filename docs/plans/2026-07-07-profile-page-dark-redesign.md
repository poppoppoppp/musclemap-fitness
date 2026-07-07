# “我的”页暗黑重构 Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 将“我的”页重构为与首页一致的黑绿运动科技界面，更新四项底部导航，并把身体快照纳入兼容旧备份的 v2 备份格式。

**Architecture:** 页面继续使用现有 `/data-management` 路由，在页面内部构建专属暗色容器和可折叠备份区。身体快照由小型 localStorage 工具负责读取与校验；备份层升级为 v2，同时把 v1 输入规范化为当前结构。

**Tech Stack:** React 19、React Router 7、TypeScript、Tailwind CSS、Playwright

---

### Task 1: 身体快照与备份 v2

**Files:**
- Create: `src/types/body.ts`
- Create: `src/utils/bodySnapshots.ts`
- Modify: `src/types/backup.ts`
- Modify: `src/utils/backup.ts`
- Test: `src/tests/user-flow.spec.ts`

1. 增加失败测试：最新快照选择、v2 导出包含身体数据、v1 导入兼容、损坏身体快照被拒绝。
2. 运行 `npm run test:e2e -- --grep "body snapshot|backup v2"`，确认因缺少实现而失败。
3. 实现最小类型、读取、排序、校验、导出与覆盖恢复逻辑。
4. 重跑相同测试并确认通过。

### Task 2: 四项暗色悬浮导航

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`
- Test: `src/tests/user-flow.spec.ts`

1. 增加失败测试，断言四个标签、目标路径、“我的”激活状态及旧入口不存在。
2. 运行目标测试确认失败。
3. 最小修改导航配置和暗色激活/非激活样式。
4. 重跑目标测试确认通过。

### Task 3: “我的”页结构与交互

**Files:**
- Modify: `src/pages/DataManagement.tsx`
- Test: `src/tests/user-flow.spec.ts`

1. 增加失败测试，覆盖标题、三个且仅三个指标、入口列表、路由、占位状态和备份折叠。
2. 增加 390×844 布局测试，断言无横向滚动且最后内容不被导航遮挡。
3. 运行目标测试确认失败。
4. 使用首页相同黑绿语言实现页面，复用原备份处理函数，不新增复杂状态管理。
5. 重跑目标测试确认通过。

### Task 4: 回归和视觉验证

**Files:**
- Modify when required: `src/tests/user-flow.spec.ts`

1. 运行 `npm run build`，修复范围内的类型或构建问题。
2. 运行 `npm run test:e2e`，确认现有首页、记录、动作库、训练历史流程未回归。
3. 在浏览器以 390×844 检查 `/data-management` 的视觉、滚动、展开备份和导航激活状态。
4. 检查 `git diff`，确保每项变更都可追溯到本需求。
