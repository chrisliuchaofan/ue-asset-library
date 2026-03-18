'use client';

import { BarChart3, TrendingUp, MousePointerClick, Eye, DollarSign, Users } from 'lucide-react';

interface MaterialMetricsSectionProps {
  consumption?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions?: number;
  roi?: number;
  newUserCost?: number;
  firstDayPayCount?: number;
  firstDayPayCost?: number;
  reportPeriod?: string;
}

const S = {
  section: {
    marginBottom: 24,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: 600 as const,
    color: 'hsl(var(--foreground))',
    margin: 0,
  },
  period: {
    fontSize: 12,
    color: 'hsl(var(--muted-foreground) / 0.4)',
    marginLeft: 'auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
  },
  card: {
    padding: '14px 16px',
    background: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 10,
  },
  cardLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'hsl(var(--muted-foreground) / 0.6)',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 600 as const,
    color: 'hsl(var(--foreground))',
    margin: 0,
  },
  empty: {
    padding: '32px 0',
    textAlign: 'center' as const,
    color: 'hsl(var(--muted-foreground) / 0.3)',
    fontSize: 13,
  },
} as const;

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return n.toLocaleString('zh-CN');
  return n.toString();
}

function formatCurrency(n: number | undefined): string {
  if (n === undefined || n === null) return '-';
  if (n >= 10000) return `¥${(n / 10000).toFixed(2)}万`;
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(n: number | undefined): string {
  if (n === undefined || n === null) return '-';
  return `${(n * 100).toFixed(2)}%`;
}

export function MaterialMetricsSection(props: MaterialMetricsSectionProps) {
  const hasAnyData = props.consumption || props.impressions || props.clicks ||
    props.ctr || props.cpc || props.cpm || props.conversions || props.roi ||
    props.newUserCost || props.firstDayPayCount || props.firstDayPayCost;

  if (!hasAnyData) {
    return (
      <div style={S.section}>
        <div style={S.header}>
          <BarChart3 style={{ width: 18, height: 18, color: 'hsl(var(--muted-foreground) / 0.6)' }} />
          <h3 style={S.title}>投放数据</h3>
        </div>
        <div style={S.empty}>暂无投放数据，上传周报后自动匹配回填</div>
      </div>
    );
  }

  const metrics = [
    { label: '消耗', value: formatCurrency(props.consumption), icon: DollarSign, show: props.consumption !== undefined },
    { label: '展示', value: formatNumber(props.impressions), icon: Eye, show: props.impressions !== undefined },
    { label: '点击', value: formatNumber(props.clicks), icon: MousePointerClick, show: props.clicks !== undefined },
    { label: 'CTR', value: formatPercent(props.ctr), icon: TrendingUp, show: props.ctr !== undefined },
    { label: 'CPC', value: formatCurrency(props.cpc), icon: DollarSign, show: props.cpc !== undefined },
    { label: 'CPM', value: formatCurrency(props.cpm), icon: DollarSign, show: props.cpm !== undefined },
    { label: '转化', value: formatNumber(props.conversions), icon: Users, show: props.conversions !== undefined },
    { label: 'ROI', value: props.roi !== undefined ? props.roi.toFixed(2) : '-', icon: TrendingUp, show: props.roi !== undefined },
    { label: '新增成本', value: formatCurrency(props.newUserCost), icon: DollarSign, show: props.newUserCost !== undefined },
    { label: '首日付费数', value: formatNumber(props.firstDayPayCount), icon: Users, show: props.firstDayPayCount !== undefined },
    { label: '首日付费成本', value: formatCurrency(props.firstDayPayCost), icon: DollarSign, show: props.firstDayPayCost !== undefined },
  ].filter(m => m.show);

  return (
    <div style={S.section}>
      <div style={S.header}>
        <BarChart3 style={{ width: 18, height: 18, color: '#F97316' }} />
        <h3 style={S.title}>投放数据</h3>
        {props.reportPeriod && (
          <span style={S.period}>数据周期: {props.reportPeriod}</span>
        )}
      </div>
      <div style={S.grid}>
        {metrics.map(m => (
          <div key={m.label} style={S.card}>
            <div style={S.cardLabel}>
              <m.icon style={{ width: 14, height: 14 }} />
              {m.label}
            </div>
            <p style={S.cardValue}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
