# V0.18 上身真实模型资源调研

调研日期：2026-05-28

## 目标

为后续正面上半身真实模型接入做资源预研，不替换正式 `front-upper`，不把真实模型提交到 Git，不引入 GPL viewer 代码。当前结论只支持本地实验，不足以进入正式产品。

目标肌群：

- `pectoralis-major`
- `anterior-deltoid`
- `lateral-deltoid`
- `biceps-brachii`
- `triceps-brachii`
- `rectus-abdominis`
- `obliques`

## 候选资源

| 候选 | 许可证判断 | 技术格式 | GLB | Blender/OBJ 转换 | mesh 可拆潜力 | muscleId 映射潜力 | 正式产品风险 | 本地实验价值 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BodyParts3D | 官方 README 当前写明 CC BY 4.0，要求署名。README 许可证更新时间为 2025-02-27。 | 官方提供部件清单、包含关系、ELEMENT 级 OBJ zip。 | 未见官方直接 GLB。 | 需要本地筛选 OBJ，并用 Blender 或转换工具整理为 GLB。 | 高，官方按 ELEMENT/部件提供数据；但需要确认胸、肩、上臂、腹部各 mesh 的实际覆盖和命名。 | 中到高，部件清单有英文名和 representation id；导出 GLB 后 mesh.name 是否保留需本地验证。 | 体积、材质、OBJ 转 GLB、mesh 筛选成本高；正式产品需做署名、压缩和命名规范化。 | 高，最适合作为第一批本地实验候选。 |
| Z-Anatomy | README 写明代码和内容采用 CC BY-SA 4.0；ShareAlike 对正式产品有传染/再分发合规风险。 | Blender template / zip，基于 BodyParts3D 并补充结构、材质和脚本。 | 未按本轮调研确认有可直接用于项目的独立 GLB。 | 需要 Blender 安装模板并导出。 | 高，作为 Blender atlas 理论上可拆结构；实际 object/mesh 命名需本地打开确认。 | 中到高，若 Blender 对象名清楚，可映射到目标 muscleId。 | CC BY-SA 4.0 是主要风险；不宜作为正式产品首选，除非法律和产品分发策略确认。 | 高，适合本地实验验证 mesh 覆盖和命名，不应直接进入正式产品。 |
| AnatomyTOOL / Open 3D Model | 模型页写明 Creative Commons Attribution ShareAlike；viewer 软件单独为 GPL3。模型许可和 viewer 许可必须分开处理。 | Source files 页提供 `.blend`、`.obj`、`.glb` zip；有 selection model / sub-model 概念。 | 有部分可下载 GLB zip；上肢相关模型多处说明 GLB 可由 Blender 文件导出。 | 可下载 GLB/OBJ/Blender，但局部上身和胸腹覆盖仍需人工确认。 | 中到高，选择模型支持隐藏/显示结构；但部分 GLB 可能只含右侧并依赖 viewer 镜像逻辑。 | 中，需要读取具体 GLB 的 mesh.name；不要假设 viewer 中的结构名等于 Three.js mesh.name。 | ShareAlike 风险；禁止引入 GPL3 viewer 代码；部分子模型偏教学而非健身产品，需要二次筛选。 | 中到高，适合本地实验，尤其验证上肢/肩带/臂部肌肉。 |
| Sketchfab / CGTrader / 随机素材站 / 商业模型 | 许可证差异大，常见限制包括非商业、禁止再分发、署名、不可改作或授权不清。 | 常见 FBX/OBJ/GLB/Blend。 | 可能有。 | 视模型而定。 | 不稳定，很多模型是合并网格或命名混乱。 | 低到中，需要逐个验 mesh.name 和拆分。 | 授权不清、不可商用、文件过大、mesh 不可拆、命名混乱。 | 低，只作为视觉参考或临时本机试验，不作为第一选择。 |

## 资料依据

