# 上传状态检查指南

## 如何验证文件上传情况

### 1. 检查 OSS 中的文件

访问阿里云 OSS 控制台：
1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com/)
2. 进入 Bucket：`guangzhougamead`
3. 查看 `assets/` 目录，确认是否有上传的文件

### 2. 检查 OSS 中的 manifest.json

在 OSS 控制台查看根目录是否有 `manifest.json` 文件，这个文件包含所有资产记录。

### 3. 检查线上版本

访问 `https://ue-asset-library.vercel.app/admin`，查看：
- 资产列表是否显示
- 文件是否能正常预览

### 4. 本地 vs 线上数据同步

**重要说明：**
- 本地 `data/manifest.json` 只在 `STORAGE_MODE=local` 时使用
- OSS 模式下，数据存储在 OSS 的 `manifest.json` 中
- 本地和线上的 OSS 数据是共享的，但本地文件是独立的

## 推荐工作流程

### 方案 A：完全使用线上版本（推荐）

1. **所有上传操作**：使用 `https://ue-asset-library.vercel.app/admin`
2. **优势**：
   - 文件直传 OSS，速度最快
   - 不占用本地资源
   - 数据实时同步
   - 成本最低

### 方案 B：本地开发 + 线上生产

1. **开发测试**：使用 `http://localhost:3000/admin`（OSS 模式）
2. **生产上传**：使用 `https://ue-asset-library.vercel.app/admin`
3. **注意**：两个环境共享同一个 OSS，数据会同步

## 数据迁移（如果需要）

如果之前有本地文件需要迁移到 OSS：

1. 检查 `public/demo/` 目录是否有文件
2. 如果有文件，需要手动上传到 OSS
3. 或者使用批量上传功能重新上传

