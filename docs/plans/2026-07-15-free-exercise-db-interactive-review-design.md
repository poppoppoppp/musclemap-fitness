# Free Exercise DB 交互审核工具设计

## 目标

把现有自包含的只读 `review.html` 改造成离线可用的单记录审核工作台。审核决定保存在带项目和报告版本的 localStorage 中，可导入旧/新格式 overrides，并导出匹配脚本可直接读取的 `manual-overrides.json` 与 `review-summary.json`。

## 方案选择

采用“生成器输出单文件审核工具”方案：数据、样式和交互逻辑仍嵌入 `review.html`，不增加正式 App 路由、构建入口或后端。相比拆分静态资源，这保留了双击打开能力；相比创建 React 审核应用，它改动范围更小，也不会把内部工具耦合到 App。

## 状态模型

`ManualOverrides` 升级为 version 1，增加 `updatedAt`、`reuse` 和 `notes`，同时兼容仅含 `accepted/rejected/forced` 的旧格式。服务端解析模块负责默认值、互斥、引用校验与警告；优先级为 forced、accepted、reuse。无效引用会被忽略并打印警告，不中断报告。

页面运行状态在 overrides 之外增加 `skipped`，因为“稍后处理”只属于当前浏览器审核进度，不应污染匹配脚本输入。每次操作即时持久化。accepted、forced、reuse 互斥；rejected 是候选级历史，可与最终决定共存。

## 匹配报告数据流

报告命令先读取并标准化 overrides，再基于当前 App exerciseId 和 Free DB sourceId 校验。matcher 将 rejected 从自动最佳候选排序中排除，但把已拒绝候选保留在记录的 `rejectedCandidates` 中；accepted/forced/reuse 产生明确的人工状态、备注和风险信息。forced 不会伪装成 exact。

## 审核页结构

页面使用桌面优先的任务工作台布局：顶部进度和摘要、紧凑筛选区、单动作信息区、三个可选候选列、固定操作区和导航区。默认筛选 exact + high-confidence，并按 tier、confidence 排序后定位第一条未审核记录。颜色仅表达选择和人工状态：绿色接受、橙色强制、蓝色共图、红色冲突/拒绝。

## 导入导出

导出 overrides 时只包含 version、updatedAt、accepted、rejected、forced、reuse、notes；文件名固定。审核摘要单独导出统计与最终决定。导入先校验，再通过原生 dialog 选择合并、覆盖或取消。清空 localStorage 使用二次确认。

## 验证

自动测试覆盖旧格式升级、互斥、多个 rejected、forced/reuse、无效引用警告、页面功能标记及当前 47 条自动候选。浏览器验证覆盖默认筛选、接受与刷新持久化、拒绝自动切换、快捷键、导出、导入等价和清理测试状态。最后运行报告命令和正式 App 构建，并确认媒体目录未变化。
