'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface MaterialDataChartProps {
  consumption?: number;
  roi?: number;
  conversions?: number;
}

export function MaterialDataChart({ consumption, roi, conversions }: MaterialDataChartProps) {
  const hasData = consumption !== undefined || roi !== undefined || conversions !== undefined;

  const chartData = useMemo(() => {
    if (!hasData) return [];
    const data = [];
    if (consumption !== undefined) {
      data.push({
        name: '消耗',
        value: consumption,
        displayValue: consumption >= 10000
          ? `${(consumption / 10000).toFixed(1)}w`
          : consumption.toLocaleString('zh-CN'),
        fill: 'hsl(262, 83%, 58%)', // 主色紫
      });
    }
    if (conversions !== undefined) {
      data.push({
        name: '转化',
        value: conversions,
        displayValue: conversions.toLocaleString('zh-CN'),
        fill: 'hsl(24, 94%, 53%)', // CTA 橙
      });
    }
    if (roi !== undefined) {
      data.push({
        name: 'ROI',
        value: roi * 100,
        displayValue: `${(roi * 100).toFixed(1)}%`,
        fill: 'hsl(142, 71%, 45%)', // 绿色
      });
    }
    return data;
  }, [consumption, roi, conversions, hasData]);

  if (!hasData || chartData.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          数据可视化
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(_: any, __: any, entry: any) => [
                  entry.payload.displayValue,
                  entry.payload.name,
                ]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
