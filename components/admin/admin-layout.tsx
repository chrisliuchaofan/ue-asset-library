'use client';

import { useState, Children } from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen, Video, ChevronLeft, ChevronRight, Settings, Plus, List, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminRefreshProvider } from './admin-refresh-context';

interface AdminLayoutProps {
  children: React.ReactNode;
  storageMode: string;
  cdnBase: string;
}

export function AdminLayout({ children, storageMode, cdnBase }: AdminLayoutProps) {
  const [activeTab, setActiveTab] = useState<'assets-new' | 'assets-manage' | 'materials-new' | 'materials-manage'>('assets-new');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assetsExpanded, setAssetsExpanded] = useState(true);
  const [materialsExpanded, setMaterialsExpanded] = useState(false);

  // 将 children 转换为数组
  const childrenArray = Children.toArray(children);

  return (
    <AdminRefreshProvider>
      <div className="flex h-screen overflow-hidden bg-white">
      {/* 左侧导航栏 */}
      <aside
        className={cn(
          'flex flex-col border-r border-gray-200 bg-gray-50 transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* 侧边栏头部 */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {!sidebarCollapsed && (
            <h2 className="text-sm font-semibold text-gray-900">后台管理</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {/* 资产管理 */}
          <div>
            <button
              onClick={() => !sidebarCollapsed && setAssetsExpanded(!assetsExpanded)}
              className={cn(
                'flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors',
                (activeTab === 'assets-new' || activeTab === 'assets-manage')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <FolderOpen className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">资产管理</span>
                  {assetsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </button>
            {!sidebarCollapsed && assetsExpanded && (
              <div className="ml-8 mt-1 space-y-1">
                <button
                  onClick={() => setActiveTab('assets-new')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                    activeTab === 'assets-new'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  <span>新增</span>
                </button>
                <button
                  onClick={() => setActiveTab('assets-manage')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                    activeTab === 'assets-manage'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <List className="h-4 w-4" />
                  <span>管理</span>
                </button>
              </div>
            )}
          </div>

          {/* 素材管理 */}
          <div>
            <button
              onClick={() => !sidebarCollapsed && setMaterialsExpanded(!materialsExpanded)}
              className={cn(
                'flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors',
                (activeTab === 'materials-new' || activeTab === 'materials-manage')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Video className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">素材管理</span>
                  {materialsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </button>
            {!sidebarCollapsed && materialsExpanded && (
              <div className="ml-8 mt-1 space-y-1">
                <button
                  onClick={() => setActiveTab('materials-new')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                    activeTab === 'materials-new'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  <span>新增</span>
                </button>
                <button
                  onClick={() => setActiveTab('materials-manage')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                    activeTab === 'materials-manage'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <List className="h-4 w-4" />
                  <span>管理</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* 设置区域占位 */}
        <div className="border-t border-gray-200 p-2">
          <button
            className={cn(
              'flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100'
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>设置</span>}
          </button>
          {!sidebarCollapsed && (
            <div className="mt-2 px-3 py-2 text-xs text-gray-500">
              {/* 设置区域占位内容 */}
              <div className="space-y-1">
                <div className="text-gray-400">• 存储配置</div>
                <div className="text-gray-400">• 显示选项</div>
                <div className="text-gray-400">• 导入导出</div>
                <div className="text-gray-400">• 数据备份</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 右侧内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {/* 顶部存储状态栏 */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-1.5">
          <div className="text-xs text-gray-600">
            存储模式: <span className="font-medium text-gray-900">{storageMode}</span>
            {' | '}
            CDN路径: <span className="font-medium text-gray-900">{cdnBase || '/'}</span>
          </div>
        </div>
        {/* 内容区域 - 最大化显示空间 */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-full p-4">
            {activeTab === 'assets-new' && childrenArray[0]}
            {activeTab === 'assets-manage' && childrenArray[1]}
            {activeTab === 'materials-new' && childrenArray[2]}
            {activeTab === 'materials-manage' && childrenArray[3]}
          </div>
        </div>
      </div>
    </div>
    </AdminRefreshProvider>
  );
}

