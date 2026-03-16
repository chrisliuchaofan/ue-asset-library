/**
 * 素材命名规则引擎
 *
 * 11标签命名格式:
 * #YYMMDD_1来源_2设计师_3创意_4类型_5方向1_6方向2_7代言人_8核心内容_9命名_a配音_b产品_c版式
 */

// ==================== 类型定义 ====================

/** 命名字段结构 */
export interface NamingFields {
  date: string;           // YYMMDD
  source: string;         // 1来源: Z/W鲸游/WZ/Y/YZ/M/P/O
  designer: string;       // 2设计师
  creative: string;       // 3创意人
  materialType: string;   // 4类型: AE/UE
  direction1: string;     // 5方向1
  direction2: string;     // 6方向2
  spokesperson: string;   // 7代言人 (可选)
  coreContent: string;    // 8核心内容: A/B/C/D/E/F
  naming: string;         // 9命名: S001名称
  voiceover: string;      // a配音: A~H
  product: string;        // b产品
  format: string;         // c版式: 横/竖/方
}

/** 命名校验结果 */
export interface NamingValidation {
  valid: boolean;
  errors: { field: keyof NamingFields; message: string }[];
  naming: string;
}

// ==================== 选项定义 ====================

/** 素材来源选项 */
export const SOURCE_OPTIONS = [
  { value: 'Z', label: 'Z - 内部自制' },
  { value: 'W', label: 'W - 外包', needsVendor: true },
  { value: 'WZ', label: 'WZ - 外包+自制' },
  { value: 'Y', label: 'Y - 亿创' },
  { value: 'YZ', label: 'YZ - 亿创+自制' },
  { value: 'M', label: 'M - 美术中心' },
  { value: 'P', label: 'P - 平台回收' },
  { value: 'O', label: 'O - Omni' },
] as const;

/** 素材类型选项 */
export const MATERIAL_TYPE_OPTIONS = [
  { value: 'AE', label: 'AE' },
  { value: 'UE', label: 'UE' },
] as const;

/** 核心内容选项 */
export const CORE_CONTENT_OPTIONS = [
  { value: 'A', label: 'A - 原片', coefficient: 1.0 },
  { value: 'B', label: 'B - 深度迭代/2人混剪', coefficient: 0.5 },
  { value: 'C', label: 'C - 3人混剪迭代', coefficient: 0.33 },
  { value: 'D', label: 'D - 玩法解说/混剪', coefficient: 0.25 },
  { value: 'E', label: 'E - 扒片头/大字报', coefficient: 0.1 },
  { value: 'F', label: 'F - 镜像/改色/扒', coefficient: 0 },
] as const;

/** 配音选项 */
export const VOICEOVER_OPTIONS = [
  { value: 'A', label: 'A - 无配音' },
  { value: 'B', label: 'B - 普通话电子音' },
  { value: 'C', label: 'C - 普通话真人' },
  { value: 'D', label: 'D - 台语电子音' },
  { value: 'E', label: 'E - 台腔真人' },
  { value: 'F', label: 'F - 其他方言电子音' },
  { value: 'G', label: 'G - 其他方言真人' },
  { value: 'H', label: 'H - 混合' },
] as const;

/** 版式选项 */
export const FORMAT_OPTIONS = [
  { value: '横', label: '横版 (16:9)' },
  { value: '竖', label: '竖版 (9:16)' },
  { value: '方', label: '方版 (1:1)' },
] as const;

// ==================== 核心函数 ====================

