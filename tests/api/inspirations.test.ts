import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import type { AuthenticatedContext } from '@/lib/team/types';

// Mock requireTeamAccess
const mockCtx: AuthenticatedContext = {
  userId: 'test@example.com',
  email: 'test@example.com',
  teamId: 'team-123',
  teamSlug: 'test-team',
  role: 'member',
};

vi.mock('@/lib/team/require-team', () => ({
  requireTeamAccess: vi.fn().mockResolvedValue(mockCtx),
  isErrorResponse: (result: any) => result instanceof NextResponse,
}));

// Mock supabaseAdmin
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

// Import after mocking
const { GET, POST } = await import('@/app/api/inspirations/route');
const { requireTeamAccess } = await import('@/lib/team/require-team');

describe('GET /api/inspirations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain: from().select().eq().order().range()
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ id: '1', title: '测试灵感', content: '内容' }],
        count: 1,
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chainMock);
    (requireTeamAccess as any).mockResolvedValue(mockCtx);
  });

  it('returns 401 when not authenticated', async () => {
    (requireTeamAccess as any).mockResolvedValue(
      NextResponse.json({ message: '未登录' }, { status: 401 })
    );

    const req = new Request('http://localhost/api/inspirations');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns paginated inspirations', async () => {
    const req = new Request('http://localhost/api/inspirations?page=1&pageSize=10');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.inspirations).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
  });

  it('passes team_id to query', async () => {
    const req = new Request('http://localhost/api/inspirations');
    await GET(req);

    const chain = mockFrom.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'test@example.com');
    expect(chain.eq).toHaveBeenCalledWith('team_id', 'team-123');
  });

  it('applies tag filter', async () => {
    const req = new Request('http://localhost/api/inspirations?tag=创意');
    await GET(req);

    const chain = mockFrom.mock.results[0].value;
    expect(chain.contains).toHaveBeenCalledWith('tags', ['创意']);
  });

  it('applies search filter', async () => {
    const req = new Request('http://localhost/api/inspirations?search=测试');
    await GET(req);

    const chain = mockFrom.mock.results[0].value;
    expect(chain.or).toHaveBeenCalledWith('title.ilike.%测试%,content.ilike.%测试%');
  });
});

describe('POST /api/inspirations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chainMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'new-1', title: '新灵感', content: '内容' },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chainMock);
    (requireTeamAccess as any).mockResolvedValue(mockCtx);
  });

  it('returns 401 when not authenticated', async () => {
    (requireTeamAccess as any).mockResolvedValue(
      NextResponse.json({ message: '未登录' }, { status: 401 })
    );

    const req = new Request('http://localhost/api/inspirations', {
      method: 'POST',
      body: JSON.stringify({ title: '测试' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid input (empty body)', async () => {
    const req = new Request('http://localhost/api/inspirations', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe('参数验证失败');
  });

  it('creates inspiration with valid input', async () => {
    const req = new Request('http://localhost/api/inspirations', {
      method: 'POST',
      body: JSON.stringify({ title: '新灵感', content: '详细描述' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('passes team_id when inserting', async () => {
    const req = new Request('http://localhost/api/inspirations', {
      method: 'POST',
      body: JSON.stringify({ title: '测试' }),
    });
    await POST(req);

    const chain = mockFrom.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'test@example.com',
        team_id: 'team-123',
      })
    );
  });
});
