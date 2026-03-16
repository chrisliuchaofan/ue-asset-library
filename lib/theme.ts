/**
 * 爆款工坊 — 统一 Design Token
 *
 * 所有 UI 组件通过此文件获取颜色、间距、圆角、过渡等样式常量。
 * 避免 Tailwind className 在 Turbopack 下的兼容问题（responsive prefix、arbitrary opacity 不生效）。
 *
 * 用法：
 *   import { T } from '@/lib/theme'
 *   <div style={{ background: T.bg.page, color: T.text.primary }}>
 *
 * 规则：
 * - 纯黑底 Runway 美学（#000 主背景）
 * - 使用 rgba(255,255,255,XX) 透明度层级控制文字/边框/悬浮
 * - 不使用 Tailwind className 做颜色/布局（可保留用于 flex/grid 等布局工具类）
 */

// ============================================================
// 颜色体系
// ============================================================

export const colors = {
  /** 页面主背景 */
  pageBg: '#000',
  /** 面板/侧栏/卡片背景（比主背景略亮） */
  panelBg: '#0a0a0a',
  /** 卡片/弹窗/浮层背景 */
  surfaceBg: '#111',
  /** 输入框/表单背景 */
  inputBg: '#0d0d0d',
  /** 悬浮态背景 */
  hoverBg: 'rgba(255,255,255,0.06)',
  /** 激活态背景（白底黑字） */
  activeBg: '#fff',
  /** 选中态背景（半透明白） */
  selectedBg: 'rgba(255,255,255,0.08)',

  /** 主文字 */
  textPrimary: '#fff',
  /** 二级文字 */
  textSecondary: 'rgba(255,255,255,0.6)',
  /** 三级文字 / placeholder */
  textTertiary: 'rgba(255,255,255,0.4)',
  /** 禁用态文字 */
  textDisabled: 'rgba(255,255,255,0.25)',
  /** 反色文字（用于激活态白底按钮） */
  textInverse: '#000',

  /** 主边框 */
  border: 'rgba(255,255,255,0.06)',
  /** 强调边框（hover / focus） */
  borderStrong: 'rgba(255,255,255,0.12)',
  /** 焦点环 */
  focusRing: 'rgba(255,255,255,0.2)',

  /** 品牌主色 */
  brand: '#fff',
  /** 成功 */
  success: '#22c55e',
  /** 警告 */
  warning: '#f59e0b',
  /** 错误 */
  error: '#ef4444',
  /** 信息 */
  info: '#3b82f6',
} as const;

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
  overlay: '0 8px 32px rgba(0,0,0,0.5)',
  /** 卡片微阴影 */
  card: '0 1px 3px rgba(0,0,0,0.3)',
  /** 下拉菜单 */
  dropdown: '0 4px 16px rgba(0,0,0,0.4)',
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
// 常用 style 工具
// ============================================================

/** 激活态 pill 按钮样式 */
export const pillActive = {
  background: colors.activeBg,
  color: colors.textInverse,
  border: 'none',
  fontWeight: fontWeight.medium,
} as const;

/** 非激活态 pill 按钮样式 */
export const pillInactive = {
  background: colors.hoverBg,
  color: colors.textTertiary,
  border: 'none',
  fontWeight: fontWeight.medium,
} as const;

/** 通用卡片容器 */
export const cardStyle = {
  background: colors.surfaceBg,
  borderRadius: radius.lg,
  border: `1px solid ${colors.border}`,
} as const;

/** 表单输入框 */
export const inputStyle = {
  background: colors.inputBg,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  color: colors.textPrimary,
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
