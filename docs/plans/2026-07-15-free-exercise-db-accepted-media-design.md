# Free Exercise DB 已审核图片下载与接入 V0.1 设计

## 目标与边界

只处理 `manual-overrides.json` 中 47 个 `accepted` 映射。固定使用报告记录的 Free Exercise DB commit `b0eed061e1c832b3ed815fbaa4b45b3cdc14df49`，下载每个来源的前两张图片并转换为 640×800、纯白背景、contain、居中、quality 88 的 WebP。不会重跑名称匹配，不处理 forced、reuse、manual-review、unmatched 或 rejected，不覆盖任何已有媒体。

## 方案比较

1. **单一 CLI 内完成全部工作**：文件少，但验证、下载、转换、报告难以隔离测试。
2. **可测试的 accepted-media 模块 + 薄 CLI（采用）**：模块负责预检、缓存、原子发布、manifest 和报告，CLI 只装配真实路径。既便于 TDD，也避免把网络和文件系统逻辑塞进报告匹配器。
3. **扩展动作总图裁切脚本**：能复用 sharp，但该脚本的核心抽象是网格裁切，与逐 URL 下载并不相符，会增加条件分支并削弱现有脚本边界。

## 架构与数据流

1. 读取人工 override、缓存数据、`matches.json` 和当前 App 可见动作集合。
2. 硬性检查 accepted 恰为 47；逐条验证 exerciseId、sourceId、两张源图、固定 commit URL 和 matches 对应关系。
3. 只为通过预检且目标目录无冲突的 accepted 动作下载 `images[0]` 与 `images[1]`。缓存路径固定为 `D:\AI\FreeExerciseDB-cache\images\{sourceId}\0.jpg|1.jpg`。
4. 缓存元数据记录 URL、SHA-256 和字节数。复用缓存前重新计算哈希；下载写入临时文件，验证解码后再原子重命名。
5. 每个动作在 `public/exercise-media` 下创建同级临时目录，完成两张转换和复读验证后，将整个目录原子重命名为 `{exerciseId}`，避免半成品动作目录。
6. 成功动作写入 `source-manifest.json`；执行统计写入 JSON 与 Markdown 报告。所有机器文件采用临时文件 + rename 更新。

## 失败与幂等策略

- accepted 数量不是 47：在任何下载前终止整个批次。
- 单动作引用无效、源图不足、下载失败、损坏或两图完全相同：记录失败并继续其他动作。
- 目标目录已存在 start/peak，或存在无法安全接管的目录：记录冲突并跳过，不删除、不覆盖。
- 完整输出且 manifest 匹配：记录“已存在跳过”。缓存哈希匹配则不下载；失败下载最多有限重试且清理临时文件。
- 转换阶段只在完整的 start/peak 均通过 sharp 元数据验证后发布。

## App 接入与视觉验证

现有详情页通过 `/exercise-media/{exerciseId}/start.webp` 和 `peak.webp` 自动解析，所以不修改 47 条动作数据。生成至少覆盖推、拉、腿、单侧、自重、器械类别的 10 动作联系表，并在真实详情页及 390px 视口抽样检查显示、contain 和阶段顺序；只做接入 QA，不重新判断动作匹配或姿势。

## 测试策略

- 单元/集成测试覆盖硬停止条件、仅 accepted、固定 commit URL、缓存哈希、有限重试、损坏/同图拒绝、目标冲突、双图原子发布、manifest 哈希和重复运行。
- 实际执行下载脚本后，批量用 sharp 校验全部新增 WebP 的格式和 640×800 尺寸。
- 运行专项测试、现有动作详情测试和生产构建。

> 附件规格已给出完整映射、路径、格式和停止条件，本设计将其视为用户批准的实现边界。按用户约束，不提交 Git。
