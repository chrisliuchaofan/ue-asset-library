'use client';

/**
 * 素材命名生成器
 * 11标签结构化命名表单 + 实时预览 + 校验
 */

import { useState, useEffect, useCallback } from 'react';
import {
  NamingFields,
  generateNaming,
  validateNaming,
  getDefaultNamingFields,
  getTodayDate,
  SOURCE_OPTIONS,
  MATERIAL_TYPE_OPTIONS,
  CORE_CONTENT_OPTIONS,
  VOICEOVER_OPTIONS,
  FORMAT_OPTIONS,
} from '@/lib/naming/naming-rules';

// ==================== 样式常量 ====================

const S = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    maxWidth: 720,
    maxHeight: '90vh',
    overflow: 'auto' as const,
    padding: 24,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginBottom: 16,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    marginBottom: 16,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 500,
  },
  input: {
    background: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    outline: 'none',
    width: '100%',
  },
  select: {
    background: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '8px 10px',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
  },
  preview: {
    background: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#60A5FA',
    wordBreak: 'break-all' as const,
    lineHeight: 1.6,
  },
  validBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 4,
    marginTop: 8,
  },
  validOk: {
    background: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
  },
  validErr: {
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  btnCancel: {
    padding: '8px 16px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    cursor: 'pointer',
  },
  btnSave: {
    padding: '8px 20px',
    borderRadius: 6,
    background: '#F97316',
    border: 'none',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSaveDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  errorList: {
    marginTop: 8,
    paddingLeft: 16,
  },
  errorItem: {
    fontSize: 12,
    color: '#ef4444',
    lineHeight: 1.6,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
} as const;

// ==================== 组件 Props ====================

interface NamingGeneratorProps {
  open: boolean;
  onClose: () => void;
  onSave: (naming: string, fields: NamingFields) => void;
  initialFields?: Partial<NamingFields>;
  /** 团队配置的下拉选项 */
  teamConfig?: {
    products: string[];
    designers: string[];
    vendors: string[];
  };
}

// ==================== 组件 ====================

export function NamingGenerator({
  open,
  onClose,
  onSave,
  initialFields,
  teamConfig,
}: NamingGeneratorProps) {
  const [fields, setFields] = useState<NamingFields>(() => ({
    ...getDefaultNamingFields(),
    ...initialFields,
  }));

  const [validation, setValidation] = useState(() => validateNaming(fields));

  // 重新校验
  useEffect(() => {
    setValidation(validateNaming(fields));
  }, [fields]);

  // 初始化 fields
  useEffect(() => {
    if (open && initialFields) {
      setFields(prev => ({ ...prev, ...initialFields }));
    }
  }, [open, initialFields]);

  const updateField = useCallback((key: keyof NamingFields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!validation.valid) return;
    onSave(validation.naming, fields);
    onClose();
  }, [validation, fields, onSave, onClose]);

  if (!open) return null;

  const products = teamConfig?.products?.length ? teamConfig.products : ['造化', '三冰', '次神'];
  const designers = teamConfig?.designers || [];

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <span style={S.title}>素材命名生成器</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* 基础信息 */}
        <div style={S.section}>
          <div style={S.sectionTitle}>基础信息</div>
          <div style={S.grid}>
            {/* 日期 */}
            <div style={S.fieldGroup}>
              <label style={S.label}># 日期 (YYMMDD)</label>
              <input
                style={S.input}
                value={fields.date}
                onChange={e => updateField('date', e.target.value)}
                placeholder="260316"
                maxLength={6}
              />
            </div>

            {/* 来源 */}
            <div style={S.fieldGroup}>
              <label style={S.label}>1 素材来源</label>
              <select
                style={S.select}
                value={fields.source.startsWith('W') && fields.source.length > 1 ? 'W' : fields.source}
                onChange={e => {
                  const v = e.target.value;
                  if (v === 'W') {
                    updateField('source', 'W');
                  } else {
                    updateField('source', v);
                  }
                }}
              >
                {SOURCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 外包商名（来源=W时显示） */}
            {fields.source.startsWith('W') && fields.source !== 'WZ' && (
              <div style={S.fieldGroup}>
                <label style={S.label}>外包商</label>
                {teamConfig?.vendors?.length ? (
                  <select
                    style={S.select}
                    value={fields.source.length > 1 ? fields.source.substring(1) : ''}
                    onChange={e => updateField('source', 'W' + e.target.value)}
                  >
                    <option value="">选择外包商</option>
                    {teamConfig.vendors.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={S.input}
                    value={fields.source.length > 1 ? fields.source.substring(1) : ''}
                    onChange={e => updateField('source', 'W' + e.target.value)}
                    placeholder="外包商名称"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* 人员信息 */}
        <div style={S.section}>
          <div style={S.sectionTitle}>人员信息</div>
          <div style={S.grid}>
            <div style={S.fieldGroup}>
              <label style={S.label}>2 设计师</label>
              {designers.length > 0 ? (
                <select
                  style={S.select}
                  value={fields.designer}
                  onChange={e => updateField('designer', e.target.value)}
                >
                  <option value="">选择设计师</option>
                  {designers.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              ) : (
                <input
                  style={S.input}
                  value={fields.designer}
                  onChange={e => updateField('designer', e.target.value)}
                  placeholder="设计师名"
                />
              )}
            </div>

            <div style={S.fieldGroup}>
              <label style={S.label}>3 创意人</label>
              <input
                style={S.input}
                value={fields.creative}
                onChange={e => updateField('creative', e.target.value)}
                placeholder="创意策划人"
              />
            </div>

            <div style={S.fieldGroup}>
              <label style={S.label}>4 素材类型</label>
              <select
                style={S.select}
                value={fields.materialType}
                onChange={e => updateField('materialType', e.target.value)}
              >
                {MATERIAL_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 创意方向 */}
        <div style={S.section}>
          <div style={S.sectionTitle}>创意方向</div>
          <div style={S.grid}>
            <div style={S.fieldGroup}>
              <label style={S.label}>5 方向1</label>
              <input
                style={S.input}
                value={fields.direction1}
                onChange={e => updateField('direction1', e.target.value)}
                placeholder="/ 或具体方向"
              />
            </div>

            <div style={S.fieldGroup}>
              <label style={S.label}>6 方向2</label>
              <input
                style={S.input}
                value={fields.direction2}
                onChange={e => updateField('direction2', e.target.value)}
                placeholder="/ 或具体方向"
              />
            </div>

            <div style={S.fieldGroup}>
              <label style={S.label}>7 代言人 (选填)</label>
              <input
                style={S.input}
                value={fields.spokesperson}
                onChange={e => updateField('spokesperson', e.target.value)}
                placeholder="无则留空"
              />
            </div>
          </div>
        </div>

        {/* 核心内容 & 命名 */}
        <div style={S.section}>
          <div style={S.sectionTitle}>核心内容 & 命名</div>
          <div style={S.grid}>
            <div style={S.fieldGroup}>
              <label style={S.label}>8 核心内容</label>
              <select
                style={S.select}
                value={fields.coreContent}
                onChange={e => updateField('coreContent', e.target.value)}
              >
                {CORE_CONTENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={{ ...S.fieldGroup, gridColumn: 'span 2' }}>
              <label style={S.label}>9 命名 (含序号+自定义名称)</label>
              <input
                style={S.input}
                value={fields.naming}
                onChange={e => updateField('naming', e.target.value)}
                placeholder="S001名称 / G11空中扩张"
              />
            </div>
          </div>
        </div>

        {/* 配音 & 产品 & 版式 */}
        <div style={S.section}>
          <div style={S.sectionTitle}>输出规格</div>
          <div style={S.grid}>
            <div style={S.fieldGroup}>
              <label style={S.label}>a 配音</label>
              <select
                style={S.select}
                value={fields.voiceover}
                onChange={e => updateField('voiceover', e.target.value)}
              >
                {VOICEOVER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={S.fieldGroup}>
              <label style={S.label}>b 产品</label>
              <select
                style={S.select}
                value={fields.product}
                onChange={e => updateField('product', e.target.value)}
              >
                <option value="">选择产品</option>
                {products.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={S.fieldGroup}>
              <label style={S.label}>c 版式</label>
              <select
                style={S.select}
                value={fields.format}
                onChange={e => updateField('format', e.target.value)}
              >
                {FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 预览 */}
        <div style={S.preview}>
          <div style={S.previewLabel}>命名预览</div>
          <div style={S.previewText}>
            {validation.valid ? validation.naming : generateNaming(fields)}
          </div>
          <div
            style={{
              ...S.validBadge,
              ...(validation.valid ? S.validOk : S.validErr),
            }}
          >
            {validation.valid ? '✓ 命名合规' : `✗ ${validation.errors.length} 项待完善`}
          </div>
          {!validation.valid && (
            <ul style={S.errorList}>
              {validation.errors.map((err, i) => (
                <li key={i} style={S.errorItem}>
                  {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button style={S.btnCancel} onClick={onClose}>取消</button>
          <button
            style={{
              ...S.btnSave,
              ...(validation.valid ? {} : S.btnSaveDisabled),
            }}
            onClick={handleSave}
            disabled={!validation.valid}
          >
            保存命名
          </button>
        </div>
      </div>
    </div>
  );
}
