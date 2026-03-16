'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Crown,
  Sparkles,
  ExternalLink,
  Loader2,
  Check,
} from 'lucide-react';

interface SubscriptionInfo {
  subscription: {
    planId: string;
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  plan: {
    id: string;
    name: string;
    priceDisplay: string;
    featureList: string[];
  };
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: '活跃', variant: 'default' },
  trialing: { label: '试用中', variant: 'secondary' },
  past_due: { label: '逾期', variant: 'destructive' },
  canceled: { label: '已取消', variant: 'outline' },
  incomplete: { label: '待完成', variant: 'secondary' },
};

export function SubscriptionCard() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [managingPortal, setManagingPortal] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      const res = await fetch('/api/billing/subscription');
      if (res.ok) {
        setInfo(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to create checkout:', err);
    } finally {
      setUpgrading(false);
    }
  }

  async function handleManageBilling() {
    setManagingPortal(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to open portal:', err);
    } finally {
      setManagingPortal(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>
    );
  }

  if (!info) return null;

  const { subscription, plan } = info;
  const isFree = subscription.planId === 'free';
  const statusInfo = STATUS_MAP[subscription.status] || STATUS_MAP.active;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isFree ? (
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Crown className="w-5 h-5 text-primary" />
          )}
          <h3 className="text-lg font-semibold text-foreground">
            {plan.name}
          </h3>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <span className="text-lg font-bold text-foreground">
          {plan.priceDisplay}
        </span>
      </div>

      {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
        <p className="text-sm text-warning mb-3">
          订阅将在 {new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-CN')} 到期后取消
        </p>
      )}

      <ul className="space-y-1.5 mb-5">
        {plan.featureList.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        {isFree ? (
          <Button onClick={handleUpgrade} disabled={upgrading} className="gap-1.5">
            {upgrading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Crown className="w-4 h-4" />
            )}
            升级到专业版
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleManageBilling}
            disabled={managingPortal}
            className="gap-1.5"
          >
            {managingPortal ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            管理订阅
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
