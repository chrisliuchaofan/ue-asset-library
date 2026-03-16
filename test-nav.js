const { chromium } = require('playwright');

(async () => {
    console.log('Starting local Playwright test...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
        console.log('Page loaded. Waiting 3s for hydration...');
        await page.waitForTimeout(3000);

        const getActive = () => page.evaluate(() => document.querySelector('.bn-active')?.textContent?.trim() || 'NONE');
        const getScrollY = () => page.evaluate(() => Math.round(window.scrollY));

        console.log(`[Init] Active: ${await getActive()}, ScrollY: ${await getScrollY()}`);

        // Click "素材" (index 1)
        console.log('Clicking "素材" (index 1)...');
        await page.evaluate(() => document.querySelectorAll('.bn-item')[1].click());
        await page.waitForTimeout(2000);
        console.log(`[After Click 1] Active: ${await getActive()}, ScrollY: ${await getScrollY()}`);

        // Click "资产" (index 2)
        console.log('Clicking "资产" (index 2)...');
        await page.evaluate(() => document.querySelectorAll('.bn-item')[2].click());
        await page.waitForTimeout(2000);
        console.log(`[After Click 2] Active: ${await getActive()}, ScrollY: ${await getScrollY()}`);

        // Click "首页" (index 0)
        console.log('Clicking "首页" (index 0)...');
        await page.evaluate(() => document.querySelectorAll('.bn-item')[0].click());
        await page.waitForTimeout(2000);
        console.log(`[After Click 0] Active: ${await getActive()}, ScrollY: ${await getScrollY()}`);

        // Check if sections are in DOM
        const sectionsCount = await page.evaluate(() => document.querySelectorAll('.ls-section').length);
        console.log(`Total .ls-section elements found: ${sectionsCount}`);

    } catch (err) {
        console.error('Test error:', err);
    } finally {
        await browser.close();
        console.log('Test complete.');
    }
})();
