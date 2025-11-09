# Vercel 部署检查清单

## ✅ 构建状态

从日志看，构建正在进行中：

- ✅ 仓库克隆成功
- ✅ 依赖安装完成（248 个包）
- ✅ Next.js 15.5.6 已检测
- ⏳ 构建进行中...

## ⚠️ 重要：构建后必须配置环境变量

**即使构建成功，如果没有配置环境变量，网站也无法正常工作！**

### 构建完成后立即操作：

1. **进入 Vercel 项目设置**
   - 项目页面 → **Settings** → **Environment Variables**

2. **添加以下环境变量**（参考 `VERCEL_ENV_VARIABLES.md`）：

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

3. **选择环境**
   - 勾选 **Production**
   - 勾选 **Preview**（可选）

4. **保存并重新部署**
   - 点击 **Save**
   - 点击 **Deployments** → 选择最新的部署 → **Redeploy**

## 🔍 验证部署

部署完成后，检查：

1. **访问网站**
   - 打开 Vercel 提供的网站地址
   - 例如：`https://ue-asset-library.vercel.app`

2. **检查控制台**
   - 打开浏览器开发者工具（F12）
   - 在控制台运行：
     ```javascript
     console.log('Storage Mode:', window.__STORAGE_MODE__);
     console.log('CDN Base:', window.__CDN_BASE__);
     console.log('OSS Config:', window.__OSS_CONFIG__);
     ```

3. **测试功能**
   - 访问 `/assets` 页面，检查资产列表是否显示
   - 访问 `/admin` 页面，检查管理后台是否正常
   - 尝试上传文件，检查是否成功

## 🐛 常见问题

### 问题 1：构建成功但页面显示错误

**原因**：环境变量未配置或配置错误

**解决**：
- 检查 Vercel 环境变量是否全部添加
- 确认 `NEXT_PUBLIC_OSS_BUCKET` 和 `NEXT_PUBLIC_OSS_REGION` 已添加
- 重新部署项目

### 问题 2：图片无法显示

**原因**：OSS 配置不正确或 AccessKey 权限不足

**解决**：
- 检查 AccessKey 是否正确
- 确认 OSS Bucket 权限设置为"公共读"
- 检查 `NEXT_PUBLIC_CDN_BASE` 配置

### 问题 3：无法上传文件

**原因**：OSS AccessKey 权限不足

**解决**：
- 确认 AccessKey 有 OSS 的读写权限
- 检查 OSS Bucket 的 ACL 设置

## 📝 下一步

1. ✅ 等待构建完成
2. ⏳ 配置环境变量（构建完成后）
3. ⏳ 重新部署
4. ⏳ 验证功能

构建完成后，告诉我结果，我会帮你检查配置！

