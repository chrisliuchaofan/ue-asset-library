'use client';

import { useState, Children, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderOpen, Video, ChevronLeft, ChevronRight, Settings, Plus, List, ChevronDown, ChevronUp, Save, X, Edit, Trash2, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AdminRefreshProvider } from './admin-refresh-context';
import { PROJECTS, PROJECT_PASSWORDS, PROJECT_DISPLAY_NAMES, getAllProjects, getProjectDisplayName, DEFAULT_DESCRIPTIONS, getAllDescriptions, saveDescriptions, type DescriptionKey } from '@/lib/constants';
import { signOut } from 'next-auth/react';

interface AdminLayoutProps {
  children: React.ReactNode;
  storageMode: string;
  cdnBase: string;
}

interface SettingsSectionProps {
  sidebarCollapsed: boolean;
}

function SettingsSection({ sidebarCollapsed }: SettingsSectionProps) {
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [projectPasswords, setProjectPasswords] = useState<Record<string, string>>({});
  const [projectDisplayNames, setProjectDisplayNames] = useState<Record<string, string>>({});
  const [customProjects, setCustomProjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDisplayName, setNewProjectDisplayName] = useState('');
  const [newProjectPassword, setNewProjectPassword] = useState('');
  const [descriptions, setDescriptions] = useState<Record<DescriptionKey, string>>({ ...DEFAULT_DESCRIPTIONS });
  const [descriptionsExpanded, setDescriptionsExpanded] = useState(false);
  const [aiPromptExpanded, setAiPromptExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiAnalyzePrompt, setAiAnalyzePrompt] = useState<string>('');
  const [aiMaterialAnalyzePrompt, setAiMaterialAnalyzePrompt] = useState<string>('');

  // 从 localStorage 加载项目配置
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 加载密码（合并默认值和存储值）
    const storedPasswords = localStorage.getItem('project_passwords');
    let passwords = { ...PROJECT_PASSWORDS };
    if (storedPasswords) {
      try {
        const parsed = JSON.parse(storedPasswords);
        passwords = { ...PROJECT_PASSWORDS, ...parsed };
      } catch {
        // 解析失败，使用默认值
      }
    }
    setProjectPasswords(passwords);
    
    // 加载显示名称（合并默认值和存储值）
    const storedDisplayNames = localStorage.getItem('project_display_names');
    let displayNames = { ...PROJECT_DISPLAY_NAMES };
    if (storedDisplayNames) {
      try {
        const parsed = JSON.parse(storedDisplayNames);
        displayNames = { ...PROJECT_DISPLAY_NAMES, ...parsed };
      } catch {
        // 解析失败，使用默认值
      }
    }
    setProjectDisplayNames(displayNames);
    
    // 加载自定义项目
    const storedCustomProjects = localStorage.getItem('custom_projects');
    if (storedCustomProjects) {
      try {
        const parsed = JSON.parse(storedCustomProjects);
        if (Array.isArray(parsed)) {
          setCustomProjects(parsed);
        }
      } catch {
        setCustomProjects([]);
      }
    }
    
    // 加载描述文字
    const loadedDescriptions = getAllDescriptions();
    setDescriptions(loadedDescriptions);
    
    // 加载 AI 提示词（用于上传资产时的标签生成）
    const storedAiPrompt = localStorage.getItem('ai_image_prompt');
    if (storedAiPrompt) {
      setAiPrompt(storedAiPrompt);
    } else {
      // 默认提示词（阿里云格式）
      setAiPrompt('你是资深游戏美术分析师，请先判断图片内容，再给出：1）不超过 8 个标签（每个不超过 6 字），2）一句不超过 25 字的中文描述。仅输出 JSON：{"tags":[], "description":""}。');
    }
    
    // 加载 AI 分析提示词（用于资产详情页的AI分析）
    const storedAiAnalyzePrompt = localStorage.getItem('ai_analyze_prompt');
    if (storedAiAnalyzePrompt) {
      setAiAnalyzePrompt(storedAiAnalyzePrompt);
    } else {
      // 默认提示词（用于资产详情页的AI分析，只要求描述，不要求标签，限制50字以内）
      setAiAnalyzePrompt('你是资深游戏美术分析师，请详细分析这张图片的内容，包括风格、主题、元素、色彩、构图等方面，提供简洁的中文描述。描述总字数不超过50字。仅输出 JSON 格式：{"description":""}，不需要 tags 字段。描述应为纯文本，不要包含代码、标记或特殊格式。');
    }
    
    // 加载素材 AI 分析提示词（用于素材详情页的AI分析）
    const storedAiMaterialAnalyzePrompt = localStorage.getItem('ai_material_analyze_prompt');
    if (storedAiMaterialAnalyzePrompt) {
      setAiMaterialAnalyzePrompt(storedAiMaterialAnalyzePrompt);
    } else {
      // 默认提示词（用于素材详情页的AI分析，只要求描述，不要求标签，限制50字以内）
      setAiMaterialAnalyzePrompt('你是资深游戏美术分析师，请详细分析这张图片的内容，包括风格、主题、元素、色彩、构图等方面，提供简洁的中文描述。描述总字数不超过50字。仅输出 JSON 格式：{"description":""}，不需要 tags 字段。描述应为纯文本，不要包含代码、标记或特殊格式。');
    }
  }, []);

  const handlePasswordChange = (project: string, password: string) => {
    setProjectPasswords((prev) => ({
      ...prev,
      [project]: password,
    }));
  };

  const handleDisplayNameChange = (project: string, displayName: string) => {
    setProjectDisplayNames((prev) => ({
      ...prev,
      [project]: displayName,
    }));
  };

  const handleAddProject = () => {
    if (!newProjectDisplayName.trim() || !newProjectPassword.trim()) {
      setMessage('请填写显示名称和密码');
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    // 如果没有提供项目ID，自动生成一个
    let projectId = newProjectName.trim();
    if (!projectId) {
      // 自动生成项目ID：项目1, 项目2, ...
      const existingProjects = getAllProjects();
      let counter = 1;
      do {
        projectId = `项目${counter}`;
        counter++;
      } while (existingProjects.includes(projectId));
    }
    
    if (getAllProjects().includes(projectId)) {
      setMessage('项目ID已存在，请使用其他ID');
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    setCustomProjects((prev) => [...prev, projectId]);
    setProjectPasswords((prev) => ({
      ...prev,
      [projectId]: newProjectPassword.trim(),
    }));
    setProjectDisplayNames((prev) => ({
      ...prev,
      [projectId]: newProjectDisplayName.trim(),
    }));
    
    setNewProjectName('');
    setNewProjectDisplayName('');
    setNewProjectPassword('');
    setMessage(`项目"${newProjectDisplayName.trim()}"已添加，请点击保存`);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteProject = (project: string) => {
    if (PROJECTS.includes(project as any)) {
      setMessage('不能删除默认项目');
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    if (confirm(`确定要删除项目 "${project}" 吗？`)) {
      setCustomProjects((prev) => prev.filter((p) => p !== project));
      setProjectPasswords((prev) => {
        const next = { ...prev };
        delete next[project];
        return next;
      });
      setProjectDisplayNames((prev) => {
        const next = { ...prev };
        delete next[project];
        return next;
      });
      setMessage('项目已删除，请点击保存');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // 只保存自定义的密码和显示名称（不包括默认项目的默认值）
      const customPasswords: Record<string, string> = {};
      const customDisplayNames: Record<string, string> = {};
      
      // 收集自定义项目的密码和显示名称
      customProjects.forEach((project) => {
        if (projectPasswords[project]) {
          customPasswords[project] = projectPasswords[project];
        }
        if (projectDisplayNames[project]) {
          customDisplayNames[project] = projectDisplayNames[project];
        }
      });
      
      // 收集默认项目的自定义值（如果与默认值不同）
      PROJECTS.forEach((project) => {
        if (projectPasswords[project] && projectPasswords[project] !== PROJECT_PASSWORDS[project]) {
          customPasswords[project] = projectPasswords[project];
        }
        if (projectDisplayNames[project] && projectDisplayNames[project] !== PROJECT_DISPLAY_NAMES[project]) {
          customDisplayNames[project] = projectDisplayNames[project];
        }
      });
      
      // 保存密码（只保存自定义值）
      localStorage.setItem('project_passwords', JSON.stringify(customPasswords));
      
      // 保存显示名称（只保存自定义值）
      localStorage.setItem('project_display_names', JSON.stringify(customDisplayNames));
      
      // 保存自定义项目
      localStorage.setItem('custom_projects', JSON.stringify(customProjects));
      
      // 更新全局配置
      if (typeof window !== 'undefined') {
        (window as any).__PROJECT_PASSWORDS__ = { ...PROJECT_PASSWORDS, ...customPasswords };
        (window as any).__PROJECT_DISPLAY_NAMES__ = { ...PROJECT_DISPLAY_NAMES, ...customDisplayNames };
        (window as any).__CUSTOM_PROJECTS__ = customProjects;
      }
      
      // 保存描述文字
      saveDescriptions(descriptions);
      
      // 保存 AI 提示词（用于上传资产时的标签生成）
      localStorage.setItem('ai_image_prompt', aiPrompt);
      
      // 保存 AI 分析提示词（用于资产详情页的AI分析）
      localStorage.setItem('ai_analyze_prompt', aiAnalyzePrompt);
      
      // 保存素材 AI 分析提示词（用于素材详情页的AI分析）
      localStorage.setItem('ai_material_analyze_prompt', aiMaterialAnalyzePrompt);
      
      setMessage('保存成功！页面将刷新以应用更改');
      setTimeout(() => {
        // 刷新页面以应用更改
        window.location.reload();
      }, 1000);
    } catch (error) {
      setMessage('保存失败，请重试');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDescriptionChange = (key: DescriptionKey, value: string) => {
    setDescriptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  
  const handleResetDescriptions = () => {
    setDescriptions({ ...DEFAULT_DESCRIPTIONS });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">设置</h1>
        <p className="mt-1 text-sm text-gray-500">管理系统配置、项目设置和 AI 提示词</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 现有项目设置 */}
          <div className="space-y-4 p-4 border rounded-lg bg-white">
            <div className="text-sm font-semibold text-gray-900">项目设置</div>
            {getAllProjects().map((project) => {
              const displayName = projectDisplayNames[project] || getProjectDisplayName(project);
              const isDefaultProject = PROJECTS.includes(project as any);
              return (
                <div key={project} className="space-y-3 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-900 font-semibold">
                      {displayName}
                      {!isDefaultProject && (
                        <span className="ml-2 text-sm text-gray-500 font-normal">({project})</span>
                      )}
                    </Label>
                    {!isDefaultProject && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProject(project)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        title="删除项目"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`display-${project}`} className="text-sm text-gray-700 mb-1 block">
                        显示名称 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`display-${project}`}
                        type="text"
                        value={displayName}
                        onChange={(e) => handleDisplayNameChange(project, e.target.value)}
                        placeholder="显示名称（如：三冰）"
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`password-${project}`} className="text-sm text-gray-700 mb-1 block">
                        密码 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`password-${project}`}
                        type="text"
                        value={projectPasswords[project] || (PROJECT_PASSWORDS[project as keyof typeof PROJECT_PASSWORDS] || '')}
                        onChange={(e) => handlePasswordChange(project, e.target.value)}
                        placeholder="请输入密码"
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 新增项目 */}
          <div className="space-y-4 p-4 border rounded-lg bg-white">
            <div className="text-sm font-semibold text-gray-900">新增项目</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-gray-700 mb-1 block">
                  显示名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={newProjectDisplayName}
                  onChange={(e) => setNewProjectDisplayName(e.target.value)}
                  placeholder="显示名称（如：新项目）"
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-1 block">
                  项目ID <span className="text-gray-400 text-xs">(自动生成)</span>
                </Label>
                <Input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="项目ID（可选，如不填将自动生成）"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-1 block">
                  密码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={newProjectPassword}
                  onChange={(e) => setNewProjectPassword(e.target.value)}
                  placeholder="密码"
                  className="h-9 text-sm"
                  required
                />
              </div>
            </div>
            <Button
              onClick={handleAddProject}
              size="sm"
              variant="outline"
              className="h-9 text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加项目
            </Button>
          </div>

          {/* 描述文字设置 */}
          <div className="space-y-4 p-4 border rounded-lg bg-white">
            <div className="text-sm font-semibold text-gray-900">描述文字设置</div>
            <div className="text-sm text-gray-600 mb-4">
              自定义前端显示的文字内容。使用 {'{project}'} 作为项目名称占位符。
            </div>
            <div className="space-y-4">
              {/* 项目密码验证对话框 */}
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <div className="text-sm font-semibold text-gray-900">项目密码验证对话框</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-700 mb-1 block">对话框标题</Label>
                    <Input
                      type="text"
                      value={descriptions.projectPasswordDialogTitle}
                      onChange={(e) => handleDescriptionChange('projectPasswordDialogTitle', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="项目密码验证"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-700 mb-1 block">输入框占位符</Label>
                    <Input
                      type="text"
                      value={descriptions.projectPasswordInputPlaceholder}
                      onChange={(e) => handleDescriptionChange('projectPasswordInputPlaceholder', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="请输入密码（支持中文）"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-700 mb-1 block">对话框描述</Label>
                  <Input
                    type="text"
                    value={descriptions.projectPasswordDialogDescription}
                    onChange={(e) => handleDescriptionChange('projectPasswordDialogDescription', e.target.value)}
                    className="h-9 text-sm"
                    placeholder="请输入 {project} 的密码以切换项目"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-700 mb-1 block">取消按钮</Label>
                    <Input
                      type="text"
                      value={descriptions.projectPasswordDialogCancel}
                      onChange={(e) => handleDescriptionChange('projectPasswordDialogCancel', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="取消"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-700 mb-1 block">确认按钮</Label>
                    <Input
                      type="text"
                      value={descriptions.projectPasswordDialogConfirm}
                      onChange={(e) => handleDescriptionChange('projectPasswordDialogConfirm', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="确认"
                    />
                  </div>
                </div>
              </div>

              {/* 空状态 */}
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <div className="text-sm font-semibold text-gray-900">空状态显示</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-700 mb-1 block">标题</Label>
                    <Input
                      type="text"
                      value={descriptions.emptyStateTitle}
                      onChange={(e) => handleDescriptionChange('emptyStateTitle', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="未找到资产"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-700 mb-1 block">描述</Label>
                    <Input
                      type="text"
                      value={descriptions.emptyStateDescription}
                      onChange={(e) => handleDescriptionChange('emptyStateDescription', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="尝试调整搜索关键词或筛选条件"
                    />
                  </div>
                </div>
              </div>

              {/* 资产计数 */}
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <div className="text-sm font-semibold text-gray-900">资产计数显示</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-700 mb-1 block">前缀</Label>
                    <Input
                      type="text"
                      value={descriptions.assetsCountPrefix}
                      onChange={(e) => handleDescriptionChange('assetsCountPrefix', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="找到"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-700 mb-1 block">后缀</Label>
                    <Input
                      type="text"
                      value={descriptions.assetsCountSuffix}
                      onChange={(e) => handleDescriptionChange('assetsCountSuffix', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="个资产"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-700 mb-1 block">0个资产</Label>
                    <Input
                      type="text"
                      value={descriptions.assetsCountZero}
                      onChange={(e) => handleDescriptionChange('assetsCountZero', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="找到 0 个资产"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDescriptions}
                className="h-9 text-sm"
              >
                重置为默认值
              </Button>
            </div>
          </div>

          {/* AI 提示词设置（用于上传资产时的标签生成） */}
          <div className="space-y-4 p-4 border rounded-lg bg-white">
            <div className="text-sm font-semibold text-gray-900">AI 提示词设置（上传资产时）</div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <p>自定义上传资产时 AI 生成标签的提示词。留空则使用默认提示词。</p>
                <p className="mt-1 text-sm text-gray-500">提示：提示词应要求 AI 返回 JSON 格式，包含 tags 数组和 description 字符串</p>
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">AI 标签生成提示词</Label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="你是资深游戏美术分析师，请先判断图片内容，再给出：1）不超过 8 个标签（每个不超过 6 字），2）一句不超过 25 字的中文描述。"
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAiPrompt('你是资深游戏美术分析师，请先判断图片内容，再给出：1）不超过 8 个标签（每个不超过 6 字），2）一句不超过 25 字的中文描述。仅输出 JSON：{"tags":[], "description":""}。');
                }}
                className="h-9 text-sm"
              >
                重置为默认值
              </Button>
            </div>
          </div>

          {/* AI 分析提示词设置（用于资产详情页的AI分析） */}
          <div className="space-y-4 p-4 border rounded-lg bg-white">
            <div className="text-sm font-semibold text-gray-900">AI 分析提示词设置（资产详情页）</div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <p>自定义资产详情页 AI 分析的提示词。留空则使用默认提示词。</p>
                <p className="mt-1 text-sm text-gray-500">提示：提示词应要求 AI 仅返回描述（description），不需要标签（tags）。建议使用 JSON 格式：{`{"description":""}`}。此提示词与上传时的提示词分开管理。</p>
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">AI 分析提示词</Label>
                <textarea
                  value={aiAnalyzePrompt}
                  onChange={(e) => setAiAnalyzePrompt(e.target.value)}
                  placeholder="你是资深游戏美术分析师，请详细分析这张图片的内容，包括风格、主题、元素、色彩、构图等方面，提供详细的中文描述。"
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAiAnalyzePrompt('你是资深游戏美术分析师，请详细分析这张图片的内容，包括风格、主题、元素、色彩、构图等方面，提供简洁的中文描述。描述总字数不超过50字。仅输出 JSON 格式：{"description":""}，不需要 tags 字段。描述应为纯文本，不要包含代码、标记或特殊格式。');
                }}
                className="h-9 text-sm"
              >
                重置为默认值
              </Button>
            </div>
          </div>

          {/* AI 分析提示词设置（用于素材详情页的AI分析） */}
          <div className="space-y-4 p-4 border rounded-lg bg-white">
            <div className="text-sm font-semibold text-gray-900">AI 分析提示词设置（素材详情页）</div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <p>自定义素材详情页 AI 分析的提示词。留空则使用默认提示词。</p>
                <p className="mt-1 text-sm text-gray-500">提示：提示词应要求 AI 仅返回描述（description），不需要标签（tags）。建议使用 JSON 格式：{`{"description":""}`}。此提示词与资产详情页的提示词分开管理。</p>
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">AI 分析提示词</Label>
                <textarea
                  value={aiMaterialAnalyzePrompt}
                  onChange={(e) => setAiMaterialAnalyzePrompt(e.target.value)}
                  placeholder="你是资深游戏美术分析师，请详细分析这张图片的内容，包括风格、主题、元素、色彩、构图等方面，提供详细的中文描述。"
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAiMaterialAnalyzePrompt('你是资深游戏美术分析师，请详细分析这张图片的内容，包括风格、主题、元素、色彩、构图等方面，提供简洁的中文描述。描述总字数不超过50字。仅输出 JSON 格式：{"description":""}，不需要 tags 字段。描述应为纯文本，不要包含代码、标记或特殊格式。');
                }}
                className="h-9 text-sm"
              >
                重置为默认值
              </Button>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="default"
              className="h-9"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存设置'}
            </Button>
            {message && (
              <div className={`text-sm ${message.includes('失败') || message.includes('不能') ? 'text-red-500' : 'text-green-500'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout({ children, storageMode, cdnBase }: AdminLayoutProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'assets-new' | 'assets-manage' | 'materials-new' | 'materials-manage' | 'settings'>('assets-new');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assetsExpanded, setAssetsExpanded] = useState(true);
  const [materialsExpanded, setMaterialsExpanded] = useState(true); // 默认展开素材管理
  const [settingsExpanded, setSettingsExpanded] = useState(false);

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

          {/* 用户管理 */}
          <a
            href="/admin/users"
            onClick={(e) => {
              e.preventDefault();
              router.push('/admin/users');
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors',
              'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Users className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="flex-1 text-left">用户管理</span>}
          </a>

          {/* 设置 */}
          <div>
            <button
              onClick={() => {
                if (!sidebarCollapsed) {
                  setSettingsExpanded(!settingsExpanded);
                }
                setActiveTab('settings');
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors',
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">设置</span>
                  {settingsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </button>
          </div>
        </nav>

        {/* 底部登出按钮 */}
        <div className="border-t border-gray-200 p-2">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900',
              sidebarCollapsed && 'justify-center px-2'
            )}
            onClick={() => {
              signOut({ callbackUrl: '/' });
            }}
            title="登出"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">登出</span>}
          </Button>
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
            {activeTab === 'settings' && <SettingsSection sidebarCollapsed={sidebarCollapsed} />}
          </div>
        </div>
      </div>
    </div>
    </AdminRefreshProvider>
  );
}

