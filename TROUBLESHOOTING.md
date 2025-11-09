# 故障排除指南

## 无法本地预览的常见问题

### 1. 依赖未安装

**症状**: 运行 `npm run dev` 时出现模块未找到错误

**解决方案**:
```bash
cd web
npm install
```

### 2. 端口被占用

**症状**: 启动时提示端口 3000 已被占用

**解决方案**:
- 关闭占用端口的进程
- 或使用其他端口: `PORT=3001 npm run dev`

### 3. TypeScript 类型错误

**症状**: 编译时出现类型错误

**解决方案**:
```bash
# 检查类型错误
npm run build

# 如果只是开发，可以暂时忽略类型错误
```

### 4. 缺少资产文件

**症状**: 页面显示但看不到资产

**解决方案**:
1. 将图片/视频文件放入 `public/demo/` 目录
2. 运行 `npm run build:manifest` 生成清单
3. 刷新页面

### 5. 环境变量问题

**症状**: CDN 路径不正确

**解决方案**:
创建 `.env.local` 文件:
```env
NEXT_PUBLIC_CDN_BASE=/
```

### 6. Next.js 缓存问题

**症状**: 修改后看不到变化

**解决方案**:
```bash
# 清除 .next 缓存
rm -rf .next
npm run dev
```

### 7. 检查项目状态

运行检查脚本:
```bash
node check-setup.js
```

## 快速诊断步骤

1. **检查 Node.js 版本** (需要 >= 18):
   ```bash
   node --version
   ```

2. **检查依赖安装**:
   ```bash
   npm list --depth=0
   ```

3. **尝试构建项目**:
   ```bash
   npm run build
   ```
   这会显示所有编译错误

4. **查看详细错误**:
   ```bash
   npm run dev
   ```
   查看终端输出的完整错误信息

## 常见错误信息

### "Cannot find module 'xxx'"
- 运行 `npm install` 安装缺失的依赖

### "Port 3000 is already in use"
- 关闭其他 Next.js 进程或使用其他端口

### "Module not found: Can't resolve '@/xxx'"
- 检查 `tsconfig.json` 中的 `paths` 配置
- 确保文件路径正确

### "Error: ENOENT: no such file or directory"
- 检查文件路径是否正确
- 确保 `data/manifest.json` 存在

## 获取帮助

如果以上方法都无法解决问题，请提供:
1. 完整的错误信息
2. Node.js 版本 (`node --version`)
3. npm 版本 (`npm --version`)
4. 运行 `npm run build` 的输出


