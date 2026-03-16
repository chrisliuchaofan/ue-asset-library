import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      // Phase 2: 团队上下文
      activeTeamId?: string | null;
      activeTeamRole?: string | null;
      activeTeamName?: string | null;
      activeTeamSlug?: string | null;
      // Phase 3: Onboarding
      onboardingCompleted?: boolean;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    name?: string | null;
    email?: string | null;
    // Phase 2: 团队上下文
    activeTeamId?: string | null;
    activeTeamRole?: string | null;
    activeTeamName?: string | null;
    activeTeamSlug?: string | null;
    // Phase 3: Onboarding
    onboardingCompleted?: boolean;
  }
}
