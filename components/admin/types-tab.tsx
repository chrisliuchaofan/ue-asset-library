'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Trash2, Save } from 'lucide-react';
import type { Asset } from '@/data/manifest.schema';

interface TypesTabProps {
  assets: Asset[];
  onSave?: () => Promise<void>; // 类型保存后的回调
}

export function TypesTab({ assets, onSave }: TypesTabProps) {
  const [allowedTypes, setAllowedTypes] = useState<string[]>([]);
  const [originalTypes, setOriginalTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [newType, setNewType] = useState<string>('');
  const [typeMappings, setTypeMappings] = useState<Map<string, string | null>>(new Map());

  // 加载允许的类型列表
  useEffect(() => {
    if (allowedTypes.length === 0) {
      loadAllowedTypes();
    }
  }, []);

  const loadAllowedTypes = async () => {
    try {
      const response = await fetch('/api/assets/types');
      if (response.ok) {
        const data = await response.json();
        const types = data.allowedTypes || [];
        setAllowedTypes(types);
        setOriginalTypes([...types]); // 保存原始类型列表
      }
    } catch (error) {
      console.error('加载类型列表失败:', error);
    }
  };

  // 开始编辑类型
  const handleStartEdit = (type: string) => {
    setEditingType(type);
    setEditingValue(type);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingType(null);
    setEditingValue('');
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingType || !editingValue.trim()) return;

    const trimmedValue = editingValue.trim();

    // 检查新名称是否已存在（且不是当前类型）
    if (trimmedValue !== editingType && allowedTypes.includes(trimmedValue)) {
      alert(`类型 "${trimmedValue}" 已存在`);
      return;
    }

    // 如果名称改变，记录映射关系
    if (trimmedValue !== editingType) {
      setTypeMappings((prev) => {
        const newMap = new Map(prev);
        newMap.set(editingType, trimmedValue);
        return newMap;
      });
    }

    setEditingType(null);
    setEditingValue('');
  };

  // 删除类型
  const handleDeleteType = (type: string) => {
    if (type === '其他') {
      alert('不能删除"其他"类型');
      return;
    }

    const usageCount = getTypeUsageCount(type);
    if (usageCount > 0) {
      if (
        !confirm(
          `确定要删除类型 "${type}" 吗？这将把 ${usageCount} 个使用该类型的资产改为"其他"类型。`
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`确定要删除类型 "${type}" 吗？`)) {
        return;
      }
    }

    setTypeMappings((prev) => {
      const newMap = new Map(prev);
      newMap.set(type, null); // null 表示删除
      return newMap;
    });
  };

  // 添加新类型
  const handleAddType = () => {
    if (!newType.trim()) return;

    const trimmedType = newType.trim();

    if (allowedTypes.includes(trimmedType)) {
      alert(`类型 "${trimmedType}" 已存在`);
      return;
    }

    // 添加到列表（临时显示，需要保存）
    setAllowedTypes((prev) => [...prev, trimmedType]);
    setNewType('');
    // 注意：新类型需要保存后才会真正生效
  };

  // 获取类型的使用次数
  const getTypeUsageCount = (type: string) => {
    return assets.filter((asset) => asset.type === type).length;
  };

  // 检查类型是否被标记为删除
  const isTypeMarkedForDeletion = (type: string) => {
    return typeMappings.get(type) === null;
  };

  // 检查类型是否被重命名
  const getTypeNewName = (type: string) => {
    return typeMappings.get(type) || type;
  };

  // 保存所有更改
  const handleSave = async () => {
    if (typeMappings.size === 0 && !hasNewTypes) {
      return;
    }

    setLoading(true);
    try {
      const mappings: { oldType: string; newType: string | null }[] = [];
      typeMappings.forEach((newType, oldType) => {
        mappings.push({ oldType, newType });
      });

      // 找出新添加的类型（在allowedTypes中但不在originalTypes中）
      const newTypes = allowedTypes.filter(type => !originalTypes.includes(type));

      const response = await fetch('/api/assets/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          typeMappings: mappings,
          newTypes: newTypes.length > 0 ? newTypes : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新类型失败');
      }

      const data = await response.json();
      setAllowedTypes(data.allowedTypes);
      setOriginalTypes([...data.allowedTypes]); // 更新原始类型列表
      setTypeMappings(new Map());
      setNewType('');
      
      // 调用回调函数，通知父组件刷新类型列表
      if (onSave) {
        await onSave();
      }
      
      alert('类型更新成功');
    } catch (error) {
      console.error('保存类型失败:', error);
      alert(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 显示的类型列表（包括新添加的）
  const displayTypes = [...allowedTypes];
  
  // 检查是否有新添加的类型（在allowedTypes中但不在originalTypes中）
  const hasNewTypes = allowedTypes.some(type => !originalTypes.includes(type));

  return (
    <>
      {/* 添加新类型 */}
      <div className="flex gap-2">
        <Input
          placeholder="输入新类型名称..."
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddType();
            }
          }}
        />
        <Button onClick={handleAddType} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          添加
        </Button>
      </div>

      {/* 类型列表 */}
      <div className="space-y-2">
        <div className="text-sm font-medium">现有类型 ({displayTypes.length})</div>
        <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-md">
          {displayTypes.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center w-full">
              暂无类型
            </div>
          ) : (
            displayTypes.map((type) => {
              const isEditing = editingType === type;
              const isDeleted = isTypeMarkedForDeletion(type);
              const newName = getTypeNewName(type);
              const usageCount = getTypeUsageCount(type);
              const isOther = type === '其他';

              if (isEditing) {
                return (
                  <div key={type} className="flex items-center gap-2 p-2 border rounded-md bg-background">
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
                    <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8">
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              }

              return (
                <div
                  key={type}
                  className={`flex items-center gap-2 p-2 border rounded-md ${
                    isDeleted ? 'opacity-50 bg-muted' : 'bg-background'
                  }`}
                >
                  <Badge variant={isDeleted ? 'destructive' : 'secondary'} className="text-sm">
                    {isDeleted ? (
                      <span className="line-through">{type}</span>
                    ) : newName !== type ? (
                      <>
                        <span className="line-through text-muted-foreground mr-1">{type}</span>
                        <span>→ {newName}</span>
                      </>
                    ) : (
                      type
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">({usageCount})</span>
                  {!isDeleted && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(type)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      {!isOther && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteType(type)}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 更改摘要 */}
      {typeMappings.size > 0 && (
        <div className="p-3 bg-muted rounded-md">
          <div className="text-sm font-medium mb-2">待保存的更改：</div>
          <div className="space-y-1 text-sm">
            {Array.from(typeMappings.entries()).map(([oldType, newType]) => (
              <div key={oldType}>
                {newType === null ? (
                  <span className="text-destructive">删除类型: {oldType}</span>
                ) : (
                  <span>
                    重命名: <span className="line-through">{oldType}</span> → {newType}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保存按钮 */}
      {(typeMappings.size > 0 || hasNewTypes) && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存更改'}
          </Button>
        </div>
      )}
    </>
  );
}

