const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.goto('/');
});

test.describe('Gamepad Basics', () => {
    test('Has correct title', async ({ page }) => {
        await expect(page).toHaveTitle(/Mobile Gamepad/);
    });

    test('Can open settings modal', async ({ page }) => {
        const modal = page.locator('#settings-modal');
        await expect(modal).toBeHidden();

        await page.click('#settings-toggle');
        await expect(modal).toBeVisible();
    });

    test('Can switch control types', async ({ page }) => {
        const joystick = page.locator('#joystick-container');
        const dpad = page.locator('#dpad-container');

        // Initial state
        await expect(joystick).toBeVisible();
        await expect(dpad).toBeHidden();

        // Switch to D-pad
        await page.click('#settings-toggle');
        await page.selectOption('#control-select', 'dpad');
        await page.click('#close-settings');

        await expect(joystick).toBeHidden();
        await expect(dpad).toBeVisible();
    });

    test('Theme persists after reload', async ({ page }) => {
        // Change to Light theme
        await page.click('#settings-toggle');
        await page.selectOption('#theme-select', 'light');
        await page.click('#close-settings');

        await expect(page.locator('body')).toHaveClass(/theme-light/);

        // Reload page
        await page.reload();

        // Verify it persists
        await expect(page.locator('body')).toHaveClass(/theme-light/);
    });

    test('Action button labels update correctly', async ({ page }) => {
        const btnSouth = page.locator('#btn-south');

        // Initial Xbox (A)
        await expect(btnSouth).toHaveText('A');

        // Switch to PS
        await page.click('#settings-toggle');
        await page.selectOption('#layout-select', 'ps');
        await page.click('#close-settings');

        // Verify symbol (Cross)
        await expect(btnSouth).toHaveText('✕');
    });
});

test.describe('PWA Checks', () => {
    test('Manifest is linked', async ({ page }) => {
        const manifest = page.locator('link[rel="manifest"]');
        await expect(manifest).toHaveAttribute('href', 'manifest.json');
    });

    test('Service worker script is linked', async ({ page }) => {
        const swLink = page.locator('script[src="app.js"]');
        await expect(swLink).toBeAttached();
    });
});
