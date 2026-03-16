# 爆款工坊 V3 开发计划

> 最后更新: 2026-03-15
> 需求分析基线: [docs/WORKFLOW-ANALYSIS.md](WORKFLOW-ANALYSIS.md)
> 前序已完成: V1(AI流水线) + V2(端到端闭环+投放桥接+打磨)

---

## 当前代码现状

| 能力 | 状态 | 说明 |
|------|------|------|
| 素材 CRUD + 上传 + 状态流转 | ✅ | draft→reviewing→approved→published 四态 |
| 投放字段 | ✅ | platform_name/platform_id/campaign_id/ad_account/launch_date 已有 |
| Studio 脚本→分镜→视频 | ✅ | 双模式+双视频提供商 |
| 审核 | ✅ | 知识库驱动+手动覆盖，缺合规规则 |
| 周报上传+AI总结 | ✅ | 能上传 Excel 解析，缺精确匹配回素材 |
| 灵感收集 | ✅ | 创建+删除+搜索，缺编辑/出口/状态 |
| 模版匹配 | ✅ | AI提取+向量匹配，缺分类体系 |
| 知识库 | ✅ | CRUD+审核维度，缺AI访谈采集 |

---

## Wave 1: 命名锚点 + 数据闭环

> 目标：命名是全链路锚点。建立命名→下载→数据回收→反标的最小闭环。

### W1.1 素材命名系统

**范围**: 11标签命名规则生成器 + 强制校验 + 下载

