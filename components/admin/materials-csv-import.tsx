import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileDown, Loader2, AlertCircle } from 'lucide-react';
import * as xlsx from 'xlsx';
import { MaterialCreateSchema } from '@/data/material.schema';

interface MaterialsCsvImportProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function MaterialsCsvImport({ open, onOpenChange, onSuccess }: MaterialsCsvImportProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const templateData = [
            {
                '素材名称*': '示例素材',
                '类型*': 'UE视频',
                '项目*': '项目A',
                '来源*': 'internal',
                '标签*': '爆款',
                '质量*': '高品质',
                '消耗': 1000,
                'ROI': 1.5,
                '首日ROI': 0.5,
                '广告主': 'XX互动',
                '投放平台': '抖音',
            },
            {
                '素材名称*': '竞品参考',
                '类型*': 'AE视频',
                '项目*': '项目B',
                '来源*': 'competitor',
                '标签*': '达标',
                '质量*': '常规',
                '消耗': 500,
                'ROI': 1.2,
                '首日ROI': 0.3,
                '广告主': 'YY科技',
                '投放平台': '微信',
            }
        ];

        const ws = xlsx.utils.json_to_sheet(templateData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, '素材导入模板');
        xlsx.writeFile(wb, '素材批量导入模板.xlsx');
    };

    const processImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setProgress(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = xlsx.read(data);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = xlsx.utils.sheet_to_json(firstSheet);

            if (rows.length === 0) {
                throw new Error('上传的文件为空');
            }

            const total = rows.length;
            let successCount = 0;
            let failedCount = 0;
            const errorDetails: string[] = [];

            for (let i = 0; i < total; i++) {
                setProgress({ current: i + 1, total });
                const row = rows[i];

                try {
                    // 映射列名
                    const payload = {
                        name: row['素材名称*'] || row['名称'] || '',
                        type: row['类型*'] || row['类型'] || 'UE视频',
                        project: row['项目*'] || row['项目'] || '项目A',
                        source: row['来源*'] || row['来源'] || 'internal',
                        tag: row['标签*'] || row['标签'] || '达标',
                        quality: [row['质量*'] || row['质量'] || '常规'],
                        consumption: row['消耗'] ? Number(row['消耗']) : undefined,
                        roi: row['ROI'] ? Number(row['ROI']) : undefined,
                        firstDayRoi: row['首日ROI'] ? Number(row['首日ROI']) : undefined,
                        advertiser: row['广告主'] || undefined,
                        platform: row['投放平台'] || row['平台'] || undefined,
                        thumbnail: '',
                        src: '',
                        gallery: '[]',
                        fileSize: '0',
                        width: '1920',
                        height: '1080',
                        duration: '0',
                    };

                    // 验证数据
                    const parsed = MaterialCreateSchema.safeParse(payload);
                    if (!parsed.success) {
                        console.error('Row validation failed', parsed.error);
                        throw new Error(`第 ${i + 2} 行数据格式错误`);
                    }

                    // 通过 API 创建
                    const res = await fetch('/api/materials', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(parsed.data),
                    });

                    if (!res.ok) {
                        const errBody = await res.json();
                        throw new Error(`第 ${i + 2} 行导入失败: ${errBody.message || res.statusText}`);
                    }

                    successCount++;
                } catch (err: any) {
                    failedCount++;
                    errorDetails.push(err.message || `第 ${i + 2} 行未知错误`);
                }
            }

            if (failedCount > 0) {
                setError(`成功导入 ${successCount} 条，失败 ${failedCount} 条。\n错误详情：\n${errorDetails.slice(0, 5).join('\n')}${errorDetails.length > 5 ? '\n...' : ''}`);
            } else {
                onOpenChange(false);
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message || '解析文件失败，请确保格式正确');
        } finally {
            setLoading(false);
            // reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>批量导入素材</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium">1. 下载模板</h3>
                        <p className="text-sm text-muted-foreground">
                            请使用我们提供的标准模板格式，填写对应的素材字段信息。带 * 号的为必填字段。
                        </p>
                        <Button variant="outline" onClick={downloadTemplate} className="w-fit" disabled={loading}>
                            <FileDown className="w-4 h-4 mr-2" />
                            下载 Excel 模板
                        </Button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium">2. 上传数据</h3>
                        <p className="text-sm text-muted-foreground">
                            仅支持 .xlsx 或 .csv 格式的文件。暂不支持批量上传素材视频文件。
                        </p>

                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={processImport}
                            disabled={loading}
                        />

                        <Button
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    正在导入 ({progress?.current}/{progress?.total})...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    选择文件并导入
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">导入遇到问题</h3>
                                    <div className="mt-2 text-sm text-red-700 whitespace-pre-wrap">
                                        {error}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
