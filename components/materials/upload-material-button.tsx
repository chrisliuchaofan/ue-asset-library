'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MaterialUploadDialog } from './material-upload-dialog';

type MaterialSource = 'internal' | 'competitor';

export function UploadMaterialButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [source, setSource] = useState<MaterialSource>('internal');
  const router = useRouter();

  const handleSelect = (s: MaterialSource) => {
    setSource(s);
    setDialogOpen(true);
  };

  return (
    <div className="relative">
      <Button size="sm" onClick={() => handleSelect('internal')}>
        <Upload className="w-3.5 h-3.5" />
        上传素材
      </Button>

      <MaterialUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        source={source}
        onSuccess={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
