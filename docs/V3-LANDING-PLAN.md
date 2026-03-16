# V3: Landing Page Dreamina 风格改造计划

> 目标: 去掉"AI 模版味"，参考 dreamina.capcut.com 打造高级感 SaaS 营销页
> 预计改动: 8 个文件重写 + 2 个新组件 + 1 个新依赖

## 参考对象分析 (Dreamina)

Dreamina 首页的核心设计语言:

| 区域 | 设计手法 | 效果 |
|------|---------|------|
| Hero | 全屏 AI 生成作品轮播 + 叠加文案 | 视觉冲击力极强，展示产品能力 |
| 导航 | 透明 → 滚动后半透明毛玻璃 | 不遮挡内容，高级感 |
| 场景卡片 | 横向滚动卡片（角色设计/时尚/游戏/营销） | 让用户找到自己的使用场景 |
| 功能详情 | 蓝色渐变背景 + 左文右图交替 | 清晰展示每个功能的实际效果 |
| 配色 | 暗灰底 + 青色强调 + 蓝紫渐变分隔 | 科技感但不廉价 |
| 动效 | 轮播自动播放 + 滚动渐入 | 克制有力，不花哨 |

## 你现在的问题

1. **黑色 + 星空 + 渐变文字** = 2024 AI 产品默认模版，没有辨识度
2. **纯文字 Hero** — 没有视觉作品展示，用户不知道产品长什么样
3. **6 宫格图标卡** — 信息密度低，每个模块只有一句话描述
4. **没有真实截图/视频** — 用户无法感知产品实际界面

## 改造方案

### 总体结构 (从上到下)

```
1. LandingNav      — 保留，微调样式
2. HeroShowcase    — 🔥 全新：全屏作品轮播 + 叠加 Slogan
3. SceneCards      — 🔥 全新：横向滚动的使用场景卡片
4. FeatureDetail   — 🔥 重写：左文右图交替的功能详情
5. WorkflowSection — 重写：更紧凑的水平时间线
6. CTASection      — 重写：渐变背景 + 更大气
7. LandingFooter   — 保留，微调
```

### 配色改造

```
旧: 纯黑 bg-black + 白色文字 + 紫橙渐变
新: 深灰渐变底色 + 品牌色点缀 + 蓝紫渐变分隔区

背景层次:
- 顶部 Hero: #0a0a0f → 半透明叠加
- 中部内容: #111118 (深灰带紫调)
- 功能详情: linear-gradient(135deg, #1a1040, #0a2050) (蓝紫渐变，参考 Dreamina)
- CTA 区: 品牌渐变 (紫→橙)
- 底部: #0a0a0f
```

---

## 逐组件实施方案

### 1. LandingNav — 微调

**文件**: `components/landing/LandingNav.tsx`
**改动量**: 小

