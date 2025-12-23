# 梦工厂项目管理功能实现逻辑分析

## 概述

本文档分析当前梦工厂（Dream Factory）项目管理功能的实现逻辑，明确数据流和需要改进的地方。

---

## 一、当前实现逻辑

### 1. 项目数据结构

项目数据存储在 `ProjectState` 中，包含：

```typescript
interface ProjectState {
  originalIdea: string;              // 原始创意/想法
  selectedConcept: Concept | null;   // 选中的概念
  storyboard: Scene[];               // 故事板（场景列表）
}

interface Scene {
  id: number;
  description: string;               // 场景描述
  visualPrompt: string;              // 画面提示词
  voiceoverScript: string;           // 旁白脚本
  imageUrl?: string;                 // ⚠️ 图片 URL（可能来自 AI 平台，有时效性）
  videoUrl?: string;                 // ⚠️ 视频 URL（可能来自 AI 平台，有时效性）
  audioUrl?: string;
  referenceAssetId?: string;
  referenceAssetUrl?: string;
  videoOperationId?: string;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  isGeneratingAudio: boolean;
}
```

### 2. 项目保存流程

**当前实现**：

1. **客户端保存**（`lib/dream-factory/project-storage.ts`）：
   - 调用 `saveProject(project: ProjectState, title?: string)`
   - **优先尝试服务器端保存**（调用 `/api/projects` POST）
   - **如果服务器失败，回退到 localStorage**

2. **服务器端保存**（`app/api/projects/route.ts`）：
   - ⚠️ **当前状态**：已标记为待迁移，返回 501 错误
   - **原本设计**：应该调用 ECS 后端 `/projects` API
   - **数据包含**：
     ```json
     {
       "title": "项目标题",
       "originalIdea": "原始创意",
       "selectedConcept": { ... },
       "storyboard": [
         {
           "imageUrl": "https://ai-platform.com/temp-image.jpg",  // ⚠️ 临时 URL
           "videoUrl": "https://ai-platform.com/temp-video.mp4"  // ⚠️ 临时 URL
         }
       ]
     }
     ```

3. **实际效果**：
   - 由于 `/api/projects` 返回 501，**所有项目数据实际保存在 localStorage 中**
   - storyboard 中的 `imageUrl` 和 `videoUrl` 是 AI 平台返回的临时 URL

---

### 3. 图片/视频生成流程

#### 3.1 图片生成

**流程**：

1. **调用 API**（`app/dream-factory/page.tsx`）：
   ```typescript
   const response = await fetch('/api/ai/generate-image', {
     method: 'POST',
     body: JSON.stringify({
       prompt: scene.visualPrompt,
       // ... 其他参数
     }),
   });
   ```

2. **API 处理**（`app/api/ai/generate-image/route.ts`）：
   - 扣除积分（使用 Supabase）
   - 调用 `aiService.generateImage()` 生成图片
   - **直接返回 AI 平台返回的 URL**（`data.imageUrl`）
   - ⚠️ **没有上传到 OSS**

3. **存储到状态**：
   ```typescript
   updateScene(sceneIndex, { 
     imageUrl: data.imageUrl,  // AI 平台的临时 URL
   });
   ```

#### 3.2 视频生成

**流程**：

1. **调用 API**（`app/dream-factory/page.tsx`）：
   ```typescript
   const response = await fetch('/api/generate', {
     method: 'POST',
     body: JSON.stringify({
       type: 'video',
       imageUrl: scene.imageUrl,  // 使用已生成的图片 URL
       prompt: scene.description || scene.visualPrompt,
       // ... 其他参数
     }),
   });
   ```

2. **API 处理**（`app/api/generate/route.ts`）：
   - 扣除积分（使用 Supabase）
   - 调用 AI API 生成视频
   - **返回占位 URL**（当前是 `picsum.photos`，TODO 标记）
   - ⚠️ **没有上传到 OSS**

3. **存储到状态**：
   ```typescript
   updateScene(sceneIndex, { 
     videoUrl: data.videoUrl,  // AI 平台的临时 URL
   });
   ```

---

### 4. OSS 上传能力

**现有接口**：

1. **`POST /api/upload`**：
   - 支持上传文件到 OSS（如果 `STORAGE_MODE=oss`）
   - 返回 OSS URL
   - 适用于用户手动上传的文件

2. **`POST /api/upload/batch`**：
   - 批量上传文件到 OSS
   - 支持重复检测

**当前问题**：

- ⚠️ **图片/视频生成后，没有自动上传到 OSS**
- storyboard 中存储的是 AI 平台的临时 URL
- 这些 URL **有时效性**，可能在一段时间后失效

---

## 二、问题总结

### 问题 1：项目数据未保存到 Supabase

- **当前状态**：项目数据保存在 localStorage
- **原因**：`/api/projects` API 返回 501（待迁移）
- **影响**：数据只存在本地，无法跨设备访问

### 问题 2：图片/视频 URL 有时效性

- **当前状态**：storyboard 中存储 AI 平台返回的临时 URL
- **问题**：这些 URL 可能在一段时间后失效
- **影响**：已保存的项目可能无法正常显示图片/视频

### 问题 3：没有自动上传到 OSS

- **当前状态**：图片/视频生成后直接使用 AI 平台的 URL
- **缺失**：没有将生成的图片/视频下载并上传到 OSS 的流程
- **影响**：无法保证内容的持久性

---

## 三、需要的实现方案

### 方案概述

1. **文本信息保存到 Supabase**：
   - 项目基本信息（title, originalIdea, selectedConcept）
   - storyboard 的结构信息（description, visualPrompt, voiceoverScript 等）
   - **不包含** imageUrl 和 videoUrl（因为这些需要是 OSS URL）

