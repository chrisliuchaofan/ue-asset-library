# 本地预览 vs 线上部署的区别

## 存储模式差异

### 本地模式（开发环境）

**配置：**
- `STORAGE_MODE=local`
- `NEXT_PUBLIC_STORAGE_MODE=local`
- `NEXT_PUBLIC_CDN_BASE=/`

**文件存储：**
- 文件保存到：`public/demo/` 目录
- URL 格式：`/demo/filename.jpg`
- 访问方式：直接通过 Next.js 静态文件服务访问

**特点：**
- ✅ 简单快速，无需配置 OSS
- ✅ 文件直接保存在项目中
- ❌ 文件会提交到 Git（如果未忽略）
- ❌ 不适合生产环境（文件会占用服务器空间）

### OSS 模式（生产环境）

**配置：**
- `STORAGE_MODE=oss`
- `NEXT_PUBLIC_STORAGE_MODE=oss`
- `NEXT_PUBLIC_CDN_BASE=/` 或 `https://你的CDN域名`
- `OSS_BUCKET=你的Bucket名称`
- `OSS_REGION=oss-cn-guangzhou`
- `OSS_ACCESS_KEY_ID=你的AccessKeyId`
- `OSS_ACCESS_KEY_SECRET=你的AccessKeySecret`
- `NEXT_PUBLIC_OSS_BUCKET=你的Bucket名称`（客户端需要）
- `NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou`（客户端需要）

**文件存储：**
- 文件上传到：阿里云 OSS
- OSS 路径：`assets/filename.jpg`
- URL 格式（取决于 CDN_BASE 配置）：
  - 如果 `NEXT_PUBLIC_CDN_BASE=/`：使用 OSS 外网域名
    - `https://bucket.oss-region.aliyuncs.com/assets/filename.jpg`
  - 如果 `NEXT_PUBLIC_CDN_BASE=https://cdn.example.com`：使用 CDN 域名
    - `https://cdn.example.com/assets/filename.jpg`

**特点：**
- ✅ 文件存储在云端，不占用服务器空间
- ✅ 可以通过 CDN 加速访问
- ✅ 适合生产环境
- ❌ 需要配置 OSS 和 CDN

## 预览图显示问题排查

### 问题：预览图挂了

**可能原因：**

1. **CDN_BASE 配置错误**
   - 检查 Vercel 环境变量中的 `NEXT_PUBLIC_CDN_BASE`
   - 如果设置为 `/`，系统会自动使用 OSS 外网域名
   - 如果设置为 CDN 域名，确保 CDN 已正确配置

2. **OSS 配置缺失**
   - 确保配置了 `NEXT_PUBLIC_OSS_BUCKET` 和 `NEXT_PUBLIC_OSS_REGION`
   - 这些变量用于客户端构建完整的 OSS URL

3. **URL 构建逻辑问题**
   - 如果上传时返回的是相对路径（如 `/assets/xxx.jpg`）
   - 客户端需要根据 `window.__OSS_CONFIG__` 构建完整 URL
   - 检查浏览器控制台是否有错误信息

4. **OSS 文件权限问题**
   - 确保 OSS Bucket 的访问权限设置为"公共读"
   - 或者配置正确的访问策略

### 解决方案

1. **检查上传返回的 URL**
   - 在管理页面上传文件后，查看返回的 URL
   - 如果是相对路径，需要客户端构建完整 URL
   - 如果是完整 URL，应该可以直接访问

2. **检查客户端配置**
   - 打开浏览器控制台，输入：`window.__OSS_CONFIG__`
   - 应该能看到 `{ bucket: 'xxx', region: 'xxx' }`
   - 如果没有，说明环境变量配置有问题

3. **检查环境变量**
   - 在 Vercel Dashboard → Settings → Environment Variables
   - 确认以下变量已配置：
     - `NEXT_PUBLIC_OSS_BUCKET`
     - `NEXT_PUBLIC_OSS_REGION`
     - `NEXT_PUBLIC_CDN_BASE`（可选，默认 `/`）

4. **验证 OSS URL**
   - 复制预览图的 URL
   - 在浏览器中直接访问，看是否能打开
   - 如果不能，检查 OSS 权限配置

## 推荐配置（生产环境）

```env
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=/
OSS_BUCKET=你的Bucket名称
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
NEXT_PUBLIC_OSS_BUCKET=你的Bucket名称
NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou
```

**说明：**
- `NEXT_PUBLIC_CDN_BASE=/` 表示使用 OSS 外网域名
- 系统会自动构建：`https://bucket.oss-region.aliyuncs.com/assets/filename.jpg`
- 如果需要使用 CDN，将 `NEXT_PUBLIC_CDN_BASE` 设置为 CDN 域名

