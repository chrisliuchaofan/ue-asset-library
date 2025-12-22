import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * 检查 Supabase 配置和连接状态
 * 
 * 访问: http://localhost:3000/api/check-supabase
 */
export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` 
        : null,
    },
    connection: null,
    table: null,
    sample: null,
  };

  // 1. 检查环境变量
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({
      ...checks,
      error: '环境变量未配置',
      message: '请在 .env.local 中配置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY',
    }, { status: 400 });
  }

  try {
    // 2. 测试连接
    const supabase = await createServerSupabaseClient();
    checks.connection = { status: 'success', message: 'Supabase client 创建成功' };

    // 3. 检查 assets 表
    const { data, error, count } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true });

    if (error) {
      checks.table = {
        status: 'error',
        message: error.message,
        code: error.code,
      };
      return NextResponse.json({
        ...checks,
        error: '查询 assets 表失败',
        suggestions: [
          '检查 assets 表是否存在',
          '检查表名是否正确（应该是 "assets"）',
          '检查 RLS (Row Level Security) 策略',
        ],
      });
    }

    checks.table = {
      status: 'success',
      count: count ?? 0,
      message: `assets 表存在，当前有 ${count ?? 0} 条记录`,
    };

    // 4. 获取示例数据
    if (count && count > 0) {
      const { data: sampleData, error: sampleError } = await supabase
        .from('assets')
        .select('*')
        .limit(1);

      if (!sampleError && sampleData && sampleData.length > 0) {
        const sample = sampleData[0] as Record<string, any>;
        checks.sample = {
          status: 'success',
          fields: Object.keys(sample),
          fieldCount: Object.keys(sample).length,
          preview: {
            id: sample.id as string,
            name: (sample.name as string) || (sample.title as string) || 'N/A',
            type: (sample.type as string) || (sample.file_type as string) || 'N/A',
          },
        };
      }
    } else {
      checks.sample = {
        status: 'empty',
        message: '表中没有数据',
      };
    }

    return NextResponse.json({
      ...checks,
      status: 'success',
      message: 'Supabase 配置正确，连接正常',
    });

  } catch (error: any) {
    return NextResponse.json({
      ...checks,
      error: '连接失败',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}




