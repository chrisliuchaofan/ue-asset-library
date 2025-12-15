/**
 * Dream Factory 项目存储工具
 * 优先使用服务器端存储，如果失败则回退到 localStorage
 */

import type { ProjectState, Concept } from '@/types/dream-factory/types';
import * as serverStorage from './project-storage-server';

export interface SavedProject {
  id: string;
  title: string;
  originalIdea: string;
  selectedConcept: Concept | null;
  storyboard: ProjectState['storyboard'];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

const STORAGE_KEY = 'dream_factory_projects';

/**
 * 获取所有保存的项目
 * 优先从服务器获取，失败则从 localStorage 获取
 */
export async function getAllSavedProjects(): Promise<SavedProject[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    // 优先使用服务器端存储
    const serverProjects = await serverStorage.getAllSavedProjects();
    if (serverProjects.length > 0) {
      return serverProjects;
    }
  } catch (error) {
    console.warn('[ProjectStorage] 服务器端获取失败，使用本地存储:', error);
  }
  
  // 回退到 localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const projects = JSON.parse(stored);
    // 按更新时间倒序排列（最新的在前）
    return projects.sort((a: SavedProject, b: SavedProject) => 
      (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
    );
  } catch (error) {
    console.error('[ProjectStorage] 读取项目列表失败:', error);
    return [];
  }
}

/**
 * 保存项目
 * 优先保存到服务器，失败则保存到 localStorage
 */
export async function saveProject(project: ProjectState, title?: string): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端保存项目');
  }
  
  try {
    // 优先使用服务器端存储
    return await serverStorage.saveProject(project, title);
  } catch (error) {
    console.warn('[ProjectStorage] 服务器端保存失败，使用本地存储:', error);
    
    // 回退到 localStorage
    try {
      const projects = await getAllSavedProjects();
      
      // 生成项目 ID 和标题
      const projectId = `project-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const projectTitle = title || project.originalIdea.substring(0, 50) || '未命名项目';
      
      const savedProject: SavedProject = {
        id: projectId,
        title: projectTitle,
        originalIdea: project.originalIdea,
        selectedConcept: project.selectedConcept,
        storyboard: project.storyboard,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completedAt: Date.now(), // 保存时标记为完成
      };
      
      projects.push(savedProject);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      
      console.log('[ProjectStorage] 项目已保存到本地:', projectId);
      return projectId;
    } catch (localError) {
      console.error('[ProjectStorage] 本地保存也失败:', localError);
      throw localError;
    }
  }
}

/**
 * 更新项目
 * 优先更新到服务器，失败则更新到 localStorage
 */
export async function updateProject(projectId: string, updates: Partial<SavedProject>): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端更新项目');
  }
  
  try {
    // 优先使用服务器端存储
    await serverStorage.updateProject(projectId, updates);
  } catch (error) {
    console.warn('[ProjectStorage] 服务器端更新失败，使用本地存储:', error);
    
    // 回退到 localStorage
    try {
      const projects = await getAllSavedProjects();
      const index = projects.findIndex(p => p.id === projectId);
      
      if (index === -1) {
        throw new Error(`项目 ${projectId} 不存在`);
      }
      
      projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: Date.now(),
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      console.log('[ProjectStorage] 项目已更新到本地:', projectId);
    } catch (localError) {
      console.error('[ProjectStorage] 本地更新也失败:', localError);
      throw localError;
    }
  }
}

/**
 * 获取单个项目
 * 优先从服务器获取，失败则从 localStorage 获取
 */
export async function getProject(projectId: string): Promise<SavedProject | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    // 优先使用服务器端存储
    const serverProject = await serverStorage.getProject(projectId);
    if (serverProject) {
      return serverProject;
    }
  } catch (error) {
    console.warn('[ProjectStorage] 服务器端获取失败，使用本地存储:', error);
  }
  
  // 回退到 localStorage
  try {
    const projects = await getAllSavedProjects();
    return projects.find(p => p.id === projectId) || null;
  } catch (error) {
    console.error('[ProjectStorage] 读取项目失败:', error);
    return null;
  }
}

/**
 * 删除项目
 * 优先从服务器删除，失败则从 localStorage 删除
 */
export async function deleteProject(projectId: string): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端删除项目');
  }
  
  try {
    // 优先使用服务器端存储
    await serverStorage.deleteProject(projectId);
  } catch (error) {
    console.warn('[ProjectStorage] 服务器端删除失败，使用本地存储:', error);
    
    // 回退到 localStorage
    try {
      const projects = await getAllSavedProjects();
      const filtered = projects.filter(p => p.id !== projectId);
      
      if (filtered.length === projects.length) {
        throw new Error(`项目 ${projectId} 不存在`);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('[ProjectStorage] 项目已从本地删除:', projectId);
    } catch (localError) {
      console.error('[ProjectStorage] 本地删除也失败:', localError);
      throw localError;
    }
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

