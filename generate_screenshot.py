import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 844, 'height': 390})
        page = await context.new_page()

        await page.goto('http://localhost:8000')
        await page.wait_for_timeout(500)

        # Switch to D-pad and Retro Theme
        await page.click('#settings-toggle')
        await page.select_option('#control-select', 'dpad')
        await page.select_option('#theme-select', 'retro')
        await page.click('#close-settings')
        await page.wait_for_timeout(1000)

        # Capture the screenshot
        await page.screenshot(path='icons/screenshot-2.png')
        print("Captured icons/screenshot-2.png")

        await browser.close()

if __name__ == "__main__":
    os.makedirs("icons", exist_ok=True)
    asyncio.run(run())
