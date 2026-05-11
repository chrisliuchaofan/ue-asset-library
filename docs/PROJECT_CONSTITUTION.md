# 爆款工坊项目宪法

最后更新: 2026-05-11

这份文档是多人协作和 AI agent 开发的最高优先级约束。任何新功能、分支、PR、AI 自动改代码，都必须先遵守这里的项目边界、数据归属和验收标准。

## 1. 项目身份

爆款工坊是一个游戏广告素材 AI 工作台，不是零散工具集合。

核心流水线:

```text
创意种子 -> AI 匹配爆款模版 -> 生成脚本/分镜 -> AI 视频生成 -> AI 审核 -> 可投放素材 -> 数据反标 -> 知识沉淀
```

任何新模块都必须回答三个问题:

1. 它服务流水线中的哪一环?
2. 它复用了哪个已有数据源或能力?
3. 它产生的数据最终沉淀到哪里?

如果回答不清楚，不允许直接开新表、新接口或新页面。

## 2. 线上仓库与分支

GitHub 仓库:

```text
git@github.com:chrisliuchaofan/ue-asset-library.git
```

本地目录名 `资产库web` 只是本机工作目录，不代表线上仓库名。

默认分支:

```text
main
```

功能分支命名:

```text
feat/<feature-name>
fix/<bug-name>
chore/<maintenance-name>
```

多人协作时，功能分支可以并行，但合并前必须收敛到同一套项目架构和数据模型。

## 3. 技术栈基线

所有开发默认使用现有技术栈，不主动引入替代方案。

| 领域 | 标准 |
| --- | --- |
| Web 框架 | Next.js 16 App Router |
| UI | React 19 + TypeScript + Tailwind CSS + shadcn/ui |
| 图标 | lucide-react |
| 数据库 | Supabase PostgreSQL + pgvector + RLS |
| 后端 DB 访问 | `supabaseAdmin` |
| 认证 | NextAuth，不使用 Supabase Auth 作为主认证 |
| 文件存储 | Aliyun OSS |
| 客户端上传 | `/api/oss/direct-upload` + `lib/client/direct-upload.ts` |
| AI 文本 | DeepSeek / Tuyoo Gateway / Qwen 等现有 provider |
| 向量 | 智谱 embedding-3，1024 维 |
| 支付 | Stripe |
| 分析 | PostHog |
| 测试 | TypeScript typecheck + Vitest + Playwright |

禁止事项:

- 不另起 React/Vite 子项目。
- 不引入第二套数据库客户端。
- 不绕过现有 auth/team/permission 体系。
- 不把 `.env`、密钥、token、OSS key 提交到 GitHub。
- 不为单个功能复制一套已有基础设施。

## 4. 唯一事实源

新增功能必须优先复用现有领域模型。

| 领域 | 主数据源 | 说明 |
| --- | --- | --- |
| 素材文件与素材元数据 | `materials` | 图片、视频、投放素材、AI 生成素材都应能进入素材库 |
| 知识沉淀 | `knowledge_entries` | 审核规则、案例、指南、prompt 知识、访谈沉淀 |
| 爆款模版 | `templates` | 可复用创作结构与素材规律 |
| 创作脚本 | `scripts` | Studio 生成和编辑的脚本/分镜 |
| 周报/投放数据 | `weekly_reports` | 消耗、转化、分级、反标 |
| 团队与权限 | `teams`, `team_members`, project permissions | 所有业务读写都应带团队上下文 |
| 文件二进制 | Aliyun OSS | 数据库存 URL/key，不存文件本体 |

新功能默认不创建新主表。只有在以下条件同时满足时，才允许新增表:

1. 现有主数据源无法表达该实体。
2. 该实体有独立生命周期。
3. 它不是某个现有实体的扩展字段或关联表。
4. 已写清楚迁移、RLS、索引、回滚和后台管理策略。
5. PR 描述中说明为什么不能复用现有表。

## 5. 数据归属规则

### 5.1 素材类数据

凡是图片、视频、可预览媒体、投放素材、AI 生成素材，都必须遵守:

