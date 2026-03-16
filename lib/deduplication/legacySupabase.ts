
import { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { AuditRule, User, AnalysisReport, HistoryRecord, ChatMessage } from './types';
import { extractErrorMessage } from './aiService';
import { devLog, devWarn } from './utils/devLog';

// 从环境变量获取 Supabase 配置（禁止硬编码默认值，未配置时仅从 .env.local 读取）
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
  devWarn('⚠️ Supabase 配置缺失，请设置 SUPABASE_URL 与 SUPABASE_ANON_KEY（或 VITE_/NEXT_PUBLIC_ 前缀）于 .env.local');
}

// 单例模式：确保只创建一个 Supabase 客户端实例
// 使用全局对象存储，避免热重载时重复创建
const GLOBAL_SUPABASE_KEY = '__super_insight_supabase_client__';

function getSupabaseClient(): SupabaseClient {
  return createBrowserSupabaseClient() as any;
}

export const supabase = getSupabaseClient();

// 查询结果缓存
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const DEFAULT_CACHE_TTL = 60000; // 默认缓存1分钟

// 优化的重试逻辑（指数退避 + 超时控制）
async function withRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, // 增加重试次数（从2次增加到3次）
  delay = 1000, // 初始延迟1秒
  timeout = 30000 // 增加总超时时间（从10秒增加到30秒）
): Promise<T> {
  const startTime = Date.now();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 使用 Promise.race 实现超时控制（每次尝试的超时时间）
      const attemptTimeout = timeout / (retries + 1); // 平均分配超时时间
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), attemptTimeout);
      });
      
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (err: any) {
      const errorMsg = extractErrorMessage(err);
      const isNetworkError = errorMsg.includes('fetch') || 
                            errorMsg.includes('timeout') ||
                            errorMsg.includes('CONNECTION_RESET') ||
                            errorMsg.includes('ECONNREFUSED') ||
                            err?.status >= 500 ||
                            err?.code === 'ECONNREFUSED' ||
                            err?.code === 'PGRST301'; // Supabase 连接错误
      
      // 检查是否总超时
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        console.error(`❌ 操作总超时（${timeout}ms），已尝试 ${attempt + 1} 次`);
        throw new Error(`Operation timeout after ${attempt + 1} attempts (${elapsed}ms)`);
      }
      
      // 如果是最后一次尝试或不是网络错误，直接抛出
      if (attempt === retries || !isNetworkError) {
        if (attempt === retries) {
          console.error(`❌ 操作失败，已重试 ${retries + 1} 次:`, errorMsg);
        }
        throw err;
      }
      
      // 指数退避：1s, 2s, 4s
      const backoffDelay = delay * Math.pow(2, attempt);
      devWarn(`⚠️ 操作失败，${backoffDelay}ms 后重试... (${attempt + 1}/${retries + 1})`, {
        error: errorMsg.substring(0, 100),
        elapsed: `${elapsed}ms`
      });
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw new Error('All retries exhausted');
}

// 带缓存的查询函数
async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
  // 检查缓存
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  
  // 执行查询
  const data = await fn();
  
  // 更新缓存
  queryCache.set(key, { data, timestamp: Date.now(), ttl });
  
  // 清理过期缓存（每100次查询清理一次）
  if (queryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of queryCache.entries()) {
      if (now - v.timestamp > v.ttl) {
        queryCache.delete(k);
      }
    }
  }
  
  return data;
}

// 连接状态缓存（避免频繁检查）
let connectionCache: { status: 'online' | 'offline' | 'checking'; timestamp: number } | null = null;
const CONNECTION_CACHE_TTL = 30000; // 30秒缓存

