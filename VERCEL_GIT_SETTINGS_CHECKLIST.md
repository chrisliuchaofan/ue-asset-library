# Vercel Git 设置检查清单

## 检查步骤

### 步骤 1：进入 Git 设置页面

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 进入项目 `ue-asset-library`
3. 点击 **Settings** → **Git**

### 步骤 2：检查 Production Branch 设置

**检查项：**
- [ ] **Production Branch** 应该设置为 `main`
- [ ] 确认这是你的主要开发分支

**如果设置错误：**
- 点击 **Edit** 修改为 `main`

### 步骤 3：检查 Automatic Deployments 设置

**检查项：**
- [ ] **Automatic deployments from Git** 应该启用
- [ ] 确认只启用了 **Production** 分支的自动部署
- [ ] 如果不需要，可以禁用其他分支的自动部署

**推荐配置：**
```
✅ Production Branch (main): 启用自动部署
❌ 其他分支: 禁用自动部署（除非需要）
```

### 步骤 4：检查 Preview Deployments 设置

**检查项：**
- [ ] **Preview Deployments** 是否启用
- [ ] 如果不需要预览部署，可以禁用以减少构建数量

**如何禁用：**
1. 找到 **Preview Deployments** 部分
2. 如果显示 "Enabled"，点击切换为 "Disabled"
3. 或者取消勾选相关选项

**说明：**
- **启用预览部署**：每次 Push 或 Pull Request 都会创建预览部署（会生成多个构建）
- **禁用预览部署**：只有 Production 分支的推送会触发部署（减少构建数量）

### 步骤 5：检查 Ignored Build Step 设置

**检查项：**
- [ ] 确认没有设置会阻止构建的忽略规则
- [ ] 如果有忽略规则，确保它们是正确的

**常见忽略规则：**
- 忽略某些文件的更改（如 `README.md`）
- 只在特定目录更改时构建

### 步骤 6：检查 Deployment Protection 设置

**检查项：**
- [ ] 确认是否需要部署保护（通常不需要）
- [ ] 如果启用了，确认配置是否正确

## 推荐配置（最小化构建）

### 配置 1：只部署 Production 分支（推荐）

```
✅ Production Branch: main
✅ Automatic deployments: 仅 Production 分支
❌ Preview Deployments: 禁用
❌ 其他分支自动部署: 禁用
```

**优点：**
- 构建数量最少（每次推送只有 1 个构建）
- 节省构建时间配额
- 部署历史更清晰

**缺点：**
- 无法预览 Pull Request 的更改

### 配置 2：启用预览部署（如果需要）

```
✅ Production Branch: main
✅ Automatic deployments: Production + Preview
✅ Preview Deployments: 启用
```

**优点：**
- 可以预览 Pull Request 的更改
- 方便团队协作

**缺点：**
- 构建数量较多（每次推送可能有多个构建）
- 消耗更多构建时间配额

## 如何修改设置

### 禁用 Preview Deployments

1. 进入 **Settings** → **Git**
2. 找到 **Preview Deployments** 部分
3. 如果显示 "Enabled"，点击切换为 "Disabled"
4. 保存更改

### 限制自动部署分支

1. 进入 **Settings** → **Git**
2. 找到 **Automatic deployments from Git** 部分
3. 取消勾选不需要自动部署的分支
4. 只保留 **Production** 分支的勾选
5. 保存更改

## 验证优化效果

修改设置后：

1. **推送一次代码测试**
   ```bash
   git commit --allow-empty -m "test: 测试部署配置"
   git push
   ```

2. **观察构建数量**
   - 进入 **Deployments** 页面
   - 查看新推送触发的构建数量
   - 如果只有 1-2 个构建，说明优化成功

3. **确认生产环境正常**
   - 访问主域名确认网站正常
   - 检查功能是否正常

## 常见问题

### Q: 禁用预览部署会影响 Pull Request 吗？
A: 会。禁用后，Pull Request 不会自动创建预览部署。如果需要预览 PR，可以保持启用。

### Q: 如何知道哪些设置需要修改？
A: 按照上面的检查清单逐项检查，根据你的需求决定是否启用预览部署。

### Q: 修改设置后需要重新部署吗？
A: 不需要。设置修改后会自动生效，下次推送代码时会使用新设置。

### Q: 如何恢复之前的设置？
A: 在同一个设置页面，将设置改回之前的状态即可。

## 当前建议

根据你的情况（只有一个主域名，不需要预览部署），建议：

1. ✅ **保持 Production Branch 为 `main`**
2. ✅ **启用 Production 分支的自动部署**
3. ❌ **禁用 Preview Deployments**（如果不需要预览功能）
4. ❌ **禁用其他分支的自动部署**

这样可以：
- 减少构建数量（每次推送只有 1 个构建）
- 节省构建时间配额
- 保持部署历史清晰

