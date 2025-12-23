# 梦工厂项目管理实现可行性分析

## 问题回答

### 问题 1：Supabase Projects 表结构定义

**答案**：已提供完整的表结构定义（见 `DREAM_FACTORY_IMPLEMENTATION_PLAN.md`）

**关键字段**：
- `id` - UUID 主键
- `user_id` - 用户 ID（关联 profiles 表）
- `title` - 项目标题
- `original_idea` - 原始创意
- `selected_concept` - JSONB 格式的概念数据
- `storyboard` - JSONB 格式的故事板数组（包含所有场景数据）
- `merged_video_url` - 合并后的视频 URL
- 时间戳字段（created_at, updated_at, completed_at）

---

### 问题 2：选择 A（生成后立即上传）是否会让等待时间更长？

**答案**：✅ **是的，会增加 3-5 秒等待时间**

**时间对比**：

| 方案 | 当前流程时间 | 新增时间 | 总时间 |
|------|-------------|---------|--------|
| 当前（只生成） | 2-3秒 | - | 2-3秒 |
| 方案 A（生成+上传） | 2-3秒 | 3-5秒 | 5-8秒 |

**增加的步骤**：
1. 从 AI 平台下载文件：1-2秒
2. 上传到 OSS：2-3秒（取决于文件大小和网络）

**结论**：如果追求快速响应，方案 A 不太理想。

---

### 问题 3：用户提出的新方案（临时URL + 用户选择）

**答案**：✅ **完全可行，且是更优的方案！**

## 方案可行性分析

### 方案描述

1. **生成后**：立即返回 AI 平台的临时 URL，标记为 `temporary`
2. **提供选项**：
   - **保存到 OSS**：服务器端下载并上传到 OSS
   - **下载到本地**：前端直接下载到用户本地
3. **如果上传失败**：提示用户下载到本地

### 可行性评估

#### ✅ 1. 使用平台返回的 URL 直接下载到本地

**可行性**：✅ **完全可行**

**实现方式**：

```typescript
// 前端实现
const handleDownloadToLocal = (url: string, filename?: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `dream-factory-${Date.now()}.jpg`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

**注意事项**：
- ✅ 大部分情况下可以直接下载（浏览器会打开新标签页下载）
- ⚠️ 如果 AI 平台有 CORS 限制，可能需要服务器代理下载

**CORS 问题处理**（如果需要）：

```typescript
// 如果遇到 CORS 问题，使用服务器代理下载
const handleDownloadToLocal = async (url: string, filename?: string) => {
  try {
    // 先尝试直接下载
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `dream-factory-${Date.now()}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    // 如果失败，使用服务器代理
    const response = await fetch(`/api/projects/download-proxy?url=${encodeURIComponent(url)}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `dream-factory-${Date.now()}.jpg`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }
};
```

---

#### ✅ 2. 提示"保存到本地"和"上传到OSS"两种选项

**可行性**：✅ **完全可行**

**UI 设计**：

```
┌─────────────────────────────────────────┐
│  [图片/视频预览]                        │
│                                         │
│  ⚠️ 文件未保存到服务器                   │
│  （临时链接可能失效）                    │
│                                         │
│  [保存到 OSS]  [下载到本地]             │
└─────────────────────────────────────────┘