**DB 变更**:
```sql
-- materials 表新增
ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_naming TEXT;          -- 系统生成的标准命名
ALTER TABLE materials ADD COLUMN IF NOT EXISTS naming_fields JSONB;           -- 各字段拆分值（方便回显编辑）
ALTER TABLE materials ADD COLUMN IF NOT EXISTS naming_verified BOOLEAN DEFAULT false;  -- 命名是否已确认

-- 团队命名配置
CREATE TABLE IF NOT EXISTS team_naming_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  products TEXT[] DEFAULT '{}',            -- 产品列表 [造化, 三冰, ...]
  designers TEXT[] DEFAULT '{}',           -- 设计师列表
  vendors TEXT[] DEFAULT '{}',             -- 外包商列表
  naming_template TEXT,                    -- 命名模版（预留自定义）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**新增文件**:
| 文件 | 说明 |
|------|------|
| `lib/naming/naming-rules.ts` | 命名规则引擎：生成、校验、解析 |
| `lib/naming/naming-config.ts` | 团队命名配置 CRUD |
| `components/materials/naming-generator.tsx` | 命名生成器 UI（11字段表单+实时预览） |
| `app/api/naming/config/route.ts` | 命名配置 API |

**修改文件**:
| 文件 | 变更 |
|------|------|
| `lib/supabase/types.ts` | 新增 material_naming/naming_fields/naming_verified 类型 |
| `data/material.schema.ts` | 新增字段 Zod schema |
| 素材详情页 | 嵌入命名生成器，未命名时阻止状态推进 |
| 素材卡片 | 显示命名标签（已命名✅/未命名⚠️） |

**验收**:
- [ ] 素材详情页可打开命名生成器，11字段逐项填写
- [ ] 实时预览完整命名，格式校验通过才能保存
- [ ] 未命名素材不能推进到 approved 状态
- [ ] 下载按钮：文件名 = 素材命名.mp4
- [ ] 管理员可在设置页配置团队的产品/设计师/外包商下拉列表

---

### W1.2 灵感模块补全

**范围**: 灵感编辑 + 灵感→模版匹配→Studio 出口

**修改文件**:
| 文件 | 变更 |
|------|------|
| `components/inspirations/inspiration-card.tsx` | 加编辑按钮，点击打开编辑弹窗 |
| `components/inspirations/edit-inspiration-dialog.tsx` | 新建：编辑弹窗（复用创建弹窗结构） |
| `app/api/inspirations/[id]/route.ts` | 新增 PATCH 方法 |
| `components/inspirations/inspiration-card.tsx` | 加「匹配模版」按钮，跳转 `/templates?match=灵感内容` |
| `app/(dashboard)/templates/page.tsx` | 读取 URL query `match` 参数，自动触发匹配 |

**验收**:
- [ ] 灵感卡片支持编辑（标题+内容+标签）
- [ ] 灵感卡片有「匹配模版」按钮，点击跳转模版页并自动匹配
- [ ] 模版匹配结果页有「用此模版创作」按钮进入 Studio

---

### W1.3 审核合规规则

**范围**: 新增「合规初审」维度，7条规则入库

**操作**:
- 在知识库 `/knowledge` 新增一条知识条目，类型=审核维度，标题=「合规初审」
- 内容为7条合规规则（C-1~C-7，来自 WORKFLOW-ANALYSIS.md §十二）
- 审核执行时，合规维度作为首要检查项

**修改文件**:
| 文件 | 变更 |
|------|------|
| 知识库种子数据或 API 调用 | 插入合规审核知识条目 |
| `app/api/review/run/route.ts` | 确保合规维度优先执行，不通过直接拦截 |

**验收**:
- [ ] 审核执行时「合规初审」维度出现在结果第一项
- [ ] 合规不通过时素材被拦截，显示具体违规规则

---

### W1.4 数据反标（命名精确匹配）

**范围**: 周报上传后，按素材命名精确匹配回素材库，回写消耗数据

**DB 变更**:
```sql
-- materials 表新增投放数据字段
ALTER TABLE materials ADD COLUMN IF NOT EXISTS impressions BIGINT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS clicks BIGINT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS ctr NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cpc NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cpm NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS new_user_cost NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS first_day_pay_count INTEGER;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS first_day_pay_cost NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS report_period TEXT;         -- 最近匹配的报表周期
```

**新增文件**:
| 文件 | 说明 |
|------|------|
| `lib/weekly-reports/material-matcher.ts` | 匹配引擎：报表素材名称 → 精确匹配 materials.material_naming |
| `app/api/weekly-reports/match/route.ts` | 匹配 API：执行匹配 + 回写数据 |

**修改文件**:
| 文件 | 变更 |
|------|------|
| `lib/supabase/types.ts` | 新增消耗数据字段类型 |
| `data/material.schema.ts` | 新增消耗字段 |
| 周报页面 | 上传后显示匹配结果（成功N条/失败N条/未匹配列表） |
| 素材卡片 | 有消耗数据时显示消耗金额角标 |
| 素材详情页 | 新增「投放数据」区块（消耗/展示/点击/CTR/CPC等） |

**验收**:
- [ ] 上传渠道报表 Excel 后，自动按素材名称匹配
- [ ] 匹配结果页展示：成功匹配数、失败匹配数、未匹配素材列表
- [ ] 匹配成功的素材详情页显示消耗/点击/CTR 等投放数据
- [ ] 素材库支持按消耗排序

---

## Wave 2: 创作体验升级

> 目标：Studio 支持混合制作，分析支持视频上传，建立个人工作区。

### W2.1 Studio 混合制作

**范围**: 分镜图可替换上传 + 非AI视频上传到场景

**修改文件**:
| 文件 | 变更 |
|------|------|
| `components/studio/scene-card.tsx` | 分镜图区域加「上传替换」按钮 |
| `components/studio/video-controls.tsx` | 加「上传视频」选项（与AI生成并列） |
| `app/api/studio/upload-asset/route.ts` | 新增：上传图片/视频到 OSS 返回 URL |

**验收**:
- [ ] 分镜图可点击替换为自己上传的图片
- [ ] 场景视频可选择「上传视频」代替 AI 生成
- [ ] 上传的文件存储到 OSS，URL 回填到 SceneBlock

---

### W2.2 脚本手动编辑

**范围**: AI 生成的脚本支持逐字段编辑

**修改文件**:
| 文件 | 变更 |
|------|------|
| `components/studio/scene-card.tsx` | 各字段（台词/画面描述/时长）可编辑 |
| Studio 状态管理 | 编辑后更新 SceneBlock 数据 |

**验收**:
- [ ] 点击脚本文字可进入编辑模式
- [ ] 编辑后分镜/视频可基于修改后的内容重新生成

---

### W2.3 上传竞品视频分析

**范围**: 爆款分析页新增「上传视频」入口，AI 多模态分析

**新增文件**:
| 文件 | 说明 |
|------|------|
| `components/analysis/video-upload-analysis.tsx` | 上传视频+触发分析 UI |
| `app/api/analysis/video-analyze/route.ts` | 视频→抽帧→千问视觉分析 |

**验收**:
- [ ] 用户可上传竞品视频文件
- [ ] AI 输出多模态分析报告（画面/文案/节奏/套路拆解）
- [ ] 分析结果可一键「提取模版」

---

### W2.4 个人工作区

**范围**: 「我的创作」聚合页，展示当前用户的灵感/脚本/素材

**新增文件**:
| 文件 | 说明 |
|------|------|
| `app/(dashboard)/my-work/page.tsx` | 个人工作区页面 |
| `app/api/my-work/route.ts` | 聚合查询：我的灵感+脚本+素材 |

**修改文件**:
| 文件 | 变更 |
|------|------|
| `app/(dashboard)/layout.tsx` | 导航新增「我的创作」入口 |

**验收**:
- [ ] 页面聚合展示当前用户创建的灵感/脚本/素材
- [ ] 各区块可快速跳转到对应模块
- [ ] 统计数字：本周创作N个脚本、N个素材

---

## Wave 3: 知识沉淀 + 效率

> 目标：AI 访谈采集经验，批量操作提效。

### W3.1 AI 访谈式知识采集

**范围**: 管理员创建访谈主题 → 生成链接 → 专家对话 → AI 整理为知识条目

**新增文件**:
| 文件 | 说明 |
|------|------|
| `app/(dashboard)/knowledge/interviews/page.tsx` | 访谈管理列表 |
| `app/knowledge/interview/[token]/page.tsx` | 外部访谈页（独立路由，token鉴权） |
| `lib/knowledge/interview-service.ts` | 访谈管理+AI对话+知识提炼 |
| `app/api/knowledge/interviews/route.ts` | 访谈 CRUD API |
| `app/api/knowledge/interviews/[token]/chat/route.ts` | 访谈对话 API |

**DB 变更**:
```sql
CREATE TABLE IF NOT EXISTS knowledge_interviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  topic TEXT NOT NULL,
  guide_questions TEXT[],
  token TEXT UNIQUE NOT NULL,
  contributor_name TEXT,
  contributor_role TEXT,
  status TEXT DEFAULT 'pending',  -- pending/in_progress/completed/archived
  chat_history JSONB DEFAULT '[]',
  extracted_knowledge_id UUID REFERENCES knowledge_entries(id),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