export const dbService = {
  async checkConnection(force = false): Promise<boolean> {
    // 使用缓存，避免频繁检查
    if (!force && connectionCache) {
      const age = Date.now() - connectionCache.timestamp;
      if (age < CONNECTION_CACHE_TTL) {
        return connectionCache.status === 'online';
      }
    }

    try {
      // 优化：使用更轻量的健康检查（只检查一个表）
      // 增加超时时间到10秒，并允许重试
      const checkPromise = supabase
        .from('audit_rules')
        .select('id')
        .limit(1);
      
      const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 10000); // 增加到10秒
        });
      
      const result = await Promise.race([checkPromise, timeoutPromise]) as any;
      
      // 即使查询返回空数据（PGRST116），也认为连接正常（表存在）
      const isOnline = !result.error || result.error?.code === 'PGRST116'; // PGRST116 = not found (表存在但无数据)
      
      // 更新缓存
      connectionCache = {
        status: isOnline ? 'online' : 'offline',
        timestamp: Date.now()
      };
      
      if (isOnline) {
        devLog('✅ 数据库连接检查成功');
      } else {
        devWarn('⚠️ 数据库连接检查失败:', result.error);
      }
      
      return isOnline;
    } catch (e: any) {
      const errorMsg = e.message || String(e);
      devWarn('⚠️ 数据库连接检查超时或失败:', errorMsg);
      
      // 即使检查失败，也不立即标记为离线（可能是网络临时问题）
      // 只有在明确错误时才标记为离线
      const isDefiniteError = errorMsg.includes('permission') || 
                              errorMsg.includes('authentication') ||
                              errorMsg.includes('invalid');
      
      connectionCache = {
        status: isDefiniteError ? 'offline' : 'online', // 网络问题时不标记为离线
        timestamp: Date.now()
      };
      
      // 网络问题返回 true，允许尝试查询
      return !isDefiniteError;
    }
  },
  
  // 清除连接缓存（在需要时强制重新检查）
  clearCache() {
    connectionCache = null;
  }
};

export const userService = {
  async login(username: string, password: string): Promise<User | null> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();
      
      if (error) throw error;
      return data as User;
    });
  },

  async getAllUsers(): Promise<User[]> {
    return withRetry(async () => {
      const { data, error } = await supabase.from('users').select('*').order('audit_count', { ascending: false });
      if (error) throw error;
      return (data as User[] || []);
    });
  },

  async incrementAuditCount(userId: string | number): Promise<void> {
    try {
      // 跳过 temp-admin-id（临时管理员ID，不存在于 users 表）
      const userIdStr = userId.toString();
      if (userIdStr === 'temp-admin-id') {
        devLog('⚠️ 跳过 temp-admin-id 的审核计数更新（临时用户）');
        return;
      }
      
      const { data: user, error } = await supabase
        .from('users')
        .select('audit_count')
        .eq('id', userIdStr)
        .single();
        
      if (error) {
        devWarn('⚠️ 查询用户失败，跳过审核计数更新:', error.message);
        return;
      }
      
      if (user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ audit_count: (user.audit_count || 0) + 1 })
          .eq('id', userIdStr);
          
        if (updateError) {
          devWarn('⚠️ 更新审核计数失败:', updateError.message);
        }
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      devWarn('⚠️ incrementAuditCount 异常:', errorMsg);
      // 不抛出错误，避免影响主流程
    }
  },

  /** 新增用户（管理中心使用），用户名不可重复 */
  async createUser(params: {
    username: string;
    password: string;
    nickname: string;
    role?: 'admin' | 'auditor';
    department?: string;
    function?: string;
  }): Promise<User | null> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: params.username.trim(),
          password: params.password,
          nickname: params.nickname.trim() || params.username.trim(),
          role: params.role ?? 'auditor',
          department: params.department?.trim() ?? '',
          function: params.function?.trim() ?? '',
          audit_count: 0
        }])
        .select()
        .single();
      if (error) throw error;
      return data as User;
    });
  },

  /** 更新用户（管理中心编辑），仅更新传入的字段 */
  async updateUser(
    id: string | number,
    params: { nickname?: string; role?: 'admin' | 'auditor'; department?: string; function?: string; password?: string }
  ): Promise<User | null> {
    return withRetry(async () => {
      const payload: Record<string, unknown> = {};
      if (params.nickname !== undefined) payload.nickname = params.nickname.trim();
      if (params.role !== undefined) payload.role = params.role;
      if (params.department !== undefined) payload.department = params.department.trim();
      if (params.function !== undefined) payload.function = params.function.trim();
      if (params.password !== undefined && params.password !== '') payload.password = params.password;
      if (Object.keys(payload).length === 0) {
        const { data } = await supabase.from('users').select('*').eq('id', id).single();
        return data as User;
      }
      const { data, error } = await supabase.from('users').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data as User;
    });
  }
};

