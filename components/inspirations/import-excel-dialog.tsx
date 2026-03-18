'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportExcelDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  title: string;
  content: string;
  tags: string;
  reference_url: string;
}

const S = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
  },
  dialog: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: 600,
    margin: '0 16px',
    background: 'hsl(var(--popover))',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: 'hsl(var(--border))',
    borderRadius: 16,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid hsl(var(--border))',
  },
  title: { fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))' },
  closeBtn: {
    padding: 4, borderRadius: 6, border: 'none',
    background: 'transparent', color: 'hsl(var(--muted-foreground) / 0.6)', cursor: 'pointer',
  },
  body: {
    flex: 1, overflowY: 'auto' as const, padding: 20,
    display: 'flex', flexDirection: 'column' as const, gap: 16,
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    border: '2px dashed hsl(var(--border))',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
  previewTable: {
    width: '100%',
    fontSize: 12,
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '8px 10px',
    textAlign: 'left' as const,
    color: 'hsl(var(--muted-foreground))',
    borderBottom: '1px solid hsl(var(--border))',
    fontSize: 11,
    fontWeight: 500 as const,
  },
  td: {
    padding: '6px 10px',
    color: 'hsl(var(--muted-foreground))',
    borderBottom: '1px solid hsl(var(--muted))',
    maxWidth: 150,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '12px 20px',
    borderTop: '1px solid hsl(var(--border))',
  },
  btnCancel: {
    padding: '8px 16px', fontSize: 13, color: 'hsl(var(--muted-foreground))',
    background: 'hsl(var(--muted))', borderWidth: 1, borderStyle: 'solid' as const,
    borderColor: 'hsl(var(--border))', borderRadius: 8, cursor: 'pointer',
  },
  btnImport: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 18px', fontSize: 13, fontWeight: 600 as const,
    color: '#000', background: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
} as const;

export function ImportExcelDialog({ open, onClose, onImported }: ImportExcelDialogProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ total: number; success: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        // 映射列：支持中英文列名
        const mapped: ParsedRow[] = json.map((row) => ({
          title: row['标题'] || row['title'] || row['Title'] || '',
          content: row['内容'] || row['content'] || row['Content'] || row['描述'] || '',
          tags: row['标签'] || row['tags'] || row['Tags'] || '',
          reference_url: row['参考链接'] || row['reference_url'] || row['URL'] || row['url'] || row['链接'] || '',
        }));

        // 过滤空行
        const valid = mapped.filter(r => r.title || r.content);
        setRows(valid);
        setFileName(file.name);
        setResult(null);
      } catch {
        console.error('Excel 解析失败');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) {
      parseExcel(file);
    }
  };

  const handleImport = async () => {
    if (importing || rows.length === 0) return;
    setImporting(true);

    try {
      const res = await fetch('/api/inspirations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult({ total: data.total || rows.length, success: data.success || 0 });
      if (data.success > 0) {
        onImported();
      }
    } catch {
      setResult({ total: rows.length, success: 0 });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setFileName('');
    setResult(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={S.overlay}>
      <div style={S.backdrop} onClick={handleClose} />
      <div style={S.dialog}>
        <div style={S.header}>
          <span style={S.title}>导入灵感（Excel）</span>
          <button style={S.closeBtn} onClick={handleClose}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={S.body}>
          {/* 上传区域 */}
          {rows.length === 0 && (
            <div
              style={S.dropZone}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--muted-foreground) / 0.25)';
                e.currentTarget.style.background = 'hsl(var(--muted))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--border))';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Upload style={{ width: 28, height: 28, color: 'hsl(var(--muted-foreground) / 0.4)' }} />
              <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                点击或拖拽上传 Excel 文件
              </div>
              <div style={{ color: 'hsl(var(--muted-foreground) / 0.3)', fontSize: 11 }}>
                支持 .xlsx / .xls / .csv，列：标题 / 内容 / 标签 / 参考链接
              </div>
            </div>
          )}

          {/* 预览 */}
          {rows.length > 0 && !result && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <FileSpreadsheet style={{ width: 16, height: 16, color: '#22C55E' }} />
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>{fileName}</span>
                <span style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>— {rows.length} 条有效记录</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.previewTable}>
                  <thead>
                    <tr>
                      <th style={S.th}>#</th>
                      <th style={S.th}>标题</th>
                      <th style={S.th}>内容</th>
                      <th style={S.th}>标签</th>
                      <th style={S.th}>参考链接</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td style={S.td}>{i + 1}</td>
                        <td style={S.td}>{row.title}</td>
                        <td style={S.td}>{row.content.slice(0, 40)}</td>
                        <td style={S.td}>{row.tags}</td>
                        <td style={S.td}>{row.reference_url ? '✓' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && (
                  <div style={{ textAlign: 'center', fontSize: 11, color: 'hsl(var(--muted-foreground) / 0.4)', padding: 8 }}>
                    ... 还有 {rows.length - 10} 条
                  </div>
                )}
              </div>
            </>
          )}

          {/* 结果 */}
          {result && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              {result.success > 0 ? (
                <>
                  <CheckCircle2 style={{ width: 40, height: 40, color: '#22C55E', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                    成功导入 {result.success}/{result.total} 条
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle style={{ width: 40, height: 40, color: '#ef4444', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                    导入失败
                  </div>
                </>
              )}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) parseExcel(file);
              e.target.value = '';
            }}
          />
        </div>

        <div style={S.footer}>
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground) / 0.3)' }}>
            {rows.length > 0 && !result ? `${rows.length} 条待导入` : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btnCancel} onClick={handleClose}>
              {result ? '关闭' : '取消'}
            </button>
            {rows.length > 0 && !result && (
              <button
                style={{ ...S.btnImport, opacity: importing ? 0.6 : 1 }}
                onClick={handleImport}
                disabled={importing}
              >
                {importing && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                {importing ? '导入中...' : '确认导入'}
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
