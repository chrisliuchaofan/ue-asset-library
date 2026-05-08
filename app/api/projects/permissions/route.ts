import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllowedProjectsForEmail } from '@/lib/project-permissions';
import { isAdmin } from '@/lib/auth/is-admin';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

export async function GET() {
  try {
    const session = await getSession();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    const [projects, admin] = await Promise.all([
      getAllowedProjectsForEmail(email),
      isAdmin(email),
    ]);

    return NextResponse.json({ projects, isAdmin: admin });
  } catch (error) {
    return handleApiRouteError(error, '获取项目权限失败');
  }
}