export const historyService = {
  async saveReport(userId: string | number, fileName: string, fileType: string, report: AnalysisReport): Promise<string | null> {
    return withRetry(async () => {
      try {
        const insertData = {
          user_id: userId.toString(),
          file_name: fileName,
          file_type: fileType,
          total_score: report.total_score,
          is_s_tier: report.is_s_tier,
          critique_summary: report.critique_summary,
          dimensions: report.dimensions,
          detailed_analysis: report.detailed_analysis,
          aesthetic_verdict: report.aesthetic_verdict,
          creative_verdict: report.creative_verdict,
          hook_strength: report.hook_strength,
          visual_style: report.visual_style,
          flow_analysis: report.flow_analysis || null, // Phase 1.2: 心流分析结果
        };

        devLog('Saving report to database:', {
          userId: userId.toString(),
          fileName,
          fileType,
          hasDetailedAnalysis: !!report.detailed_analysis
        });

        const { data, error } = await supabase
          .from('audit_history')
          .insert([insertData])
          .select()
          .single();

        if (error) {
          const readableError = extractErrorMessage(error);
          console.error("Save report failed:", {
            error: readableError,
            fullError: error,
            userId: userId.toString(),
            fileName,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint
          });
          throw new Error(readableError);
        }

        devLog('Report saved successfully:', {
          reportId: data?.id,
          userId: userId.toString()
        });

        return data ? data.id : null;
      } catch (err: any) {
        const errorMsg = extractErrorMessage(err);
        console.error('saveReport error:', {
          error: errorMsg,
          userId: userId.toString(),
          fileName,
          fullError: err
        });
        throw err;
      }
    });
  },

  async getUserHistory(userId: string | number, limit = 100, offset = 0): Promise<HistoryRecord[]> {
    return withRetry(async () => {
      try {
        const userIdStr = userId.toString();
        
        devLog('📋 开始查询 audit_history 表...', {
          userId: userIdStr,
          userIdType: typeof userId,
          limit,
          offset
        });
        
        // 构建基础查询（不先查询表结构，减少一次请求）
        let query = supabase
          .from('audit_history')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1); // 添加分页支持
        
        // 根据用户类型设置过滤条件
        if (userIdStr !== 'temp-admin-id') {
          query = query.eq('user_id', userIdStr);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('❌ audit_history 数据查询失败:', {
            error: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint,
            userId: userIdStr
          });
          
          // 如果是普通用户且查询失败，尝试降级方案（兼容旧数据）
          if (userIdStr !== 'temp-admin-id') {
            devLog('⚠️ 用户查询失败，尝试降级方案...');
            const fallbackQuery = supabase
              .from('audit_history')
              .select('*')
              .eq('user_id', 'temp-admin-id')
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1);
            
            const { data: fallbackData, error: fallbackError } = await fallbackQuery;
            
            if (!fallbackError && fallbackData && fallbackData.length > 0) {
              devLog(`✅ 使用降级方案，共 ${fallbackData.length} 条记录`);
              return (fallbackData || []).map((row: any) => ({
                ...row,
                feedback: row.feedback || null
              })) as HistoryRecord[];
            }
            
            devWarn('⚠️ 降级方案也失败，返回空数组');
          }
          
          // 抛出错误，让调用者知道查询失败
          throw error;
        }
        
        const records = (data || []).map((row: any) => ({
          ...row,
          feedback: row.feedback || null
        })) as HistoryRecord[];
        
        devLog(`✅ audit_history 查询成功，共 ${records.length} 条记录`);
        
        return records;
      } catch (err: any) {
        const errorMsg = extractErrorMessage(err);
        console.error('❌ getUserHistory 失败:', {
          userId,
          error: errorMsg,
          fullError: err,
          errorCode: err?.code,
          errorDetails: err?.details
        });
        // 抛出错误，让调用者处理（而不是静默返回空数组）
        throw err;
      }
    });
  },

  async getReportDetail(reportId: string): Promise<HistoryRecord> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('audit_history')
        .select('*') // 获取完整数据，包括 detailed_analysis
        .eq('id', reportId)
        .single();
      
      if (error) throw error;
      return data as HistoryRecord;
    });
  },

  async deleteReport(reportId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('audit_history')
        .delete()
        .eq('id', reportId);
      if (error) throw error;
    });
  },

  async updateFeedback(reportId: string, feedback: 'like' | 'dislike' | null): Promise<void> {
    return withRetry(async () => {
      // 先检查 feedback 字段是否存在
      const testQuery = await supabase.from('audit_history').select('*').limit(1);
      if (testQuery.error) {
        devWarn('Cannot check feedback field, skipping update:', testQuery.error);
        return; // 如果表不存在或无法查询，直接返回
      }
      
      const sampleRow = testQuery.data?.[0];
      const hasFeedbackField = sampleRow && 'feedback' in sampleRow;
      
      if (!hasFeedbackField) {
        devWarn('feedback field does not exist in audit_history table, skipping update');
        return; // 如果字段不存在，直接返回，不抛出错误
      }
      
      const { error } = await supabase
        .from('audit_history')
        .update({ feedback })
        .eq('id', reportId);
      if (error) throw error;
    });
  }
};

