# scripts/check-transition.py
import asyncio
from playwright.async_api import async_playwright

async def run_capture(p, width, height, name_prefix):
    browser = await p.chromium.launch()
    page = await browser.new_page(viewport={"width": width, "height": height})
    
    await page.goto("http://localhost:3002")
    await page.wait_for_timeout(2000)
    
    targets = {
        5: 150,
        8: 240,
        15: 450,
        40: 1200,
        55: 1650,
        75: 2250,
        90: 2700,
        95: 2850,
        98: 2940
    }
    
    for pct, y in targets.items():
        await page.evaluate(f"window.scrollTo(0, {y})")
        await page.wait_for_timeout(500)
        filename = f"{name_prefix}_{pct}.png"
        await page.screenshot(path=filename)
        print(f"Captured {filename} at {y}px")
        
    await browser.close()

async def main():
    async with async_playwright() as p:
        print("Capturing Mobile viewports...")
        await run_capture(p, 375, 667, "transition_mobile")
        print("Capturing Desktop viewports...")
        await run_capture(p, 1280, 800, "transition_desktop")

if __name__ == "__main__":
    asyncio.run(main())
