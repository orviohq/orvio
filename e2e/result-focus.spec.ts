import { test, expect } from '@playwright/test';
for (const method of ['pointer', 'keyboard'])
  test(`result has one ESC cue, neutral entry focus, and visible Tab focus: ${method}`, async ({
    page,
  }) => {
    await page.goto('/');
    if (method === 'pointer') await page.mouse.click(5, 5);
    else await page.keyboard.press('Tab');
    await page.goto(
      '/result/?lang=ko#v=3&song=first-light&keys=5&diff=low&score=500000&acc=50&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1',
    );
    const d = page.locator('#results');
    await expect(d).toBeVisible();
    await expect(d).toBeFocused();
    expect((await d.innerText()).match(/ESC 곡 선택/g)).toHaveLength(1);
    expect(
      await page.locator('#back').evaluate((e) => e.matches(':focus-visible')),
    ).toBe(false);
    await page.keyboard.press('Tab');
    await expect(page.locator('#result-preview')).toBeFocused();
    expect(
      await page
        .locator('#result-preview')
        .evaluate(
          (e) =>
            e.matches(':focus-visible') &&
            getComputedStyle(e).outlineStyle !== 'none',
        ),
    ).toBe(true);
    await page.mouse.click(10, 10);
    await page.keyboard.press('Escape');
    await expect(d).not.toBeVisible();
  });
