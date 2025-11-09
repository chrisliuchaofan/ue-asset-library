'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Trash2, Save } from 'lucide-react';
import type { Asset } from '@/data/manifest.schema';

interface TagsTabProps {
  assets: Asset[];
  onSave: (tagMappings: { oldTag: string; newTag: string | null }[]) => Promise<void>;
}

export function TagsTab({ assets, onSave }: TagsTabProps) {
  // 获取所有唯一标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    assets.forEach((asset) => {
      asset.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [assets]);

  // 标签编辑状态
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('');
  const [tagMappings, setTagMappings] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(false);

  // 重置状态
  useEffect(() => {
    setEditingTag(null);
    setEditingValue('');
    setNewTag('');
    setTagMappings(new Map());
  }, []);

  // 开始编辑标签
  const handleStartEdit = (tag: string) => {
    setEditingTag(tag);
    setEditingValue(tag);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditingValue('');
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingTag || !editingValue.trim()) return;

    const trimmedValue = editingValue.trim();

    // 检查新名称是否已存在（且不是当前标签）
    if (trimmedValue !== editingTag && allTags.includes(trimmedValue)) {
      alert(`标签 "${trimmedValue}" 已存在`);
      return;
    }

    // 如果名称改变，记录映射关系
    if (trimmedValue !== editingTag) {
      setTagMappings((prev) => {
        const newMap = new Map(prev);
        newMap.set(editingTag, trimmedValue);
        return newMap;
      });
    }

    setEditingTag(null);
    setEditingValue('');
  };

  // 删除标签
  const handleDeleteTag = (tag: string) => {
    if (confirm(`确定要删除标签 "${tag}" 吗？这将从所有使用该标签的资产中移除该标签。`)) {
      setTagMappings((prev) => {
        const newMap = new Map(prev);
        newMap.set(tag, null); // null 表示删除
        return newMap;
      });
    }
  };

  // 添加新标签
  const handleAddTag = () => {
    if (!newTag.trim()) return;

    const trimmedTag = newTag.trim();

    if (allTags.includes(trimmedTag)) {
      alert(`标签 "${trimmedTag}" 已存在`);
      return;
    }

    // 新标签不需要映射，直接添加到列表（但不会立即保存，需要点击保存按钮）
    setNewTag('');
    // 注意：新标签不会立即出现在列表中，需要保存后刷新
  };

  // 保存所有更改
  const handleSave = async () => {
    if (tagMappings.size === 0 && !newTag.trim()) {
      return;
    }

    setLoading(true);
    try {
      // 构建映射数组
      const mappings: { oldTag: string; newTag: string | null }[] = [];

      // 添加重命名映射
      tagMappings.forEach((newTag, oldTag) => {
        mappings.push({ oldTag, newTag });
      });

      // 如果有新标签，需要特殊处理（新标签不涉及重命名，只是添加）
      // 但新标签不会立即出现在资产中，所以这里只处理重命名和删除

      await onSave(mappings);
      setTagMappings(new Map());
      setNewTag('');
    } catch (error) {
      console.error('保存标签失败:', error);
      alert('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取标签的使用次数
  const getTagUsageCount = (tag: string) => {
    return assets.filter((asset) => asset.tags.includes(tag)).length;
  };

  // 检查标签是否被标记为删除
  const isTagMarkedForDeletion = (tag: string) => {
    return tagMappings.get(tag) === null;
  };

  // 检查标签是否被重命名
  const getTagNewName = (tag: string) => {
    return tagMappings.get(tag) || tag;
  };

  return (
    <>
      {/* 添加新标签 */}
      <div className="flex gap-2">
        <Input
          placeholder="输入新标签名称..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddTag();
            }
          }}
        />
        <Button onClick={handleAddTag} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          添加
        </Button>
      </div>

      {/* 标签列表 */}
      <div className="space-y-2">
        <div className="text-sm font-medium">现有标签 ({allTags.length})</div>
        <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-md">
          {allTags.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center w-full">
              暂无标签
            </div>
          ) : (
            allTags.map((tag) => {
              const isEditing = editingTag === tag;
              const isDeleted = isTagMarkedForDeletion(tag);
              const newName = getTagNewName(tag);
              const usageCount = getTagUsageCount(tag);

              if (isEditing) {
                return (
                  <div key={tag} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit();
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="h-8 w-32"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveEdit}
                      className="h-8"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="h-8"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              }

              return (
                <div
                  key={tag}
                  className={`flex items-center gap-2 p-2 border rounded-md ${
                    isDeleted ? 'opacity-50 bg-muted' : 'bg-background'
                  }`}
                >
                  <Badge variant={isDeleted ? 'destructive' : 'secondary'} className="text-sm">
                    {isDeleted ? (
                      <span className="line-through">{tag}</span>
                    ) : newName !== tag ? (
                      <>
                        <span className="line-through text-muted-foreground mr-1">{tag}</span>
                        <span>→ {newName}</span>
                      </>
                    ) : (
                      tag
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">({usageCount})</span>
                  {!isDeleted && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(tag)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTag(tag)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 更改摘要 */}
      {tagMappings.size > 0 && (
        <div className="p-3 bg-muted rounded-md">
          <div className="text-sm font-medium mb-2">待保存的更改：</div>
          <div className="space-y-1 text-sm">
            {Array.from(tagMappings.entries()).map(([oldTag, newTag]) => (
              <div key={oldTag}>
                {newTag === null ? (
                  <span className="text-destructive">删除标签: {oldTag}</span>
                ) : (
                  <span>
                    重命名: <span className="line-through">{oldTag}</span> → {newTag}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || tagMappings.size === 0}>
          {loading ? '保存中...' : '保存更改'}
        </Button>
      </div>
    </>
  );
}

