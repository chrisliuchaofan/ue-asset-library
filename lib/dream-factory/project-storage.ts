/**
 * Dream Factory 项目存储工具
 * 使用 localStorage 保存和加载项目
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
}

const STORAGE_KEY = 'dream_factory_projects';

/**
 * 获取所有保存的项目
 */
export function getAllSavedProjects(): SavedProject[] {
  if (typeof window === 'undefined') return [];
  
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
 */
export function saveProject(project: ProjectState, title?: string): string {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端保存项目');
  }
  
  try {
    const projects = getAllSavedProjects();
    
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
    
    console.log('[ProjectStorage] 项目已保存:', projectId);
    return projectId;
  } catch (error) {
    console.error('[ProjectStorage] 保存项目失败:', error);
    throw error;
  }
}

/**
 * 更新项目
 */
export function updateProject(projectId: string, updates: Partial<SavedProject>): void {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端更新项目');
  }
  
  try {
    const projects = getAllSavedProjects();
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
    console.log('[ProjectStorage] 项目已更新:', projectId);
  } catch (error) {
    console.error('[ProjectStorage] 更新项目失败:', error);
    throw error;
  }
}

/**
 * 获取单个项目
 */
export function getProject(projectId: string): SavedProject | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const projects = getAllSavedProjects();
    return projects.find(p => p.id === projectId) || null;
  } catch (error) {
    console.error('[ProjectStorage] 读取项目失败:', error);
    return null;
  }
}

/**
 * 删除项目
 */
export function deleteProject(projectId: string): void {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端删除项目');
  }
  
  try {
    const projects = getAllSavedProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    
    if (filtered.length === projects.length) {
      throw new Error(`项目 ${projectId} 不存在`);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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

