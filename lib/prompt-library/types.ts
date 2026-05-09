export type PromptCaseStatus = 'draft' | 'published' | 'archived';
export type PromptCaseMediaType = 'video' | 'image';

export interface PromptCase {
  id: string;
  teamId: string | null;
  userId: string | null;
  title: string;
  description?: string;
  prompt: string;
  negativePrompt?: string;
  mediaType: PromptCaseMediaType;
  mediaUrl?: string;
  coverUrl?: string;
  tool?: string;
  category?: string;
  tags: string[];
  sourceMaterialId?: string;
  status: PromptCaseStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptCaseQuery {
  q?: string;
  tool?: string;
  category?: string;
  tag?: string;
  mediaType?: PromptCaseMediaType | 'all';
  status?: PromptCaseStatus;
  teamId?: string;
  limit?: number;
}

export interface PromptDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  updatedAt: string;
}
