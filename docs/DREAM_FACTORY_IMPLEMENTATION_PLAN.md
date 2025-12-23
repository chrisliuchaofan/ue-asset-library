# 梦工厂项目管理功能实现方案

## 一、Supabase Projects 表结构设计

### 表结构定义

```sql
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  original_idea TEXT NOT NULL,
  selected_concept JSONB,
  storyboard JSONB NOT NULL,
  merged_video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- 索引
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 启用 Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的项目
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid()::text = user_id);
```

### Storyboard JSONB 结构示例

```json
{
  "storyboard": [
    {
      "id": 1,
      "description": "场景描述",
      "visualPrompt": "画面提示词",
      "voiceoverScript": "旁白脚本",
      "imageUrl": "https://oss.example.com/images/xxx.jpg",  // OSS URL 或临时 URL
      "videoUrl": "https://oss.example.com/videos/xxx.mp4",  // OSS URL 或临时 URL
      "audioUrl": "https://oss.example.com/audios/xxx.mp3",
      "referenceAssetId": "asset-id",
      "referenceAssetUrl": "https://...",
      "imageUrlStatus": "persisted",  // "temporary" | "persisted" | "uploading" | "failed"
      "videoUrlStatus": "persisted",  // "temporary" | "persisted" | "uploading" | "failed"
      "isGeneratingImage": false,
      "isGeneratingVideo": false,
      "isGeneratingAudio": false
    }
  ]
}
```

### TypeScript 类型定义

需要在 `lib/supabase/types.ts` 中添加：

```typescript
projects: {
  Row: {
    id: string;
    user_id: string;
    title: string;
    original_idea: string;
    selected_concept: Json | null;
    storyboard: Json;  // 包含 Scene[] 数据
    merged_video_url: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    title: string;
    original_idea: string;
    selected_concept?: Json | null;
    storyboard: Json;
    merged_video_url?: string | null;
    created_at?: string;
    updated_at?: string;
    completed_at?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    title?: string;
    original_idea?: string;
    selected_concept?: Json | null;
    storyboard?: Json;
    merged_video_url?: string | null;
    created_at?: string;
    updated_at?: string;
    completed_at?: string | null;
  };
}
```

---

## 二、上传方案分析

### 问题 2：选择 A（生成后立即上传）的等待时间

**分析**：

- **当前流程**：生成 → 返回 URL → 前端显示（~2-3秒）
- **方案 A 流程**：生成 → 下载 → 上传 OSS → 返回 OSS URL → 前端显示（~5-8秒）
- **额外时间**：约 3-5 秒（取决于文件大小和网络速度）

**结论**：确实会增加等待时间，但这是为了确保持久化的必要代价。

---

### 问题 3：用户提出的新方案

#### 方案描述

1. **生成后**：保存 AI 平台返回的临时 URL，标记状态为 `temporary`
2. **提供两个选项**：
   - 选项 1：保存到本地（下载到用户本地）
   - 选项 2：上传到 OSS（服务器端下载并上传）
3. **如果上传失败**：提示用户保存到本地

#### 可行性分析

**✅ 完全可行，且是更好的方案！**

---

## 三、实现方案详细设计

### 方案架构

#### 阶段 1：生成阶段（快速响应）

```
用户点击"生成图片"
  ↓
调用 /api/ai/generate-image
  ↓
AI 平台生成图片
  ↓
返回临时 URL（立即返回，不等待）
  ↓
前端显示图片（使用临时 URL）
  ↓
标记 imageUrlStatus = "temporary"
```

**优点**：
- ✅ 响应速度快（只等待 AI 生成，不等待上传）
- ✅ 用户可以立即看到结果
- ✅ 如果用户不满意，可以重新生成，避免不必要的上传

#### 阶段 2：持久化阶段（用户选择）

**UI 设计**：

在图片/视频下方显示操作按钮：

```
[生成的图片/视频显示区域]
┌─────────────────────────────────┐
│  [图片/视频预览]                │
│                                 │
│  ⚠️ 文件未保存到服务器           │
│  [保存到 OSS]  [下载到本地]     │
└─────────────────────────────────┘
```

