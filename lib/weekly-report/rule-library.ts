/**
 * 规则库管理服务
 * 管理用户的自定义筛选规则
 */

import { getSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth-config';
import { createServerSupabaseClient as createClient } from '@/lib/supabase/server';

/**
 * 筛选规则接口
 */
export interface FilterRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  ruleText: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建规则的请求数据
 */
export interface CreateFilterRuleRequest {
  name: string;
  description?: string;
  ruleText: string;
}

/**
 * 更新规则的请求数据
 */
export interface UpdateFilterRuleRequest {
  name?: string;
  description?: string;
  ruleText?: string;
}

/**
 * 规则库服务类
 */
export class RuleLibraryService {
  /**
   * 获取用户的规则列表
   */
  async getRules(userId: string): Promise<FilterRule[]> {
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('user_filter_rules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[RuleLibrary] 获取规则列表失败:', error);
      throw new Error(`获取规则列表失败: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description || undefined,
      ruleText: row.rule_text,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * 获取单个规则
   */
  async getRule(ruleId: string, userId: string): Promise<FilterRule | null> {
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('user_filter_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 未找到记录
        return null;
      }
      console.error('[RuleLibrary] 获取规则失败:', error);
      throw new Error(`获取规则失败: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description || undefined,
      ruleText: data.rule_text,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * 创建新规则
   */
  async addRule(userId: string, rule: CreateFilterRuleRequest): Promise<FilterRule> {
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('user_filter_rules')
      .insert({
        user_id: userId,
        name: rule.name,
        description: rule.description || null,
        rule_text: rule.ruleText,
      })
      .select()
      .single();

    if (error) {
      console.error('[RuleLibrary] 创建规则失败:', error);
      throw new Error(`创建规则失败: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description || undefined,
      ruleText: data.rule_text,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * 更新规则
   */
  async updateRule(ruleId: string, userId: string, updates: UpdateFilterRuleRequest): Promise<FilterRule> {
    const supabase = (await createClient()) as any;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description || null;
    }
    if (updates.ruleText !== undefined) {
      updateData.rule_text = updates.ruleText;
    }

    const { data, error } = await supabase
      .from('user_filter_rules')
      .update(updateData)
      .eq('id', ruleId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[RuleLibrary] 更新规则失败:', error);
      throw new Error(`更新规则失败: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description || undefined,
      ruleText: data.rule_text,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * 删除规则
   */
  async deleteRule(ruleId: string, userId: string): Promise<void> {
    const supabase = (await createClient()) as any;

    const { error } = await supabase
      .from('user_filter_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', userId);

    if (error) {
      console.error('[RuleLibrary] 删除规则失败:', error);
      throw new Error(`删除规则失败: ${error.message}`);
    }
  }

  /**
   * 获取默认规则列表
   */
  getDefaultRules(): Omit<FilterRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        name: '微小消耗Top10',
        description: '微信小游戏的素材，消耗排名前十',
        ruleText: '微小的素材，消耗排名前十',
      },
      {
        name: '抖小消耗Top10',
        description: '抖音小游戏的素材，消耗排名前十',
        ruleText: '抖小的素材，消耗排名前十',
      },
      {
        name: '微小和抖小Top10',
        description: '微信小游戏和抖音小游戏，消耗排名前十，排除空素材名',
        ruleText: '微小和抖小的消耗排名前十，去掉素材名为空',
      },
      {
        name: '广点通微小Top20',
        description: '广点通平台的微信小游戏，消耗排名前20',
        ruleText: '广点通的微小素材，消耗排名前20',
      },
      {
        name: '25年7月后微小',
        description: '微信小游戏，时间晚于25年7月以后，消耗排名前十',
        ruleText: '微小的素材，消耗排名前十，时间晚于25年7月以后',
      },
      {
        name: '试玩素材',
        description: '试玩的素材',
        ruleText: '试玩的素材',
      },
      {
        name: '广点通消耗Top10',
        description: '广点通平台的所有素材，消耗排名前十',
        ruleText: '广点通的素材，消耗排名前十',
      },
      {
        name: '头条抖小Top10',
        description: '头条平台的抖音小游戏，消耗排名前十',
        ruleText: '头条的抖小素材，消耗排名前十',
      },
    ];
  }

  /**
   * 初始化用户的默认规则（如果用户还没有规则）
   */
  async initializeDefaultRules(userId: string): Promise<void> {
    const existingRules = await this.getRules(userId);

    // 如果用户已经有规则，不初始化
    if (existingRules.length > 0) {
      return;
    }

    // 添加默认规则
    const defaultRules = this.getDefaultRules();
    for (const rule of defaultRules) {
      try {
        await this.addRule(userId, rule);
      } catch (error) {
        console.error(`[RuleLibrary] 初始化默认规则失败 (${rule.name}):`, error);
        // 继续添加其他规则，不中断
      }
    }
  }
}

// 导出单例实例
export const ruleLibraryService = new RuleLibraryService();
