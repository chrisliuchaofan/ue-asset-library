/**
 * 素材命名解析器
 * 根据三国冰河素材命名规则提取分类标签和创意类型
 * 
 * 命名格式示例：
 * #251106 1Z 2晓 3晓 4AE 6Z小游戏 8H 919708木场54解说 aB b三冰 c竖.mp4
 * #260108_1WZ_2贺鑫晓鹏李_3晓_4AE_5W玩法_6Z混剪_8G_926753RCB女神大猩猩偷围栏_aB_b三冰_c竖
 */

export interface ParsedMaterialName {
  /** 方向分类：RC、木场、WL、RCB、UE、AE等 */
  direction?: string;
  /** 创意类型：偷围栏、怪物围栏、河马咬木头、AI、玩法、解说、混剪等 */
  creativeType?: string;
  /** 技术类型：AE、UE等（从4XX编码提取） */
  techType?: string;
  /** 创意标签：小游戏、AI、混剪、玩法、解说等（从6X编码提取） */
  creativeTag?: string;
  /** 其他标签 */
  tags?: string[];
}

/**
 * 方向关键词映射
 */
const DIRECTION_KEYWORDS = {
  'RC': ['RC', 'rc'],
  'RCB': ['RCB', 'rcb'],
  '木场': ['木场', '木場'],
  'WL': ['WL', 'wl'],
  'UE': ['UE', 'ue'],
  'AE': ['AE', 'ae'],
};

/**
 * 创意类型关键词映射
 */
const CREATIVE_TYPE_KEYWORDS = {
  '偷围栏': ['偷围栏', '偷圍欄'],
  '怪物围栏': ['怪物围栏', '怪物圍欄'],
  '河马咬木头': ['河马咬木头', '河馬咬木頭', '河马', '河馬'],
  '白熊': ['白熊'],
  '鳄鱼': ['鳄鱼', '鱷魚'],
  '大象': ['大象'],
  '大猩猩': ['大猩猩'],
  'AI': ['AI', 'ai'],
  '玩法': ['玩法'],
  '解说': ['解说', '解說'],
  '混剪': ['混剪'],
  '小游戏': ['小游戏', '小遊戲'],
  '塔防': ['塔防'],
  '红蓝对抗': ['红蓝对抗', '紅藍對抗', '红蓝', '紅藍'],
  '切块': ['切块', '切塊'],
  '倍增门': ['倍增门', '倍增門'],
  '数字门': ['数字门', '數字門'],
  '木场烧木头': ['木场烧木头', '木場燒木頭', '烧木头', '燒木頭'],
  '木场': ['木场', '木場'],
  '女神': ['女神'],
  '瀑布': ['瀑布'],
};

/**
 * 解析素材名称，提取分类标签
 */
export function parseMaterialName(name: string): ParsedMaterialName {
  const result: ParsedMaterialName = {
    tags: [],
  };

  if (!name || name.trim() === '') {
    return result;
  }

  const nameUpper = name.toUpperCase();
  const nameLower = name.toLowerCase();

  // 1. 提取技术类型（从 4XX 编码中提取）
  // 格式：4AE、4UE 等
  const techTypeMatch = name.match(/4([A-Z]{2})/i);
  if (techTypeMatch) {
    result.techType = techTypeMatch[1].toUpperCase();
  }

  // 2. 提取创意标签（从 6X 编码中提取）
  // 格式：6Z小游戏、6ZAI、6Z混剪、6Z玩法、6Z解说等
  const creativeTagMatch = name.match(/6[ZUEW]([^0-9\s_]+)/i);
  if (creativeTagMatch) {
    const tag = creativeTagMatch[1];
    // 提取关键词
    if (tag.includes('小游戏') || tag.includes('小遊戲')) {
      result.creativeTag = '小游戏';
    } else if (tag.includes('AI') || tag.includes('ai')) {
      result.creativeTag = 'AI';
    } else if (tag.includes('混剪')) {
      result.creativeTag = '混剪';
    } else if (tag.includes('玩法')) {
      result.creativeTag = '玩法';
    } else if (tag.includes('解说') || tag.includes('解說')) {
      result.creativeTag = '解说';
    } else if (tag.includes('fake')) {
      result.creativeTag = 'fake';
    }
  }

  // 3. 提取方向（从描述部分提取，通常在9XXXXX之后）
  // 查找方向关键词
  for (const [direction, keywords] of Object.entries(DIRECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        result.direction = direction;
        break;
      }
    }
    if (result.direction) break;
  }

  // 4. 提取创意类型（从描述部分提取）
  // 查找创意类型关键词
  for (const [creativeType, keywords] of Object.entries(CREATIVE_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        result.creativeType = creativeType;
        break;
      }
    }
    if (result.creativeType) break;
  }

  // 5. 提取其他标签
  // 从描述中提取更多信息
  const descriptionMatch = name.match(/9\d+([^a-z_]+)/i);
  if (descriptionMatch) {
    const description = descriptionMatch[1];
    
    // 提取方向（如果还没找到）
    if (!result.direction) {
      for (const [direction, keywords] of Object.entries(DIRECTION_KEYWORDS)) {
        for (const keyword of keywords) {
          if (description.includes(keyword)) {
            result.direction = direction;
            break;
          }
        }
        if (result.direction) break;
      }
    }

    // 提取创意类型（如果还没找到）
    if (!result.creativeType) {
      for (const [creativeType, keywords] of Object.entries(CREATIVE_TYPE_KEYWORDS)) {
        for (const keyword of keywords) {
          if (description.includes(keyword)) {
            result.creativeType = creativeType;
            break;
          }
        }
        if (result.creativeType) break;
      }
    }
  }

  // 6. 收集所有标签
  if (result.direction) {
    result.tags!.push(result.direction);
  }
  if (result.creativeType) {
    result.tags!.push(result.creativeType);
  }
  if (result.techType) {
    result.tags!.push(result.techType);
  }
  if (result.creativeTag) {
    result.tags!.push(result.creativeTag);
  }

  return result;
}

/**
 * 批量解析素材名称
 */
export function parseMaterialNames(materials: Array<{ name: string }>): Array<{ name: string; parsed: ParsedMaterialName }> {
  return materials.map((material) => ({
    ...material,
    parsed: parseMaterialName(material.name),
  }));
}
