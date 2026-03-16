# 爆款工坊 V2 — 全链路闭环 + 产品打磨

> 制定日期: 2026-03-11
> 基于: 全流程走查发现的 7 个核心断点 + 自然延伸方向

## 一句话目标

从"AI 能生成视频"进化到"用户能用起来并看到数据回报" — 打通最后一公里。

## 核心问题

V1 (S1→P4) 完成了 AI 流水线的技术能力：灵感 → 模版 → 脚本 → 分镜 → 视频 → 审核。
但走查发现**用户无法走完完整业务流程**——视频生成后无法入库、无法关联投放命名、数据无法回收匹配。

```
当前断点示意:
灵感 → 模版 → Studio(脚本→分镜→视频) →❌ 无法保存为素材
                                          →❌ 无法关联投放平台命名
素材库 →❌ 无用户上传入口
审核通过 →❌ 无发布动作
数据洞察(周报) →❌ Excel名称 ≠ 素材库名称，匹配失败
```

## 全流程走查发现的 7 个核心断点

| # | 断点 | 严重度 | 说明 |
|---|------|--------|------|
| 1 | 素材库无用户上传入口 | 🔴 P0 | materials/page.tsx 无上传按钮，只有后台 batch-upload-dialog |
| 2 | 缺少投放平台命名字段 | 🔴 P0 | material.schema.ts 无 platform_name / platform_id / campaign_id |
| 3 | Studio 生成视频无法保存为素材 | 🔴 P0 | studio/page.tsx 只有"前往审核"，无"保存为素材"按钮/API |
| 4 | 审核通过后无发布流程 | 🟡 P1 | review/page.tsx 只有运行审核+人工覆盖，无"标记就绪/发布"动作 |
| 5 | 周报数据匹配失败 | 🟡 P1 | Excel 素材命名 ≠ 素材库 name 字段，ReportMaterial 无 material_id |
| 6 | Dashboard Invalid Date | 🟢 P2 | formatDate() 未校验 isNaN(date.getTime())，显示 NaN |
| 7 | 资产库与素材库定位混淆 | 🟢 P2 | /assets (UE资产) vs /materials (投放素材) 用户难区分 |

---

## 阶段总览

| 阶段 | 名称 | 目标 | 预估工作量 |
|------|------|------|-----------|
| **V2.1** | **端到端闭环** | 打通 Studio→素材库→审核→发布 完整链路 | 大 |
| **V2.2** | **投放数据桥接** | 投放命名 + 周报匹配 + 数据回收 | 中 |
| **V2.3** | **产品打磨** | Bug修复 + UX优化 + 模块清理 | 小 |

---

## V2.1: 端到端闭环 (P0)

> 用户从灵感到可投放素材的完整流程跑通

### V2.1.1 素材上传入口

**问题**: 素材库页面没有用户上传按钮，素材只能通过后台批量导入。

**产出**:
- [ ] `/materials` 页面新增「上传素材」按钮
- [ ] `components/materials/material-upload-dialog.tsx` — 上传对话框（视频/图片 + OSS 上传 + 元数据填写）
- [ ] `app/api/materials/upload/route.ts` — 上传 API（文件 → Aliyun OSS → 素材入库）
- [ ] 上传后自动计算 hash / duration / 宽高 / fileSize
- [ ] 支持拖拽上传 + 进度条

**技术要点**:
- 复用 Aliyun OSS 已有配置
- 视频时长/分辨率: 客户端通过 `<video>` 元素预加载获取
- 文件 hash: 客户端 Web Crypto API 计算 SHA-256

### V2.1.2 Studio → 素材库衔接

**问题**: Studio 生成的视频只能预览，无法保存到素材库。

**产出**:
- [ ] Studio 页面新增「保存为素材」按钮（在"前往审核"旁边）
- [ ] `app/api/studio/save-as-material/route.ts` — 将 SceneBlock 中的 videoUrl 保存为 materials 记录
- [ ] 保存时自动填充: type='AI视频', source='internal', 来自脚本的 name/描述
- [ ] 保存后跳转素材详情或素材库，带成功提示
- [ ] 支持单场景保存 + 全部场景批量保存

**技术要点**:
- SceneBlock.videoUrl 已是 OSS 地址，直接写入 materials.src
- SceneBlock.imageUrl → materials.thumbnail
- 关联 script_id: materials 表新增 `source_script_id TEXT` 追溯来源

### V2.1.3 审核 → 发布流程

**问题**: 审核通过后没有任何发布/就绪动作，素材状态无标识。

**产出**:
- [ ] materials 表新增 `status TEXT DEFAULT 'draft'` — draft / reviewing / approved / published
- [ ] 审核页面: 全部通过时显示「标记为可投放」按钮
- [ ] 素材库: 按状态筛选（全部 / 草稿 / 审核中 / 已通过 / 已投放）
- [ ] 素材卡片显示状态角标（颜色区分）
- [ ] `app/api/materials/[id]/publish/route.ts` — 更新状态 API

**流程**:
```
上传/AI生成 → draft(草稿)
           → 运行审核 → reviewing(审核中)
                      → 审核通过 → approved(已通过) → 手动标记 → published(已投放)
                      → 审核失败 → draft(回到草稿)
```

---

## V2.2: 投放数据桥接 (P1)

> 让素材和投放数据对应起来，实现 ROI 追踪闭环

### V2.2.1 投放命名体系

**问题**: material.schema.ts 只有内部 `name`，缺少投放平台使用的标准化命名。

