# Prompt Library 权限矩阵

最后更新：2026-05-13

本文档是 `prompt-library` 与 `knowledge` 的权限归属说明。它不新增任何独立角色、独立权限字段或独立权限判断；所有鉴权、团队上下文和权限判断必须继续复用主项目现有体系。

## 权限原则

- `/prompt-library` 是展示视图，可以公开读取 `approved` 的公开案例。
- 公开案例定义为 `knowledge_entries.status = 'approved'` 且 `knowledge_entries.team_id IS NULL`，并带有 `prompt-library` 标签。
- `/knowledge` 是内部知识库管理后台，必须登录并通过团队权限。
- `prompt-library` 的上传、创建、编辑、删除必须登录，并复用 `requireTeamAccess(...)`。
- 不允许新增 prompt-library 专属角色、专属权限字段、专属权限判断。
- 所有权限判断必须复用：
  - `proxy.ts`
  - `lib/team/require-team.ts`
  - `lib/team/types.ts`
  - `team_members`
- 前端遇到 `401` / `403` 必须显示权限错误，不能渲染成“暂无内容”。

## 模块权限矩阵

| 模块/路径 | 动作 | 是否公开 | 数据范围 | 权限来源 | 失败行为 |
| --- | --- | --- | --- | --- | --- |
| `/prompt-library` | 查看案例列表 | 是 | `approved` 且 `team_id IS NULL` 的公开 prompt 案例 | `proxy.ts` public route；数据层只读公开记录 | 展示真实空状态；如果 API 返回 `401/403`，显示权限错误 |
| `/prompt-library/[id]` | 查看案例详情 | 是 | 单条 `approved` 且 `team_id IS NULL` 的公开 prompt 案例 | `proxy.ts` public route；数据层只读公开记录 | `404` 显示未找到；`401/403` 显示权限错误 |
| `/prompt-library/docs` | 查看公开文档 | 是 | `approved` 且 `team_id IS NULL` 的公开 prompt 文档 | `proxy.ts` public route；数据层只读公开记录 | 展示真实空状态；如果 API 返回 `401/403`，显示权限错误 |
| `/api/prompt-library/cases` | `GET` 列表 | 是 | `approved` 且 `team_id IS NULL` | Route handler 不做团队鉴权；数据层限制公开记录 | 返回公开列表或空数组 |
| `/api/prompt-library/cases/[id]` | `GET` 详情 | 是 | `approved` 且 `team_id IS NULL` | Route handler 不做团队鉴权；数据层限制公开记录 | 未找到返回 `404` |
| `/api/prompt-library/docs` | `GET` 文档 | 是 | `approved` 且 `team_id IS NULL` | Route handler 不做团队鉴权；数据层限制公开记录 | 返回公开文档或空数组 |
| `/api/prompt-library/media/[id]` | `GET` 媒体预览 | 是 | 仅公开案例关联的公开素材 | 先读取公开案例，再按公开素材生成预览 | 非公开或不存在返回 `404` |
| `/prompt-library` 上传入口 | 选择文件并提交 | 否 | 当前登录用户的当前团队 | 后续 API 通过 `requireTeamAccess('content:create')` 校验 | `401/403` 显示权限错误 |
| `/api/oss/direct-upload` | 上传二进制到 OSS | 否 | 当前登录用户的当前团队能力 | 复用主项目现有上传 API 权限 | 按现有 API 返回 `401/403` |
| `/api/materials` | 创建素材记录 | 否 | 当前团队 `materials` | `requireTeamAccess('content:create')` + 主项目项目权限 | 前端显示权限错误 |
| `/api/prompt-library/cases` | `POST` 创建案例 | 否 | 当前团队 `knowledge_entries` | `requireTeamAccess('content:create')` | 返回 `401/403`，前端显示权限错误 |
| `/api/prompt-library/docs` | `POST` 创建文档 | 否 | 当前团队 `knowledge_entries` | `requireTeamAccess('content:create')` | 返回 `401/403`，前端显示权限错误 |
| `/api/prompt-library/cases/[id]` | 编辑/删除案例 | 否 | 当前团队 `knowledge_entries` | 如后续新增，必须使用 `requireTeamAccess('content:update'/'content:delete')` | 返回 `401/403`，前端显示权限错误 |
| `/knowledge` | 知识库后台管理 | 否 | 当前团队知识库数据 | `proxy.ts` protected route + `requireTeamAccess(...)` | 未登录跳登录；无权限返回错误 |
| `/studio?source=prompt-library` | 使用案例创作 | 否 | 主项目 Studio | `proxy.ts` 保护 `/studio`；Studio 复用现有权限 | 未登录跳登录；不跳外部 Matrix |

## 禁止事项

- 不在 `prompt-library` 模块里新增独立权限枚举、角色字段、ACL 表或自定义鉴权 helper。
- 不用 `teamId = undefined` 读取团队数据。
- 不把 `sample-data` 或 `legacy-docs` 当作真实主数据源。
- 不在公开 `GET` 请求中自动写入 `materials` 或 `knowledge_entries`。
- 不把权限错误渲染成“暂无内容”。

