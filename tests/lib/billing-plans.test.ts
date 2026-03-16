import { describe, it, expect } from 'vitest';
import {
  PLANS,
  getPlan,
  getPlanFeatureList,
  type PlanId,
} from '@/lib/billing/plans';

describe('PLANS', () => {
  it('has exactly 3 plans', () => {
    expect(Object.keys(PLANS)).toHaveLength(3);
  });

  it('has free, pro, enterprise', () => {
    expect(PLANS.free).toBeDefined();
    expect(PLANS.pro).toBeDefined();
    expect(PLANS.enterprise).toBeDefined();
  });

  it('free plan has price 0', () => {
    expect(PLANS.free.price).toBe(0);
  });

  it('pro plan has positive price', () => {
    expect(PLANS.pro.price).toBeGreaterThan(0);
  });

  it('enterprise has negative price (contact sales)', () => {
    expect(PLANS.enterprise.price).toBe(-1);
  });

  it('free has limited credits', () => {
    expect(PLANS.free.features.monthlyCredits).toBeGreaterThan(0);
    expect(PLANS.free.features.monthlyCredits).toBeLessThan(PLANS.pro.features.monthlyCredits);
  });

  it('pro is marked as popular', () => {
    expect(PLANS.pro.popular).toBe(true);
  });

  it('enterprise has unlimited members', () => {
    expect(PLANS.enterprise.features.maxMembers).toBe(-1);
  });

  it('plans have increasing feature limits', () => {
    expect(PLANS.free.features.maxMembers).toBeLessThan(PLANS.pro.features.maxMembers);
    expect(PLANS.free.features.maxStorage).toBeLessThan(PLANS.pro.features.maxStorage);
  });
});

describe('getPlan', () => {
  it('returns correct plan by id', () => {
    expect(getPlan('free').id).toBe('free');
    expect(getPlan('pro').id).toBe('pro');
    expect(getPlan('enterprise').id).toBe('enterprise');
  });

  it('falls back to free for unknown plan', () => {
    expect(getPlan('unknown' as PlanId).id).toBe('free');
  });
});

describe('getPlanFeatureList', () => {
  it('returns Chinese feature list by default', () => {
    const features = getPlanFeatureList(PLANS.free);
    expect(features.length).toBeGreaterThan(0);
    expect(features[0]).toContain('AI 积分');
  });

  it('returns English feature list', () => {
    const features = getPlanFeatureList(PLANS.free, 'en');
    expect(features.length).toBeGreaterThan(0);
    expect(features[0]).toContain('AI credits');
  });

  it('pro includes priority support', () => {
    const features = getPlanFeatureList(PLANS.pro);
    expect(features.some(f => f.includes('优先'))).toBe(true);
  });

  it('free does not include priority support', () => {
    const features = getPlanFeatureList(PLANS.free);
    expect(features.some(f => f.includes('优先'))).toBe(false);
  });

  it('enterprise includes custom branding', () => {
    const features = getPlanFeatureList(PLANS.enterprise);
    expect(features.some(f => f.includes('自定义品牌'))).toBe(true);
  });

  it('enterprise shows unlimited credits', () => {
    const features = getPlanFeatureList(PLANS.enterprise);
    expect(features.some(f => f.includes('不限量'))).toBe(true);
  });
});
