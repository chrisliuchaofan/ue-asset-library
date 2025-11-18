# 素材管理页面优化计划

## 一、对比分析：资产页面 vs 素材页面

### 1. 单文件上传流程

**资产页面（当前逻辑）：**
- ✅ 上传文件后，文件添加到"已上传文件列表"
- ✅ 需要手动填写表单（名称、类型、标签等）
- ✅ 点击"创建资产"按钮后才真正创建
- ✅ 有确认步骤，符合管理习惯

**素材页面（当前逻辑）：**
- ❌ 上传文件后，如果是单个文件且不是视频，直接创建素材
- ❌ 如果是多个文件或包含视频，才进入确认流程
- ❌ 单文件上传没有确认步骤，不符合管理习惯

### 2. 批量上传确认界面

**资产页面（BatchUploadDialog）：**
- ✅ 弹窗尺寸：`max-w-4xl w-[90vw] max-h-[85vh] h-[85vh]`（大尺寸，充分利用屏幕）
- ✅ 预览列表：每个资产卡片显示预览图、名称、类型、标签等信息
- ✅ 编辑按钮：使用图标按钮（Edit图标），简洁美观
- ✅ 文件列表：显示已上传的文件，可以点击设置为预览图
- ✅ 布局：使用网格布局，信息层次清晰
- ✅ 操作按钮：固定在底部，有"确认创建"按钮，显示待创建数量

**素材页面（待确认素材列表）：**
- ❌ 弹窗尺寸：`max-w-2xl`（太小，信息展示不充分）
- ❌ 预览列表：简单的列表，信息展示不完整
- ❌ 编辑按钮：文字按钮"开始编辑"，样式简陋
- ❌ 文件列表：没有显示已上传的文件列表
- ❌ 布局：简单的垂直列表，不够美观
- ❌ 操作按钮：按钮样式和位置不够合理

### 3. 编辑对话框

**资产页面（EditAssetDialog）：**
- ✅ 弹窗尺寸：`max-w-2xl max-h-[85vh]`
- ✅ 表单布局：使用网格布局（`grid grid-cols-1 md:grid-cols-2`）
- ✅ 文件上传：有独立的上传区域，支持多文件
- ✅ 已上传文件：网格展示（`grid grid-cols-3`），可以设置为预览图
- ✅ 错误提示：有明确的错误信息展示区域

**素材页面（编辑素材对话框）：**
- ✅ 弹窗尺寸：`max-w-2xl max-h-[90vh]`（已优化）
- ✅ 表单布局：使用网格布局（已优化）
- ✅ 文件上传：有上传功能（已优化）
- ✅ 已上传文件：有文件列表展示（已优化）
- ⚠️ 需要进一步优化样式，参考资产页面

### 4. 新增素材表单

**资产页面：**
- ✅ 表单区域：独立的卡片区域（`border border-gray-200 bg-white`）
- ✅ 标题区域：灰色背景（`bg-gray-50`），清晰的标题
- ✅ 文件上传：拖拽上传区域，支持多文件
- ✅ 预览区域：显示预览图和视频，支持切换
- ✅ 已上传文件：网格展示，可以设置为预览图

**素材页面：**
- ✅ 表单区域：独立的卡片区域（已实现）
- ✅ 标题区域：灰色背景（已实现）
- ✅ 文件上传：拖拽上传区域（已实现）
- ⚠️ 需要参考资产页面，优化预览和文件列表展示

## 二、修改计划

### 计划1：单文件上传也需要确认后再创建

**目标：** 统一上传流程，单文件上传也需要填写表单并确认后才创建

**修改内容：**
1. 修改 `handleFileUpload` 函数：
   - 移除直接创建素材的逻辑
   - 上传文件后，只添加到 `uploadedFiles` 列表
   - 自动填充表单的 `name` 字段（从文件名提取）
   - 不自动创建素材

2. 修改 `handleCreate` 函数：
   - 确保只有在点击"创建素材"按钮时才创建
   - 验证必填字段（名称、类型、项目、标签、质量）

3. 修改 `handleFileSelect` 和 `handleDrop`：
   - 单文件上传时，也走文件上传流程，不直接创建

**影响范围：**
- `components/admin/admin-materials-dashboard.tsx`
  - `handleFileUpload` 函数
  - `handleCreate` 函数
  - `handleFileSelect` 函数
  - `handleDrop` 函数

### 计划2：优化批量上传确认界面

**目标：** 参考资产页面的 BatchUploadDialog，改进素材页面的待确认素材列表界面

**修改内容：**
1. 弹窗尺寸：
   - 从 `max-w-2xl` 改为 `max-w-4xl w-[90vw] max-h-[85vh] h-[85vh]`
   - 使用 flex 布局，充分利用屏幕空间

2. 预览列表：
   - 参考资产页面的卡片样式
   - 每个素材卡片显示：
     - 预览图（16x16 或更大）
     - 素材名称（字体加粗）
     - 类型、项目、标签等信息
     - 编辑和删除按钮（使用图标按钮）
   - 使用网格或列表布局，信息层次清晰

