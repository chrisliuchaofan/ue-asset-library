import { test, expect } from 'playwright/test';

test.describe('Authentication Flow', () => {
  test('redirects unauthenticated user to login page', async ({ page }) => {
    await page.goto('/materials');
    // Should be redirected to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/auth/login');
    // Should have login form elements
    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page.locator('input[type="text"], input[name="username"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /登录|sign in|login/i })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="text"], input[name="username"], input[name="email"]').first().fill('wronguser');
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.getByRole('button', { name: /登录|sign in|login/i }).click();
    // Should show error message
    await expect(page.locator('[role="alert"], .text-destructive, .text-red')).toBeVisible({ timeout: 10_000 });
  });

  test('register page is accessible', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});

test.describe('Landing Page', () => {
  test('shows landing page for unauthenticated user', async ({ page }) => {
    await page.goto('/');
    // Landing page should have the brand name
    const content = await page.textContent('body');
    expect(content).toContain('爆款工坊');
  });

  test('has login/register links', async ({ page }) => {
    await page.goto('/');
    // Should have a sign-in or login link/button
    const loginLink = page.getByRole('link', { name: /登录|sign in|login/i });
    await expect(loginLink).toBeVisible();
  });
});