**产出**:
- [ ] materials 表新增字段:
  - `platform_name TEXT` — 投放平台素材命名（回填）
  - `platform_id TEXT` — 投放平台素材 ID
  - `campaign_id TEXT` — 关联计划 ID
  - `ad_account TEXT` — 投放账户
  - `launch_date TIMESTAMPTZ` — 上线投放时间
- [ ] `data/material.schema.ts` 同步更新 Zod schema
- [ ] 素材详情页新增「投放信息」区域（卡片/Tab）
- [ ] 支持单个编辑 + 批量回填（选中多个素材 → 填写平台命名）

**业务背景**:
用户在投放平台（头条/广点通/Unity等）使用特定命名规则。素材上线后，需要回填这个平台命名，这样后续拉取消耗数据时才能对应。

### V2.2.2 周报数据匹配

**问题**: 周报 Excel 中的素材名称和素材库 name 字段不一致，无法自动关联。

**产出**:
- [ ] `ReportMaterial` 新增 `material_id?: string` 关联字段
- [ ] `lib/weekly-reports/material-matcher.ts` — 智能匹配服务:
  - 精确匹配: `platform_name` == Excel name
  - 模糊匹配: Levenshtein 距离 / 包含关系
  - AI 辅助匹配: DeepSeek 判断相似度（可选）
- [ ] 周报上传后自动尝试匹配，显示匹配度 + 手动确认/修正
- [ ] 匹配成功后回写 materials 的消耗/ROI 字段

**流程**:
```
上传 Excel → 解析 ReportMaterial[] → 按 platform_name 匹配 materials
           → 匹配成功: 自动关联 + 回写消耗数据
           → 匹配失败: 高亮显示，人工选择关联
```

### V2.2.3 素材数据看板

**产出**:
- [ ] 素材详情页新增「数据追踪」Tab — 消耗趋势图 / ROI 变化 / 投放天数
- [ ] Dashboard 优化: 按消耗排名 Top 素材 / 本周新增 / ROI 分布
- [ ] 素材库支持按消耗/ROI 排序

---

## V2.3: 产品打磨 (P2)

> Bug 修复 + 用户体验优化

### V2.3.1 Bug 修复

- [ ] **Dashboard Invalid Date** — `formatDate()` 添加 `isNaN(date.getTime())` 校验
- [ ] **filesize vs fileSize** — material.schema.ts 统一为 `fileSize`，清理 `filesize` 冗余字段
- [ ] **materials ENUM 类型** — 评估是否迁移为 TEXT（技术债务项）

### V2.3.2 模块梳理

- [ ] **资产库 vs 素材库定位明确化**:
  - `/assets` 重命名为「UE 资产」或「制作素材」，强调是制作原料
  - `/materials` 明确为「投放素材」，强调是成品产出
  - 导航 + 页面标题 + 空状态文案 + 搜索范围 统一调整
- [ ] **导航优化**: 按工作流重排导航顺序（灵感→模版→创作→审核→素材库→数据）

### V2.3.3 交互体验

- [ ] 素材详情页: 从卡片点击进入独立详情页（而非仅弹窗播放视频）
- [ ] 素材库: 列表视图 + 网格视图切换
- [ ] Studio: 保存草稿自动保存（防丢失）
- [ ] 全局: Loading 状态统一 + 错误边界优化

---

## 实施优先级

```
V2.1.1 (素材上传) → V2.1.2 (Studio→素材库) → V2.1.3 (状态+发布)
       ↓
V2.2.1 (投放命名) → V2.2.2 (周报匹配) → V2.2.3 (数据看板)
       ↓
V2.3.1 (Bug修复) → V2.3.2 (模块梳理) → V2.3.3 (交互体验)
```

**建议开发顺序**: V2.3.1(快速修Bug) → V2.1 全部 → V2.2.1 → V2.2.2 → V2.3.2 → V2.2.3 → V2.3.3

理由: 先修简单 Bug 热身，然后打通核心闭环（V2.1），再做数据桥接（V2.2），最后打磨体验（V2.3）。

---

## 数据库变更预估

```sql
-- V2.1.2: materials 追溯来源
ALTER TABLE materials ADD COLUMN IF NOT EXISTS source_script_id TEXT;

-- V2.1.3: 素材状态
ALTER TABLE materials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- V2.2.1: 投放信息
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_name TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_id TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS ad_account TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS launch_date TIMESTAMPTZ;

-- 索引
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_platform_name ON materials(platform_name);
```

---

## 新增/修改文件预估

| 类别 | 新增 | 修改 |
|------|------|------|
| 组件 | material-upload-dialog, material-detail-page, material-status-badge, publish-action | materials-page-shell, SceneCard, review/page, dashboard/page |
| API | /materials/upload, /materials/[id]/publish, /studio/save-as-material | /materials/route, /review/run/route |
| 服务 | material-matcher.ts | material.schema.ts, materials-data.ts |
| 数据库 | 1 个迁移文件 | materials 表 +6 列 |
| 类型 | — | material.schema.ts, weekly-report.ts, supabase/types.ts |

---

## 完成标准

- [ ] 用户可以: 记录灵感 → 匹配模版 → 生成脚本 → 生成分镜 → 生成视频 → **保存为素材** → **审核通过** → **标记投放** → **回填平台命名** → **上传周报** → **看到数据匹配**
- [ ] `next build` 零报错
- [ ] 全流程走查无断点
