# 阿里云 OSS 配置指南

## 前置准备

1. **开通阿里云 OSS 服务**
   - 登录阿里云控制台
   - 开通对象存储 OSS 服务
   - 创建一个 Bucket（存储桶）

2. **获取 AccessKey**
   - 进入 [AccessKey 管理页面](https://ram.console.aliyun.com/manage/ak)
   - 创建 AccessKey（建议使用 RAM 子账号，仅授予 OSS 读写权限）
   - 保存 AccessKey ID 和 AccessKey Secret

3. **获取 Bucket 信息**
   - 在 OSS 控制台查看你的 Bucket 名称
   - 查看 Bucket 所在地域（例如：华东1-杭州 → `oss-cn-hangzhou`）

## 配置步骤

### 1. 安装依赖

```bash
cd web
npm install
```

这会自动安装 `ali-oss` 包。

### 2. 创建环境变量文件

复制示例文件：

```bash
cp .env.local.example .env.local
```

### 3. 编辑 `.env.local` 文件

打开 `.env.local`，修改以下配置：

```env
# 切换到 OSS 模式
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss

# 填写你的 OSS 配置
OSS_BUCKET=你的bucket名称
OSS_REGION=oss-cn-hangzhou  # 根据你的实际地域修改
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret

# CDN 配置（如果使用了 CDN 加速）
NEXT_PUBLIC_CDN_BASE=https://你的CDN域名
# 或者直接使用 OSS 外网域名
# NEXT_PUBLIC_CDN_BASE=https://你的bucket名称.oss-cn-hangzhou.aliyuncs.com
```

### 4. 初始化 OSS manifest

首次使用 OSS 模式时，需要将现有的 manifest.json 上传到 OSS：

**方法一：通过代码初始化（推荐）**

1. 先保持 `STORAGE_MODE=local`，在后台管理页面创建一些测试资产
2. 将 `data/manifest.json` 的内容复制
3. 切换到 `STORAGE_MODE=oss`，重启服务
4. 在后台管理页面创建一个新资产，系统会自动创建 manifest.json 到 OSS

**方法二：手动上传**

1. 在 OSS 控制台，进入你的 Bucket
2. 上传 `data/manifest.json` 文件到 Bucket 根目录
3. 确保文件名为 `manifest.json`

### 5. 上传资产文件到 OSS

资产文件（图片/视频）需要上传到 OSS：

1. 在 OSS 控制台创建文件夹（例如：`assets/`）
2. 上传你的图片和视频文件
3. 在后台管理页面创建资产时，填写 OSS 中的文件路径：
   - 例如：`/assets/image.jpg` 或 `https://你的bucket.oss-cn-hangzhou.aliyuncs.com/assets/image.jpg`

## 验证配置

1. **重启开发服务器**：
   ```bash
   npm run dev
   ```

2. **访问后台管理页面**：
   - 打开 `http://localhost:3001/admin`
   - 页面顶部应显示 "存储模式: oss"

3. **测试功能**：
   - 查看资产列表（应该从 OSS 读取）
   - 创建新资产（应该写入 OSS）
   - 编辑资产（应该更新 OSS）
   - 删除资产（应该从 OSS 删除）

## 常见问题

### 1. 提示 "OSS 配置不完整"

检查 `.env.local` 中是否填写了所有必需的 OSS 配置项：
- `OSS_BUCKET`
- `OSS_REGION`
- `OSS_ACCESS_KEY_ID`
- `OSS_ACCESS_KEY_SECRET`

### 2. 提示 "读取 OSS manifest 失败"

可能的原因：
- manifest.json 文件不存在（首次使用需要先创建）
- AccessKey 权限不足（需要 OSS 读写权限）
- Bucket 名称或地域配置错误

解决方法：
- 检查 OSS 控制台是否有 manifest.json 文件
- 验证 AccessKey 权限
- 确认 Bucket 名称和地域是否正确

### 3. 资产文件无法显示

检查：
- `NEXT_PUBLIC_CDN_BASE` 是否正确配置
- OSS Bucket 是否开启了公共读权限（或使用 CDN）
- 资产路径是否正确（相对路径或完整 URL）

### 4. 权限安全建议

- **不要将 `.env.local` 提交到 Git**（已在 .gitignore 中）
- 使用 RAM 子账号，仅授予必要的 OSS 权限
- 生产环境建议使用环境变量注入，而不是文件配置

## 切换回本地模式

如果需要切换回本地模式：

1. 修改 `.env.local`：
   ```env
   STORAGE_MODE=local
   NEXT_PUBLIC_STORAGE_MODE=local
   ```

2. 重启服务即可

## 生产环境部署

在生产环境（如 NAS）部署时：

1. 将 `.env.local` 中的配置转换为环境变量
2. 确保服务器可以访问阿里云 OSS（网络连通性）
3. 建议使用 CDN 加速静态资源访问

