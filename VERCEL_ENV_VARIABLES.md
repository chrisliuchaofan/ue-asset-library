# Vercel 环境变量配置清单

在 Vercel 项目设置中，按照以下步骤配置环境变量：

1. 进入项目 → **Settings** → **Environment Variables**
2. 点击 **Add** 添加每个变量
3. 选择环境：**Production**, **Preview**, **Development**（根据需要选择）

## 必需的环境变量

### 存储模式配置

| 变量名 | 值 | 说明 | 环境 |
|--------|-----|------|------|
| `STORAGE_MODE` | `oss` | 存储模式（本地模式用 `local`，但 Vercel 建议用 `oss`） | Production, Preview |
| `NEXT_PUBLIC_STORAGE_MODE` | `oss` | 客户端存储模式（必须与服务端一致） | Production, Preview |

### OSS 服务端配置（用于上传和管理）

| 变量名 | 值 | 说明 | 环境 |
|--------|-----|------|------|
| `OSS_BUCKET` | `guangzhougamead` | 阿里云 OSS Bucket 名称 | Production, Preview |
| `OSS_REGION` | `oss-cn-guangzhou` | 阿里云 OSS 地域 | Production, Preview |
| `OSS_ACCESS_KEY_ID` | `你的AccessKeyId` | 阿里云 AccessKey ID | Production, Preview |
| `OSS_ACCESS_KEY_SECRET` | `你的AccessKeySecret` | 阿里云 AccessKey Secret | Production, Preview |
| `OSS_ENDPOINT` | （可选） | OSS 自定义端点，通常留空 | Production, Preview |

### OSS 客户端配置（用于前端构建完整 URL）

| 变量名 | 值 | 说明 | 环境 |
|--------|-----|------|------|
| `NEXT_PUBLIC_OSS_BUCKET` | `guangzhougamead` | OSS Bucket 名称（客户端可访问） | Production, Preview |
| `NEXT_PUBLIC_OSS_REGION` | `oss-cn-guangzhou` | OSS 地域（客户端可访问） | Production, Preview |

### CDN 配置（可选）

| 变量名 | 值 | 说明 | 环境 |
|--------|-----|------|------|
| `NEXT_PUBLIC_CDN_BASE` | `/` 或 `https://你的CDN域名` | CDN 基础路径<br>- 使用 `/` 时，客户端会自动使用 OSS 外网域名<br>- 使用 CDN 域名时，填写完整域名（如 `https://cdn.example.com`） | Production, Preview |

## 配置示例

### 示例 1：使用 OSS 外网域名（推荐）

```
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=/
OSS_BUCKET=guangzhougamead
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
NEXT_PUBLIC_OSS_BUCKET=guangzhougamead
NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou
```

### 示例 2：使用 CDN 加速

```
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=https://cdn.example.com
OSS_BUCKET=guangzhougamead
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
NEXT_PUBLIC_OSS_BUCKET=guangzhougamead
NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou
```

## 快速复制清单

在 Vercel 中添加环境变量时，可以按以下顺序添加：

```
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=/
OSS_BUCKET=guangzhougamead
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
NEXT_PUBLIC_OSS_BUCKET=guangzhougamead
NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou
```

**注意**：将 `你的AccessKeyId` 和 `你的AccessKeySecret` 替换为实际的阿里云 AccessKey。

## 验证配置

配置完成后：

1. 点击 **Save** 保存所有环境变量
2. 重新部署项目（Redeploy）
3. 部署完成后，访问你的网站
4. 打开浏览器控制台，运行：
   ```javascript
   console.log('Storage Mode:', window.__STORAGE_MODE__);
   console.log('CDN Base:', window.__CDN_BASE__);
   console.log('OSS Config:', window.__OSS_CONFIG__);
   ```

如果看到正确的配置信息，说明环境变量配置成功。

## 安全提示

- ✅ **不要**在代码仓库中提交 `.env.local` 文件
- ✅ **不要**在公开的文档中暴露真实的 AccessKey
- ✅ 在 Vercel 中配置环境变量是安全的，只有你有权限查看
- ✅ 如果 AccessKey 泄露，立即在阿里云控制台重新生成

