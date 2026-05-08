import { getAllowedCompanyEmailDomains } from '@/lib/auth/company-email';
import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage() {
  const allowedDomains = getAllowedCompanyEmailDomains();

  return <ResetPasswordForm allowedDomains={allowedDomains} />;
}