3. 编辑按钮：
   - 从文字按钮"开始编辑"改为图标按钮（Edit图标）
   - 使用 `variant="ghost" size="sm"`，样式参考资产页面
   - 按钮文字改为"编辑"或使用图标+文字

4. 文件列表：
   - 在素材卡片中显示已上传的文件列表
   - 使用网格布局（`grid grid-cols-3`）
   - 可以点击文件设置为预览图（参考资产页面）

5. 操作按钮：
   - 固定在底部（`flex-shrink-0 pt-4 border-t`）
   - "确认创建"按钮显示待创建数量
   - 按钮样式参考资产页面

**影响范围：**
- `components/admin/admin-materials-dashboard.tsx`
  - 待确认素材列表对话框（`pendingMaterialsDialogOpen`）
  - 待确认素材编辑对话框（`editingPendingMaterialIndex !== null`）

### 计划3：优化编辑对话框样式

**目标：** 进一步优化编辑对话框，使其与资产页面的编辑对话框风格一致

**修改内容：**
1. 文件上传区域：
   - 参考资产页面的上传区域样式
   - 使用 `border-2 border-dashed` 样式

2. 已上传文件列表：
   - 使用网格布局（`grid grid-cols-3`）
   - 文件卡片样式参考资产页面
   - 添加"设为预览图"功能（使用 Star 图标）

3. 表单布局：
   - 确保与资产页面一致
   - 使用相同的间距和样式

**影响范围：**
- `components/admin/admin-materials-dashboard.tsx`
  - 编辑素材对话框（`editDialogOpen`）

### 计划4：优化新增素材表单

**目标：** 参考资产页面的新增表单，优化预览和文件列表展示

**修改内容：**
1. 预览区域：
   - 参考资产页面的预览区域样式
   - 支持预览图切换
   - 显示预览图数量

2. 已上传文件列表：
   - 使用网格布局（`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4`）
   - 文件卡片样式参考资产页面
   - 添加"设为预览图"功能

**影响范围：**
- `components/admin/admin-materials-dashboard.tsx`
  - 新增素材表单区域

## 三、具体实现细节

### 1. 单文件上传确认流程

```typescript
// 修改前：handleFileUpload 直接创建素材
// 修改后：handleFileUpload 只上传文件，不创建素材

const handleFileUpload = useCallback(async (file: File) => {
  // ... 上传逻辑 ...
  
  // 上传成功后，添加到 uploadedFiles
  setUploadedFiles((prev) => [...prev, newFile]);
  
  // 自动填充表单名称
  setForm((prev) => ({
    ...prev,
    name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
  }));
  
  // ❌ 移除直接创建素材的逻辑
  // ✅ 用户需要手动填写表单并点击"创建素材"按钮
}, []);
```

### 2. 批量上传确认界面优化

```tsx
// 弹窗尺寸
<DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] h-[85vh] flex flex-col overflow-hidden">

// 预览列表 - 参考资产页面样式
<div className="max-h-[50vh] overflow-y-auto space-y-2 border rounded-lg p-4">
  {pendingMaterials.map((material, index) => (
    <div key={index} className="p-3 border rounded-lg bg-muted/50">
      <div className="flex items-start gap-3">
        {/* 预览图 */}
        {material.thumbnail && (
          <img src={getClientUrl(material.thumbnail)} className="w-16 h-16 object-cover rounded border" />
        )}
        
        {/* 素材信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate">{material.name}</div>
            <div className="flex gap-1">
              {/* 编辑按钮 - 使用图标 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingPendingMaterialIndex(index)}
                className="h-6 w-6 p-0"
                title="编辑"
              >
                <Edit className="h-4 w-4 text-blue-600" />
              </Button>
              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSkip(index)}
                className="h-6 w-6 p-0"
                title="删除"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            <div>类型: {material.type}</div>
            <div>项目: {material.project}</div>
            <div>标签: {material.tag}</div>
          </div>
          
          {/* 已上传文件列表 */}
          {material.uploadData && (
            <div className="mt-3 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                已上传文件
              </label>
              <div className="grid grid-cols-3 gap-1">
                {/* 文件列表 */}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ))}
</div>
```

### 3. 按钮样式优化

```tsx
// 修改前
<Button onClick={() => setEditingPendingMaterialIndex(index)}>
  开始编辑
</Button>

// 修改后
<Button
  variant="ghost"
  size="sm"
  onClick={() => setEditingPendingMaterialIndex(index)}
  className="h-6 w-6 p-0"
  title="编辑"
>
  <Edit className="h-4 w-4 text-blue-600" />
</Button>
```

## 四、预期效果

1. **统一上传流程**：单文件和多文件上传都需要确认后才创建，符合管理习惯
2. **美观的确认界面**：批量上传确认界面与资产页面风格一致，信息展示清晰
3. **更好的用户体验**：编辑按钮使用图标，界面更简洁美观
4. **完整的文件管理**：可以查看和设置已上传的文件为预览图

## 五、注意事项

1. 保持与资产页面的风格一致
2. 确保所有功能正常工作
3. 注意响应式设计，适配不同屏幕尺寸
4. 保持代码的可维护性

