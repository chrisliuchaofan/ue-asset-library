// 项目常量定义

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
  PRIORITY_IMAGES_COUNT: 7, // 首屏优先加载的图片数量
} as const;


