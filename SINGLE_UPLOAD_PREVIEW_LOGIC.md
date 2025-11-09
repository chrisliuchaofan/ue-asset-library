# 单个上传时预览图抓取逻辑

## 完整流程

### 1. 文件上传阶段 (`handleFileUpload`)

```typescript
// 步骤1: 上传文件到服务器
const data = await uploadPromise; // 返回 { url, type, ... }

// 步骤2: 如果是视频，提取缩略图
let thumbnailUrl = previewUrl;
if (data.type === 'video') {
  const thumb = await extractVideoThumbnail(file);
  if (thumb) {
    thumbnailUrl = thumb; // 视频缩略图是 base64 格式
  }
}

// 步骤3: 添加到已上传文件列表
const newFile = {
  url: data.url, // 原始URL（不包含CDN base）
  type: data.type, // 'image' 或 'video'
  ...
};

// 步骤4: 更新表单
updateFormFromUploadedFiles([...uploadedFiles, newFile]);
```

### 2. 表单更新阶段 (`updateFormFromUploadedFiles`)

```typescript
const firstFile = files[0]; // 取第一个文件

setForm({
  src: firstFile.url, // ✅ 总是设置为第一个文件的URL
  
  // ✅ 关键逻辑：
  thumbnail: firstFile.type === 'image' 
    ? firstFile.url      // 如果是图片，使用图片URL作为thumbnail
    : prev.thumbnail,    // 如果是视频，保持之前的thumbnail（可能为空）
  
  gallery: galleryUrls.join(','), // 所有文件URL
});
```

**关键点：**
- **图片文件**：`thumbnail = 图片URL`，`src = 图片URL`（两者相同）
- **视频文件**：`thumbnail = 空或之前的thumbnail`，`src = 视频URL`
- **视频缩略图**：如果 `extractVideoThumbnail` 成功，会生成 base64 缩略图，但**不会自动设置到表单的 thumbnail 字段**（需要用户手动点击"设为预览图"按钮）

### 3. 创建资产阶段 (`handleCreate`)

```typescript
const payload = {
  thumbnail: form.thumbnail || undefined, // 可能为空（视频情况）
  src: form.src || undefined,             // 总是有值
  ...
};
```

### 4. 资产列表显示阶段 (`displayedAssets.map`)

```typescript
// ✅ 预览图URL的获取逻辑
const thumbnailOrSrc = asset.thumbnail || asset.src;
const previewUrl = getPreviewUrl(thumbnailOrSrc);

// 显示逻辑：
if (previewUrl) {
  // 显示图片或视频预览
} else {
  // 显示"无预览"
}
```

**关键点：**
- **优先使用 `asset.thumbnail`**，如果没有则使用 `asset.src`
- 对于图片资产：`thumbnail` 和 `src` 都有值，使用 `thumbnail`
- 对于视频资产：`thumbnail` 可能为空，使用 `src`（视频URL）

## 特殊情况处理

### 视频缩略图提取

```typescript
// extractVideoThumbnail 函数
// 1. 创建 video 元素
// 2. 加载视频文件
// 3. 在视频第一帧时截图
// 4. 转换为 base64 格式
// 返回: "data:image/jpeg;base64,..."
```

**注意：** 视频缩略图（base64）**不会自动设置到表单**，需要用户：
1. 在预览区域看到视频缩略图
2. 点击"设为预览图"按钮
3. 才会设置到 `form.thumbnail`

### URL 处理 (`getPreviewUrl`)

```typescript
function getPreviewUrl(url: string) {
  // 1. 如果已经是完整URL (http:// 或 https://)，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 2. 如果是OSS路径 (/assets/...)，构建完整URL
  if (normalizedPath.startsWith('/assets/')) {
    // 使用 OSS 配置构建完整URL
    return `https://${bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
  }
  
  // 3. 其他情况：拼接 CDN base
  return `${cdnBase}${normalizedPath}`;
}
```

## 总结

### 单个上传的预览图逻辑：

1. **图片文件**：
   - `thumbnail = 图片URL`
   - `src = 图片URL`
   - 列表显示：使用 `thumbnail`（与 `src` 相同）

2. **视频文件**：
   - `thumbnail = 空`（除非用户手动设置）
   - `src = 视频URL`
   - 列表显示：使用 `src`（视频URL）
   - 可选：用户可以通过"设为预览图"按钮设置视频缩略图（base64）到 `thumbnail`

3. **资产列表显示优先级**：
   ```
   asset.thumbnail || asset.src
   ```
   优先使用 `thumbnail`，如果没有则使用 `src`

## 与批量上传的对比

**批量上传的差异：**
- 批量上传时，如果只有视频没有图片，会自动将视频URL设置为 `thumbnail`
- 单个上传时，视频的 `thumbnail` 默认为空，需要用户手动设置

**建议统一逻辑：**
- 单个上传时，如果是视频且没有提取到缩略图，也应该将视频URL设置为 `thumbnail`（与批量上传一致）

