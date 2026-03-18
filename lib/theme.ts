/**
 * 爆款工坊 — 统一 Design Token
 *
 * 所有 UI 组件通过此文件获取间距、圆角、过渡等样式常量。
 * 颜色全部使用 CSS 变量（hsl(var(--xxx))），支持亮色/暗色自动切换。
 *
 * 用法：
 *   import T from '@/lib/theme'
 *   <div style={{ background: 'hsl(var(--card))', borderRadius: T.radius.lg }}>
 *
 * 颜色规则：
 * - 使用 globals.css 定义的 CSS 变量 (--background, --foreground, --card, --border, etc.)
 * - 组件中使用 hsl(var(--xxx)) 而非硬编码颜色
 * - 支持亮色/暗色/跟随系统三种主题模式
 */

// ============================================================
// 间距 (px)
// ============================================================

export const space = {
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 20px */
  xl: 20,
  /** 24px */
  '2xl': 24,
  /** 32px */
  '3xl': 32,
  /** 40px */
  '4xl': 40,
  /** 48px */
  '5xl': 48,
} as const;

// ============================================================
// 圆角 (px)
// ============================================================

export const radius = {
  /** 4px — 小控件（tag, badge） */
  sm: 4,
  /** 6px — 按钮、输入框 */
  md: 6,
  /** 8px — 卡片 */
  lg: 8,
  /** 12px — 大卡片、弹窗 */
  xl: 12,
  /** 9999px — 胶囊 pill */
  full: 9999,
} as const;

// ============================================================
// 过渡
// ============================================================

export const transition = {
  /** 快速微交互（hover, active） */
  fast: 'all 0.15s ease',
  /** 标准过渡（展开、切换） */
  normal: 'all 0.2s ease',
  /** 缓慢（布局位移、侧栏展开） */
  slow: 'all 0.3s ease',
  /** 侧栏宽度专用 */
  sidebarWidth: 'width 0.2s ease',
} as const;

// ============================================================
// 字号 (px)
// ============================================================

export const fontSize = {
  /** 10px — 极小标注 */
  '2xs': 10,
  /** 11px — 辅助标签 */
  xs: 11,
  /** 12px — 正文辅助 */
  sm: 12,
  /** 13px — 正文 */
  base: 13,
  /** 14px — 小标题 */
  md: 14,
  /** 16px — 标题 */
  lg: 16,
  /** 18px — 大标题 */
  xl: 18,
  /** 24px — 页面标题 */
  '2xl': 24,
} as const;

// ============================================================
// 字重
// ============================================================

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ============================================================
// 阴影
// ============================================================

export const shadow = {
  /** 弹窗/浮层阴影 */
  overlay: '0 8px 32px hsl(var(--foreground) / 0.15)',
  /** 卡片微阴影 */
  card: '0 1px 3px hsl(var(--foreground) / 0.06)',
  /** 下拉菜单 */
  dropdown: '0 4px 16px hsl(var(--foreground) / 0.1)',
} as const;

// ============================================================
// 布局尺寸
// ============================================================

export const layout = {
  /** 侧栏折叠宽度 */
  sidebarCollapsed: 55,
  /** 侧栏展开宽度 */
  sidebarExpanded: 220,
  /** Studio 工具面板宽度（桌面） */
  toolPanelDesktop: 340,
  /** Studio 工具面板宽度（平板） */
  toolPanelTablet: 280,
  /** 顶栏高度（如有） */
  headerHeight: 48,
  /** 移动端底部导航高度 */
  mobileNavHeight: 56,
} as const;

// ============================================================
// 断点 (px) — 用于 window.matchMedia
// ============================================================

export const breakpoint = {
  /** 手机 → 平板 */
  sm: 640,
  /** 平板 → 小桌面 */
  md: 768,
  /** 小桌面 → 大桌面 */
  lg: 1024,
  /** 大桌面 → 超宽 */
  xl: 1280,
} as const;

// ============================================================
// 颜色体系（CSS 变量映射，支持亮色/暗色自动切换）
// ============================================================

export const colors = {
  /** 页面主背景 */
  pageBg: 'hsl(var(--background))',
  /** 面板/侧栏/卡片背景 */
  panelBg: 'hsl(var(--card))',
  /** 卡片/弹窗/浮层背景 */
  surfaceBg: 'hsl(var(--popover))',
  /** 输入框/表单背景 */
  inputBg: 'hsl(var(--muted))',
  /** 悬浮态背景 */
  hoverBg: 'hsl(var(--accent))',
  /** 激活态背景 */
  activeBg: 'hsl(var(--primary))',
  /** 选中态背景 */
  selectedBg: 'hsl(var(--accent))',

  /** 主文字 */
  textPrimary: 'hsl(var(--foreground))',
  /** 二级文字 */
  textSecondary: 'hsl(var(--muted-foreground))',
  /** 三级文字 / placeholder */
  textTertiary: 'hsl(var(--muted-foreground) / 0.6)',
  /** 禁用态文字 */
  textDisabled: 'hsl(var(--muted-foreground) / 0.4)',
  /** 反色文字 */
  textInverse: 'hsl(var(--primary-foreground))',

  /** 主边框 */
  border: 'hsl(var(--border))',
  /** 强调边框 */
  borderStrong: 'hsl(var(--ring))',
  /** 焦点环 */
  focusRing: 'hsl(var(--ring) / 0.3)',

  /** 品牌主色 */
  brand: 'hsl(var(--primary))',
  /** 成功 */
  success: 'hsl(var(--success))',
  /** 警告 */
  warning: 'hsl(var(--warning))',
  /** 错误 */
  error: 'hsl(var(--destructive))',
  /** 信息 */
  info: 'hsl(var(--info))',
} as const;

/** 激活态 pill 按钮样式 */
export const pillActive = {
  background: 'hsl(var(--foreground))',
  color: 'hsl(var(--background))',
  border: 'none',
  fontWeight: fontWeight.medium,
} as const;

/** 非激活态 pill 按钮样式 */
export const pillInactive = {
  background: 'hsl(var(--muted))',
  color: 'hsl(var(--muted-foreground))',
  border: 'none',
  fontWeight: fontWeight.medium,
} as const;

/** 通用卡片容器 */
export const cardStyle = {
  background: 'hsl(var(--card))',
  borderRadius: radius.lg,
  border: `1px solid hsl(var(--border))`,
} as const;

/** 表单输入框 */
export const inputStyle = {
  background: 'hsl(var(--muted))',
  border: `1px solid hsl(var(--border))`,
  borderRadius: radius.md,
  color: 'hsl(var(--foreground))',
  fontSize: fontSize.sm,
  padding: `${space.sm}px ${space.md}px`,
  outline: 'none',
  transition: transition.fast,
} as const;

// ============================================================
// 统一导出（简短别名）
// ============================================================

export const T = {
  bg: {
    page: colors.pageBg,
    panel: colors.panelBg,
    surface: colors.surfaceBg,
    input: colors.inputBg,
    hover: colors.hoverBg,
    active: colors.activeBg,
    selected: colors.selectedBg,
  },
  text: {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    disabled: colors.textDisabled,
    inverse: colors.textInverse,
  },
  border: colors.border,
  borderStrong: colors.borderStrong,
  focusRing: colors.focusRing,
  brand: colors.brand,
  status: {
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
  },
  space,
  radius,
  transition,
  fontSize,
  fontWeight,
  shadow,
  layout,
  breakpoint,
  pill: { active: pillActive, inactive: pillInactive },
  card: cardStyle,
  input: inputStyle,
} as const;

export default T;
