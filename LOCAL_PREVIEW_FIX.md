# 本地预览功能不显示问题排查指南

## 问题描述
在本地预览时，新的调整（如项目显示名称、设置功能等）不显示。

## 解决方案

### 1. 清除 Next.js 缓存
```bash
# 删除 .next 目录
rm -rf .next

# 重新启动开发服务器
npm run dev
```

### 2. 清除浏览器缓存
- **Chrome/Edge**: 按 `Ctrl+Shift+Delete` (Windows) 或 `Cmd+Shift+Delete` (Mac)
- 选择"缓存的图片和文件"
- 点击"清除数据"
- 或者使用硬刷新：`Ctrl+Shift+R` (Windows) 或 `Cmd+Shift+R` (Mac)

### 3. 清除 localStorage
在浏览器控制台执行：
```javascript
// 清除项目相关配置
localStorage.removeItem('project_passwords');
localStorage.removeItem('project_display_names');
localStorage.removeItem('custom_projects');

// 刷新页面
location.reload();
```

### 4. 检查代码更新
确保以下文件已正确更新：
- `lib/constants.ts` - 项目显示名称配置
- `components/admin/admin-layout.tsx` - 管理页面设置功能
- `lib/storage.ts` - 资产项目字段处理
- `lib/materials-data.ts` - 素材项目字段处理

### 5. 重启开发服务器
```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

### 6. 检查浏览器控制台
打开浏览器开发者工具（F12），查看：
- Console 标签：是否有 JavaScript 错误
- Network 标签：资源是否正常加载
- Application 标签：localStorage 中的值是否正确

## 验证步骤

### 1. 验证项目显示名称
- 访问资产页面 (`/assets`)
- 点击项目选择器
- 应该看到：项目A显示为"三冰"，项目B显示为"次神"，项目C显示为"造化"

### 2. 验证管理页面设置功能
- 访问管理页面 (`/admin`)
- 点击左侧"设置"按钮
- 应该看到：
  - 所有项目的显示名称和密码设置
  - 可以修改项目显示名称和密码
  - 可以新增项目
  - 可以删除自定义项目（不能删除默认项目）

### 3. 验证未分项目的资产归类
- 检查 `data/manifest.json` 和 `data/materials.json`
- 所有没有项目字段的资产和素材应该自动归类到"项目A"

## 如果问题仍然存在

1. **检查环境变量**
   ```bash
   # 确保没有覆盖项目配置的环境变量
   cat .env.local
   ```

2. **检查 TypeScript 编译错误**
   ```bash
   npm run build
   ```

3. **检查文件权限**
   ```bash
   # 确保有读写权限
   ls -la data/
   ```

4. **完全重置**
   ```bash
   # 删除所有缓存和构建文件
   rm -rf .next node_modules/.cache
   npm install
   npm run dev
   ```

## 常见问题

### Q: 修改后页面没有变化
A: 清除浏览器缓存和 Next.js 缓存，然后重启开发服务器

### Q: 项目显示名称还是旧的
A: 清除 localStorage 中的 `project_display_names`，页面会自动使用默认值

### Q: 设置功能不显示
A: 检查浏览器控制台是否有错误，确保 `admin-layout.tsx` 已正确更新

### Q: 新增的项目不显示
A: 确保点击了"保存设置"按钮，页面会自动刷新以应用更改

