# 爆款工坊 (Viral Workshop)

游戏广告素材 AI 工作台 — 从创意种子到可投放视频的全链路自动化。

## 项目定位

面向游戏公司的 SaaS 产品，核心流水线：
```
创意种子 → AI 匹配爆款模版 → 生成脚本+分镜 → AI 视频生成 → AI 审核 → 可投放素材
```

目标用户：美术总监、创策、设计师（AI/AE/UE）、投放。

## 技术栈

- **框架**: Next.js 16 + React 19 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **数据库**: Supabase (PostgreSQL + pgvector + RLS)
- **存储**: Aliyun OSS
- **认证**: NextAuth (非 Supabase Auth)
- **AI**: DeepSeek (文本主力) + 智谱 AI (embedding-3, 1024维) + 即梦 (图生视频) + 可灵 Kling (图生视频) + 阿里千问 (文生图+视觉分析)
- **支付**: Stripe
- **分析**: PostHog
- **测试**: Vitest + Playwright

## 核心约束 (必读)

1. **DB 操作必须用 `supabaseAdmin`** — service role key，绕过 RLS 避免 team_members 递归
2. **`user_id` 是 TEXT 类型** — NextAuth 用 email 做 ID，不是 Supabase Auth UUID
3. **开发端口 3001** — `NEXTAUTH_URL=http://localhost:3001`，端口需与 NEXTAUTH_URL 一致
4. **中间件文件是 `proxy.ts`** — 不是 Next.js 默认的 `middleware.ts`
5. **Supabase 类型手动维护** — `lib/supabase/types.ts` 需要手动更新，不用 CLI 生成
6. **insert/update 需要 `as any` cast** — `(supabase.from('table') as any).insert(...)` 绕过严格类型
7. **RPC 调用需要 cast** — `(supabaseAdmin as any).rpc('function_name', params)`
8. **materials 表用 ENUM 类型** — `material_type`, `project_enum`, `material_tag` 是 ENUM 不是 TEXT
9. **embedding 需要 ZHIPU_API_KEY** — 没有这个 key，embedding 服务回退到零向量

## 模块结构

| 路由 | 模块 | 说明 |
|------|------|------|
| `/materials` | 素材库 | 素材浏览/管理/评论 |
| `/analysis` | 爆款分析 | 视频去重/竞品分析 |
| `/studio` | AI 创作 | 脚本生成（模版驱动） |
| `/review` | 智能审核 | AI 质量审核 |
| `/templates` | 爆款模版 | AI 提取+向量匹配 |
| `/inspirations` | 灵感收集 | 创意种子管理 |
| `/assets` | 资产库 | UE 资产索引 |
| `/weekly-reports` | 数据洞察 | 周报/消耗分析 |
| `/settings` | 设置 | 积分/计费/团队 |

## 当前开发状态

**已完成:**
- SaaS 基建（多团队 RBAC + Stripe + OAuth + PostHog）
- AI 流水线 Phase 0（素材迁移 Supabase + pgvector + scripts 持久化）
- AI 流水线 Phase 1（爆款模版系统：AI 提取 + 向量匹配 + 管理 UI）
- AI 流水线 Phase 2（脚本 + 分镜生成：双模式脚本 + Wanx 文生图 + PDF 导出 + Studio 流程化 UI）
- AI 流水线 Phase 3（AI 视频生成：Kling + Jimeng 双提供商 + 异步轮询 + Studio 视频控制面板）

**V1 已归档 (S1 → P0 → P1 → P2 → P3 → P4)** — AI 流水线技术能力完成

**当前焦点: V3 命名闭环 + 创作升级 + 知识沉淀**
- Wave 1: 命名锚点 + 数据闭环（命名系统 + 灵感补全 + 合规审核 + 数据反标）
- Wave 2: 创作体验升级（混合制作 + 脚本编辑 + 竞品分析 + 个人工作区）
- Wave 3: 知识沉淀 + 效率（AI访谈采集 + 批量审核 + 灵感增强）

开发计划: [docs/DEV-PLAN.md](docs/DEV-PLAN.md) | 需求分析: [docs/WORKFLOW-ANALYSIS.md](docs/WORKFLOW-ANALYSIS.md) | 路线图: [docs/ROADMAP.md](docs/ROADMAP.md)

## 关键文件

| 文件 | 说明 |
|------|------|
| `app/(dashboard)/layout.tsx` | Dashboard 布局 + 导航 |
| `lib/auth-config.ts` | NextAuth 配置 |
| `proxy.ts` | 路由中间件 |
| `lib/supabase/admin.ts` | supabaseAdmin 实例 |
| `lib/supabase/types.ts` | 手动维护的 DB 类型 |
| `lib/ai/ai-service.ts` | AI 服务管理器 |
| `lib/vector-search.ts` | 向量搜索服务 |
| `lib/templates/` | 模版提取/匹配/DB |
| `lib/studio/` | 脚本生成 + 分镜图生成 + 视频生成 + PDF 导出 |
| `lib/ai/providers/kling-provider.ts` | 可灵视频 Provider（JWT + 图生视频） |
| `components/studio/` | Studio 页面组件（步骤条/模式选择/模版选择/场景卡片/视频控制等） |
| `app/globals.css` | CSS 变量 + 设计 Token |

## 品牌设计

- 主色/CTA: 橙色 `#F97316` (hsl 24 95% 53%) — 按钮、操作、强调
- 信息色: 蓝色 `#60A5FA` — 链接、辅助文本
- 成功色: 绿色 `#22C55E` — 状态标记
- 品牌渐变: `linear-gradient(135deg, #7C3AED, #F97316)` — 仅用于 logo
- 支持亮色/暗色/跟随系统主题
- 语义色: `--success`, `--warning`, `--destructive`, `--info`

## 沟通

- 语言: 中文
- 评审视角: 产品/设计/用户/技术 多维度