export const ruleService = {
  async getAllRules(useCache = true): Promise<AuditRule[]> {
    const cacheKey = 'audit_rules_all';
    
    // 查询函数（与数据库调试页面保持一致）
    const fetchRules = async (): Promise<AuditRule[]> => {
      devLog('📋 开始查询 audit_rules 表...');
      
      try {
        // 直接查询所有数据（不先查询表结构，减少一次请求）
        const { data, error } = await supabase
          .from('audit_rules')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ audit_rules 查询失败:', {
            error: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint
          });
          throw error;
        }
        
        const rules = (data as AuditRule[]) || [];
        devLog(`✅ audit_rules 查询成功，共 ${rules.length} 条记录`);
        
        return rules;
      } catch (err: any) {
        const errorMsg = extractErrorMessage(err);
        console.error('❌ getAllRules 失败:', {
          error: errorMsg,
          fullError: err,
          errorCode: err?.code,
          errorDetails: err?.details
        });
        throw err;
      }
    };
    
    if (useCache) {
      return withCache(cacheKey, () => withRetry(fetchRules), 300000);
    }
    
    return withRetry(fetchRules);
  },

  async createRule(rule: Omit<AuditRule, 'id' | 'created_at'> & { embedding: number[] }): Promise<AuditRule> {
    return withRetry(async () => {
      // 清除规则列表缓存
      queryCache.delete('audit_rules_all');
      
      const { data, error } = await supabase
        .from('audit_rules')
        .insert([{
          name: rule.name,
          category: rule.category,
          system_prompt: rule.system_prompt,
          embedding: rule.embedding,
          author_id: rule.author_id?.toString(),
          author_name: rule.author_name,
          // Phase 1.3: 结构化字段
          material_type: rule.material_type || null,
          game_type: rule.game_type || null,
          tags: rule.tags || null,
          positive_examples: rule.positive_examples || null,
          negative_examples: rule.negative_examples || null,
          deduction_rules: rule.deduction_rules || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data as AuditRule;
    });
  },

  /**
   * 向量检索规则。threshold 越高越严格，count 为返回条数上限。
   * 若服务端 RPC 未更新，仍会使用默认 0.7 / 5。
   */
  async searchRules(
    embedding: number[],
    matchThreshold: number = 0.7,
    matchCount: number = 5
  ): Promise<AuditRule[]> {
    if (!embedding || embedding.every(v => v === 0)) {
      devWarn('⚠️ searchRules: Embedding 为空或全零，跳过检索');
      return [];
    }
    
    // 检查维度（常见维度：768, 1024, 1536, 2048）
    const dimension = embedding.length;
    if (![768, 1024, 1536, 2048].includes(dimension)) {
      const errorMsg = `⚠️ Embedding 维度不匹配: ${dimension}。数据库期望 768/1024/1536/2048 维。请检查数据库迁移是否已执行。`;
      devWarn(errorMsg);
      console.error('Embedding 维度错误:', {
        actual: dimension,
        expected: [768, 1024, 1536, 2048],
        embedding: embedding.slice(0, 5), // 只打印前5个值
      });
      // 不抛出错误，返回空数组，让流程继续（使用默认规则）
      return [];
    }
    
    try {
      const { data, error } = await supabase.rpc('match_rules', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
      });
      
      if (error) {
        const errorMsg = `规则检索失败: ${error.message || JSON.stringify(error)}`;
        devWarn('⚠️ searchRules 错误:', error);
        console.error('match_rules RPC 错误详情:', {
          error,
          embeddingDimension: dimension,
          matchThreshold,
          matchCount,
        });
        // 不抛出错误，返回空数组，让流程继续（使用默认规则）
        return [];
      }
      
      devLog(`✅ searchRules 成功: 找到 ${data?.length || 0} 个匹配规则`);
      return (data || []) as AuditRule[];
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      devWarn('⚠️ searchRules 异常:', errorMsg);
      console.error('searchRules 异常详情:', {
        error: e,
        embeddingDimension: dimension,
      });
      // 不抛出错误，返回空数组，让流程继续（使用默认规则）
      return [];
    }
  },

  async updateRule(id: string | number, updates: Partial<AuditRule>): Promise<void> {
    return withRetry(async () => {
      // 清除规则列表缓存
      queryCache.delete('audit_rules_all');
      
      const { error } = await supabase.from('audit_rules').update(updates).eq('id', id);
      if (error) throw error;
    });
  },

  async deleteRule(id: string | number): Promise<void> {
    return withRetry(async () => {
      // 清除规则列表缓存
      queryCache.delete('audit_rules_all');
      
      const { error } = await supabase.from('audit_rules').delete().eq('id', id);
      if (error) throw error;
    });
  }
};

export const conversationService = {
  async saveConversation(userId: string | number, title: string, messages: ChatMessage[], currentResult: string): Promise<string | null> {
    return withRetry(async () => {
      // 只保存文本消息，过滤掉文件消息（因为文件URL会失效）
      const textMessages = messages
        .filter(msg => msg.type === 'text')
        .map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          type: msg.type,
          status: msg.status
        }));

      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          user_id: userId.toString(),
          title,
          messages: textMessages,
          current_result: currentResult || null
        }])
        .select()
        .single();

      if (error) throw error;
      return data ? data.id : null;
    });
  },

  async getUserConversations(userId: string | number): Promise<Array<{ id: string; title: string; created_at: string; message_count: number }>> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at, messages')
        .eq('user_id', userId.toString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(conv => ({
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        message_count: Array.isArray(conv.messages) ? conv.messages.length : 0
      }));
    });
  },

  async getConversationDetail(conversationId: string): Promise<{ messages: ChatMessage[]; currentResult: string } | null> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('messages, current_result')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        messages: (data.messages || []) as ChatMessage[],
        currentResult: data.current_result || ''
      };
    });
  },

  async deleteConversation(conversationId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
      if (error) throw error;
    });
  }
};
