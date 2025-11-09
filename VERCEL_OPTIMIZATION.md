# Vercel 部署优化指南

## 问题：多个构建同时运行

当你推送代码到 Git 时，Vercel 可能会为同一个项目创建多个部署别名，导致每次推送都触发多个构建任务。

## 不清理的影响

### 1. 资源消耗
- ⚠️ **构建时间配额消耗更快**：每次推送会消耗 4 倍的构建时间
- ⚠️ **可能更快达到免费额度上限**：Vercel 免费版有构建时间限制

### 2. 管理混乱
- 📋 **部署历史混乱**：难以追踪哪个部署是实际使用的
- 🔍 **查找困难**：需要从多个别名中找出正确的部署

### 3. 潜在混淆
- 🌐 **多个 URL**：不同别名可能指向不同版本
- ⚠️ **版本不一致**：如果某个别名构建失败，可能访问到旧版本

### 4. 性能影响
- ⏱️ **构建队列拥堵**：多个构建会占用更多资源
- 🐌 **可能影响其他项目**：如果团队有其他项目，会共享构建资源

## 检查步骤

### 步骤 1：检查项目设置

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 进入你的项目 `ue-asset-library`
3. 点击 **Settings** → **Git**
4. 检查以下配置：
   - **Production Branch**: 应该是 `main`
   - **Automatic deployments from Git**: 应该只启用 Production
   - **Preview deployments**: 根据需要启用（通常可以禁用）

### 步骤 2：检查域名/别名

1. 在项目页面，点击 **Settings** → **Domains**
2. 查看所有域名和别名：
   - 主域名：`ue-asset-library.vercel.app`（应该保留）
   - 其他别名：`ue-asset-library-2xd2`, `ue-asset-library-b5mb` 等（可能是自动生成的）

### 步骤 3：识别实际使用的域名

1. 在 **Deployments** 页面，找到标记为 **Current** 的部署
2. 查看该部署使用的域名/别名
3. 这个就是实际的生产环境域名

## 优化方案

### 方案 1：理解自动生成的别名

**重要说明**：这些别名（如 `ue-asset-library-2xd2`）是 Vercel 自动生成的预览 URL，**不会显示在 Domains 设置中**，也无法手动删除。

- ✅ **不影响实际使用**：实际访问使用的是主域名 `ue-asset-library.vercel.app`
- ✅ **自动管理**：这些别名由 Vercel 自动管理，无需手动处理
- ⚠️ **多个构建的原因**：可能是 Vercel 为不同环境或团队成员创建的预览部署

**建议**：无需担心这些别名，它们不会影响生产环境。

### 方案 2：禁用预览部署

1. 进入 **Settings** → **Git**
2. 找到 **Preview Deployments** 设置
3. 如果不需要预览部署，可以禁用

### 方案 3：限制自动部署

1. 进入 **Settings** → **Git**
2. 在 **Automatic deployments from Git** 中
3. 只启用 **Production** 分支的自动部署
4. 禁用其他分支的自动部署

## 推荐配置

### 最小化配置（推荐）

```
✅ Production Branch: main
✅ Automatic deployments: 仅 Production
❌ Preview deployments: 禁用（除非需要）
✅ 域名：只保留主域名
```

### 保留的域名

- `ue-asset-library.vercel.app`（主域名，必须保留）
- 如果有自定义域名，也保留

### 关于自动生成的别名

这些别名（如 `ue-asset-library-2xd2`）是 Vercel 自动生成的，**无法手动删除**：
- 它们不会显示在 Domains 设置中
- 它们是 Vercel 内部使用的预览 URL
- 实际访问使用的是主域名 `ue-asset-library.vercel.app`

## 验证优化效果

优化后，当你推送代码时：
- ✅ 应该只有 **1-2 个构建任务**（主域名 + 自定义域名，如果有）
- ✅ 部署历史更清晰
- ✅ 构建时间配额消耗减少

## 注意事项

1. **不要删除主域名**：`ue-asset-library.vercel.app` 是 Vercel 自动分配的主域名，删除后可能无法访问
2. **自定义域名**：如果你配置了自定义域名，不要删除它
3. **团队协作**：如果项目有多个成员，确保所有成员都知道哪个域名是生产环境

## 如何确认当前使用的域名

1. 在 Vercel Dashboard 中，进入 **Deployments** 页面
2. 找到标记为 **Current** 的部署
3. 查看该部署的 **Domains** 列
4. 这个域名就是实际访问的地址

## 常见问题

### Q: 为什么 Domains 设置中看不到这些别名？
A: 这些别名（如 `ue-asset-library-2xd2`）是 Vercel 自动生成的预览 URL，不会显示在 Domains 设置中。它们用于内部部署标识，不影响实际访问。

### Q: 多个构建会影响网站访问吗？
A: 不会。实际访问使用的是主域名 `ue-asset-library.vercel.app`。多个构建只是 Vercel 的内部机制，不会影响生产环境。

### Q: 为什么会有这么多别名？
A: 可能是 Vercel 在不同时间自动生成的，或者是之前的配置遗留。通常只需要主域名即可。

### Q: 如何防止未来再次出现多个别名？
A: 定期检查 **Settings** → **Domains**，及时清理不需要的别名。确保 Git 设置中只启用必要的自动部署。

