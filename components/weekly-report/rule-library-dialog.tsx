'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FilterRule } from '@/lib/weekly-report/rule-library';

interface RuleLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRuleSelect?: (rule: FilterRule) => void;
}

export function RuleLibraryDialog({
  open,
  onOpenChange,
  onRuleSelect,
}: RuleLibraryDialogProps) {
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<FilterRule | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ruleText: '',
  });

  // 加载规则列表
  useEffect(() => {
    if (open) {
      loadRules();
    }
  }, [open]);

  const loadRules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/weekly-reports/filter-rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('[RuleLibraryDialog] 加载规则失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加规则
  const handleAdd = () => {
    setEditingRule(null);
    setIsAdding(true);
    setFormData({ name: '', description: '', ruleText: '' });
  };

  // 编辑规则
  const handleEdit = (rule: FilterRule) => {
    setEditingRule(rule);
    setIsAdding(false);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      ruleText: rule.ruleText,
    });
  };

  // 删除规则
  const handleDelete = async (ruleId: string) => {
    if (!confirm('确定要删除这条规则吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/weekly-reports/filter-rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadRules();
      } else {
        const error = await response.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('[RuleLibraryDialog] 删除规则失败:', error);
      alert('删除失败');
    }
  };

  // 保存规则
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.ruleText.trim()) {
      alert('规则名称和规则文本不能为空');
      return;
    }

    try {
      if (editingRule) {
        // 更新规则
        const response = await fetch(`/api/weekly-reports/filter-rules/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await loadRules();
          setEditingRule(null);
          setIsAdding(false);
          setFormData({ name: '', description: '', ruleText: '' });
        } else {
          const error = await response.json();
          alert(error.error || '更新失败');
        }
      } else {
        // 创建规则
        const response = await fetch('/api/weekly-reports/filter-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await loadRules();
          setIsAdding(false);
          setFormData({ name: '', description: '', ruleText: '' });
        } else {
          const error = await response.json();
          alert(error.error || '创建失败');
        }
      }
    } catch (error) {
      console.error('[RuleLibraryDialog] 保存规则失败:', error);
      alert('保存失败');
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditingRule(null);
    setIsAdding(false);
    setFormData({ name: '', description: '', ruleText: '' });
  };

  // 选择规则
  const handleSelect = (rule: FilterRule) => {
    if (onRuleSelect) {
      onRuleSelect(rule);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle>规则库管理</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            管理您的常用筛选规则
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 添加/编辑表单 */}
          {(isAdding || editingRule) && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  规则名称
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：微小消耗Top10"
                  className="border-border bg-transparent text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  规则描述（可选）
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="例如：微信小游戏的素材，消耗排名前十"
                  className="border-border bg-transparent text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  规则文本
                </label>
                <Input
                  value={formData.ruleText}
                  onChange={(e) => setFormData({ ...formData, ruleText: e.target.value })}
                  placeholder="例如：微小的素材，消耗排名前十"
                  className="border-border bg-transparent text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleSave}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  保存
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="border-border bg-transparent text-foreground hover:bg-muted"
                >
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* 规则列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">规则列表</h3>
              {!isAdding && !editingRule && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAdd}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>添加规则</span>
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">加载中...</div>
            ) : rules.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">暂无规则</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{rule.name}</div>
                        {rule.description && (
                          <div className="mt-1 text-sm text-muted-foreground">{rule.description}</div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground font-mono">
                          {rule.ruleText}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {onRuleSelect && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelect(rule)}
                            className="border-border bg-transparent text-foreground hover:bg-muted"
                          >
                            使用
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(rule)}
                          className="border-border bg-transparent text-foreground hover:bg-muted"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(rule.id)}
                          className="border-border bg-transparent text-foreground hover:bg-muted"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