**验收**:
- [ ] 管理员可创建访谈主题+引导问题，生成分享链接
- [ ] 专家通过链接进入对话页面（无需登录），与 AI 访谈者交流
- [ ] 访谈结束后 AI 自动整理为 Markdown 知识条目
- [ ] 知识条目标注贡献人信息

---

### W3.2 批量审核

**修改文件**:
| 文件 | 变更 |
|------|------|
| `app/(dashboard)/review/page.tsx` | 加全选/多选，批量触发审核 |
| `app/api/review/batch/route.ts` | 新增：批量审核 API |

**验收**:
- [ ] 可勾选多个素材一键批量审核
- [ ] 批量结果展示各素材通过/不通过状态

---

### W3.3 灵感增强

**范围**: 灵感状态流转 + 参考链接 + Excel导入

**DB 变更**:
```sql
ALTER TABLE inspirations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';  -- new/used/archived
ALTER TABLE inspirations ADD COLUMN IF NOT EXISTS reference_url TEXT;
```

**修改文件**:
| 文件 | 变更 |
|------|------|
| `components/inspirations/inspiration-card.tsx` | 显示状态标签，支持参考链接 |
| `components/inspirations/import-excel-dialog.tsx` | 新建：Excel 创意表导入 |

**验收**:
- [ ] 灵感卡片显示状态（新建/已使用/已归档）
- [ ] 用于创作后自动标记为「已使用」
- [ ] 支持填写参考视频链接
- [ ] 支持从 Excel 批量导入灵感

---

## 暂不实施（P2 backlog）

| 功能 | 原因 |
|------|------|
| 视频拼接/完整预览 | 需要 FFmpeg 后端，复杂度高 |
| 配音/BGM/字幕叠加 | 音频处理独立系统 |
| 广告平台 API 自动对接 | 各平台 API 差异大，先用 Excel |
| 消耗拆分系数计算 | 规则因项目而异，暂不通用化 |
| 素材到期/淘汰管理 | 非核心闭环 |
| UE脚本外包协作流 | 流程重，需单独评估 |

---

## 布局改造（并行）

> 独立于功能开发，UI 层面的改造。详见 plan file。

- [ ] 侧栏双模式（折叠55px/展开220px）
- [ ] 用户头像 dropdown（替代底部工具按钮）
- [ ] 各页面 header 统一规范
- [ ] 废弃组件清理

---

## 技术约束备忘

1. DB 操作用 `supabaseAdmin`，绕过 RLS
2. insert/update 用 `as any` cast
3. `user_id` 是 TEXT（email），不是 UUID
4. UI 用 inline style，不用 Tailwind 响应式前缀（Turbopack 限制）
5. 颜色用 `rgba(255,255,255,0.XX)`，不用 CSS 变量
6. materials 表的 type/project/tag 是 ENUM 类型
