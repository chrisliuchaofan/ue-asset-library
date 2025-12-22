/**
 * 项目导出工具
 * 导出项目为 ZIP 文件，包含项目数据和视频
 */

import JSZip from 'jszip';
import type { ProjectState } from '@/types/dream-factory/types';
import { getVideo, hasVideo } from './storage';

/**
 * 导出项目为 ZIP 文件
 */
export async function exportProjectAsZip(
  project: ProjectState,
  mergedVideoBlob?: Blob
): Promise<Blob> {
  console.log('[导出] 开始导出项目...');
  
  const zip = new JSZip();
  
  // 1. 添加项目元数据 JSON
  const projectData = {
    originalIdea: project.originalIdea,
    selectedConcept: project.selectedConcept,
    storyboard: project.storyboard.map(scene => ({
      id: scene.id,
      description: scene.description,
      visualPrompt: scene.visualPrompt,
      voiceoverScript: scene.voiceoverScript,
      // 不包含 URL，因为视频会单独保存
    })),
    exportDate: new Date().toISOString(),
  };
  
  zip.file('project.json', JSON.stringify(projectData, null, 2));
  
  // 2. 添加项目说明文件
  const readme = `# 梦工厂项目导出

项目名称: ${project.selectedConcept?.title || '未命名项目'}
创建时间: ${new Date().toISOString()}

## 项目描述
${project.originalIdea}

## 场景列表
${project.storyboard.map((scene, idx) => `${idx + 1}. ${scene.description}`).join('\n')}

## 文件说明
- project.json: 项目元数据
- videos/: 各场景的视频片段
- merged-video.webm: 合并后的完整视频（如果已生成）
`;
  
  zip.file('README.md', readme);
  
  // 3. 添加所有视频片段
  const videosFolder = zip.folder('videos');
  if (videosFolder) {
    for (const scene of project.storyboard) {
      if (scene.videoUrl) {
        try {
          // 尝试从 IndexedDB 获取
          let videoBlob: Blob | undefined;
          
          if (await hasVideo(scene.videoUrl)) {
            videoBlob = await getVideo(scene.videoUrl);
          } else {
            // 如果 IndexedDB 中没有，尝试下载
            const response = await fetch(
              scene.videoUrl.startsWith('/api/video-proxy') 
                ? scene.videoUrl 
                : `/api/video-proxy?url=${encodeURIComponent(scene.videoUrl)}`
            );
            if (response.ok) {
              videoBlob = await response.blob();
            }
          }
          
          if (videoBlob) {
            videosFolder.file(`scene-${scene.id}.mp4`, videoBlob);
            console.log('[导出] 已添加场景视频:', scene.id);
          } else {
            console.warn('[导出] 无法获取场景视频:', scene.id);
          }
        } catch (error) {
          console.error('[导出] 获取视频失败:', scene.id, error);
        }
      }
    }
  }
  
  // 4. 如果有合并后的视频，也添加进去
  if (mergedVideoBlob) {
    zip.file('merged-video.webm', mergedVideoBlob);
    console.log('[导出] 已添加合并视频');
  }
  
  // 5. 生成 ZIP 文件
  console.log('[导出] 正在生成 ZIP 文件...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  
  console.log('[导出] 导出完成，ZIP 大小:', (zipBlob.size / 1024 / 1024).toFixed(2), 'MB');
  return zipBlob;
}

/**
 * 下载 Blob 文件
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}