状态变化：
- temporary: ⚠️ 文件未保存
- uploading: ⏳ 正在上传...
- persisted: ✅ 已保存到服务器
- failed: ❌ 上传失败，建议下载到本地
```

**实现路径**：

1. **状态管理**：在 Scene 中添加 `imageUrlStatus` 和 `videoUrlStatus`
2. **UI 组件**：根据状态显示不同的提示和按钮
3. **API 调用**：点击"保存到 OSS"时调用上传 API

---

#### ✅ 3. 如果上传失败就推荐保存本地

**可行性**：✅ **完全可行**

**实现逻辑**：

```typescript
// 上传到 OSS 失败时的处理
try {
  const result = await uploadToOSS(temporaryUrl);
  updateScene(sceneId, { 
    imageUrl: result.ossUrl,
    imageUrlStatus: 'persisted'
  });
} catch (error) {
  // 上传失败，标记状态并提示用户
  updateScene(sceneId, { 
    imageUrlStatus: 'failed'
  });
  
  // UI 显示：
  // "❌ 上传失败，建议下载到本地保存"
  // [重试上传] [下载到本地]
}
```

---

## 实现路径总览

### 路径 1：新增 API 接口 - 上传媒体到 OSS

**文件**：`app/api/projects/upload-media/route.ts`

**功能**：
- 接收临时 URL 和文件类型
- 从临时 URL 下载文件
- 上传到 OSS
- 返回 OSS URL

**请求格式**：
```json
{
  "type": "image" | "video",
  "temporaryUrl": "https://ai-platform.com/temp-file.jpg",
  "sceneId": 1,  // 用于更新 storyboard
  "projectId": "uuid"  // 可选，如果项目已保存
}
```

**响应格式**：
```json
{
  "success": true,
  "ossUrl": "https://oss.example.com/dream-factory/images/xxx.jpg"
}
```

---

### 路径 2：前端状态管理

**文件**：`app/dream-factory/page.tsx`

**需要添加**：

1. **状态字段**（在 Scene 接口中）：
```typescript
imageUrlStatus?: 'temporary' | 'persisted' | 'uploading' | 'failed';
videoUrlStatus?: 'temporary' | 'persisted' | 'uploading' | 'failed';
```

2. **处理函数**：
```typescript
// 上传到 OSS
const handleUploadToOSS = async (sceneId: number, type: 'image' | 'video', url: string) => {
  // 标记为上传中
  updateScene(sceneId, { 
    [`${type}UrlStatus`]: 'uploading' 
  });
  
  try {
    const response = await fetch('/api/projects/upload-media', {
      method: 'POST',
      body: JSON.stringify({
        type,
        temporaryUrl: url,
        sceneId,
      }),
    });
    
    const result = await response.json();
    
    // 更新 URL 和状态
    updateScene(sceneId, {
      [`${type}Url`]: result.ossUrl,
      [`${type}UrlStatus`]: 'persisted',
    });
  } catch (error) {
    // 标记为失败
    updateScene(sceneId, {
      [`${type}UrlStatus`]: 'failed',
    });
  }
};

