'use client';

/**
 * 素材命名区块 — 嵌入素材详情页
 * 显示当前命名状态 + 打开命名生成器 + 下载按钮
 */

import { useState, useCallback, useEffect } from 'react';
import { NamingGenerator } from './naming-generator';
import type { NamingFields } from '@/lib/naming/naming-rules';

const S = {
  card: {
    background: 'hsl(var(--muted))',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'hsl(var(--border))',
    borderRadius: 10,
    padding: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: 'hsl(var(--foreground))',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  namingText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#60A5FA',
    background: 'rgba(96,165,250,0.08)',
    padding: '8px 12px',
    borderRadius: 6,
    wordBreak: 'break-all' as const,
    lineHeight: 1.6,
  },
  noNaming: {
    fontSize: 13,
    color: 'hsl(var(--muted-foreground) / 0.6)',
    fontStyle: 'italic' as const,
    padding: '8px 0',
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  btn: {
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  btnPrimary: {
    background: '#F97316',
    border: 'none',
    color: '#fff',
  },
  btnOutline: {
    background: 'transparent',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--muted-foreground))',
  },
  btnSuccess: {
    background: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'rgba(34,197,94,0.2)',
    color: '#22c55e',
  },
  badge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 500,
  },
  badgeOk: {
    background: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
  },
  badgeWarn: {
    background: 'rgba(245,158,11,0.1)',
    color: '#f59e0b',
  },
  saving: {
    fontSize: 12,
    color: 'hsl(var(--muted-foreground) / 0.6)',
    marginTop: 8,
  },
} as const;

interface MaterialNamingSectionProps {
  materialId: string;
  materialNaming?: string;
  namingFields?: NamingFields;
  namingVerified?: boolean;
  /** 素材源文件 URL，用于下载 */
  srcUrl?: string;
}

export function MaterialNamingSection({
  materialId,
  materialNaming,
  namingFields: initialNamingFields,
  namingVerified,
  srcUrl,
}: MaterialNamingSectionProps) {
  const [naming, setNaming] = useState(materialNaming || '');
  const [fields, setFields] = useState<NamingFields | undefined>(initialNamingFields);
  const [verified, setVerified] = useState(namingVerified || false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamConfig, setTeamConfig] = useState<{
    products: string[];
    designers: string[];
    vendors: string[];
  } | undefined>();

  // 加载团队命名配置
  useEffect(() => {
    async function loadConfig() {
      try {
        // 从 localStorage 获取 teamId
        const teamId = localStorage.getItem('activeTeamId');
        if (!teamId) return;

        const res = await fetch(`/api/naming/config?teamId=${teamId}`);
        if (res.ok) {
          const data = await res.json();
          setTeamConfig({
            products: data.products || [],
            designers: data.designers || [],
            vendors: data.vendors || [],
          });
        }
      } catch {
        // 静默失败，使用默认选项
      }
    }
    loadConfig();
  }, []);

  const handleSave = useCallback(async (newNaming: string, newFields: NamingFields) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: materialId,
          materialNaming: newNaming,
          namingFields: newFields,
          namingVerified: true,
        }),
      });

      if (res.ok) {
        setNaming(newNaming);
        setFields(newFields);
        setVerified(true);
      }
    } catch (err) {
      console.error('Failed to save naming:', err);
    } finally {
      setSaving(false);
    }
  }, [materialId]);

  const handleDownload = useCallback(() => {
    if (!srcUrl || !naming) return;

    // 确定文件扩展名
    const ext = srcUrl.toLowerCase().includes('.mp4') ? '.mp4'
      : srcUrl.toLowerCase().includes('.mov') ? '.mov'
      : srcUrl.toLowerCase().includes('.webm') ? '.webm'
      : '.mp4';

    const fileName = naming + ext;

    // 创建下载链接
    const link = document.createElement('a');
    link.href = srcUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [srcUrl, naming]);

  return (
    <>
      <div style={S.card}>
        <div style={S.header}>
          <span style={S.title}>
            📋 素材命名
            {verified ? (
              <span style={{ ...S.badge, ...S.badgeOk }}>✓ 已命名</span>
            ) : (
              <span style={{ ...S.badge, ...S.badgeWarn }}>⚠ 未命名</span>
            )}
          </span>
        </div>

        {naming ? (
          <div style={S.namingText}>{naming}</div>
        ) : (
          <div style={S.noNaming}>尚未设置命名，请使用命名生成器创建标准命名</div>
        )}

        <div style={S.actions}>
          <button
            style={{ ...S.btn, ...(naming ? S.btnOutline : S.btnPrimary) }}
            onClick={() => setShowGenerator(true)}
          >
            {naming ? '修改命名' : '生成命名'}
          </button>

          {naming && srcUrl && (
            <button
              style={{ ...S.btn, ...S.btnSuccess }}
              onClick={handleDownload}
            >
              ⬇ 下载 (命名文件)
            </button>
          )}
        </div>

        {saving && <div style={S.saving}>保存中...</div>}
      </div>

      <NamingGenerator
        open={showGenerator}
        onClose={() => setShowGenerator(false)}
        onSave={handleSave}
        initialFields={fields}
        teamConfig={teamConfig}
      />
    </>
  );
}
