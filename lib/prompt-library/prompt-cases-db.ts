import { supabaseAdmin } from '@/lib/supabase/admin';
import { dbCreateKnowledgeEntry } from '@/lib/knowledge/knowledge-db';
import type { PromptCase, PromptCaseMediaType, PromptCaseQuery, PromptDoc } from './types';

const PROMPT_LIBRARY_TAG = 'prompt-library';

interface KnowledgePromptRow {
  id: string;
  team_id: string | null;
  user_id: string | null;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  prompt_template: string | null;
  criteria: Record<string, unknown> | null;
  source_material_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MaterialRow {
  id: string;
  name: string | null;
  type: string | null;
  thumbnail: string | null;
  src: string | null;
  gallery: string[] | null;
}

interface KnowledgeDocRow {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  updated_at: string;
}

export interface PromptCaseCreateInput {
  title: string;
  description?: string;
  prompt: string;
  negativePrompt?: string;
  tool?: string;
  category?: string;
  tags?: string[];
  mediaType: PromptCaseMediaType;
  sourceMaterialId: string;
}

export interface PromptDocCreateInput {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  attachmentUrl?: string;
  attachmentName?: string;
}

function isMissingKnowledgeTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('knowledge_entries');
}

function isVideoUrl(url?: string | null) {
  return !!url && /\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i.test(url);
}

function normalizeTags(tags?: string[] | null) {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
}

function getCriteriaString(criteria: Record<string, unknown> | null | undefined, key: string) {
  const value = criteria?.[key];
  return typeof value === 'string' ? value : undefined;
}

