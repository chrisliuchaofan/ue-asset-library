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
    let response: Response;
    
    try {
      response = await fetch('/api/projects');
    } catch (fetchError) {
      // fetch 本身失败（网络错误等）
      const errorMessage = fetchError instanceof Error 
        ? fetchError.message 
        : '网络请求失败';
      console.error('[ProjectStorage] 网络请求失败:', {
        error: errorMessage,
        type: 'network_error',
      });
      throw new Error(`获取项目列表失败: ${errorMessage}`);
    }
    
    // 检查响应是否有效
    if (!response) {
      console.error('[ProjectStorage] 响应无效:', {
        response: null,
        type: 'invalid_response',
      });
      throw new Error('无法获取响应：fetch 返回 null 或 undefined');
    }
    
    if (!response.ok) {
      // 尝试从响应中提取详细错误信息
      const status = typeof response.status === 'number' ? response.status : 0;
      const statusText = typeof response.statusText === 'string' ? response.statusText : 'Unknown';
      let errorMessage = `获取项目列表失败: ${status} ${statusText}`;
      let errorDetails: any = null;
      let errorCode: string | undefined = undefined;
      
      try {
        const errorData = await response.json();
        
        // 提取错误消息
        if (errorData && typeof errorData === 'object') {
          if (errorData.message) {
            errorMessage = String(errorData.message);
          } else if (errorData.userMessage) {
            errorMessage = String(errorData.userMessage);
          }
          
          // 提取错误码（如果有）
          if (errorData.code) {
            errorCode = String(errorData.code);
            errorMessage += ` (错误码: ${errorData.code})`;
          }
          
          // 提取错误详情（只有当详情不为空时才记录）
          if (errorData.details && typeof errorData.details === 'object') {
            const detailsKeys = Object.keys(errorData.details);
            if (detailsKeys.length > 0) {
              errorDetails = errorData.details;
            }
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } catch (parseError) {
        // 如果无法解析 JSON，尝试获取文本
        try {
          const errorText = await response.text();
          if (errorText && errorText.trim()) {
            errorMessage += ` - ${errorText.substring(0, 200)}`;
          }
        } catch (textError) {
          // 忽略文本解析错误
        }
      }
      
      // 构建日志数据，确保始终有内容且字段都有值
      const logData: {
        status: number;
        statusText: string;
        errorMessage: string;
        errorCode?: string;
        details?: any;
      } = {
        status: status || 0,
        statusText: statusText || 'Unknown',
        errorMessage: errorMessage || '未知错误',
      };
      
      if (errorCode) {
        logData.errorCode = errorCode;
      }
      
      if (errorDetails) {
        logData.details = errorDetails;
      }
      
      // 记录错误（使用多个参数确保始终有输出）
      console.error(
        '[ProjectStorage] API 响应错误:',
        `状态: ${logData.status}`,
        `状态文本: ${logData.statusText}`,
        `错误消息: ${logData.errorMessage}`,
        errorCode ? `错误码: ${errorCode}` : '',
        errorDetails ? `详情: ${JSON.stringify(errorDetails)}` : ''
      );
      
      throw new Error(errorMessage);
    }
    
    const projects = await response.json();
    
    // 确保 projects 是数组
    if (!Array.isArray(projects)) {
      console.warn('[ProjectStorage] API 返回的数据不是数组:', projects);
      return [];
    }
    
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
    // 重新抛出错误，让调用方知道具体错误信息
    throw error;
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