1. 文件上传到 OSS。
2. OSS URL/key 写入 `materials`。
3. 页面展示从 `materials` 或关联实体读取。
4. 不把文件放进 repo。
5. 不把长期媒体只存在临时 URL。

标准上传路径:

```text
客户端选择文件
-> uploadFileDirect(file)
-> /api/oss/direct-upload
-> Aliyun OSS assets/...
-> /api/materials 创建素材记录
```

### 5.2 知识类数据

凡是规则、经验、案例、prompt、审核标准、访谈提炼、操作指南，都应进入 `knowledge_entries`。

推荐映射:

| 内容 | `knowledge_entries` 字段 |
| --- | --- |
| prompt 案例标题 | `title` |
| prompt、负面 prompt、适用场景、工具、分类 | `content` 或扩展结构字段 |
| 类型 | `category='example'` 或 `category='guideline'` |
| 标签 | `tags`，例如 `prompt-library`, `AI视频`, `案例` |
| 来源素材 | `source_material_id` |
| 状态 | `draft`, `approved`, `archived` |
| 团队 | `team_id` |

提示词库、案例库、文档库这类页面，本质上是知识库的视图，不应绕开知识库另建平行主数据。

### 5.3 关联数据

当一个功能同时涉及素材和知识，推荐结构是:

```text
OSS: 存文件
materials: 存素材元数据和可预览地址
knowledge_entries: 存经验、prompt、案例解释
source_material_id: 把知识条目关联回素材
```

## 6. 架构复用顺序

AI agent 或工程师做功能前，必须按顺序检查:

1. 是否已有页面模块可扩展: `app/(dashboard)/...`
2. 是否已有 API 可复用: `app/api/...`
3. 是否已有领域服务: `lib/materials-*`, `lib/knowledge`, `lib/templates`, `lib/studio`
4. 是否已有 schema: `data/*.schema.ts`
5. 是否已有上传、权限、团队、AI provider、向量搜索能力
6. 是否已有组件: `components/...`

只有确认不存在合适扩展点，才允许新增模块。

## 7. API 与服务层规则

Route handler 负责:

- 鉴权和权限检查。
- 解析请求参数。
- 调用领域服务。
- 返回稳定 JSON。

领域逻辑放在 `lib/<domain>/`，不要塞进页面组件或 route handler。

客户端组件负责:

- 展示状态。
- 调用 API。
- 管理交互。

禁止:

- 客户端直接写 Supabase。
- 页面组件里写复杂 DB 逻辑。
- 每个功能复制一份上传、鉴权、分页、toast、错误处理。

## 8. 权限与团队上下文

所有业务 API 默认需要团队上下文。

优先使用:

```ts
requireTeamAccess(...)
```

或现有 session/project permission helper。

约束:

- `user_id` 是 `TEXT`，当前体系用 NextAuth 身份，不要假设它是 Supabase UUID。
- 后端 DB 操作使用 `supabaseAdmin`。
- 需要团队隔离的数据必须写 `team_id`。
- 读取团队数据时必须包含团队过滤，必要时允许全局 `team_id IS NULL` 数据。

## 9. 数据库迁移规则

所有数据库结构变化必须放在:

```text
supabase/migrations/
```

迁移必须包含:

- `CREATE TABLE IF NOT EXISTS` 或安全 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- 必要索引
- RLS 策略
- `updated_at` 触发器，如实体需要更新时间
- 与现有类型文件 `lib/supabase/types.ts` 的手动同步说明

禁止:

- 只在本地数据库手改结构。
- migration 没有 RLS。
- 新表不解释数据生命周期。
- 为了赶进度建临时正式表。

## 10. 环境变量与密钥

`.env.local` 可用于本地开发，但永远不提交。

多人协作规则:

- 新增环境变量必须同步更新 `ENV_VARIABLES.md`。
- 线上部署环境变量必须在 Vercel 或对应平台配置。
- 不能在代码中硬编码 Supabase URL、service role、OSS key、AI key。
- 本地给同事 `.env` 只代表同事能连接同一套服务，不代表可以绕过项目数据模型。

## 11. UI 与产品一致性

