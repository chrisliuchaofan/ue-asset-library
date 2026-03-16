
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { UploadCloud, FileVideo, Image as ImageIcon, ClipboardPaste, FileSpreadsheet } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accept?: string; // e.g., "video/*,image/*"
  label?: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelect,
  disabled,
  accept = "video/*",
  label = "上传素材"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Paste Event
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (disabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1 || items[i].type.indexOf("video") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          onFileSelect(file);
          break; // Only handle the first valid file
        }
      }
    }
  }, [disabled, onFileSelect]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelect(file);
    }
  }, [disabled, onFileSelect]);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const isImageMode = accept.includes('image');
  const isExcelMode = accept.includes('.xlsx') || accept.includes('.xls') || accept.includes('spreadsheet');

  return (
    <Card
      className={`
        relative overflow-hidden border-2 border-dashed transition-all duration-300
        ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:border-blue-500/50 hover:bg-muted/30'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        flex flex-col items-center justify-center p-8 md:p-12 text-center
        min-h-[280px] md:min-h-[320px] lg:min-h-[360px]
        w-full
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div className="rounded-full bg-muted/50 p-4 md:p-5 mb-3 md:mb-4 relative">
        {isDragging ? (
          <UploadCloud className="w-10 h-10 md:w-12 md:h-12 text-blue-500 animate-bounce" />
        ) : isExcelMode ? (
          <FileSpreadsheet className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
        ) : isImageMode ? (
          <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
        ) : (
          <FileVideo className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
        )}
        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
          <ClipboardPaste className="w-3 h-3 md:w-3.5 md:h-3.5" />
        </div>
      </div>

      <h3 className="text-base md:text-lg font-semibold mb-1.5 md:mb-2 text-foreground">
        {isDragging ? "释放文件" : label}
      </h3>
      <p className="text-xs md:text-sm text-muted-foreground max-w-sm px-4">
        拖拽文件、点击浏览，或直接 <span className="text-blue-400 font-medium">Ctrl+V 粘贴</span> 截图。
      </p>
    </Card>
  );
};
