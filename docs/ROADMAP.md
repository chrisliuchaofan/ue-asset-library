# 爆款工坊 — 产品路线图

> 最后更新: 2026-03-11

## 一句话目标

让 AI 从创意种子到可投放视频全链路自动化 — "让 AI 真的帮我提消耗"

## 核心流水线

```
创意种子 → AI 匹配爆款模版 → 生成脚本+分镜 → AI 视频生成 → AI 审核 → 保存素材 → 投放+数据回收
```

---

## 阶段总览

### V1: AI 流水线 ✅ 已归档 (2026-03-06 ~ 2026-03-11)

| 阶段 | 名称 | 状态 | 完成时间 |
|------|------|------|---------|
| S1 | SaaS 基建 | ✅ 已完成 | 2026-03-06 |
| P0 | AI 流水线基础设施 | ✅ 已完成 | 2026-03-08 |
| P1 | 爆款模版系统 | ✅ 已完成 | 2026-03-09 |
| P2 | 脚本 + 分镜生成 | ✅ 已完成 | 2026-03-10 |
| P3 | AI 视频生成 | ✅ 已完成 | 2026-03-10 |
| P4 | 知识库 + AI 审核升级 | ✅ 已完成 | 2026-03-11 |

### V2: 全链路闭环 + 产品打磨 (进行中)

| 阶段 | 名称 | 状态 | 说明 |
|------|------|------|------|
| **V2.1** | **端到端闭环** | ✅ 已完成 | 素材上传 + Studio→素材库 + 审核→发布 |
| **V2.2** | **投放数据桥接** | ✅ 已完成 | 投放命名 + 周报匹配 |
| **V2.3** | **产品打磨** | ✅ 已完成 | Bug修复 + 模块梳理 + 交互优化 |

> 📋 V2 详细计划: [docs/V2-PLAN.md](V2-PLAN.md)

---

## S1: SaaS 基建 ✅

> 从内部工具升级为多租户 SaaS 产品

- [x] **基础清理** — 删除 Dream Factory、重组导航、统一设计 Token、安全加固
- [x] **首页 + 移动适配** — Landing Page、Hero 响应式、Bento Grid
- [x] **灵感收集模块** — Supabase 表 + API + 瀑布流 UI + 语音录制
- [x] **多团队 RBAC** — teams/members/invitations 表、4 角色权限、邀请码注册、团队切换
- [x] **产品体验** — Onboarding 引导、空状态设计、模块间流转、Cmd+K 命令面板
- [x] **增长功能** — CI/CD (GitHub Actions)、国际化 (next-intl)、UI/UX 审计、评论系统
- [x] **SaaS 成熟度** — Vitest 138 tests、Stripe 计费、OAuth (Google/GitHub)、PostHog 分析

---

## P0: AI 流水线基础设施 ✅

> 为 AI 创意流水线铺路的数据层改造

- [x] **素材迁移 Supabase** — materials 表 + 从 OSS JSON 迁移 38 条 + RLS
- [x] **开启 pgvector** — vector(1024) 列 + IVFFlat 索引 + 向量搜索函数
- [x] **脚本持久化** — scripts 表 + Studio 从 localStorage 改为 Supabase 读写

### 关键技术决策
- materials 表沿用旧 ENUM 类型（material_type/project_enum/material_tag），未做 TEXT 迁移
- pgvector 用 IVFFlat 索引（数据量 <1万条足够，超过再迁 HNSW）
- 迁移脚本保留在 `scripts/migrate-materials.ts`

---

## P1: 爆款模版系统 ✅

> 从爆款素材中 AI 提取可复用"公式"，用于驱动后续脚本生成

- [x] **数据库** — material_templates 表 + pgvector + match_templates RPC
- [x] **AI 模版提取** — DeepSeek 分析素材 → 提取 hook/结构/情绪/风格 → 智谱 embedding
- [x] **模版匹配** — 创意文本 → 向量相似度搜索 → high/medium/low 分级
- [x] **API 路由** — CRUD + /extract + /match（6 个端点）
- [x] **管理 UI** — 列表页(卡片+筛选+匹配面板) + 详情页(时间线+状态管理)
- [x] **集成** — 导航栏 + 中间件鉴权 + i18n

### 关键文件
- `lib/templates/templates-db.ts` — DB CRUD
- `lib/templates/template-extractor.ts` — AI 提取
- `lib/templates/template-matcher.ts` — 向量匹配
- `data/template.schema.ts` — 类型定义
- `app/(dashboard)/templates/` — UI 页面

### 验证结果
- API CRUD 全部 200/201
- AI 提取：选取爆款素材 → 生成 4 场景模版 → 1024 维 embedding 存储成功
- 向量匹配：相似度 68.43%，UI 正确展示
- `next build` 零报错

