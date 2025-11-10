import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type MaterialsBatchAction = 'update-type' | 'update-tag' | 'update-quality' | 'delete';

 interface MaterialsBatchEditDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   selectedCount: number;
   types: readonly string[];
   tags: readonly string[];
   qualities: readonly string[];
   onUpdateType: (type: string) => Promise<void>;
   onUpdateTag: (tag: string) => Promise<void>;
   onUpdateQuality: (qualities: string[]) => Promise<void>;
   onDelete: () => Promise<void>;
 }

 export function MaterialsBatchEditDialog({
   open,
   onOpenChange,
   selectedCount,
   types,
   tags,
   qualities,
   onUpdateType,
   onUpdateTag,
   onUpdateQuality,
   onDelete,
 }: MaterialsBatchEditDialogProps) {
   const [mode, setMode] = useState<MaterialsBatchAction>('update-type');
   const [selectedType, setSelectedType] = useState(types[0] ?? '');
   const [selectedTag, setSelectedTag] = useState(tags[0] ?? '');
   const [selectedQualities, setSelectedQualities] = useState<string[]>(qualities.slice(0, 1));
   const [confirmText, setConfirmText] = useState('');
   const [loading, setLoading] = useState(false);

   useEffect(() => {
     if (!open) {
       setMode('update-type');
       setSelectedType(types[0] ?? '');
       setSelectedTag(tags[0] ?? '');
       setSelectedQualities(qualities.slice(0, 1));
       setConfirmText('');
       setLoading(false);
     }
   }, [open, types, tags, qualities]);

   const actionMeta = useMemo(
     () => ({
       'update-type': {
         label: '更改类型',
         description: '为所有选中的素材批量更新类型。',
       },
       'update-tag': {
         label: '更改标签',
         description: '为所有选中的素材批量更新标签。',
       },
       'update-quality': {
         label: '更改质量',
         description: '为所有选中的素材批量更新质量标签。',
       },
       delete: {
         label: '批量删除',
         description: '删除所有选中的素材，此操作不可恢复。',
       },
     }),
     []
   );

   const toggleQuality = (quality: string, checked: boolean) => {
     setSelectedQualities((prev) => {
       if (checked) {
         if (prev.includes(quality)) return prev;
         return [...prev, quality];
       }
       return prev.filter((item) => item !== quality);
     });
   };

   const handleSubmit = async () => {
     try {
       setLoading(true);
       if (mode === 'update-type') {
         await onUpdateType(selectedType);
       } else if (mode === 'update-tag') {
         await onUpdateTag(selectedTag);
       } else if (mode === 'update-quality') {
         await onUpdateQuality(selectedQualities);
       } else if (mode === 'delete') {
         if (confirmText !== '删除') {
           throw new Error('请输入 “删除” 以确认删除操作');
         }
         await onDelete();
       }
       onOpenChange(false);
     } catch (error) {
       const message = error instanceof Error ? error.message : '批量操作失败，请稍后重试';
       alert(message);
     } finally {
       setLoading(false);
     }
   };

   const disableSubmit = () => {
     if (loading) return true;
     if (selectedCount === 0) return true;
     if (mode === 'update-type' && !selectedType) return true;
     if (mode === 'update-tag' && !selectedTag) return true;
     if (mode === 'update-quality' && selectedQualities.length === 0) return true;
     if (mode === 'delete' && confirmText !== '删除') return true;
     return false;
   };

   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg">
         <DialogHeader className="space-y-1">
           <DialogTitle>批量操作（{selectedCount}）</DialogTitle>
           <DialogDescription>{actionMeta[mode].description}</DialogDescription>
         </DialogHeader>

         <div className="space-y-5">
           <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
             {(Object.keys(actionMeta) as MaterialsBatchAction[]).map((action) => (
               <button
                 key={action}
                 type="button"
                 onClick={() => setMode(action)}
                 className={cn(
                   'flex h-10 items-center justify-center rounded-md border text-sm transition',
                   mode === action
                     ? 'border-primary bg-primary/10 text-primary'
                     : 'border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground'
                 )}
               >
                 {actionMeta[action].label}
               </button>
             ))}
           </div>

           {mode === 'update-type' && (
             <div className="space-y-2">
               <p className="text-xs text-muted-foreground">选择一种素材类型</p>
               <select
                 className="h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
                 value={selectedType}
                 onChange={(e) => setSelectedType(e.target.value)}
               >
                 {types.map((type) => (
                   <option key={type} value={type}>
                     {type}
                   </option>
                 ))}
               </select>
             </div>
           )}

           {mode === 'update-tag' && (
             <div className="space-y-2">
               <p className="text-xs text-muted-foreground">选择一个标签</p>
               <select
                 className="h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
                 value={selectedTag}
                 onChange={(e) => setSelectedTag(e.target.value)}
               >
                 {tags.map((tag) => (
                   <option key={tag} value={tag}>
                     {tag}
                   </option>
                 ))}
               </select>
             </div>
           )}

           {mode === 'update-quality' && (
             <div className="space-y-3">
               <p className="text-xs text-muted-foreground">可多选质量标签</p>
               <div className="flex flex-wrap gap-2">
                 {qualities.map((quality) => {
                   const checked = selectedQualities.includes(quality);
                   return (
                     <label
                       key={quality}
                       className={cn(
                         'flex cursor-pointer select-none items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                         checked
                           ? 'border-primary bg-primary/10 text-primary'
                           : 'border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground'
                       )}
                     >
                       <Checkbox
                         checked={checked}
                         onChange={(e) => toggleQuality(quality, e.target.checked)}
                       />
                       <span>{quality}</span>
                     </label>
                   );
                 })}
               </div>
               <div className="flex flex-wrap gap-1">
                 {selectedQualities.map((quality) => (
                   <Badge key={quality} variant="secondary" className="text-[11px]">
                     {quality}
                   </Badge>
                 ))}
               </div>
             </div>
           )}

           {mode === 'delete' && (
             <div className="space-y-2">
               <p className="text-xs text-muted-foreground">
                 删除后无法恢复，请输入
                 <span className="mx-1 font-semibold text-destructive">删除</span>
                 以确认。
               </p>
               <Input
                 value={confirmText}
                 onChange={(e) => setConfirmText(e.target.value)}
                 placeholder="删除"
               />
             </div>
           )}
         </div>

         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
             取消
           </Button>
           <Button onClick={handleSubmit} disabled={disableSubmit()}>
             {loading ? '处理中...' : '确认操作'}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }
