/**
 * Dream Factory 项目存储工具（服务器端）
 * 使用后端 API 保存和加载项目
 */

import type { ProjectState, Concept } from '@/types/dream-factory/types';

export interface SavedProject {
  id: string;
  title: string;
  originalIdea: string;
  selectedConcept: Concept | null;
  storyboard: ProjectState['storyboard'];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  mergedVideoUrl?: string;
}

/**
 * 获取所有保存的项目
 */
export async function getAllSavedProjects(): Promise<SavedProject[]> {
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) {
      throw new Error(`获取项目列表失败: ${response.statusText}`);
    }
    
    const projects = await response.json();
    
    // 转换为 SavedProject 格式
    return projects.map((p: any) => ({
      id: p.id,
      title: p.title,
      originalIdea: p.originalIdea,
      selectedConcept: p.selectedConcept,
      storyboard: p.storyboard,
      createdAt: new Date(p.createdAt).getTime(),
      updatedAt: new Date(p.updatedAt).getTime(),
      completedAt: p.completedAt ? new Date(p.completedAt).getTime() : undefined,
      mergedVideoUrl: p.mergedVideoUrl,
    })).sort((a: SavedProject, b: SavedProject) => 
      (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
    );
  } catch (error) {
    console.error('[ProjectStorage] 读取项目列表失败:', error);
    return [];
  }
}

/**
 * 保存项目
 */
export async function saveProject(project: ProjectState, title?: string): Promise<string> {
  try {
    const projectTitle = title || project.originalIdea.substring(0, 50) || '未命名项目';
    
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: projectTitle,
        originalIdea: project.originalIdea,
        selectedConcept: project.selectedConcept,
        storyboard: project.storyboard,
      }),
    });

    if (!response.ok) {
      throw new Error(`保存项目失败: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[ProjectStorage] 项目已保存:', result.id);
    return result.id;
  } catch (error) {
    console.error('[ProjectStorage] 保存项目失败:', error);
    throw error;
  }
}

/**
 * 更新项目
 */
export async function updateProject(projectId: string, updates: Partial<SavedProject>): Promise<void> {
  try {
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.originalIdea !== undefined) updateData.originalIdea = updates.originalIdea;
    if (updates.selectedConcept !== undefined) updateData.selectedConcept = updates.selectedConcept;
    if (updates.storyboard !== undefined) updateData.storyboard = updates.storyboard;
    if (updates.mergedVideoUrl !== undefined) updateData.mergedVideoUrl = updates.mergedVideoUrl;
    if (updates.completedAt !== undefined) {
      updateData.completedAt = updates.completedAt ? new Date(updates.completedAt) : null;
    }

    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`更新项目失败: ${response.statusText}`);
    }

    console.log('[ProjectStorage] 项目已更新:', projectId);
  } catch (error) {
    console.error('[ProjectStorage] 更新项目失败:', error);
    throw error;
  }
}

/**
 * 获取单个项目
 */
export async function getProject(projectId: string): Promise<SavedProject | null> {
  try {
    const response = await fetch(`/api/projects/${projectId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`获取项目失败: ${response.statusText}`);
    }

    const p = await response.json();
    
    return {
      id: p.id,
      title: p.title,
      originalIdea: p.originalIdea,
      selectedConcept: p.selectedConcept,
      storyboard: p.storyboard,
      createdAt: new Date(p.createdAt).getTime(),
      updatedAt: new Date(p.updatedAt).getTime(),
      completedAt: p.completedAt ? new Date(p.completedAt).getTime() : undefined,
      mergedVideoUrl: p.mergedVideoUrl,
    };
  } catch (error) {
    console.error('[ProjectStorage] 读取项目失败:', error);
    return null;
  }
}

/**
 * 删除项目
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`删除项目失败: ${response.statusText}`);
    }

    console.log('[ProjectStorage] 项目已删除:', projectId);
  } catch (error) {
    console.error('[ProjectStorage] 删除项目失败:', error);
    throw error;
  }
}

/**
 * 将保存的项目转换为 ProjectState
 */
export function savedProjectToProjectState(saved: SavedProject): ProjectState {
  return {
    originalIdea: saved.originalIdea,
    selectedConcept: saved.selectedConcept,
    storyboard: saved.storyboard,
  };
}