2. **图片/视频上传到 OSS**：
   - 图片生成后，**立即下载并上传到 OSS**
   - 视频生成后，**立即下载并上传到 OSS**
   - 在 storyboard 中存储 **OSS URL**，而不是 AI 平台的临时 URL

### 数据流程

```
用户操作
  ↓
1. 生成图片
  ↓
  调用 /api/ai/generate-image
  ↓
  AI 平台返回临时 URL
  ↓
  ⚠️ 需要：下载图片 → 上传到 OSS → 返回 OSS URL
  ↓
  存储 OSS URL 到 storyboard[].imageUrl
  ↓
2. 生成视频
  ↓
  调用 /api/generate (type: 'video')
  ↓
  AI 平台返回临时 URL
  ↓
  ⚠️ 需要：下载视频 → 上传到 OSS → 返回 OSS URL
  ↓
  存储 OSS URL 到 storyboard[].videoUrl
  ↓
3. 保存项目
  ↓
  调用 /api/projects (POST)
  ↓
  保存到 Supabase projects 表
  ↓
  数据包含：文本信息 + OSS URL（持久化）
```

---

## 四、需要确认的问题

### 1. Supabase projects 表结构

请确认 Supabase 中的 `projects` 表是否已创建？如果已创建，表结构是什么？

**预期结构**：
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  original_idea TEXT NOT NULL,
  selected_concept JSONB,
  storyboard JSONB NOT NULL,  -- 包含所有场景信息，包括 OSS URL
  merged_video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);
```

### 2. OSS 上传时机

**选项 A**：生成后立即上传（推荐）
- 优点：确保内容持久化，不会丢失
- 缺点：需要等待上传完成，用户体验稍慢

**选项 B**：保存项目时批量上传
- 优点：不影响生成流程的响应速度
- 缺点：如果用户不保存项目，内容会丢失

**推荐**：选项 A（生成后立即上传）

### 3. 上传失败处理

如果上传到 OSS 失败，如何处理？
- 选项 A：返回错误，不保存 URL
- 选项 B：保存 AI 平台的临时 URL，标记为待上传
- 选项 C：重试机制

---

## 五、待实现的改动

### 1. 图片生成后上传 OSS

**位置**：`app/api/ai/generate-image/route.ts`

**改动**：
```typescript
// 生成图片后
const result = await aiService.generateImage(imageRequest, provider);

// ⚠️ 需要添加：下载图片并上传到 OSS
if (result.imageUrl && !result.imageUrl.includes('oss-') && !result.imageUrl.includes('aliyuncs.com')) {
  // 1. 从 AI 平台下载图片
  const imageResponse = await fetch(result.imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  
  // 2. 上传到 OSS
  const ossUrl = await uploadToOSS(Buffer.from(imageBuffer), 'image/jpeg', `dream-factory/images/${generationId}.jpg`);
  
  // 3. 返回 OSS URL
  return NextResponse.json({ imageUrl: ossUrl });
}
```

### 2. 视频生成后上传 OSS

**位置**：`app/api/generate/route.ts` 或 `app/api/ai/generate-job/route.ts`

**改动**：类似图片上传逻辑

### 3. 项目保存到 Supabase

**位置**：`app/api/projects/route.ts`

**改动**：
- 移除对 ECS 后端的调用
- 使用 Supabase Admin Client 保存到 `projects` 表
- 确保 storyboard 中的 URL 都是 OSS URL

---

## 六、当前代码位置

### 项目存储相关文件

- `lib/dream-factory/project-storage.ts` - 客户端存储逻辑（优先服务器，失败回退 localStorage）
- `lib/dream-factory/project-storage-server.ts` - 服务器端存储逻辑（调用 `/api/projects`）
- `app/api/projects/route.ts` - 项目 API（当前返回 501）
- `app/api/projects/[id]/route.ts` - 单个项目 API（当前返回 501）

### 图片/视频生成相关文件

- `app/api/ai/generate-image/route.ts` - 图片生成 API（已迁移到 Supabase 积分，但未上传 OSS）
- `app/api/ai/generate-job/route.ts` - 视频生成 API（已迁移到 Supabase 积分，但未上传 OSS）
- `app/api/generate/route.ts` - 通用生成 API（旧接口，可能被废弃）

### OSS 上传相关文件

- `app/api/upload/route.ts` - 单文件上传到 OSS
- `app/api/upload/batch/route.ts` - 批量上传到 OSS
- `lib/oss-client.ts` - OSS 客户端封装

---

## 七、总结

### 当前状态

1. ✅ 积分系统已迁移到 Supabase
2. ✅ AI 功能已移除 ECS 后端依赖
3. ⚠️ 项目数据保存在 localStorage（因为 API 返回 501）
4. ❌ 图片/视频未上传到 OSS（存储的是临时 URL）
5. ❌ 项目保存 API 待迁移到 Supabase

### 需要实现

1. **图片生成后上传 OSS**：修改 `app/api/ai/generate-image/route.ts`
2. **视频生成后上传 OSS**：修改 `app/api/ai/generate-job/route.ts` 或相关接口
3. **项目保存到 Supabase**：实现 `app/api/projects/route.ts` 的 Supabase 版本
4. **确认 Supabase projects 表结构**：需要确认表结构后才能实现

---

## 等待确认

请确认：

1. ✅ Supabase `projects` 表是否已创建？表结构是什么？
2. ✅ OSS 上传时机：生成后立即上传，还是保存项目时批量上传？
3. ✅ 上传失败处理策略：返回错误、标记待上传，还是重试？

确认后即可开始实现。