后台工作台默认是高密度、可扫描、工作型界面。

原则:

- 优先复用 shadcn/ui 和已有组件。
- 操作按钮用清晰图标和短标签。
- 表格、列表、筛选、弹窗、上传流程要遵循现有模块习惯。
- 不做营销页式大 hero 来承载工作台功能。
- 不让新模块变成视觉孤岛。

新增页面必须检查:

- 导航是否接入 dashboard 布局。
- 空状态、加载态、错误态是否完整。
- 移动端是否不溢出。
- 深色/浅色主题是否可接受。

## 12. AI Agent 开工协议

每个 AI agent 开始写代码前，必须先输出或自查:

```text
1. 需求属于哪个业务域?
2. 需要复用哪些现有表/API/lib/components?
3. 会不会新增表? 如果会，为什么现有表不能承载?
4. 文件上传是否走 OSS?
5. 是否需要 team_id / permission?
6. 是否需要 migration / types 更新?
7. 验收路径是什么?
```

AI agent 不允许直接说“我会新增一套 xxx 表/服务/上传接口”然后开干。必须先证明复用路径不可行。

## 13. 分支开发流程

推荐流程:

```text
git fetch --all --prune
git checkout main
git pull
git checkout -b feat/<feature-name>
```

如果本地有未提交改动，需要使用 worktree 或 stash，不能强切分支覆盖现场。

推荐安全预览:

```text
git worktree add ../资产库web-<feature> origin/<branch>
```

PR 合并前必须说明:

- 改了哪些业务域。
- 复用了哪些既有模块。
- 新增了哪些数据结构。
- 是否有 migration。
- 如何本地验证。
- 是否影响线上环境变量。

## 14. 验收门禁

最小门禁:

```text
npm run typecheck
```

涉及业务逻辑:

```text
npm run test
```

涉及页面、上传、登录、关键流程:

```text
npm run build
npx playwright test
```

涉及数据库:

- migration 可重复执行。
- 本地或测试环境能查询/插入/更新。
- RLS/团队过滤行为明确。

涉及 OSS:

- 上传真实文件成功。
- 返回 URL 可预览。
- 大文件有进度、错误和超时处理。
- 数据库里存的是最终可用 URL/key。

## 15. Code Review 清单

Review 先看风险，不先看风格。

必须检查:

- 是否复用了正确主数据源。
- 是否引入平行数据模型。
- 是否绕开权限/团队。
- 是否硬编码环境变量或 URL。
- 是否把服务端逻辑放进客户端。
- 是否破坏现有页面或导航。
- 是否缺少 migration、schema、types 更新。
- 是否有必要的错误态、空态、加载态。
- 是否通过 typecheck/build。

## 16. Prompt Library 专项裁决

提示词库不是独立产品，也不是第二套知识系统。

正确架构:

```text
OSS: 图片/视频文件
materials: 媒体素材记录
knowledge_entries: prompt 案例、说明、标签、经验沉淀
/prompt-library: 知识库 + 素材库的展示视图
```

开发要求:

- 上传入口复用 `uploadFileDirect()` 和 `/api/oss/direct-upload`。
- 上传成功后创建 `materials` 记录。
- 创建或更新 `knowledge_entries` 记录，并用 `source_material_id` 关联素材。
- 列表和详情页从 `knowledge_entries` 读取案例，并关联素材媒体展示。
- `sample-data` 只能做空状态演示或开发 fallback。
- 不允许把 `prompt_cases` 作为长期主数据源，除非它被重新定义为清晰的辅助关联表，并通过 PR 说明必要性。

## 17. 决策记录

架构争议不要散落在聊天里。凡是影响数据模型、技术栈、权限、部署、成本的决策，必须沉淀到文档。

推荐位置:

```text
docs/PROJECT_CONSTITUTION.md
docs/DEV-PLAN.md
docs/ROADMAP.md
```

重大决策写明:

- 背景
- 选项
- 取舍
- 最终决定
- 后续迁移或回滚方案

## 18. 一句话原则

```text
先复用，再扩展；先归属，再开发；先验证，再合并。
```