/** 生成今日日期 YYMMDD */
export function getTodayDate(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/** 从 NamingFields 生成完整命名字符串 */
export function generateNaming(fields: NamingFields): string {
  const parts = [
    `#${fields.date}`,
    `1${fields.source}`,
    `2${fields.designer}`,
    `3${fields.creative}`,
    `4${fields.materialType}`,
  ];

  // 方向1: 有值就填，没有就填 /
  if (fields.direction1 && fields.direction1 !== '/') {
    parts.push(`5${fields.direction1}`);
  }

  // 方向2: 有值就填，没有就填 /
  if (fields.direction2 && fields.direction2 !== '/') {
    parts.push(`6${fields.direction2}`);
  }

  // 代言人: 可选
  if (fields.spokesperson) {
    parts.push(`7${fields.spokesperson}`);
  }

  parts.push(`8${fields.coreContent}`);
  parts.push(`9${fields.naming}`);
  parts.push(`a${fields.voiceover}`);
  parts.push(`b${fields.product}`);
  parts.push(`c${fields.format}`);

  return parts.join('_');
}

/** 校验命名字段完整性 */
export function validateNaming(fields: NamingFields): NamingValidation {
  const errors: NamingValidation['errors'] = [];

  if (!fields.date || !/^\d{6}$/.test(fields.date)) {
    errors.push({ field: 'date', message: '日期必须是6位数字 (YYMMDD)' });
  }
  if (!fields.source) {
    errors.push({ field: 'source', message: '素材来源不能为空' });
  }
  if (!fields.designer) {
    errors.push({ field: 'designer', message: '设计师不能为空' });
  }
  if (!fields.creative) {
    errors.push({ field: 'creative', message: '创意人不能为空' });
  }
  if (!fields.materialType || !['AE', 'UE'].includes(fields.materialType)) {
    errors.push({ field: 'materialType', message: '素材类型必须是 AE 或 UE' });
  }
  if (!fields.coreContent || !['A', 'B', 'C', 'D', 'E', 'F'].includes(fields.coreContent)) {
    errors.push({ field: 'coreContent', message: '核心内容代码不能为空 (A~F)' });
  }
  if (!fields.naming) {
    errors.push({ field: 'naming', message: '命名不能为空' });
  }
  if (!fields.voiceover || !['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(fields.voiceover)) {
    errors.push({ field: 'voiceover', message: '配音类型不能为空 (A~H)' });
  }
  if (!fields.product) {
    errors.push({ field: 'product', message: '产品名不能为空' });
  }
  if (!fields.format || !['横', '竖', '方'].includes(fields.format)) {
    errors.push({ field: 'format', message: '版式必须是 横/竖/方' });
  }

  const naming = errors.length === 0 ? generateNaming(fields) : '';

  return { valid: errors.length === 0, errors, naming };
}

/** 解析命名字符串为 NamingFields (反向解析，用于数据反标匹配) */
export function parseNaming(naming: string): Partial<NamingFields> | null {
  if (!naming || !naming.startsWith('#')) return null;

  const result: Partial<NamingFields> = {};
  // 去掉开头的 #
  const withoutHash = naming.startsWith('#') ? naming.substring(1) : naming;
  const parts = withoutHash.split('_');

  for (const part of parts) {
    if (!part) continue;

    // 第一个part是日期
    if (/^\d{6}$/.test(part)) {
      result.date = part;
      continue;
    }

    const prefix = part[0];
    const value = part.substring(1);

    switch (prefix) {
      case '1': result.source = value; break;
      case '2': result.designer = value; break;
      case '3': result.creative = value; break;
      case '4': result.materialType = value; break;
      case '5': result.direction1 = value; break;
      case '6': result.direction2 = value; break;
      case '7': result.spokesperson = value; break;
      case '8': result.coreContent = value; break;
      case '9': result.naming = value; break;
      case 'a': result.voiceover = value; break;
      case 'b': result.product = value; break;
      case 'c': result.format = value; break;
    }
  }

  return result;
}

/** 获取默认命名字段 */
export function getDefaultNamingFields(): NamingFields {
  return {
    date: getTodayDate(),
    source: 'Z',
    designer: '',
    creative: '',
    materialType: 'AE',
    direction1: '/',
    direction2: '/',
    spokesperson: '',
    coreContent: 'A',
    naming: '',
    voiceover: 'A',
    product: '',
    format: '竖',
  };
}
