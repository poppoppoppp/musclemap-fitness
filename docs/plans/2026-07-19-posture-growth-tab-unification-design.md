# 体态成长 Tab 统一架构设计

日期：2026-07-19

## 目标

将“体态改善”收回成长页内部，统一展示新版证据筛查、旧版体态计划、训练完成记录、反馈和可比较复测，同时保持所有已有本地记录、训练执行链和备份边界不变。

本轮只实现第一阶段。MediaPipe、RTMPose、RTMW、模型下载、推理服务和自动训练推荐均不在本轮实现。

## 路由与页面层级

- `/growth` 默认展示训练成长 Tab。
- `/growth/posture` 继续作为兼容地址，但渲染成长页框架并选中体态改善 Tab。
- `/growth/posture/screening` 保留为全屏筛查子流程。
- `/growth/posture/results/:sessionId` 保留为完整报告子流程。
- `/growth/posture/history` 保留为历史与复测子流程。
- `/growth/posture/plan/new?sessionId=...` 新增为手动方案选择和计划确认子流程。
- 所有子流程完成、取消或返回后统一回到 `/growth/posture`。

浏览器历史中的 `/growth/posture` 自身必须稳定恢复体态 Tab，不能依赖组件内一次性的点击状态。

## 统一纯派生展示模型

`PostureGrowthViewState` 是纯派生展示模型。Selector 只接收仓储读取结果、训练记录和当前时间，不写入、不迁移、不修复任何数据，也不访问 `localStorage` 或 IndexedDB。

状态优先级固定为：

1. `active-plan`
2. `paused-plan`
3. 计划完成时间之后存在更新且可创建计划的筛查：`assessed`
4. 最近完成计划：`completed-plan`
5. 只有不可创建计划的筛查：受限 `assessed`
6. 完全无记录：`empty`

“计划完成后的新筛查”以 `session.completedAt > plan.completedAt` 比较。不得使用数组顺序、对象创建顺序或 localStorage 顺序推断。

## 可创建计划的筛查不变量

只有同时满足以下条件的筛查才允许进入计划创建流程：

- Session 存在并具有完整持久化结构。
- 状态为 `completed` 或 `functional-only`。
- 至少有一个 `confidence === 'supported'` 的 finding。
- 结果不要求专业评估。
- 不是安全分流、测量无效、混合证据、未完成或证据不足结果。

不可创建计划的记录仍正常展示摘要、时间和状态，并提供结果报告、复测或专业评估入口。

同一纯函数负责页面状态和计划创建路由的资格判断，避免 URL 校验与页面展示产生分叉。

## 旧计划与新版筛查来源

旧计划继续使用 `assessmentId`。新版手动创建计划使用 `screeningSessionId`，不得创建伪造的旧 `PostureAssessment`。

计划来源不变量：

- 新版计划以 `screeningSessionId` 为来源。
- 旧版计划可继续只有 `assessmentId`。
- 两个字段不得同时参与推荐判断。
- 老数据中两个字段均为空时仍可读取、展示和执行。

新版计划额外保存最小来源快照：

- 筛查完成时间；
- 主要 finding 名称或结果摘要；
- 用户主动选择的 `protocolId`；
- 计划创建时间；
- `selectionMode: 'manual'`。

快照只用于历史追溯，不参与自动推荐或重新计算。

## 手动方案选择器

计划创建流程分为选择与确认两个步骤：

1. 校验 `sessionId` 和创建资格。
2. 展示筛查摘要和所有通过现有 `getPosturePlanEligibility` 技术准入规则的方案。
3. 不依据 finding 排序、默认选中或突出任何方案。
4. 用户明确选择方案、周期、每周频率和训练日。
5. 确认页再次展示选择内容。
6. 用户最终确认后调用现有计划仓储创建计划。

URL 被手动修改、Session 不存在或资格不满足时，不执行任何写入，返回 `/growth/posture` 并通过路由状态展示合理提示。

## 页面组件