**选项 1：保存到 OSS（推荐）**

```
用户点击"保存到 OSS"
  ↓
调用 /api/projects/upload-media
  ↓
服务器端：
  1. 从临时 URL 下载文件
  2. 上传到 OSS
  3. 返回 OSS URL
  ↓
更新 storyboard[].imageUrl = OSS URL
更新 imageUrlStatus = "persisted"
  ↓
显示成功提示："已保存到服务器"
```

**选项 2：下载到本地**

```
用户点击"下载到本地"
  ↓
前端直接下载（使用临时 URL）
  ↓
浏览器下载文件到用户本地
```

**如果上传失败**：

```
上传到 OSS 失败
  ↓
显示错误提示：
  "上传失败，建议下载到本地保存"
  [重试] [下载到本地]
```

---

### 数据流设计

#### 场景数据结构（扩展）

```typescript
interface Scene {
  id: number;
  description: string;
  visualPrompt: string;
  voiceoverScript: string;
  
  // URL 字段（可能是临时 URL 或 OSS URL）
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  
  // 状态字段（新增）
  imageUrlStatus?: 'temporary' | 'persisted' | 'uploading' | 'failed';
  videoUrlStatus?: 'temporary' | 'persisted' | 'uploading' | 'failed';
  
  // 其他字段
  referenceAssetId?: string;
  referenceAssetUrl?: string;
  videoOperationId?: string;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  isGeneratingAudio: boolean;
}
```

---

## 四、实现路径

### 路径 1：新增 API 接口

**`POST /api/projects/upload-media`**

```typescript
// 请求体
{
  "type": "image" | "video",
  "temporaryUrl": "https://ai-platform.com/temp-file.jpg",
  "sceneId": 1,  // 场景 ID（用于更新 storyboard）
  "projectId": "project-uuid",  // 项目 ID（可选，如果项目已保存）
}

// 响应
{
  "success": true,
  "ossUrl": "https://oss.example.com/dream-factory/images/xxx.jpg",
  "message": "已保存到 OSS"
}
```

**实现步骤**：
1. 从 `temporaryUrl` 下载文件
2. 上传到 OSS（路径：`dream-factory/images/` 或 `dream-factory/videos/`）
3. 如果提供了 `projectId`，更新项目中的 URL
4. 返回 OSS URL

### 路径 2：修改生成 API

**保持现有流程不变**，只返回临时 URL，不自动上传。

### 路径 3：前端 UI 组件

**在图片/视频预览区域添加操作按钮**：

```typescript
// 在 app/dream-factory/page.tsx 中

{scene.imageUrl && (
  <div className="relative">
    <img src={scene.imageUrl} />
    
    {/* 状态提示和操作按钮 */}
    {scene.imageUrlStatus === 'temporary' && (
      <div className="absolute bottom-2 left-2 right-2 bg-yellow-900/90 p-2 rounded">
        <p className="text-xs text-yellow-200 mb-2">
          ⚠️ 文件未保存到服务器（临时链接可能失效）
        </p>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleUploadToOSS(scene.id, 'image', scene.imageUrl!)}
            disabled={scene.imageUrlStatus === 'uploading'}
          >
            {scene.imageUrlStatus === 'uploading' ? '上传中...' : '保存到 OSS'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleDownloadToLocal(scene.imageUrl!)}
          >
            下载到本地
          </Button>
        </div>
      </div>
    )}
    
    {scene.imageUrlStatus === 'persisted' && (
      <div className="absolute bottom-2 left-2 right-2 bg-green-900/90 p-2 rounded">
        <p className="text-xs text-green-200">
          ✅ 已保存到服务器
        </p>
      </div>
    )}
    
    {scene.imageUrlStatus === 'failed' && (
      <div className="absolute bottom-2 left-2 right-2 bg-red-900/90 p-2 rounded">
        <p className="text-xs text-red-200 mb-2">
          ❌ 上传失败，建议下载到本地保存
        </p>
        <div className="flex gap-2">
          <Button onClick={() => handleUploadToOSS(scene.id, 'image', scene.imageUrl!)}>
            重试上传
          </Button>
          <Button variant="outline" onClick={() => handleDownloadToLocal(scene.imageUrl!)}>
            下载到本地
          </Button>
        </div>
      </div>
    )}
  </div>
)}
```

