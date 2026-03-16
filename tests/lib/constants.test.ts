import { describe, it, expect } from 'vitest';
import {
  PROJECTS,
  PROJECT_DISPLAY_NAMES,
  DEFAULT_DESCRIPTIONS,
  FILE_UPLOAD_LIMITS,
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  PAGINATION,
  BATCH_UPLOAD_CONFIG,
  getDescription,
} from '@/lib/constants';

describe('PROJECTS', () => {
  it('has exactly 3 projects', () => {
    expect(PROJECTS).toHaveLength(3);
  });

  it('contains expected project names', () => {
    expect(PROJECTS).toContain('项目A');
    expect(PROJECTS).toContain('项目B');
    expect(PROJECTS).toContain('项目C');
  });
});

describe('PROJECT_DISPLAY_NAMES', () => {
  it('maps all projects to display names', () => {
    for (const project of PROJECTS) {
      expect(PROJECT_DISPLAY_NAMES[project]).toBeDefined();
      expect(typeof PROJECT_DISPLAY_NAMES[project]).toBe('string');
    }
  });
});

describe('getDescription', () => {
  it('returns default description', () => {
    const text = getDescription('emptyStateTitle');
    expect(text).toBe('未找到资产');
  });

  it('replaces placeholders', () => {
    const text = getDescription('projectPasswordDialogDescription', { project: '项目A' });
    expect(text).toContain('项目A');
  });
});

describe('FILE_UPLOAD_LIMITS', () => {
  it('MAX_FILE_SIZE is 2GB', () => {
    expect(FILE_UPLOAD_LIMITS.MAX_FILE_SIZE).toBe(2 * 1024 * 1024 * 1024);
  });
});

describe('ALLOWED_FILE_EXTENSIONS', () => {
  it('IMAGE includes common formats', () => {
    expect(ALLOWED_FILE_EXTENSIONS.IMAGE).toContain('.jpg');
    expect(ALLOWED_FILE_EXTENSIONS.IMAGE).toContain('.png');
    expect(ALLOWED_FILE_EXTENSIONS.IMAGE).toContain('.webp');
  });

  it('VIDEO includes common formats', () => {
    expect(ALLOWED_FILE_EXTENSIONS.VIDEO).toContain('.mp4');
    expect(ALLOWED_FILE_EXTENSIONS.VIDEO).toContain('.webm');
  });

  it('ALL combines IMAGE and VIDEO', () => {
    for (const ext of ALLOWED_FILE_EXTENSIONS.IMAGE) {
      expect(ALLOWED_FILE_EXTENSIONS.ALL).toContain(ext);
    }
    for (const ext of ALLOWED_FILE_EXTENSIONS.VIDEO) {
      expect(ALLOWED_FILE_EXTENSIONS.ALL).toContain(ext);
    }
  });
});

describe('PAGINATION', () => {
  it('has consistent ASSETS_PER_PAGE = rows * per_row', () => {
    expect(PAGINATION.ASSETS_PER_PAGE).toBe(
      PAGINATION.ASSETS_ROWS_PER_PAGE * PAGINATION.ASSETS_PER_ROW
    );
  });

  it('INITIAL_ITEMS_PER_PAGE is less than ASSETS_PER_PAGE', () => {
    expect(PAGINATION.INITIAL_ITEMS_PER_PAGE).toBeLessThan(PAGINATION.ASSETS_PER_PAGE);
  });
});

describe('BATCH_UPLOAD_CONFIG', () => {
  it('has reasonable concurrency limit', () => {
    expect(BATCH_UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS).toBeGreaterThan(0);
    expect(BATCH_UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS).toBeLessThanOrEqual(10);
  });

  it('has positive retry config', () => {
    expect(BATCH_UPLOAD_CONFIG.MAX_RETRIES).toBeGreaterThan(0);
    expect(BATCH_UPLOAD_CONFIG.RETRY_DELAY).toBeGreaterThan(0);
  });
});
