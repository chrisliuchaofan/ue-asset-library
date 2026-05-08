import { getAllowedCompanyEmailDomains } from '@/lib/auth/company-email';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  const allowedDomains = getAllowedCompanyEmailDomains();

  return <RegisterForm allowedDomains={allowedDomains} />;
}
