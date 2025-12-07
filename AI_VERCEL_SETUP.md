# Vercel 上配置 AI 读图功能

## 问题诊断

如果点击 "AI 读图" 后显示的是占位结果（"测试图片"、"占位标签"、"AI 未配置"），说明 Vercel 环境变量未配置。

## 解决步骤

### 1. 登录 Vercel Dashboard

访问 [Vercel Dashboard](https://vercel.com/dashboard)，找到你的项目 `ue-asset-library`。

### 2. 进入环境变量设置

1. 点击项目名称进入项目页面
2. 点击 **Settings**（设置）
3. 点击 **Environment Variables**（环境变量）

### 3. 添加 AI 相关环境变量

点击 **Add** 按钮，逐个添加以下环境变量：

#### 必需的环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `AI_IMAGE_API_PROVIDER` | `aliyun` | AI 服务商类型 |
| `AI_IMAGE_API_ENDPOINT` | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | 阿里云通义 API 端点 |
| `AI_IMAGE_API_KEY` | `sk-你的API密钥` | 阿里云通义 API 密钥（从 `vercel-env-template.txt` 中获取） |
| `AI_IMAGE_API_MODEL` | `qwen-vl-plus-latest` | AI 模型名称（可选，默认值） |

#### 可选的环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `AI_IMAGE_API_TIMEOUT` | `30000` | 请求超时时间（毫秒，默认 30 秒） |
| `AI_IMAGE_API_STRICT` | `false` | 严格模式（默认 false，未配置时返回 mock 结果） |

### 4. 选择环境

添加每个变量时，**必须勾选 Production**（生产环境），这样线上部署才能使用这些变量。

如果需要在预览环境（Preview）也使用，可以同时勾选 Preview。

### 5. 保存并重新部署

1. 添加完所有变量后，点击 **Save**（保存）
2. 进入 **Deployments**（部署）页面
3. 找到最新的部署，点击 **...** 菜单
4. 选择 **Redeploy**（重新部署）

**重要**：修改环境变量后，必须重新部署才能生效！

## 验证配置

部署完成后：

1. 访问你的网站：`https://ue-asset-library.vercel.app`
2. 打开任意资产详情页
3. 点击 "AI 读图" 按钮
4. 如果配置正确，应该显示真实的 AI 分析结果（标签和描述）
5. 如果仍然显示占位结果，检查 Vercel 的部署日志（Functions 日志）

## 查看日志

如果配置后仍然有问题，可以查看 Vercel 的日志：

1. 进入项目页面
2. 点击 **Deployments** → 选择最新的部署
3. 点击 **Functions** 标签
4. 找到 `/api/ai/analyze-image` 函数
5. 查看日志输出，应该能看到：
   - `[AI API] 环境变量未配置:` - 如果环境变量未正确配置
   - `[AI API] 请求完成，耗时: XXXms` - 如果 API 调用成功

## 常见问题

### Q: 为什么本地正常，线上不正常？

A: 本地有 `.env.local` 文件配置了环境变量，但 Vercel 需要单独配置。环境变量不会自动同步到 Vercel。

### Q: 配置后还是显示占位结果？

A: 
1. 确认环境变量已保存
2. 确认已重新部署（Redeploy）
3. 检查 Vercel 日志，查看是否有错误信息
4. 确认 API 密钥是否正确（从 `vercel-env-template.txt` 中获取）

### Q: 如何获取阿里云通义 API 密钥？

A: 
1. 登录 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
2. 进入 **API-KEY 管理**
3. 创建或查看 API Key
4. 格式：`sk-xxxxxxxxxxxxx`

## 参考文档

- 详细环境变量配置：`VERCEL_ENV_VARIABLES.md`
- AI 功能使用说明：`AI_IMAGE_API_USAGE.md`
- 阿里云通义测试指南：`QWEN_VL_TEST.md`






