import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const path of ['/', '/catalog', '/product/blazer-esencial', '/account', '/cart']) {
  test(`accessibility and responsive layout: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.locator('main').waitFor();
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(report.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
