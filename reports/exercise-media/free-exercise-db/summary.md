# Free Exercise DB 动作图片覆盖率与匹配报告 V0.1

## 技术摘要

MuscleMap 当前实际可见动作共 **291** 个，其中 **53** 个已有完整本地 start/peak。对其余动作进行保守匹配后，得到 exact **0** 个、high-confidence **0** 个、manual-review **117** 个、unmatched **121** 个。

exact + high-confidence 共 **0** 个，占全部可见动作 **0.0%**，占未完整覆盖动作 **0.0%**。若后续复核并采用这些候选，含已有本地图的理论覆盖率为 **18.2%**。

## 覆盖与工作量

| 指标 | 数量/比例 |
| --- | ---: |
| 可见动作 | 291 |
| 本地 complete / partial / missing | 53 / 0 / 238 |
| already-covered / exact / high-confidence | 53 / 0 / 0 |
| manual-review / unmatched | 117 / 121 |
| 可直接覆盖比例（已有 + exact） | 18.2% |
| 人工确认比例 | 40.2% |
| 无候选比例 | 41.6% |
| 建议共图组 | 9 |
| 保守估计仍需独立图片集 | 214 |

## 匹配方法与阈值

名称、exerciseId、明确别名、器械、主次肌群、category、force、mechanic、姿态、关键变式和单/双侧共同参与评分。exact 阈值 0.95，high-confidence 阈值 0.85，manual-review 阈值 0.60；前两名差距小于 0.04 时不能自动通过。器械、单侧、姿态、角度、关键变式、主肌群、推拉方向、深蹲/髋铰链、体态场景和图片数量冲突会阻止自动通过。

## 最常见的自动匹配阻断原因

- 体态/康复动作不能自动映射为普通训练动作：31 条候选记录
- 身体姿态不一致：kneeling ≠ 未注明：5 条候选记录
- 侧别/交替方式不一致：unilateral ≠ 未注明：5 条候选记录
- 发力方向冲突：push ≠ pull：4 条候选记录
- 身体姿态不一致：未注明 ≠ standing：3 条候选记录

## 最缺图的动作类别

- strength：63 个 unmatched
- posture：30 个 unmatched
- bodyweight：24 个 unmatched
- activation：4 个 unmatched

## 是否值得使用 Free Exercise DB

当前自动匹配没有产生足够的可靠候选，不建议直接使用。

## 局限与风险

- Free Exercise DB 的 force、mechanic 和 equipment 存在空值，图片也可能存在重复或动作阶段含义差异。
- 自动评分不能判断图片中的握距、把手、身体角度和动作阶段是否完全符合 MuscleMap 文案。
- 共图分组只表示基础动作接近，不表示动作完全相同。
- 独立图片集数量是保守估计，会随 manual-review 的人工接受或拒绝而变化。

## 来源与复现

- 数据源：https://raw.githubusercontent.com/yuhonas/free-exercise-db/b0eed061e1c832b3ed815fbaa4b45b3cdc14df49/dist/exercises.json
- commit：b0eed061e1c832b3ed815fbaa4b45b3cdc14df49
- SHA-256：4ee91b55470542030bb65f036f64bc688d702f558c6d576c308b75ddbd0ac577
- 数据条数：873
- 许可证：Unlicense
- 下载时间：2026-07-15T02:39:06.945Z
- 运行命令：`npm run media:free-db:report`

## 下一步

先在 `review.html` 中审核 exact 和 high-confidence 的 start/peak 阶段是否适合，再处理 manual-review 的候选分歧；确认前不要把远程图片写入 App。
