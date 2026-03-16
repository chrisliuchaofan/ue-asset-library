'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialStatusBadge } from './material-status-badge';
import { MATERIAL_STATUS_LABELS } from '@/data/material.schema';
import { Pencil, Check, X, Rocket, Loader2 } from 'lucide-react';

interface MaterialLaunchInfoProps {
  materialId: string;
  status?: string;
  platformName?: string;
  platformId?: string;
  campaignId?: string;
  adAccount?: string;
  launchDate?: string;
}

export function MaterialLaunchInfo({
  materialId,
  status: initialStatus,
  platformName: initialPlatformName,
  platformId: initialPlatformId,
  campaignId: initialCampaignId,
  adAccount: initialAdAccount,
  launchDate: initialLaunchDate,
}: MaterialLaunchInfoProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [status, setStatus] = useState(initialStatus || 'draft');
  const [platformName, setPlatformName] = useState(initialPlatformName || '');
  const [platformId, setPlatformId] = useState(initialPlatformId || '');
  const [campaignId, setCampaignId] = useState(initialCampaignId || '');
  const [adAccount, setAdAccount] = useState(initialAdAccount || '');
  const [launchDate, setLaunchDate] = useState(initialLaunchDate || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: materialId,
          platformName,
          platformId,
          campaignId,
          adAccount,
          launchDate: launchDate || undefined,
        }),
      });
      if (res.ok) {
        setEditing(false);
      }
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/materials/${materialId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
      }
    } catch (err) {
      console.error('状态更新失败:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 状态流转按钮
  const nextStatusAction = (() => {
    switch (status) {
      case 'draft': return { label: '提交审核', next: 'reviewing' };
      case 'reviewing': return { label: '标记通过', next: 'approved' };
      case 'approved': return { label: '标记已投放', next: 'published' };
      default: return null;
    }
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            投放信息
          </CardTitle>
          <div className="flex items-center gap-2">
            <MaterialStatusBadge status={status} />
            {nextStatusAction && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                disabled={updatingStatus}
                onClick={() => handleStatusChange(nextStatusAction.next)}
              >
                {updatingStatus ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : null}
                {nextStatusAction.label}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!editing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">平台素材名</span>
                <p className="font-medium mt-0.5">{platformName || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">平台素材ID</span>
                <p className="font-medium mt-0.5">{platformId || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">计划ID</span>
                <p className="font-medium mt-0.5">{campaignId || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">投放账户</span>
                <p className="font-medium mt-0.5">{adAccount || '-'}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs mt-2"
              onClick={() => setEditing(true)}
            >
              <Pencil className="w-3 h-3 mr-1" />
              {platformName ? '编辑投放信息' : '回填投放信息'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">平台素材名</Label>
                <Input
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="投放平台使用的素材名称"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">平台素材ID</Label>
                <Input
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  placeholder="平台分配的素材ID"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">计划ID</Label>
                <Input
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  placeholder="关联的广告计划"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">投放账户</Label>
                <Input
                  value={adAccount}
                  onChange={(e) => setAdAccount(e.target.value)}
                  placeholder="投放账户名"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
                <X className="w-3 h-3 mr-1" />
                取消
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                保存
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
