---
target: training templates module
total_score: 12
p0_count: 1
p1_count: 4
timestamp: 2026-07-16T13-55-32Z
slug: src-pages-newtrainingtemplate-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | 保存成功和占位提示可见，但存储失败没有可恢复反馈 |
| 2 | Match System / Real World | 2/4 | 文案易懂，但“空模板”被当作完成资产，与训练模板的实际含义不符 |
| 3 | User Control and Freedom | 1/4 | 离开新建页会丢草稿，且没有编辑、删除、撤销或取消机制 |
| 4 | Consistency and Standards | 1/4 | `mode=template` 在下游页面被忽略，模板页也偏离现有设计系统 |
| 5 | Error Prevention | 1/4 | 只校验名称，允许保存零动作模板；无重复、数据结构或存储容量防护 |
| 6 | Recognition Rather Than Recall | 2/4 | 入口可见，但三个添加入口中两个不进入模板选择态，一个只是占位提示 |
| 7 | Flexibility and Efficiency | 0/4 | 无复制、排序、快速编辑、最近使用或直接开始训练 |
| 8 | Aesthetic and Minimalist Design | 2/4 | 视觉统一但嵌套卡片、侧边亮条、描边密度和大面积空区降低效率 |
| 9 | Error Recovery | 1/4 | 名称错误可恢复，存储损坏和写入异常只能静默回退或抛错 |
| 10 | Help and Documentation | 0/4 | 没有说明动作处方、组次、休息或模板与训练记录之间的关系 |
| **Total** | | **12/40** | **Poor，核心体验需要重做** |

## Anti-Patterns Verdict

**LLM assessment**：页面有明显的“AI 风格产品页”痕迹。深色加荧光绿、每节标题左侧亮条、连续圆角描边卡片、空状态中再嵌套卡片，形式强于任务。更严重的是，大量控件看起来可操作，实际只是“开发中”或跳到不识别模板模式的页面。

**Deterministic scan**：`NewTrainingTemplate.tsx` 报告 1 个 `gray-on-color`。这是条件 class 的静态误报，`text-zinc-200` 与选中态 `bg-lime-300` 不会同时生效。`PlanBuilder.tsx` 未发现规则命中。自动检测没有发现真正的流程缺口，流程缺口由浏览器和源码审查确认。

**Visual overlays**：浏览器控制面只提供只读脚本求值，无法可靠注入检测脚本，因此没有用户可见覆盖层。替代证据为 390×844 的真实页面截图、DOM 快照和返回路径状态核对。

## Overall Impression

这不是“完成度不够”的训练模板，而是被规格主动限制成了一个无法使用的资产壳：能创建名字和标签，不能加入动作、不能调整处方、不能再次打开、不能开始训练、不能备份。最大机会不是润色页面，而是先重建从“创建模板”到“用模板开始训练”的完整闭环。

## What's Working

- 数据类型已经预留了 `sets`、`repRange`、`restSeconds`、`note` 和顺序字段，后续不需要重做基本模型。
- 移动端触控尺寸、可见焦点和 `aria-pressed` 基础较好，现有 390×844 无横向溢出测试也通过。
- 模板列表不伪造示例数据，空状态是诚实的；保存后状态反馈清楚。

## Priority Issues

### [P0] 核心任务被阻断：模板不能包含动作，也不能启动训练

- **Why it matters**：用户无法完成“创建可复用训练安排”这一核心目标。两个带 `mode=template` 的入口都由普通页面接收，参数没有被读取；搜索入口和“添加动作”只是状态消息。
- **Fix**：建立模板编辑会话，动作库和肌群选择器在模板模式下提供多选、已选清单与“加入模板”；保存后列表卡片提供“开始训练”，将模板项映射到 `ActiveWorkout`。
- **Suggested command**：`$impeccable shape`

### [P1] 模板没有生命周期

- **Why it matters**：列表卡片是静态 `article`，没有详情、编辑、复制、删除、排序或最后使用时间。创建后的资产变成死数据。
- **Fix**：新增 `/templates/:id` 编辑页，提供开始、编辑、复制、删除；列表显示动作数、预计组数、上次使用并允许按最近使用排序。
- **Suggested command**：`$impeccable shape`

### [P1] 跨页面选择会丢失草稿

- **Why it matters**：输入名称并选择重点后进入动作库，再返回时名称为空、标签取消。移动端用户在多页面选择动作时会反复丢工作。
- **Fix**：用 URL 中的 `draftId` 或持久化 draft store 管理编辑会话；所有选择页带回同一草稿；离开未保存内容时提供恢复或放弃选项。
- **Suggested command**：`$impeccable harden`

### [P1] 本地数据不可信

- **Why it matters**：模板不在备份模型中；读取只判断顶层是数组，损坏项会直接进入渲染；写入异常未捕获。用户可能在没有提示的情况下丢模板。
- **Fix**：备份版本升级并纳入模板，增加运行时 normalize/migrate；写入返回结果并在 UI 显示可恢复错误；覆盖导入前明确模板数量。
- **Suggested command**：`$impeccable harden`

### [P1] 当前测试把错误需求固定成了“成功”

- **Why it matters**：E2E 明确断言可以保存零动作模板，也只验证两个入口的 `href`，没有验证动作确实回到模板。测试全绿掩盖了核心流程不存在。
- **Fix**：把验收标准改为端到端任务：命名、选动作、编辑组次、保存、重新打开、开始训练、归档历史、备份恢复；为存储 normalize 和迁移增加单元测试。
- **Suggested command**：`$impeccable harden`

### [P2] 视觉语言压过任务效率

- **Why it matters**：荧光绿在标题条、边框、图标、按钮、焦点和装饰上重复出现；大卡片套小卡片，首屏显示信息少；与项目文档中的 Action Blue 产品系统不一致。
- **Fix**：回到产品级 restrained 色彩，把绿色只留给主操作或训练状态；移除标题侧条和装饰圆环；编辑页改为紧凑的动作清单加底部固定主操作。
- **Suggested command**：`$impeccable distill`

## Persona Red Flags

- **Casey，单手训练用户**：必须在长页面底部保存；跨到动作库再回来草稿丢失；没有底部常驻“已选 N 个动作”与完成按钮。
- **Jordan，第一次做计划的用户**：看到三个添加方式却只有跳转和“开发中”，无法知道模板至少应包含哪些动作、组次和休息时间。
- **Alex，有经验的训练者**：不能复制上一模板、批量选择、拖拽排序或直接开始训练；模板卡片不可操作，无法形成高频工作流。
- **项目特定用户，健身房组间操作**：当前设计要求多次页面切换和长距离滚动，且中断后草稿不恢复，不符合 PRODUCT.md 中“手机、组间、单手快速操作”的使用场景。

## Minor Observations

- `lastUsedAt` 已存在于类型中，但没有任何写入或展示。
- `updatedAt` 创建后永远不会更新，因为没有 update API。
- 模板卡片截断长名称，却没有详情页让用户看到完整名称。
- `更多操作`、自定义重点和搜索动作暴露为可用控件，实际只是“开发中”，损害信任。
- 模板页面使用手写内联 SVG，与项目自己的图标组件体系不一致。

## Questions to Consider

- 模板的最小有效状态应是“至少一个动作”，还是允许草稿但不允许开始训练？
- “训练重点”是用户手工标签，还是应从动作肌群自动推导并允许覆盖？
- 启动模板时，遇到已有进行中训练，应让用户替换、合并，还是返回当前训练？
