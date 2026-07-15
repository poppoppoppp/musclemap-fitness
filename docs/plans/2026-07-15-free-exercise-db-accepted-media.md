# Free Exercise DB Accepted Media Download Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 安全、幂等地下载并接入 47 个已人工接受动作的 start/peak 图片，并生成可审计来源与执行报告。

**Architecture:** 新建可测试的 accepted-media 模块负责预检、缓存、图片验证、原子转换和报告；薄 CLI 绑定项目真实路径并执行。现有动作详情页路径约定保持不变。

**Tech Stack:** TypeScript/tsx、Node.js fs/fetch/crypto、sharp、node:test、现有 Playwright 详情页测试。

---

### Task 1: 预检与固定来源模型

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/acceptedMedia.ts`
- Create: `scripts/exercise-media/free-exercise-db/downloadAcceptedMedia.test.mts`

**Steps:**
1. 先写失败测试，覆盖 accepted 必须为 47、只读取 accepted、exercise/source/images/matches/commit URL 校验。
2. 运行 `npx tsx --test scripts/exercise-media/free-exercise-db/downloadAcceptedMedia.test.mts`，确认因 API 缺失而失败。
3. 实现最小预检模型，禁止名称重匹配。
4. 重跑测试并进行规格、质量自查。

### Task 2: 哈希缓存、图片验证与原子发布

**Files:**
- Modify: `scripts/exercise-media/free-exercise-db/acceptedMedia.ts`
- Modify: `scripts/exercise-media/free-exercise-db/downloadAcceptedMedia.test.mts`

**Steps:**
1. 先写失败测试，覆盖缓存复用、临时下载、有限重试、HTML/空文件/损坏/同图拒绝。
2. 实现基于 SHA-256 元数据的缓存下载。
3. 先写失败测试，覆盖 640×800 WebP、EXIF 旋转、contain、双图原子目录发布和冲突跳过。
4. 实现最小转换与清理逻辑，重跑测试并完成两阶段自查。

### Task 3: Manifest、报告与 CLI

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/downloadAcceptedMedia.mts`
- Modify: `scripts/exercise-media/free-exercise-db/acceptedMedia.ts`
- Modify: `scripts/exercise-media/free-exercise-db/downloadAcceptedMedia.test.mts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `public/exercise-media/source-manifest.json`
- Create: `reports/exercise-media/free-exercise-db/download-summary.json`
- Create: `reports/exercise-media/free-exercise-db/download-summary.md`

**Steps:**
1. 先写失败测试，覆盖 manifest sourceId/URL/hash、执行统计和重复运行幂等性。
2. 实现 JSON/Markdown 输出与薄 CLI，添加 `media:free-db:download-accepted` 命令。
3. 重跑专项测试并完成规格、质量自查。

### Task 4: 实际接入与完整验证

**Files:**
- Create: `reports/exercise-media/free-exercise-db/accepted-media-contact-sheet.webp`
- Modify: `docs/plans/task.md`

**Steps:**
1. 在任何下载前再次确认 accepted=47、现有媒体=6、commit 固定且目标无覆盖。
2. 运行 `npm run media:free-db:download-accepted`。
3. 用 sharp 批量验证所有成功输出、manifest 哈希和 start/peak 成对存在。
4. 再次运行下载命令，验证零重复下载、零重复转换。
5. 生成至少 10 动作联系表，覆盖指定动作类别。
6. 运行 `npm run test:media:free-db`、下载专项测试、动作详情测试和 `npm run build`。
7. 在本地详情页和 390px 视口抽样验证；清点 Git 状态，确认无提交、推送或部署。

> 用户明确禁止提交，因此计划中的所有提交步骤均省略；保留当前共享工作区中的既有改动。
