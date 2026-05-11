'use client';

import type { MouseEvent } from 'react';
import { Wand2 } from 'lucide-react';

type UseInStudioButtonProps = {
  prompt: string;
  caseId: string;
  label?: string;
  className?: string;
};

export function UseInStudioButton({
  prompt,
  caseId,
  label = '立即创作',
  className = 'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90',
}: UseInStudioButtonProps) {
  const studioUrl = `/studio?source=prompt-library&caseId=${encodeURIComponent(caseId)}`;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      sessionStorage.setItem(
        'prompt_library_to_studio',
        JSON.stringify({
          source: 'prompt-library',
          caseId,
          prompt,
        }),
      );
    } catch {
      // Studio also receives source/caseId through the URL; storage failure should not block navigation.
    }
    window.location.assign(studioUrl);
  };

  return (
    <a href={studioUrl} className={className} onClick={handleClick}>
      <Wand2 className="h-4 w-4" />
      {label}
    </a>
  );
}
