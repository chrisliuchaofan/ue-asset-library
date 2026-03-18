'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ArrowRight, TrendingUp } from 'lucide-react';
import type { Material } from '@/data/material.schema';

interface TopConsumptionChartProps {
  materials: Material[];
  maxItems?: number;
}

function formatConsumption(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`;
  return value.toLocaleString('zh-CN');
}

export function TopConsumptionChart({ materials, maxItems = 5 }: TopConsumptionChartProps) {
  const topMaterials = useMemo(() => {
    return materials
      .filter((m) => m.consumption !== undefined && m.consumption > 0)
      .sort((a, b) => (b.consumption ?? 0) - (a.consumption ?? 0))
      .slice(0, maxItems)
      .map((m) => ({
        id: m.id,
        name: m.name.length > 10 ? m.name.substring(0, 10) + '...' : m.name,
        fullName: m.name,
        consumption: m.consumption ?? 0,
        roi: m.roi,
      }));
  }, [materials, maxItems]);

  if (topMaterials.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Top 消耗素材
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/materials">
                查看全部
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
            <DollarSign className="w-6 h-6 opacity-30" />
            <span className="text-sm">暂无消耗数据</span>
            <p className="text-xs text-muted-foreground/60 text-center max-w-[200px]">上传周报数据后，这里将展示消耗 Top 素材</p>
            <Button variant="outline" size="sm" asChild className="mt-1 text-xs">
              <Link href="/weekly-reports">
                上传数据
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Top 消耗素材
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href="/materials">
              查看全部
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topMaterials}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="20%"
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatConsumption(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: any, _: any, entry: any) => [
                  formatConsumption(value),
                  entry.payload.fullName,
                ]}
              />
              <Bar
                dataKey="consumption"
                fill="hsl(262, 83%, 58%)"
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* ROI 简要列表 */}
        <div className="mt-3 space-y-1.5">
          {topMaterials.map((m, idx) => (
            <Link
              key={m.id}
              href={`/materials/${m.id}`}
              className="flex items-center gap-2 text-xs hover:bg-muted/50 rounded px-2 py-1 transition-colors group"
            >
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1 truncate text-foreground group-hover:text-primary transition-colors">
                {m.fullName}
              </span>
              <span className="text-muted-foreground shrink-0">
                {formatConsumption(m.consumption)}
              </span>
              {m.roi !== undefined && (
                <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
                  <TrendingUp className="w-3 h-3" />
                  {(m.roi * 100).toFixed(0)}%
                </span>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