---

## P2: 脚本 + 分镜生成 ✅

> 从模版到可执行的制作方案 — 让设计师拿到明确的制作指引

- [x] **类型扩展** — `types.ts` 新增 ScriptGenerationMode, ImageProviderType, StoryboardGenerateRequest/Result
- [x] **双模式脚本生成** — `script-generator.ts` 支持 free（自由创作）+ template（模版驱动）
- [x] **Wanx 异步轮询** — `qwen-provider.ts` 支持 DashScope 异步任务模式（task_id 轮询）
- [x] **分镜图生成服务** — `storyboard-generator.ts` + `/api/studio/generate-storyboard`（并发控制 3 张/批）
- [x] **Studio UI 重构** — 步骤式流程（选模式 → 填创意 → 生成脚本 → 生成分镜 → 导出）
- [x] **PDF 导出** — 客户端 jspdf（封面页 + 每页 2 场景并排 + 分镜图嵌入）

### 关键文件
- `lib/studio/types.ts` — 扩展后的类型（ScriptGenerationMode, ImageProviderType, StoryboardGenerateRequest）
- `lib/studio/script-generator.ts` — 双模式脚本生成（FREE_SYSTEM_PROMPT + TEMPLATE_SYSTEM_PROMPT + alignScenesWithTemplate）
- `lib/studio/storyboard-generator.ts` — 分镜图批量生成（并发控制 + prompt 增强）
- `lib/studio/storyboard-export.ts` — PDF 导出（jspdf 客户端生成）
- `lib/ai/providers/qwen-provider.ts` — Wanx 异步轮询（pollImageTask）
- `app/api/studio/generate-storyboard/route.ts` — 分镜图 API（maxDuration=120）
- `components/studio/` — 6 个新组件（StepIndicator, ModeSelector, TemplateSelector, ScriptInputForm, SceneCard, StoryboardControls）
- `app/(dashboard)/studio/page.tsx` — 重构后的 Studio 页面

### 设计决策
- **双模式保留**：模版驱动（推荐）+ 自由创作，不强制用户选模版
- **文生图可配置**：ImageProviderType 支持 qwen/kling/flux，页面可选模型，目前启用 qwen
- **并发控制**：每批 3 张 + Promise.allSettled 隔离错误，单张失败不影响其他
- **模版对齐**：AI 返回场景数不匹配时，强制对齐模版结构（截断/补全）
- **PDF 客户端生成**：避免服务端中文字体问题，继承浏览器系统字体

### 验证结果
- `next build` 零报错

---

## P3: AI 视频生成 ✅

> 从分镜图到视频片段 — 双提供商（即梦 + 可灵）异步生成

- [x] **Kling 可灵 Provider** — JWT HS256 认证 + 图生视频 + 异步任务状态查询
- [x] **Jimeng 即梦 queryTaskStatus** — HMAC-SHA256 签名 + 任务状态轮询
- [x] **视频生成服务** — `video-generator.ts` 顺序提交（成本高 + 频率限制）
- [x] **视频 API 端点** — `/api/studio/generate-video`（提交）+ `/api/studio/video-status`（轮询）
- [x] **Studio UI 集成** — VideoControls 控制面板 + SceneCard 视频预览区 + 步骤条扩展
- [x] **异步两阶段流程** — 提交任务 → 5s 间隔轮询（5 分钟超时）+ 页面刷新恢复

### 关键文件
- `lib/ai/providers/kling-provider.ts` — 可灵 Provider（JWT 认证 + image2video + queryTaskStatus）
- `lib/ai/providers/jimeng-provider.ts` — 即梦 Provider（新增 queryTaskStatus）
- `lib/studio/video-generator.ts` — 顺序提交视频任务
- `lib/studio/types.ts` — VideoProviderType, VideoGenerationStatus, VideoGenerateRequest 等
- `app/api/studio/generate-video/route.ts` — 视频生成 API（maxDuration=30）
- `app/api/studio/video-status/route.ts` — 视频状态轮询 API（maxDuration=15）
- `components/studio/VideoControls.tsx` — 视频生成控制面板
- `components/studio/SceneCard.tsx` — 视频预览区（播放器 + 状态指示 + 重试）

### 设计决策
- **不新建 DB 表**：视频状态存入 SceneBlock JSONB（videoUrl/videoStatus/videoTaskId/videoProvider）
- **顺序提交**：视频生成成本高 + API 频率限制，逐场景提交而非并行
- **两阶段流程**：提交阶段快速返回 taskId，轮询阶段异步等待完成
- **双提供商**：即梦（成本低）+ 可灵（质量高），页面可切换
- **页面恢复**：刷新页面自动检测 pending/processing 任务并恢复轮询