// 下载到本地
const handleDownloadToLocal = (url: string, filename?: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `dream-factory-${Date.now()}.${url.split('.').pop()}`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

3. **UI 组件**：根据状态显示不同的提示和按钮

---

### 路径 3：项目保存到 Supabase

**文件**：`app/api/projects/route.ts`

**实现**：
- 使用 Supabase Admin Client
- 保存项目数据到 `projects` 表
- storyboard 中只保存已持久化（persisted）的 URL，临时 URL 可以保留但标记状态

---

## 技术细节

### 1. 服务器端下载文件（可行性：✅）

**实现**：

```typescript
async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    // 某些 AI 平台可能需要认证
    headers: {
      // 'Authorization': `Bearer ${apiKey}`,  // 如果需要
    },
  });
  
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

**潜在问题**：
- ⚠️ 某些 AI 平台可能有防盗链（需要测试）
- ⚠️ 某些平台可能需要认证（添加 Authorization 头）
- ⚠️ 大文件下载可能需要流式处理（避免内存溢出）

**解决方案**：
- 测试 AI 平台的 URL 访问性
- 根据平台文档添加必要的请求头
- 对于大文件，使用流式下载（Node.js stream）

---

### 2. 上传到 OSS（可行性：✅）

**已有实现**：`app/api/upload/route.ts` 已有完整实现，可以直接复用

**实现**：

```typescript
import { getOSSClient } from '@/lib/oss-client';

async function uploadToOSS(
  buffer: Buffer,
  contentType: string,
  filename: string
): Promise<string> {
  const client = getOSSClient();
  const ossPath = `dream-factory/${contentType.startsWith('image/') ? 'images' : 'videos'}/${Date.now()}-${randomBytes(8).toString('hex')}.${filename.split('.').pop()}`;
  
  await client.multipartUpload(ossPath, buffer, {
    parallel: 4,
    partSize: 10 * 1024 * 1024, // 10MB 分片
    contentType,
  });
  
  // 返回 OSS URL（处理 CDN）
  const bucket = process.env.OSS_BUCKET!;
  const region = process.env.OSS_REGION!.replace('oss-', '');
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE;
  
  if (cdnBase && cdnBase !== '/' && cdnBase.trim() !== '') {
    return `${cdnBase.replace(/\/+$/, '')}/${ossPath}`;
  }
  
  return `https://${bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
}
```

---

### 3. 前端下载到本地（可行性：✅）

**实现**：

```typescript
const handleDownloadToLocal = (url: string, filename?: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `dream-factory-${Date.now()}.${url.split('.').pop()?.split('?')[0]}`;
  link.target = '_blank';  // 新标签页打开，触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

**CORS 问题处理**（如果需要）：

如果 AI 平台的 URL 有 CORS 限制，需要创建代理 API：

```typescript
// app/api/projects/download-proxy/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ message: '缺少 url 参数' }, { status: 400 });
  }
  
  const response = await fetch(url);
  const blob = await response.blob();
  
  return new NextResponse(blob, {
    headers: {
      'Content-Type': blob.type,
      'Content-Disposition': `attachment; filename="${url.split('/').pop()}"`,
    },
  });
}
```

---

## 完整实现路径

### 步骤 1：更新 Supabase 类型定义

- ✅ 在 `lib/supabase/types.ts` 中添加 `projects` 表类型
- ✅ 确保与数据库表结构匹配

### 步骤 2：创建上传媒体 API

- ✅ 创建 `app/api/projects/upload-media/route.ts`
- ✅ 实现下载和上传逻辑
- ✅ 处理错误情况

### 步骤 3：更新项目保存 API

- ✅ 更新 `app/api/projects/route.ts`（POST - 创建）
- ✅ 更新 `app/api/projects/[id]/route.ts`（GET, PUT, DELETE）
- ✅ 使用 Supabase 保存和读取

### 步骤 4：前端状态管理

- ✅ 在 Scene 类型中添加状态字段
- ✅ 在生成图片/视频时设置状态为 `temporary`
- ✅ 保存项目时包含状态信息

### 步骤 5：前端 UI 更新

- ✅ 根据状态显示不同的提示和按钮
- ✅ 实现"保存到 OSS"功能
- ✅ 实现"下载到本地"功能
- ✅ 处理上传失败的情况

---

## 方案优势总结

### ✅ 用户体验优势

1. **快速响应**：生成后立即显示，不等待上传（节省 3-5 秒）
2. **灵活选择**：用户可以选择保存方式（OSS 或本地）
3. **明确提示**：清楚知道哪些文件已保存，哪些是临时的
4. **容错性强**：上传失败可以下载到本地

### ✅ 技术优势

1. **节省资源**：如果用户不满意，可以重新生成，不会浪费 OSS 存储
2. **减少服务器负载**：不需要立即处理所有文件
3. **提高成功率**：用户可以重试上传，而不是一次性失败就丢失

---

## 需要确认的问题

### 1. Supabase 表结构

是否按照提供的 SQL 创建表？如果需要调整字段，请说明。

### 2. OSS 文件路径规则

建议路径：
- 图片：`dream-factory/images/{projectId}/{timestamp}-{random}.jpg`
- 视频：`dream-factory/videos/{projectId}/{timestamp}-{random}.mp4`

或者使用其他规则？

### 3. 下载到本地的 CORS 处理

是否需要先测试 AI 平台的 URL 是否可以直接下载？
如果遇到 CORS 问题，是否需要创建代理 API？

### 4. 批量上传功能

是否需要支持"一键保存所有未保存的文件到 OSS"的功能？

---

## 结论

**✅ 实现可行性：完全可行**

所有提出的功能都可以实现：
1. ✅ 使用平台 URL 直接下载到本地（可能需要 CORS 代理）
2. ✅ 提供"保存到 OSS"和"下载到本地"两个选项
3. ✅ 上传失败时推荐下载到本地

**推荐实现顺序**：
1. 先实现基础功能（上传到 OSS API + 项目保存 API）
2. 再实现前端 UI（状态显示和按钮）
3. 最后优化（批量上传、重试机制等）

确认后即可开始实现！