改动:
- [ ] Logo 区域: 去掉 Clapperboard 图标，改用文字 Logo "爆款工坊" + 品牌色下划线
- [ ] 导航项增加: "功能" / "工作流" / "场景" 三个锚点
- [ ] 滚动后背景: bg-black/60 → bg-[#111118]/80 (带紫调的深灰)
- [ ] CTA 按钮: 保持橙色，但改为 pill 形状 (rounded-full px-6)

### 2. HeroShowcase — 全新 (核心亮点)

**文件**: `components/landing/HeroShowcase.tsx` (新建)
**替代**: LandingHero.tsx
**改动量**: 大

设计参考: Dreamina 的全屏轮播 Hero

**结构**:
```tsx
<section className="relative h-screen overflow-hidden">
  {/* 背景: 3-4 张全屏图片/视频自动轮播 */}
  <div className="absolute inset-0">
    {slides.map((slide, i) => (
      <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
        <img src={slide.image} className="object-cover w-full h-full" />
        {/* 底部渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
      </div>
    ))}
  </div>

  {/* 叠加文案 (左下角) */}
  <div className="relative z-10 flex flex-col justify-end h-full px-8 pb-24 max-w-3xl">
    {/* Prompt 标签 (参考 Dreamina 的 "[ A boy falling... ]") */}
    <span className="text-white/50 text-sm mb-4">[ {currentSlide.prompt} ]</span>

    {/* 主标题 - 两行 */}
    <h1 className="text-5xl md:text-7xl font-bold">
      <span className="text-white">首帧定生死</span>
      <br />
      <span className="bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
        爆款有工坊
      </span>
    </h1>

    {/* 副标题 */}
    <p className="mt-4 text-white/50 text-lg max-w-xl">
      游戏广告素材 AI 工作台 — 从创意灵感到可投放视频，全链路自动化
    </p>

    {/* CTA 按钮 */}
    <div className="mt-8 flex gap-4">
      <Link href="/auth/register" className="...orange pill...">免费开始 →</Link>
    </div>
  </div>

  {/* 轮播指示器 (底部中央小圆点) */}
  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
    {slides.map((_, i) => <button className={`w-2 h-2 rounded-full ${...}`} />)}
  </div>
</section>
```

**轮播图片方案** (不需要真实产品截图):
- 方案 A (推荐): 用 CSS 渐变 + 抽象几何图形模拟，类似 Vercel/Linear 的暗色几何 Hero
- 方案 B: 用产品界面截图做背景（需要截图）
- 方案 C: 纯视频背景（需要视频素材）

**MVP 实现**: 用 3 组 **CSS 渐变背景 + 大文字** 模拟展示效果:
```
Slide 1: "爆款拆解" — 紫色调渐变 + 网格线条
Slide 2: "AI 脚本生成" — 蓝色调渐变 + 代码风格线条
Slide 3: "智能审核" — 橙色调渐变 + 仪表盘线条
```

**自动轮播**: 5 秒间隔，用 useEffect + setInterval，framer-motion AnimatePresence 过渡

### 3. SceneCards — 全新

**文件**: `components/landing/SceneCards.tsx` (新建)
**改动量**: 中

参考 Dreamina 的 "Create your design, whatever your purpose" 区域

**结构**: 水平滚动的场景卡片
```tsx
<section className="py-20 bg-[#111118]">
  <div className="max-w-7xl mx-auto px-6">
    <h2 className="text-3xl font-bold text-white/90">
      为游戏广告而生
    </h2>
    <p className="text-white/40 mt-2">
      无论什么品类、什么风格，AI 都能帮你找到爆款公式
    </p>
  </div>

  {/* 横向滚动容器 */}
  <div className="mt-10 flex gap-5 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-hide">
    {scenes.map(scene => (
      <div className="flex-shrink-0 w-72 snap-start rounded-2xl overflow-hidden group cursor-pointer">
        {/* 场景封面图 (CSS 渐变模拟) */}
        <div className="h-48 bg-gradient-to-br ..." />
        {/* 场景信息 */}
        <div className="p-5 bg-white/[0.04]">
          <h3 className="text-white/90 font-semibold">{scene.title}</h3>
          <p className="text-white/40 text-sm mt-1">{scene.description}</p>
          <span className="text-sm text-orange-400 mt-3 inline-flex items-center gap-1">
            开始创作 →
          </span>
        </div>
      </div>
    ))}
  </div>
</section>
```

**场景列表**:
```ts
const scenes = [
  { title: 'RPG 角色展示', description: '突出角色技能和画面表现力', gradient: '...' },
  { title: 'SLG 策略推广', description: '展示建造、联盟、战争玩法', gradient: '...' },
  { title: '休闲游戏买量', description: '趣味玩法 + 强 CTA 转化', gradient: '...' },
  { title: '二次元手游', description: 'Live2D 角色 + 剧情向素材', gradient: '...' },
  { title: '竞技对战', description: '快节奏操作 + 排名激励', gradient: '...' },
];
```

### 4. FeatureDetail — 重写

**文件**: `components/landing/FeatureSection.tsx` (重写)
**改动量**: 大

**从 6 宫格卡 → 左文右图交替布局** (参考 Dreamina 的功能介绍区)

```
背景: 蓝紫渐变 (linear-gradient(135deg, #1a1040, #0a2050))

Feature 1: [文字左 | 截图右] — 爆款分析
Feature 2: [截图左 | 文字右] — AI 脚本 + 分镜
Feature 3: [文字左 | 截图右] — AI 视频生成
Feature 4: [截图左 | 文字右] — 智能审核
```

每个 Feature Block:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16">
  {/* 文字侧 */}
  <div className={index % 2 === 0 ? '' : 'lg:order-2'}>
    <span className="text-sm text-purple-400 font-medium">爆款分析</span>
    <h3 className="text-3xl font-bold text-white mt-2">
      AI 拆解竞品素材结构
    </h3>
    <p className="text-white/50 mt-4 leading-relaxed">
      自动识别 Hook、转场、CTA 等关键节点，提取可复用的爆款公式，
      让你的创作有据可依。
    </p>
    <Link className="mt-6 inline-flex text-orange-400 hover:text-orange-300">
      了解更多 →
    </Link>
  </div>

  {/* 截图/演示侧 */}
  <div className={index % 2 === 0 ? '' : 'lg:order-1'}>
    {/* 用 CSS 模拟的产品界面占位 */}
    <div className="rounded-xl bg-white/[0.05] border border-white/10 p-4 aspect-video">
      {/* 模拟 UI 元素 */}
    </div>
  </div>
</div>
```

**产品截图方案**:
- MVP: 用 CSS 画简化的 UI 示意图（深色卡片+线条模拟界面）
- 后续: 替换为真实产品截图

### 5. WorkflowSection — 重写

**文件**: `components/landing/WorkflowSection.tsx` (重写)
**改动量**: 中

从竖向 4 步 → **水平时间线** (更紧凑)

```
灵感 ──→ 模版匹配 ──→ AI 创作 ──→ 审核发布
 🔍         📋          🎬          ✅
```

用 flex 水平排列，每步之间用虚线连接，滚动进入时逐步亮起

### 6. CTASection — 重写

**文件**: `components/landing/CTASection.tsx` (重写)
**改动量**: 中

更大气的 CTA:
- 去掉圆角盒子，改为全宽渐变背景区
- 更大的标题字号
- 数据亮点展示: "1000+ 素材分析 / 3 分钟生成脚本 / 95% 审核通过率"(虚拟数据)

### 7. LandingPageContent — 更新

**文件**: `components/landing/LandingPageContent.tsx`
**改动量**: 中

- 移除 GalaxyBackground (星空背景)
- 改用深灰色基底 bg-[#0a0a0f]
- 替换 LandingHero → HeroShowcase
- 新增 SceneCards
- 更新 FeatureSection → FeatureDetail

### 8. globals.css — 补充变量

**文件**: `app/globals.css`
**改动量**: 小

新增:
```css
/* Landing V3 */
--landing-bg: #0a0a0f;
--landing-surface: #111118;
--landing-accent-blue: #3b82f6;
```

---

## 依赖变更

| 操作 | 包 | 用途 |
|------|-----|------|
| 保留 | framer-motion | 动画（已装） |
| 保留 | ogl | GalaxyBackground 保留文件但不在首页使用 |
| 可选安装 | embla-carousel-react | Hero 轮播（如果需要触摸滑动） |

**MVP 方案**: 不装新依赖，用 useState + setInterval + framer-motion AnimatePresence 实现轮播

---

## 文件改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/landing/LandingPageContent.tsx` | 重写 | 移除星空，新结构 |
| `components/landing/LandingNav.tsx` | 微调 | Logo + 锚点 + 背景色 |
| `components/landing/HeroShowcase.tsx` | **新建** | 全屏轮播 Hero |
| `components/landing/SceneCards.tsx` | **新建** | 场景横向滚动卡片 |
| `components/landing/FeatureSection.tsx` | 重写 | 左文右图交替 |
| `components/landing/WorkflowSection.tsx` | 重写 | 水平时间线 |
| `components/landing/CTASection.tsx` | 重写 | 全宽渐变 CTA |
| `components/landing/LandingFooter.tsx` | 微调 | 背景色适配 |
| `app/globals.css` | 补充 | Landing 专用变量 |
| `components/landing/LandingHero.tsx` | 删除 | 被 HeroShowcase 替代 |

**不动的文件**:
- `app/page.tsx` — 入口不变
- `components/galaxy-background.tsx` — 保留文件，其他页面可能复用

---

## 实施顺序

```
Step 1: LandingPageContent + 配色基底 (去星空，建立新色调)
Step 2: HeroShowcase (全屏轮播 — 最重要的视觉改变)
Step 3: SceneCards (横向卡片)
Step 4: FeatureDetail (左文右图)
Step 5: WorkflowSection (水平时间线)
Step 6: CTASection + Footer (收尾)
Step 7: LandingNav 微调 + 响应式测试
Step 8: next build 验证
```

## 设计原则

1. **展示 > 描述** — 用视觉元素展示产品能力，减少纯文字说明
2. **克制动效** — 只在进入视口时做一次渐入，不要持续动画
3. **暗色质感** — 深灰 (非纯黑) + 微妙渐变 + 玻璃态边框
4. **移动优先** — 所有区域都要在手机上好看
5. **加载速度** — 不用 WebGL，纯 CSS + 图片，首屏 < 1s

## 品牌色使用指南

- **紫色** (#7C3AED): 功能标签、标题强调
- **橙色** (#F97316): CTA 按钮、链接、行动号召
- **蓝紫渐变** (#1a1040 → #0a2050): 功能详情区背景
- **白色层次**: 标题 white/90, 正文 white/50, 辅助 white/30
