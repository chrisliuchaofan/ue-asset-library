import Link from 'next/link';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';

export const metadata: Metadata = {
  title: '爆款工坊交付验收',
  description: '本轮爆款拆解、模板复刻、数据反馈闭环的测试历史与验收入口',
};

const testHistory = [
  {
    title: '素材上传修复实测',
    result: 'passed',
    detail: '复现截图中的 56.4 秒小数时长上传场景，线上创建素材成功，入库后时长为 56 秒。',
  },
  {
    title: 'AI 视频分析网关',
    result: 'passed',
    detail: '视频分析已切到太石 LLM 网关；当网关限流或不可用时，模板和脚本生成仍有可用兜底。',
  },
  {
    title: '线上主链路验收样本',
    result: 'passed',
    detail: '内部素材、竞品素材、爆款模板、复刻脚本、周报数据回填已在正式库形成一组可验收样本。',
  },
  {
    title: '模板反馈验收',
    result: 'passed',
    detail: '模板详情可看到来源爆款与复刻反馈，周报回填后用于判断模板是否继续复用。',
  },
  {
    title: '数据回填测试',
    result: 'passed',
    detail: '周报/TD 字段解析、稳定 ID 匹配、团队内写回规则已通过，线上验收报告总消耗 483,200。',
  },
  {
    title: '项目权限空态',
    result: 'passed',
    detail: '没有项目权限时不再显示空白素材库，而是明确提示账号缺项目权限并给出下一步入口。',
  },
  {
    title: '域名一致性',
    result: 'passed',
    detail: '旧 Vercel 域名、裸域和预览域会跳转到 https://www.factory-buy.com，登录回跳也会清洗到主域名。',
  },
  {
    title: '类型检查与生产构建',
    result: 'ready',
    detail: '全项目 TypeScript 检查和 Next.js 生产构建通过后再发布线上。',
  },
];

const acceptanceFlow = [
  { label: '1. 先看数据回填', href: '/weekly-reports' },
  { label: '2. 查看内部/竞品素材', href: '/materials?project=项目A' },
  { label: '3. 打开爆款模板', href: '/templates/c0d3cafe-0001-4000-8000-000000000101' },
  { label: '4. 用模板生成创意', href: '/studio?templateId=c0d3cafe-0001-4000-8000-000000000101' },
  { label: '5. 检查复刻脚本', href: '/studio' },
  { label: '6. 回到模板看反馈', href: '/templates/c0d3cafe-0001-4000-8000-000000000101' },
];

const latestAcceptance = [
  { label: '验收团队', value: '刘超凡 / 爆款工坊团队' },
  { label: '验收报告', value: '2026-05-03 ~ 2026-05-09 线上验收，总消耗 483,200' },
  { label: '验收模板', value: 'c0d3cafe-0001-4000-8000-000000000101' },
  { label: '验收口径', value: '爆款拆解（竞品、内部）→ 爆款模板 → 创意复刻 → 数据反馈' },
];

export default function DeliveryPage() {
  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <p style={styles.kicker}>交付验收页 · 2026-05-11 CST · https://www.factory-buy.com</p>
        <h1 style={styles.title}>爆款拆解到创意复刻闭环</h1>
        <p style={styles.subtitle}>
          本页用于你打开线上链接后先看测试历史，再按业务理解进入产品自测。
        </p>
        <div style={styles.actions}>
          <Link href="/weekly-reports" style={styles.primaryButton}>开始验收</Link>
          <Link href="/templates/c0d3cafe-0001-4000-8000-000000000101" style={styles.secondaryButton}>查看模板</Link>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>测试历史</h2>
        <div style={styles.grid}>
          {testHistory.map(item => (
            <article key={item.title} style={styles.card}>
              <div style={styles.cardTop}>
                <h3 style={styles.cardTitle}>{item.title}</h3>
                <span style={styles.badge}>{item.result}</span>
              </div>
              <p style={styles.cardText}>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>你要验收的主链路</h2>
        <div style={styles.flow}>
          {acceptanceFlow.map(step => (
            <Link key={step.label} href={step.href} style={styles.flowItem}>
              {step.label}
            </Link>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>本次线上验收样本</h2>
        <div style={styles.evidenceGrid}>
          {latestAcceptance.map(item => (
            <article key={item.label} style={styles.evidenceItem}>
              <span style={styles.evidenceLabel}>{item.label}</span>
              <strong style={styles.evidenceValue}>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section style={styles.note}>
        <h2 style={styles.noteTitle}>交付口径</h2>
        <p style={styles.noteText}>
          当前聚焦目标是：爆款拆解（竞品、内部）→ 爆款模板 → 创意复刻 → 数据反馈。
          本轮没有改成 lite 版，也没有更换项目底座。
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7f8fb',
    color: '#111827',
    padding: '48px 24px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    maxWidth: 1040,
    margin: '0 auto 36px',
  },
  kicker: {
    margin: '0 0 12px',
    color: '#596579',
    fontSize: 14,
  },
  title: {
    margin: 0,
    fontSize: 44,
    lineHeight: 1.08,
    letterSpacing: 0,
  },
  subtitle: {
    maxWidth: 680,
    margin: '18px 0 0',
    color: '#4b5563',
    fontSize: 17,
    lineHeight: 1.7,
  },
  actions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 26,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 42,
    padding: '0 18px',
    borderRadius: 8,
    background: '#111827',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 42,
    padding: '0 18px',
    borderRadius: 8,
    background: '#fff',
    color: '#111827',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
    border: '1px solid #d8dee9',
  },
  section: {
    maxWidth: 1040,
    margin: '0 auto 28px',
  },
  sectionTitle: {
    margin: '0 0 14px',
    fontSize: 22,
    letterSpacing: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  card: {
    background: '#fff',
    border: '1px solid #e1e7ef',
    borderRadius: 8,
    padding: 18,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardTitle: {
    margin: 0,
    fontSize: 15,
    letterSpacing: 0,
  },
  badge: {
    flex: '0 0 auto',
    borderRadius: 999,
    padding: '4px 8px',
    background: '#e8f7ef',
    color: '#11633c',
    fontSize: 12,
    fontWeight: 700,
  },
  cardText: {
    margin: '12px 0 0',
    color: '#4b5563',
    lineHeight: 1.65,
    fontSize: 14,
  },
  flow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 10,
  },
  flowItem: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 48,
    padding: '0 16px',
    borderRadius: 8,
    background: '#fff',
    border: '1px solid #dfe6ef',
    color: '#111827',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
  },
  evidenceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 10,
  },
  evidenceItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 92,
    padding: 16,
    borderRadius: 8,
    background: '#fff',
    border: '1px solid #e1e7ef',
  },
  evidenceLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: 700,
  },
  evidenceValue: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 1.55,
    overflowWrap: 'anywhere',
  },
  note: {
    maxWidth: 1040,
    margin: '0 auto',
    padding: 20,
    background: '#eef4ff',
    border: '1px solid #d7e4ff',
    borderRadius: 8,
  },
  noteTitle: {
    margin: '0 0 8px',
    fontSize: 17,
    letterSpacing: 0,
  },
  noteText: {
    margin: 0,
    color: '#334155',
    lineHeight: 1.7,
    fontSize: 14,
  },
};
