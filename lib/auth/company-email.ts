export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getAllowedCompanyEmailDomains(): string[] {
  const raw =
    process.env.COMPANY_EMAIL_DOMAINS ||
    process.env.NEXT_PUBLIC_COMPANY_EMAIL_DOMAINS ||
    '';

  return raw
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

export function isAllowedCompanyEmail(email: string, domains = getAllowedCompanyEmailDomains()): boolean {
  const normalized = normalizeEmail(email);
  const [, domain = ''] = normalized.split('@');

  if (!domain || domains.length === 0) {
    return false;
  }

  return domains.some((allowedDomain) => domain === allowedDomain);
}

export function formatAllowedCompanyEmailDomains(domains = getAllowedCompanyEmailDomains()): string {
  return domains.map((domain) => `@${domain}`).join('、');
}