- BodyParts3D README：官方列出 `isa_parts_list_e.txt` / `partof_parts_list_e.txt` 等部件清单，并说明 OBJ zip 由多个 ELEMENT 的 Wavefront OBJ 组成；许可证为 CC BY 4.0，要求显示 BodyParts3D credit。来源：https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README.html
- Z-Anatomy `Models-of-human-anatomy` README：说明项目是 Blender template，包含由 BodyParts3D 派生的模型，许可证为 CC BY-SA 4.0。来源：https://github.com/Z-Anatomy/Models-of-human-anatomy
- AnatomyTOOL Open 3D Model：项目说明模型采用 CC BY-SA；Create 页说明 viewer software 是 GPL3，模型分发遵循 Creative Commons，且 source files 包含 `.blend` / `.obj` / `.glb` zip。来源：https://anatomytool.org/open3dmodel 和 https://anatomytool.org/open3dmodel-create

## 目标肌群覆盖判断

| muscleId | BodyParts3D | Z-Anatomy | AnatomyTOOL / Open 3D Model |
| --- | --- | --- | --- |
| `pectoralis-major` | 需要下载部件清单和 OBJ 验证。 | 可能覆盖，需 Blender 验证。 | 上肢/肩带资料可能覆盖胸肩带相关结构，需下载验证。 |
| `anterior-deltoid` | 需要确认 deltoid 是否可分前束。 | 可能更完整，但需确认是否拆成前/中/后束。 | Scapulohumeral / arm muscles 可能有 deltoid，分束需验证。 |
| `lateral-deltoid` | 需要确认 deltoid 是否可分中束。 | 可能更完整，但需确认对象拆分。 | 同上。 |
| `biceps-brachii` | 需要确认上臂肌肉 mesh。 | 可能覆盖。 | Create 页明确有 arm muscles 相关资源，需下载验证 mesh.name。 |
| `triceps-brachii` | 需要确认上臂肌肉 mesh。 | 可能覆盖。 | Create 页明确有 arm muscles 相关资源，需下载验证 mesh.name。 |
| `rectus-abdominis` | 需要确认腹部肌肉 mesh。 | 可能覆盖。 | 本轮资料主要确认上肢/骨骼/骨盆进度，腹部覆盖不足以判断。 |
| `obliques` | 需要确认腹外斜肌/腹内斜肌 mesh。 | 可能覆盖。 | 本轮资料不足以判断。 |

## 推荐排序

1. BodyParts3D：许可证相对更适合正式产品候选，结构化清单和 OBJ ELEMENT 适合建立可控转换流程。下一步应本地下载清单，筛出目标肌群候选，再转换成小型 GLB 验证 mesh.name。
2. AnatomyTOOL / Open 3D Model：有现成 GLB 和上肢相关模型，本地实验价值高；正式产品必须避开 GPL viewer，并评估 CC BY-SA 风险。
3. Z-Anatomy：肌肉系统可能更完整，适合 Blender 本地验证；CC BY-SA 4.0 使其不适合作为默认正式产品首选。
4. 其他素材站/商业模型：只作备选，需要逐项确认商业授权、再分发、mesh 拆分和命名。

## 下一步建议

1. 不把任何真实模型放入 Git；本机实验路径固定为 `public/models/private/upper-body-local.glb`。
2. 优先从 BodyParts3D 下载英文部件清单，筛选胸、三角肌、肱二头肌、肱三头肌、腹直肌、腹斜肌相关 representation id。
3. 用 Blender 或可审计的本地转换流程导出最小上身 GLB，放入 private 路径，打开 `/three-muscle-demo` 读取 mesh 数量和 mesh.name。
4. 只有在真实读取 mesh.name 后，才填写 `upperBodyLocalMeshMappings`；当前不要写任何假映射。
5. 若继续评估 AnatomyTOOL 或 Z-Anatomy，只下载模型资源，不引入 GPL viewer 代码，并在正式产品接入前完成 ShareAlike 风险审查。
