'use client';

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

type PromptLibraryBackLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  children: ReactNode;
};

export function PromptLibraryBackLink({ children, onClick, ...props }: PromptLibraryBackLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target
    ) {
      return;
    }

    event.preventDefault();
    if (window.history.state?.promptLibraryModal) {
      window.dispatchEvent(new Event('prompt-library:close-detail'));
      window.history.back();
      return;
    }

    if (window.location.pathname === '/prompt-library') {
      window.dispatchEvent(new Event('prompt-library:close-detail'));
      return;
    }

    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer?.origin === window.location.origin && referrer.pathname === '/prompt-library') {
        window.history.back();
        return;
      }
    } catch {
      // Fall through to the normal prompt library URL.
    }

    window.location.assign('/prompt-library');
  }

  return (
    <a href="/prompt-library" onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
