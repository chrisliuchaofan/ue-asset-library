'use client';

import type { MouseEvent } from 'react';
import { Wand2 } from 'lucide-react';

type UseInStudioButtonProps = {
  prompt: string;
  caseId: string;
  label?: string;
  className?: string;
};

const MATRIX_CREATE_URL = 'https://matrix.tuyoo.com/newVideo/index';

export function UseInStudioButton({
  label = '立即创作',
  className = 'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90',
}: UseInStudioButtonProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign(MATRIX_CREATE_URL);
  };

  return (
    <a href={MATRIX_CREATE_URL} className={className} onClick={handleClick}>
      <Wand2 className="h-4 w-4" />
      {label}
    </a>
  );
}
