import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PromptCase, PromptCaseQuery, PromptDoc } from './types';
import { samplePromptCases, samplePromptDocs } from './sample-data';
import { migratedPromptDocs } from './legacy-docs';

interface PromptCaseRow {
  id: string;
  team_id: string | null;
  user_id: string | null;
  title: string;
  description: string | null;
  prompt: string;
  negative_prompt: string | null;
  media_type: string;
  media_url: string | null;
  cover_url: string | null;
  tool: string | null;
  category: string | null;
  tags: string[] | null;
  source_material_id: string | null;
  status: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

interface KnowledgeRow {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  updated_at: string;
}

function rowToPromptCase(row: PromptCaseRow): PromptCase {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    prompt: row.prompt,
    negativePrompt: row.negative_prompt ?? undefined,
    mediaType: row.media_type === 'image' ? 'image' : 'video',
    mediaUrl: row.media_url ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    tool: row.tool ?? undefined,
    category: row.category ?? undefined,
    tags: row.tags ?? [],
    sourceMaterialId: row.source_material_id ?? undefined,
    status: row.status as PromptCase['status'],
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function filterCases(cases: PromptCase[], query: PromptCaseQuery): PromptCase[] {
  const q = query.q?.trim().toLowerCase();
  return cases.filter((item) => {
    if (query.status && item.status !== query.status) return false;
    if (query.tool && item.tool !== query.tool) return false;
    if (query.category && item.category !== query.category) return false;
    if (query.tag && !item.tags.includes(query.tag)) return false;
    if (query.mediaType && query.mediaType !== 'all' && item.mediaType !== query.mediaType) return false;
    if (q) {
      const haystack = [
        item.title,
        item.description,
        item.prompt,
        item.negativePrompt,
        item.tool,
        item.category,
        item.tags.join(' '),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    }
    return true;
  }).slice(0, query.limit ?? 100);
}

function isMissingTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('prompt_cases');
}

export async function dbGetPromptCases(query: PromptCaseQuery = {}): Promise<PromptCase[]> {
  const supabase = supabaseAdmin;

  let request = (supabase
    .from('prompt_cases') as any)
    .select('*')
    .eq('status', query.status ?? 'published')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (query.teamId) {
    request = request.or(`team_id.is.null,team_id.eq.${query.teamId}`);
  }
  if (query.tool) request = request.eq('tool', query.tool);
  if (query.category) request = request.eq('category', query.category);
  if (query.mediaType && query.mediaType !== 'all') request = request.eq('media_type', query.mediaType);
  if (query.tag) request = request.contains('tags', [query.tag]);
  if (query.limit) request = request.limit(query.limit);

  const { data, error } = await request;

  if (error) {
    if (isMissingTableError(error)) return filterCases(samplePromptCases, { ...query, status: 'published' });
    throw new Error(`查询 AI 提示案例失败: ${error.message}`);
  }

  const rows = (data as unknown as PromptCaseRow[]).map(rowToPromptCase);
  return rows.length > 0 ? filterCases(rows, query) : filterCases(samplePromptCases, { ...query, status: 'published' });
}

export async function dbGetPromptCaseById(id: string, teamId?: string): Promise<PromptCase | null> {
  const supabase = supabaseAdmin;

  let request = (supabase
    .from('prompt_cases') as any)
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .limit(1);

  if (teamId) {
    request = request.or(`team_id.is.null,team_id.eq.${teamId}`);
  }

  const { data, error } = await request.maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return samplePromptCases.find((item) => item.id === id) ?? null;
    }
    throw new Error(`查询 AI 提示案例失败: ${error.message}`);
  }

  return data ? rowToPromptCase(data as unknown as PromptCaseRow) : samplePromptCases.find((item) => item.id === id) ?? null;
}

export async function dbGetPromptDocs(teamId?: string): Promise<PromptDoc[]> {
  return migratedPromptDocs;

  const supabase = supabaseAdmin;

  let request = supabase
    .from('knowledge_entries')
    .select('id,title,content,category,tags,updated_at')
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(80);

  if (teamId) {
    request = request.or(`team_id.is.null,team_id.eq.${teamId}`);
  }

  const { data, error } = await request;
  if (error) return samplePromptDocs;

  const docs = (data as unknown as KnowledgeRow[])
    .filter((row) => {
      const tags = row.tags ?? [];
      const text = `${row.title} ${row.content} ${row.category} ${tags.join(' ')}`.toLowerCase();
      return tags.includes('prompt-library') || tags.includes('AI视频') || text.includes('prompt');
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      tags: row.tags ?? [],
      updatedAt: row.updated_at,
    }));

  return docs.length > 0 ? docs : samplePromptDocs;
}