- `PostureGrowthSection`：根据 View State 分派状态组件。
- `PostureEmptyState`：首次分析介绍、准备信息、可分析内容、方案分类和真实空记录。
- `PostureAnalysisSummary`：最近筛查、1–3 个 finding、简短证据与受限状态操作。
- `PostureActivePlanCard`：周期、当前周、真实完成次数、暂停/完成状态和计划操作。
- `PostureTodayWorkoutCard`：只在当天确有未完成任务时提供“继续今日训练”。
- `PostureFocusCards`：使用已存计划快照、方案数据或 finding，不生成新结论。
- `PostureTrendCard`：只显示 `comparePostureScreeningSessions` 判定为可比较的真实数据。
- `PostureRecentAssessmentCard`：最近筛查或复测摘要。
- `PostureRecordSummary`：筛查、计划和复测记录入口。
- `PosturePlanBuilderPage`：手动方案选择与确认。

时间范围选择器只属于训练成长和身体变化，不在体态 Tab 展示。

## 趋势边界

只有同时满足以下条件才展示趋势：

- 有明确 `baselineSessionId` 关系；
- 算法与筛查协议版本一致；
- 照片测量协议一致；
- 视角或侧别一致；
- 指标与单位一致；
- 两次数据质量有效。

没有可比较数据时展示文字空状态，不画图、不生成百分比，也不把数值差自动解释为改善或恶化。

## 今日训练与记录

继续复用现有链路：

`PosturePlan` → `getPostureTodayTask` → `startPosturePlanWorkout` / `addPosturePlanTaskToActiveWorkout` → 活动训练 → 归档训练日志 → `PostureSessionFeedback`。

非训练日、已完成、当天任务已完成或计划暂停时不生成任务。Selector 不改变排期和进度规则。

## 持久化与备份

保留现有存储键和 IndexedDB：

- `musclemap.postureScreeningSessions.v1`
- `musclemap.postureScreeningDraft.v1`
- `musclemap.posturePlans.v1`
- `musclemap.postureAssessments.v1`
- `musclemap.postureFeedback.v1`
- `musclemap.workoutLogs.v0.3`
- `musclemap-posture-screening-v1` IndexedDB

新增字段必须进入类型、反序列化、类型守卫、备份、恢复和旧数据兼容测试。原始照片继续不进入备份；结构化照片测量仍按现有规则去除本地 `photoAssetId` 后导出。

## 失败与降级

- 筛查存储损坏：显示读取异常，不伪装为空状态。
- 计划创建写入失败：停留在确认页并显示错误。
- 方案失去技术准入资格：阻止确认，不静默替换方案。
- Session 失效：不创建数据，返回体态 Tab。
- 当天没有真实任务：不提供假训练入口。
- 趋势不可比：只说明不可比原因。

## 未来模型接口边界

第一阶段只定义与具体平台无关的接口类型和技术文档，不创建假实现：

```ts
interface PostureAnalysisService {
  createSession(input: PostureCaptureInput): Promise<PostureAnalysisJob>;
  getJob(jobId: string): Promise<PostureAnalysisJob>;
  getResult(sessionId: string): Promise<PostureAnalysisResult>;
}
```

未来前端固定采用官方 MediaPipe Tasks Pose Landmarker for Web；后端基准优先采用官方 MMPose `rtmpose-m_8xb512-700e_body8-halpe26-256x192` 与 RTMDet-m。生产平台不得在第一阶段写死，MediaPipe 结果不得冒充后端正式分析。

完整模型来源、版本、许可证、基准、下载、哈希、部署与降级规范将在独立技术文档中保存。本轮不安装包、不下载权重、不创建推理服务。

## 测试与验收

- Selector 单元测试覆盖全部状态优先级和明确时间比较。
- 资格测试覆盖所有禁止创建计划的筛查分支。
- 计划类型、反序列化、备份恢复和旧数据兼容测试。
- 手动方案选择必须经过显式选择和确认。
- URL 绕过测试确认没有任何写入。
- 今日训练沿用现有规则的回归测试。
- 子流程返回体态 Tab 与浏览器返回测试。
- 390×844、393×852、430×932 移动端视觉检查和横向溢出检查。
- TypeScript、完整 Playwright 测试和生产构建通过。

