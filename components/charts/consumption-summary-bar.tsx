'use client';

import { useMemo } from 'react';
import type { Material } from '@/data/material.schema';
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

interface ConsumptionSummaryBarProps {
  materials: Material[];
}

export function ConsumptionSummaryBar({ materials }: ConsumptionSummaryBarProps) {
  const stats = useMemo(() => {
    const withConsumption = materials.filter(
      (m) => m.consumption !== undefined && m.consumption > 0
    );
    if (withConsumption.length === 0) return null;

    const totalConsumption = withConsumption.reduce(
      (sum, m) => sum + (m.consumption ?? 0),
      0
    );
    const avgRoi =
      withConsumption.filter((m) => m.roi !== undefined).length > 0
        ? withConsumption
            .filter((m) => m.roi !== undefined)
            .reduce((sum, m) => sum + (m.roi ?? 0), 0) /
          withConsumption.filter((m) => m.roi !== undefined).length
        : undefined;
    const totalConversions = withConsumption.reduce(
      (sum, m) => sum + (m.conversions ?? 0),
      0
    );

    return {
      count: withConsumption.length,
      totalConsumption,
      avgRoi,
      totalConversions,
    };
  }, [materials]);

  if (!stats) return null;

  const formatValue = (v: number) => {
    if (v >= 10000) return `${(v / 10000).toFixed(1)}w`;
    return v.toLocaleString('zh-CN');
  };

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
      <span className="flex items-center gap-1">
        <DollarSign className="w-3 h-3" />
        总消耗 {formatValue(stats.totalConsumption)}
      </span>
      {stats.avgRoi !== undefined && (
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          均 ROI {(stats.avgRoi * 100).toFixed(1)}%
        </span>
      )}
      {stats.totalConversions > 0 && (
        <span className="flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          总转化 {formatValue(stats.totalConversions)}
        </span>
      )}
      <span className="text-muted-foreground/60">
        ({stats.count} 个有数据)
      </span>
    </div>
  );
}