### 验证结果
- `next build` 零报错
- Studio UI 步骤条正确显示"生成视频"步骤
- VideoControls 在无分镜图时正确隐藏

---

## P4: 知识库 + AI 审核升级 ✅

> 让审核标准从"人脑经验"变成"系统知识"

- [x] **知识库数据模型** — knowledge_entries 表 + pgvector 1024 维 + IVFFlat 索引 + RLS + match_knowledge_entries RPC
- [x] **知识导入** — 手动创建 + Markdown 批量导入（按 `## ` 标题拆分）
- [x] **RAG 驱动审核** — 重构 ai-orchestrator，从硬编码 3 维度改为知识库动态驱动 + RAG 上下文注入
- [x] **动态维度引擎** — 3 种 check_type（rule_based / ai_text / ai_multimodal）工厂模式分派
- [x] **反馈闭环** — 人工覆盖维度结果 → 自动生成反馈候选 → 管理员审批入库
- [x] **知识管理 UI** — `/knowledge` 独立页面（3 标签页 + CRUD + 导入 + 反馈审批）
- [x] **审核页面升级** — 动态维度列 + 维度覆盖弹窗 + P4 标识
- [x] **向后兼容** — 旧 score_xxx 列保留 + Legacy 降级 + dimension_results JSONB 双写

### 关键文件
- `lib/knowledge/knowledge-db.ts` — 知识库 CRUD + 维度查询
- `lib/knowledge/rag-service.ts` — RAG 向量检索 + prompt 注入
- `lib/review/dynamic-checker.ts` — 维度检查工厂（rule_based / ai_text / ai_multimodal）
- `lib/review/ai-orchestrator.ts` — 重构后的动态审核调度器
- `data/knowledge.schema.ts` — 知识条目类型定义
- `app/api/knowledge/` — 5 个 API 路由（CRUD + 导入 + 反馈 + 覆盖）
- `app/(dashboard)/knowledge/page.tsx` — 知识管理主页
- `components/knowledge/` — 4 个组件（卡片 + 表单 + 导入 + 反馈列表）
- `components/review/` — 2 个组件（维度结果单元格 + 覆盖弹窗）

### 设计决策
- **团队级 + 全局共享**: team_id=null 的知识全局可见，team_id 有值的仅团队内可见
- **全动态维度**: 审核维度从 knowledge_entries 中 category='dimension' 的条目读取，不再硬编码
- **RAG 上下文注入**: `{{context}}` 占位符模式，知识检索结果注入到维度 prompt_template
- **向后兼容**: 知识库无维度时自动降级到旧版 3-checker；dimension_results JSONB 与旧列双写
- **反馈闭环**: 人工修正 AI 判定 → 自动生成 feedback 候选 → 管理员审批后正式入库

### 验证结果
- `next build` 零报错
- Supabase SQL 迁移成功（knowledge_entries 表 + material_reviews 新增 JSONB 列）
- `/knowledge` 页面：3 条种子维度正确显示 + CRUD 操作正常
- `/review` 页面：动态维度列（时长规范 / 前3秒钩子 / CTA行动指引）正确渲染

### 价值
- 差异化壁垒 — 知识库是团队专属资产，竞品无法复制
- 越用越智能 — 审核经验持续积累
- 灵活可配 — 新增/修改审核维度无需改代码

---

---

## V2: 全链路闭环 + 产品打磨

> 从"AI 能生成视频"进化到"用户能用起来并看到数据回报"

基于全流程走查发现的 7 个核心断点：

### V2.1 端到端闭环 (P0) ✅

- [x] **素材上传入口** — /materials 新增上传按钮 + OSS 上传 + 元数据填写
- [x] **Studio → 素材库** — "保存为素材"按钮 + API，AI 视频直接入库
- [x] **审核 → 发布** — 素材状态体系 (draft→reviewing→approved→published) + 状态筛选

### V2.2 投放数据桥接 (P1) ✅

- [x] **投放命名体系** — materials 新增 platform_name / platform_id / campaign_id / ad_account / launch_date
- [x] **周报数据匹配** — platform_name 精确匹配 + 模糊匹配 + 关联显示
- [ ] **素材数据看板** — 消耗趋势 + ROI 变化 + 排名（V3 规划）

### V2.3 产品打磨 (P2) ✅

- [x] **Bug 修复** — Dashboard Invalid Date
- [x] **模块梳理** — UE 资产 vs 投放素材定位明确 + 导航按工作流重排
- [x] **交互体验** — 素材状态筛选 + 状态徽章 + 周报关联指示器

---

## 技术债务 (按需处理)

- [ ] 帮助中心 / 产品文档（Phase 4.3 延后）
- [ ] materials 表 ENUM → TEXT 类型统一
- [ ] docs/ 目录进一步精简（可按需归档）