function getCriteriaNumber(criteria: Record<string, unknown> | null | undefined, key: string) {
  const value = criteria?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function statusToPromptStatus(status: string): PromptCase['status'] {
  if (status === 'approved') return 'published';
  if (status === 'archived') return 'archived';
  return 'draft';
}

function promptStatusToKnowledgeStatus(status?: PromptCase['status']) {
  if (status === 'draft') return 'draft';
  if (status === 'archived') return 'archived';
  return 'approved';
}

function inferMediaType(material?: MaterialRow, criteria?: Record<string, unknown> | null): PromptCaseMediaType {
  const fromCriteria = criteria?.mediaType;
  if (fromCriteria === 'image' || fromCriteria === 'video') return fromCriteria;

  const type = material?.type ?? '';
  if (type.includes('\u56fe')) return 'image';
  if (type.includes('\u89c6\u9891') || type.toLowerCase().includes('video')) return 'video';
  if (isVideoUrl(material?.src)) return 'video';
  return 'image';
}

function rowToPromptCase(row: KnowledgePromptRow, material?: MaterialRow): PromptCase {
  const criteria = row.criteria ?? {};
  const mediaType = inferMediaType(material, criteria);
  const mediaUrl = material?.src || undefined;
  const thumbnail = material?.thumbnail || undefined;
  const coverUrl =
    mediaType === 'video'
      ? thumbnail && thumbnail !== mediaUrl && !isVideoUrl(thumbnail)
        ? thumbnail
        : undefined
      : thumbnail || mediaUrl;

  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    title: row.title,
    description: getCriteriaString(criteria, 'description') || row.content || undefined,
    prompt: row.prompt_template || getCriteriaString(criteria, 'prompt') || row.content,
    negativePrompt: getCriteriaString(criteria, 'negativePrompt'),
    mediaType,
    mediaUrl,
    coverUrl,
    tool: getCriteriaString(criteria, 'tool'),
    category: getCriteriaString(criteria, 'promptCategory') || getCriteriaString(criteria, 'caseCategory'),
    tags: normalizeTags(row.tags).filter((tag) => tag !== PROMPT_LIBRARY_TAG),
    sourceMaterialId: row.source_material_id ?? undefined,
    status: statusToPromptStatus(row.status),
    sortOrder: getCriteriaNumber(criteria, 'sortOrder') ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function filterCases(cases: PromptCase[], query: PromptCaseQuery): PromptCase[] {
  const q = query.q?.trim().toLowerCase();
  return cases
    .filter((item) => {
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
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    })
    .slice(0, query.limit ?? 100);
}

async function getMaterialMap(ids: string[], teamId?: string): Promise<Map<string, MaterialRow>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  let request = (supabaseAdmin.from('materials') as any)
    .select('id,name,type,thumbnail,src,gallery')
    .in('id', uniqueIds);

  request = teamId ? request.eq('team_id', teamId) : request.is('team_id', null);

  const { data, error } = await request;
  if (error) throw new Error(`Failed to query prompt case materials: ${error.message}`);

  return new Map((data as MaterialRow[]).map((material) => [material.id, material]));
}

export async function dbGetPromptCases(query: PromptCaseQuery = {}): Promise<PromptCase[]> {
  let request = (supabaseAdmin.from('knowledge_entries') as any)
    .select('id,team_id,user_id,title,content,category,tags,prompt_template,criteria,source_material_id,status,created_at,updated_at')
    .eq('category', 'example')
    .eq('status', promptStatusToKnowledgeStatus(query.status ?? 'published'))
    .contains('tags', [PROMPT_LIBRARY_TAG])
    .order('created_at', { ascending: false });

  request = query.teamId ? request.eq('team_id', query.teamId) : request.is('team_id', null);
  if (query.limit) request = request.limit(query.limit);

  const { data, error } = await request;
  if (error) {
    if (isMissingKnowledgeTableError(error)) return [];
    throw new Error(`Failed to query prompt cases: ${error.message}`);
  }

  const rows = data as KnowledgePromptRow[];
  if (rows.length === 0) return [];

  const materialMap = await getMaterialMap(
    rows.map((row) => row.source_material_id).filter((id): id is string => Boolean(id)),
    query.teamId,
  );
  const cases = rows
    .map((row) => rowToPromptCase(row, row.source_material_id ? materialMap.get(row.source_material_id) : undefined))
    .sort((a, b) => a.sortOrder - b.sortOrder || Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return filterCases(cases, query);
}

export async function dbGetPromptCaseById(id: string, teamId?: string): Promise<PromptCase | null> {
  let request = (supabaseAdmin.from('knowledge_entries') as any)
    .select('id,team_id,user_id,title,content,category,tags,prompt_template,criteria,source_material_id,status,created_at,updated_at')
    .eq('id', id)
    .eq('category', 'example')
    .eq('status', 'approved')
    .contains('tags', [PROMPT_LIBRARY_TAG])
    .limit(1);

  request = teamId ? request.eq('team_id', teamId) : request.is('team_id', null);

  const { data, error } = await request.maybeSingle();
  if (error) {
    if (isMissingKnowledgeTableError(error)) return null;
    throw new Error(`Failed to query prompt case: ${error.message}`);
  }

  if (!data) return null;

  const row = data as KnowledgePromptRow;
  const materialMap = await getMaterialMap(row.source_material_id ? [row.source_material_id] : [], teamId);
  return rowToPromptCase(row, row.source_material_id ? materialMap.get(row.source_material_id) : undefined);
}

export async function dbGetPromptCaseMaterialIds(teamId: string): Promise<string[]> {
  if (!teamId) return [];

  const { data, error } = await (supabaseAdmin.from('knowledge_entries') as any)
    .select('source_material_id')
    .eq('category', 'example')
    .contains('tags', [PROMPT_LIBRARY_TAG])
    .eq('team_id', teamId)
    .not('source_material_id', 'is', null);

  if (error) {
    if (isMissingKnowledgeTableError(error)) return [];
    throw new Error(`Failed to query prompt case material ids: ${error.message}`);
  }

  return Array.from(
    new Set(
      ((data || []) as Array<{ source_material_id: string | null }>)
        .map((row) => row.source_material_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

export async function dbCreatePromptCase(
  input: PromptCaseCreateInput,
  options: { teamId: string; userId: string },
): Promise<PromptCase> {
  const tags = normalizeTags([...(input.tags ?? []), PROMPT_LIBRARY_TAG]);
  const entry = await dbCreateKnowledgeEntry(
    {
      title: input.title.trim(),
      content: input.description?.trim() || input.prompt.trim(),
      category: 'example',
      tags,
      promptTemplate: input.prompt.trim(),
      criteria: {
        promptLibrary: true,
        description: input.description?.trim() || '',
        negativePrompt: input.negativePrompt?.trim() || '',
        tool: input.tool?.trim() || '',
        promptCategory: input.category?.trim() || '',
        mediaType: input.mediaType,
        sortOrder: 0,
      },
      sourceType: 'manual',
      sourceMaterialId: input.sourceMaterialId,
      status: 'approved',
    },
    options,
  );

  const created = await dbGetPromptCaseById(entry.id, options.teamId);
  if (!created) throw new Error('Prompt case was created but could not be loaded');
  return created;
}

export async function dbCreatePromptDoc(
  input: PromptDocCreateInput,
  options: { teamId: string; userId: string },
): Promise<PromptDoc> {
  const tags = normalizeTags([...(input.tags ?? []), PROMPT_LIBRARY_TAG]);
  const category = input.category?.trim() || 'general';
  const attachmentUrl = input.attachmentUrl?.trim();
  const attachmentName = input.attachmentName?.trim() || '附件';
  const content = attachmentUrl
    ? `${input.content.trim()}\n\n---\n\n附件：[${attachmentName}](${attachmentUrl})`.trim()
    : input.content.trim();

  const entry = await dbCreateKnowledgeEntry(
    {
      title: input.title.trim(),
      content,
      category: category as any,
      tags,
      criteria: {
        promptLibrary: true,
        docCategory: category,
        attachmentUrl: attachmentUrl || '',
        attachmentName: attachmentUrl ? attachmentName : '',
      },
      sourceType: attachmentUrl ? 'import' : 'manual',
      status: 'approved',
    },
    options,
  );

  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    category: entry.category,
    tags: entry.tags,
    updatedAt: entry.updatedAt,
  };
}

export async function dbGetPromptDocs(teamId?: string): Promise<PromptDoc[]> {
  let request = (supabaseAdmin.from('knowledge_entries') as any)
    .select('id,title,content,category,tags,updated_at')
    .eq('status', 'approved')
    .neq('category', 'example')
    .order('updated_at', { ascending: false })
    .limit(80);

  request = teamId ? request.eq('team_id', teamId) : request.is('team_id', null);

  const { data, error } = await request;
  if (error) {
    if (isMissingKnowledgeTableError(error)) return [];
    return [];
  }

  const docs = (data as KnowledgeDocRow[])
    .filter((row) => {
      const tags = row.tags ?? [];
      const text = `${row.title} ${row.content} ${row.category} ${tags.join(' ')}`.toLowerCase();
      return tags.includes(PROMPT_LIBRARY_TAG) || tags.includes('AI视频') || text.includes('prompt');
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      tags: row.tags ?? [],
      updatedAt: row.updated_at,
    }));

  return docs;
}
