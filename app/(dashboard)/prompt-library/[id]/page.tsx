import { PromptCaseDetailView } from '@/components/prompt-library/prompt-case-detail-view';
import { PromptGalleryV3Client } from '@/components/prompt-library/prompt-gallery-v3-client';

export default async function PromptCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="relative min-h-screen bg-black">
      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <PromptGalleryV3Client />
      </div>
      <PromptCaseDetailView id={id} />
    </div>
  );
}
