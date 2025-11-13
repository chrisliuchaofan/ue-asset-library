// 项目常量定义

// 项目列表（固定列表，3个项目）
export const PROJECTS = [
  '项目A', // 三冰
  '项目B', // 次神
  '项目C', // 造化
] as const;

export type Project = typeof PROJECTS[number];

// 项目显示名称映射（用于页面显示）
export const PROJECT_DISPLAY_NAMES: Record<Project, string> = {
  '项目A': '三冰',
  '项目B': '次神',
  '项目C': '造化',
};

// 项目密码配置（支持中文密码）
// 密码就是项目名：项目A=三冰，项目B=次神，项目C=造化
// 可以通过环境变量覆盖，格式：PROJECT_PASSWORDS={"项目A":"三冰","项目B":"次神"}
export const PROJECT_PASSWORDS: Record<Project, string> = {
  '项目A': process.env.NEXT_PUBLIC_PROJECT_A_PASSWORD || '三冰',
  '项目B': process.env.NEXT_PUBLIC_PROJECT_B_PASSWORD || '次神',
  '项目C': process.env.NEXT_PUBLIC_PROJECT_C_PASSWORD || '造化',
};

// 获取项目显示名称（支持自定义项目）
export function getProjectDisplayName(project: string): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('project_display_names');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed[project]) {
          return parsed[project];
        }
      } catch {
        // 如果解析失败，使用默认值
      }
    }
  }
  return PROJECT_DISPLAY_NAMES[project as Project] || project;
}

// 获取项目密码（支持自定义项目）
export function getProjectPassword(project: string): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('project_passwords');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed[project]) {
          return parsed[project];
        }
      } catch {
        // 如果解析失败，使用默认值
      }
    }
  }
  return PROJECT_PASSWORDS[project as Project] || '';
}

// 获取所有项目（包括自定义项目）
export function getAllProjects(): string[] {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('custom_projects');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [...PROJECTS, ...parsed];
        }
      } catch {
        // 如果解析失败，使用默认值
      }
    }
  }
  return [...PROJECTS];
}

// 文件上传限制
export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB
  MAX_FILE_NAME_LENGTH: 255,
} as const;

// 允许的文件扩展名
export const ALLOWED_FILE_EXTENSIONS = {
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
  VIDEO: ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
  ALL: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.mp4', '.webm', '.mov', '.avi', '.mkv'],
} as const;

// 允许的 MIME 类型
export const ALLOWED_MIME_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
} as const;

// 默认资产类型
export const DEFAULT_ASSET_TYPES = [
  '角色',
  '场景',
  '动画',
  '特效',
  '材质',
  '蓝图',
  'UI',
  '合成',
  '音频',
  '其他',
] as const;

// 分页配置
export const PAGINATION = {
  ITEMS_PER_PAGE: 50,
  // 资产列表分页：每行10个，每页10x10=100个
  ASSETS_PER_ROW: 10, // 每行显示的资产数量
  ASSETS_ROWS_PER_PAGE: 10, // 每页显示的行数
  ASSETS_PER_PAGE: 100, // 每页显示的资产数量（10x10）
  // 性能优化：减少初始渲染数量
  INITIAL_ITEMS_PER_PAGE: 18, // 素材列表初始每页显示数量（从 24 降到 18，进一步减少首屏渲染）
  PRIORITY_IMAGES_COUNT: 12, // 首屏优先加载的图片数量（根据实际可见区域调整）
  // 虚拟滚动配置
  VIRTUAL_SCROLL_OVERSCAN: 1, // 虚拟滚动预渲染行数（从 2 降到 1，最小化初始渲染）
} as const;

// 批量上传配置
export const BATCH_UPLOAD_CONFIG = {
  // 最大并发上传数（避免内存溢出和连接数过多）
  MAX_CONCURRENT_UPLOADS: 5,
  // 单次批量上传最大文件数
  MAX_BATCH_SIZE: 100,
  // 上传重试次数
  MAX_RETRIES: 3,
  // 重试延迟（毫秒）
  RETRY_DELAY: 1000,
} as const;


