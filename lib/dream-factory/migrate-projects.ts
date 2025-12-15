/**
 * 项目数据迁移工具
 * 将 localStorage 中的项目迁移到服务器端
 */

import { getAllSavedProjects as getLocalProjects } from './project-storage';
import * as serverStorage from './project-storage-server';

const STORAGE_KEY = 'dream_factory_projects';
const MIGRATION_FLAG_KEY = 'dream_factory_migration_completed';

/**
 * 检查是否已完成迁移
 */
export function isMigrationCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

/**
 * 标记迁移完成
 */
export function markMigrationCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}

/**
 * 执行迁移
 */
export async function migrateProjects(): Promise<{
  total: number;
  success: number;
  failed: number;
  results: Array<{ success: boolean; id?: string; originalId: string; error?: string }>;
}> {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端执行迁移');
  }

  // 检查是否已完成迁移
  if (isMigrationCompleted()) {
    console.log('[Migration] 迁移已完成，跳过');
    return { total: 0, success: 0, failed: 0, results: [] };
  }

  // 从 localStorage 读取项目
  const localProjects = await getLocalProjects();
  
  if (localProjects.length === 0) {
    console.log('[Migration] 没有需要迁移的项目');
    markMigrationCompleted();
    return { total: 0, success: 0, failed: 0, results: [] };
  }

  console.log(`[Migration] 开始迁移 ${localProjects.length} 个项目...`);

  // 批量迁移到服务器
  const results = [];
  for (const project of localProjects) {
    try {
      const savedId = await serverStorage.saveProject(
        {
          originalIdea: project.originalIdea,
          selectedConcept: project.selectedConcept,
          storyboard: project.storyboard,
        },
        project.title
      );

      // 如果有合并视频 URL，更新项目（如果类型支持）
      if ('mergedVideoUrl' in project && (project as any).mergedVideoUrl) {
        try {
          await serverStorage.updateProject(savedId, {
            mergedVideoUrl: (project as any).mergedVideoUrl,
          } as any);
        } catch (updateError) {
          console.warn(`[Migration] 更新项目 ${savedId} 的 mergedVideoUrl 失败:`, updateError);
        }
      }

      results.push({ success: true, id: savedId, originalId: project.id });
      console.log(`[Migration] 项目 ${project.id} 迁移成功 -> ${savedId}`);
    } catch (error) {
      console.error(`[Migration] 项目 ${project.id} 迁移失败:`, error);
      results.push({ success: false, originalId: project.id, error: String(error) });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  console.log(`[Migration] 迁移完成: ${successCount} 成功, ${failedCount} 失败`);

  // 如果所有项目都迁移成功，标记为完成
  if (failedCount === 0) {
    markMigrationCompleted();
    console.log('[Migration] 所有项目迁移成功，已标记为完成');
  }

  return {
    total: localProjects.length,
    success: successCount,
    failed: failedCount,
    results,
  };
}

/**
 * 自动迁移（在应用启动时调用）
 */
export async function autoMigrate(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const result = await migrateProjects();
    if (result.total > 0) {
      console.log(`[Migration] 自动迁移完成: ${result.success}/${result.total} 成功`);
    }
  } catch (error) {
    console.error('[Migration] 自动迁移失败:', error);
  }
}

