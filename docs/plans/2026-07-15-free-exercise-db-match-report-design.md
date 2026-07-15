# Free Exercise DB 动作图片覆盖率与匹配报告 V0.1 设计

## 范围与数据边界

报告以 App 的运行时数据为准。普通动作直接读取 `src/data/exercises.ts` 最终导出的 `exercises`；体态动作读取 `getVisiblePostureProtocols()` 中可见方案的 exercise 步骤，按 exerciseId 去重后通过 `getExerciseById()` 解析。隐藏方案、观察项、内部材料和不可解析动作不进入分母。

Free Exercise DB 只读取官方仓库 `main` 分支的 `dist/exercises.json`，缓存到项目外的 `D:\AI\FreeExerciseDB-cache`。缓存元数据记录下载时间、URL、commit、SHA-256、条数和 Unlicense。网络失败时仅在已有缓存和元数据可读取时回退，否则明确失败。不下载图片库，报告只保留两张 raw URL。

## 匹配方法

名称标准化保留会改变含义的姿态、角度、握距和单侧词。别名表只包含明确同义词。每个候选保留名称、器械、主肌群、次肌群和动作属性五类分数，以及硬冲突与扣分。

候选分级遵循以下门槛：

- `already-covered`：本地 start 和 peak 同时存在，优先于外部匹配。
- `exact`：最终置信度至少 0.95、明确名称或别名命中、至少两图、无硬冲突，且领先第二候选至少 0.04。
- `high-confidence`：最终置信度至少 0.85、至少两图、无硬冲突，且领先第二候选至少 0.04。
- `manual-review`：最终置信度至少 0.60，或候选分差过小、存在变式差异但可作为共享基础图候选。
- `unmatched`：低于 0.60，或没有合理候选，或体态康复、呼吸与神经类动作只命中普通训练动作。

器械、单侧、姿态、角度、主肌群、推拉方向、深蹲/髋铰链和图片数量冲突会阻止候选进入自动通过等级。人工覆盖按 `forced`、`rejected`、`accepted` 的顺序应用；本次只创建空结构。

## 报告与审核页

生成 `summary.json`、`matches.json`、带 BOM 的 `matches.csv`、`summary.md`、`unmatched.md`、`reuse-groups.json` 和 `review.html`。审核页是独立静态文件，嵌入同批次 `matches.json` 快照以支持双击打开，提供 tier、主肌群、器械和 mediaStatus 筛选，显示前三候选、评分、冲突、建议与远程候选图片，不写 App 路由或人工决策。

共享基础图只在基础动作、器械、姿态和单/双侧兼容时建议。独立制作量采用保守定义：`unmatched` 加上未进入建议共图组的 `manual-review`；报告同时说明该值会随人工审核结果变化。

## 验证

测试覆盖运行时全集、ID 唯一性、媒体状态、候选存在性、两图要求、硬冲突阻断、等级汇总、覆盖动作排除、缓存回退和重复运行稳定性。最终还要检查报告 JSON/CSV/Markdown、在浏览器中打开审核页、运行现有媒体处理器测试和 `npm run build`。