---

## 五、技术实现细节

### 1. 服务器端下载文件

**可行性**：✅ 完全可行

```typescript
// app/api/projects/upload-media/route.ts

async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      // 某些 AI 平台可能需要认证头
      // 'Authorization': `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

**注意事项**：
- 某些 AI 平台可能有防盗链，需要检查 URL 的访问性
- 某些平台可能需要认证（在 fetch 中添加 Authorization 头）
- 需要处理大文件下载（使用流式下载，避免内存溢出）

### 2. 上传到 OSS

**可行性**：✅ 已有实现，可以直接复用

```typescript
import { getOSSClient } from '@/lib/oss-client';

async function uploadToOSS(
  buffer: Buffer, 
  contentType: string, 
  filename: string
): Promise<string> {
  const client = getOSSClient();
  const ossPath = `dream-factory/${contentType === 'image/jpeg' ? 'images' : 'videos'}/${filename}`;
  
  await client.multipartUpload(ossPath, buffer, {
    parallel: 4,
    partSize: 10 * 1024 * 1024, // 10MB 分片
    contentType,
  });
  
  // 返回 OSS URL
  const bucket = process.env.OSS_BUCKET!;
  const region = process.env.OSS_REGION!.replace('oss-', '');
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE;
  
  if (cdnBase && cdnBase !== '/' && cdnBase.trim() !== '') {
    return `${cdnBase.replace(/\/+$/, '')}/${ossPath}`;
  }
  
  return `https://${bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
}
```

### 3. 前端下载到本地

**可行性**：✅ 完全可行

```typescript
// app/dream-factory/page.tsx

const handleDownloadToLocal = (url: string, filename?: string) => {
  // 创建临时链接并触发下载
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `dream-factory-${Date.now()}.${url.split('.').pop()}`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

**注意事项**：
- 某些浏览器可能因为 CORS 限制无法直接下载
- 如果遇到 CORS 问题，可以通过服务器代理下载

---

## 六、完整实现路径

### 步骤 1：更新 Supabase 类型定义

- 在 `lib/supabase/types.ts` 中添加 `projects` 表类型定义

### 步骤 2：创建上传 API

- 创建 `app/api/projects/upload-media/route.ts`
- 实现下载和上传逻辑

### 步骤 3：实现项目保存 API

- 更新 `app/api/projects/route.ts`，实现 Supabase 保存
- 更新 `app/api/projects/[id]/route.ts`，实现更新和删除

### 步骤 4：前端 UI 更新

- 在 `app/dream-factory/page.tsx` 中添加状态管理
- 添加"保存到 OSS"和"下载到本地"按钮
- 实现上传和下载处理函数

### 步骤 5：状态管理

- 在 Scene 中添加 `imageUrlStatus` 和 `videoUrlStatus`
- 保存项目时包含这些状态
- 加载项目时恢复状态

---

## 七、优势总结

### 这个方案的优势

1. ✅ **用户体验好**：生成后立即显示，不等待上传
2. ✅ **灵活性高**：用户可以选择保存方式（OSS 或本地）
3. ✅ **容错性强**：上传失败可以下载到本地
4. ✅ **节省资源**：如果用户不满意，可以重新生成，不会浪费 OSS 存储
5. ✅ **明确的状态提示**：用户清楚知道哪些文件已保存，哪些是临时的

---

## 八、需要确认的问题

请确认：

1. ✅ **Supabase 表结构**：是否按照上面的 SQL 创建表？（如果需要调整字段，请说明）
2. ✅ **文件路径规则**：
   - 图片路径：`dream-factory/images/{projectId}/{timestamp}-{random}.jpg`
   - 视频路径：`dream-factory/videos/{projectId}/{timestamp}-{random}.mp4`
   - 还是其他规则？
3. ✅ **下载到本地**：如果遇到 CORS 问题，是否需要服务器代理下载？
4. ✅ **批量上传**：是否需要支持"一键保存所有未保存的文件到 OSS"？

确认后即可开始实现。

