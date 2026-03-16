# 爆款工坊 (Viral Workshop)

游戏广告素材 AI 工作台 — 从创意种子到可投放视频的全链路自动化。

## 核心流水线

```
创意种子 → AI 匹配爆款模版 → 生成脚本+分镜 → AI 视频生成 → AI 审核 → 可投放素材
```

## 技术栈

Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui + Supabase + Aliyun OSS

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量（参考 ENV_VARIABLES.md）
cp .env.example .env.local

# 启动开发服务器（端口必须是 3000）
npm run dev
```

## 文档

- **[CLAUDE.md](./CLAUDE.md)** — 项目入口（技术栈 + 约束 + 模块 + 当前状态）
- **[docs/ROADMAP.md](./docs/ROADMAP.md)** — 产品路线图 + 开发进度
- **[ENV_VARIABLES.md](./ENV_VARIABLES.md)** — 环境变量配置
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** — 部署指南
