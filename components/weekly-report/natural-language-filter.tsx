'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { explainNaturalLanguageRule } from '@/lib/weekly-report/data-filter';
import type { FilterRule } from '@/lib/weekly-report/rule-library';

interface NaturalLanguageFilterProps {
  onRuleChange: (ruleText: string) => void;
  onPreview?: (ruleText: string) => void;
  disabled?: boolean;
}

export function NaturalLanguageFilter({
  onRuleChange,
  onPreview,
  disabled = false,
}: NaturalLanguageFilterProps) {
  const [ruleText, setRuleText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRuleSelect, setShowRuleSelect] = useState(false);

  // 加载规则列表
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/weekly-reports/filter-rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      console.error('[NaturalLanguageFilter] 加载规则失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 当规则文本改变时，更新解释
  useEffect(() => {
    if (ruleText.trim()) {
      try {
        const explanationText = explainNaturalLanguageRule(ruleText);
        setExplanation(explanationText);
      } catch (error) {
        setExplanation('规则解析失败');
      }
    } else {
      setExplanation('');
    }
  }, [ruleText]);

  // 选择规则
  const handleRuleSelect = (rule: FilterRule) => {
    setRuleText(rule.ruleText);
    setSelectedRuleId(rule.id);
    setShowRuleSelect(false);
    onRuleChange(rule.ruleText);
  };

  // 输入规则文本
  const handleRuleTextChange = (value: string) => {
    setRuleText(value);
    setSelectedRuleId('');
    onRuleChange(value);
  };

  // 预览规则
  const handlePreview = () => {
    if (ruleText.trim() && onPreview) {
      onPreview(ruleText);
    }
  };

  // 清空规则
  const handleClear = () => {
    setRuleText('');
    setSelectedRuleId('');
    setExplanation('');
    onRuleChange('');
  };

  return (
    <div className="space-y-3">
      {/* 规则库选择器 */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between border-border bg-transparent hover:bg-muted"
          onClick={() => setShowRuleSelect(!showRuleSelect)}
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>规则库</span>
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showRuleSelect ? 'rotate-180' : ''}`} />
        </Button>

        {showRuleSelect && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
            <div className="max-h-60 overflow-y-auto p-2">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">加载中...</div>
              ) : rules.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">暂无规则</div>
              ) : (
                rules.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    onClick={() => handleRuleSelect(rule)}
                  >
                    <div className="font-medium">{rule.name}</div>
                    {rule.description && (
                      <div className="text-xs text-muted-foreground">{rule.description}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 规则输入框 */}
      <div className="space-y-2">
        <div className="relative">
          <Input
            type="text"
            placeholder="输入自然语言筛选规则，例如：微小的素材，消耗排名前十"
            value={ruleText}
            onChange={(e) => handleRuleTextChange(e.target.value)}
            disabled={disabled}
            className="border-border bg-transparent placeholder:text-muted-foreground focus:border-primary"
          />
          {ruleText && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 规则解释 */}
        {explanation && (
          <div className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {explanation}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {onPreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={!ruleText.trim() || disabled}
              className="border-border bg-transparent hover:bg-muted"
            >
              <Search className="mr-2 h-4 w-4" />
              <span>预览</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
