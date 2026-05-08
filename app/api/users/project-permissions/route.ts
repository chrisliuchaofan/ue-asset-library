import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/is-admin';
import { setUserProjectPermissions } from '@/lib/project-permissions';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

const UpdateProjectPermissionsSchema = z.object({
  targetEmail: z.string().email('邮箱格式不正确'),
  projects: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    if (!(await isAdmin(email))) {
      return NextResponse.json(
        createStandardError(ErrorCode.FORBIDDEN, '权限不足，需要管理员权限'),
        { status: 403 }
      );
    }

    const parsed = UpdateProjectPermissionsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '参数验证失败', { errors: parsed.error.flatten() }),
        { status: 400 }
      );
    }

    const projects = await setUserProjectPermissions(parsed.data.targetEmail, parsed.data.projects);

    return NextResponse.json({
      success: true,
      email: parsed.data.targetEmail.trim().toLowerCase(),
      projects,
    });
  } catch (error) {
    return handleApiRouteError(error, '更新项目权限失败');
  }
}
