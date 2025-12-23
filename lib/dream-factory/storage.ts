/**
 * 梦工厂项目存储工具（IndexedDB）
 * 用于在客户端存储项目数据和视频
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { ProjectState, Scene } from '@/types/dream-factory/types';

interface DreamFactoryDB extends DBSchema {
  projects: {
    key: string;
    value: {
      id: string;
      project: ProjectState;
      timestamp: number;
      mergedVideoUrl?: string; // 合并后的视频URL
    };
  };
  videos: {
    key: string; // videoUrl 作为 key
    value: {
      url: string;
      blob: Blob;
      timestamp: number;
    };
  };
}

let dbInstance: IDBPDatabase<DreamFactoryDB> | null = null;

async function getDB(): Promise<IDBPDatabase<DreamFactoryDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<DreamFactoryDB>('dream-factory', 1, {
    upgrade(db) {
      // 创建项目存储
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }

      // 创建视频存储
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos');
      }
    },
  });

  return dbInstance;
}

/**
 * 保存项目
 */
export async function saveProject(project: ProjectState): Promise<void> {
  const db = await getDB();
  const projectId = `project-${Date.now()}`;
  
  await db.put('projects', {
    id: projectId,
    project,
    timestamp: Date.now(),
  });

  console.log('[存储] 项目已保存:', projectId);
}

/**
 * 获取所有项目
 */
export async function getAllProjects(): Promise<Array<{
  id: string;
  project: ProjectState;
  timestamp: number;
  mergedVideoUrl?: string;
}>> {
  const db = await getDB();
  return db.getAll('projects');
}

/**
 * 根据ID获取项目
 */
export async function getProjectById(id: string): Promise<{
  id: string;
  project: ProjectState;
  timestamp: number;
  mergedVideoUrl?: string;
} | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

/**
 * 保存视频到 IndexedDB
 */
export async function saveVideo(videoUrl: string, blob: Blob): Promise<void> {
  const db = await getDB();
  
  await db.put('videos', {
    url: videoUrl,
    blob,
    timestamp: Date.now(),
  }, videoUrl);

  console.log('[存储] 视频已保存:', videoUrl);
}

/**
 * 从 IndexedDB 获取视频
 */
export async function getVideo(videoUrl: string): Promise<Blob | undefined> {
  const db = await getDB();
  const video = await db.get('videos', videoUrl);
  return video?.blob;
}

/**
 * 检查视频是否已保存
 */
export async function hasVideo(videoUrl: string): Promise<boolean> {
  const db = await getDB();
  const video = await db.get('videos', videoUrl);
  return !!video;
}

/**
 * 保存合并后的视频
 */
export async function saveMergedVideo(projectId: string, videoBlob: Blob): Promise<string> {
  const db = await getDB();
  const videoUrl = URL.createObjectURL(videoBlob);
  
  // 保存视频 Blob
  await saveVideo(videoUrl, videoBlob);
  
  // 更新项目记录
  const project = await db.get('projects', projectId);
  if (project) {
    project.mergedVideoUrl = videoUrl;
    await db.put('projects', project);
  }
  
  return videoUrl;
}









