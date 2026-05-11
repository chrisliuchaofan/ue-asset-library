'use client';

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

type HardNavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children: ReactNode;
};

export function HardNavLink({ href, onClick, children, ...props }: HardNavLinkProps) {
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
    window.location.assign(href);
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
