# 框选功能调试指南

## 问题描述
长按会出现白色框，白色框区域内的所有资产都会被加入清单。

## 排查步骤

### 1. 检查代码是否生效
打开浏览器开发者工具（F12），查看 Console 标签页。

当你进行框选操作时，应该能看到以下调试日志：
- `[框选调试] 鼠标按下：开始潜在框选`
- `[框选调试] 鼠标移动：开始真正的框选`（如果移动超过 5px）
- `[框选调试] 鼠标抬起`
- `[框选调试] handleSelectionEnd 被调用`
- `[框选调试] 框选区域尺寸`
- `[框选调试] 找到相交的资产`

### 2. 清除浏览器缓存
1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"
4. 或者按 `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)

### 3. 检查代码文件
确认 `components/assets-list.tsx` 文件包含以下内容：

```bash
# 在项目根目录运行
grep -n "MIN_DRAG_DISTANCE\|MIN_SELECTION_SIZE\|isPotentialSelection" components/assets-list.tsx
```

应该能看到：
- 第 49 行：`isPotentialSelection` 状态
- 第 54 行：`MIN_DRAG_DISTANCE = 5`
- 第 222 行：`MIN_SELECTION_SIZE = 10`

### 4. 重启开发服务器
```bash
# 停止当前服务器 (Ctrl+C)
# 清理缓存
rm -rf .next
# 重新启动
npm run dev
```

### 5. 测试场景

#### 场景 1：点击（不拖动）
- **预期行为**：不显示白色框，不选择任何资产
- **调试日志**：应该看到 `[框选调试] 只是点击，取消框选`

#### 场景 2：短距离拖动（< 5px）
- **预期行为**：不显示白色框，不选择任何资产
- **调试日志**：应该看到 `[框选调试] 只是点击，取消框选`

#### 场景 3：长距离拖动但区域小（< 10px × 10px）
- **预期行为**：显示白色框，但不选择资产
- **调试日志**：应该看到 `[框选调试] 框选区域太小，取消批量选择`

#### 场景 4：正常框选（> 10px × 10px）
- **预期行为**：显示白色框，选择框内的资产
- **调试日志**：应该看到 `[框选调试] 找到相交的资产` 和 `[框选调试] 切换资产选择状态`

## 如果问题依然存在

### 检查是否有其他代码路径
搜索项目中是否有其他地方也实现了框选功能：

```bash
grep -r "handleSelectionEnd\|isSelecting\|setIsSelecting" components/
```

### 检查事件监听器
在浏览器开发者工具的 Console 中运行：

```javascript
// 检查是否有多个事件监听器
getEventListeners(document).mousedown
getEventListeners(document).mousemove
getEventListeners(document).mouseup
```

### 检查 React 组件状态
在浏览器开发者工具的 React DevTools 中：
1. 找到 `AssetsListContent` 组件
2. 查看 `isSelecting`、`isPotentialSelection`、`selectionStart`、`selectionEnd` 的状态
3. 观察这些状态在框选时的变化

## 临时禁用框选功能

如果问题严重影响使用，可以临时禁用框选功能：

在 `components/assets-list.tsx` 的 `handleMouseDown` 函数开头添加：

```typescript
const handleMouseDown = (e: MouseEvent) => {
  return; // 临时禁用框选
  // ... 原有代码
};
```

## 联系开发者

如果以上步骤都无法解决问题，请提供：
1. 浏览器 Console 中的完整调试日志
2. React DevTools 中组件的状态截图
3. 具体的操作步骤（点击、拖动等）
















