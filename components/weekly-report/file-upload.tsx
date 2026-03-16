'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void | Promise<void>;
  onDateRangeChange: (startDate: string, endDate: string, dateRange: string) => void;
  disabled?: boolean;
  uploading?: boolean;
}

export function FileUpload({
  onFileSelect,
  onDateRangeChange,
  disabled = false,
  uploading = false,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 计算当前周的日期范围（默认值）
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = 周日, 1 = 周一, ...
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // 本周一
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // 本周日
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  };
  
  const currentWeek = getCurrentWeekDates();
  const [weekStartDate, setWeekStartDate] = useState(currentWeek.start);
  const [weekEndDate, setWeekEndDate] = useState(currentWeek.end);
  
  // 初始化时触发日期范围回调
  useEffect(() => {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}.${date.getDate()}`;
    };
    const dateRange = `${formatDate(weekStartDate)} ~ ${formatDate(weekEndDate)}`;
    onDateRangeChange(weekStartDate, weekEndDate, dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  const handleFileSelect = useCallback((file: File) => {
    // 验证文件类型
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      alert('只支持 Excel 文件（.xlsx 或 .xls）');
      return;
    }

    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('文件大小超过限制（最大 10MB）');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleDateChange = useCallback((start: string, end: string) => {
    setWeekStartDate(start);
    setWeekEndDate(end);
    
    // 格式化日期范围字符串
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}.${date.getDate()}`;
    };
    const dateRange = `${formatDate(start)} ~ ${formatDate(end)}`;
    
    onDateRangeChange(start, end, dateRange);
  }, [onDateRangeChange]);

  return (
    <div className="space-y-4">
      {/* 日期范围选择 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            开始日期
          </label>
          <input
            type="date"
            value={weekStartDate}
            onChange={(e) => {
              const start = e.target.value;
              setWeekStartDate(start);
              if (weekEndDate && start) {
                handleDateChange(start, weekEndDate);
              }
            }}
            disabled={disabled || uploading}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            结束日期
          </label>
          <input
            type="date"
            value={weekEndDate}
            onChange={(e) => {
              const end = e.target.value;
              setWeekEndDate(end);
              if (weekStartDate && end) {
                handleDateChange(weekStartDate, end);
              }
            }}
            disabled={disabled || uploading}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors duration-200"
          />
        </div>
      </div>

      {/* 文件上传区域 */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Excel 文件
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border bg-muted/30'
            }
            ${disabled || uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-border'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleInputChange}
            disabled={disabled || uploading}
            className="hidden"
            id="excel-upload"
          />
          
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1 text-left">
                <p className="text-foreground font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {!disabled && !uploading && (
                <button
                  onClick={handleRemoveFile}
                  className="p-1 rounded-full hover:bg-muted transition-colors duration-200"
                  aria-label="移除文件"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
            </div>
          ) : (
            <label
              htmlFor="excel-upload"
              className="flex flex-col items-center gap-3 cursor-pointer"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground font-medium">
                  点击或拖拽 Excel 文件到此处
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  支持 .xlsx 和 .xls 格式，最大 10MB
                </p>
              </div>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
