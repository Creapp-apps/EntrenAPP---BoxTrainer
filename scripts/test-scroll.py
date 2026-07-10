# scripts/test-scroll.py
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        # Launch browser headlessly
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 375, "height": 667}) # Simulated iPhone SE like the screenshot
        
        print("Navigating to http://localhost:3000...")
        await page.goto("http://localhost:3000")
        
        # Wait a bit for initial render
        await page.wait_for_timeout(2000)
        
        # Check initial state
        print("Checking initial DOM elements...")
        card = await page.query_selector(".main-card")
        if card:
            print("main-card is present!")
            # Get all child classes
            children = await card.evaluate("node => Array.from(node.children).map(c => ({ tag: c.tagName, className: c.className, isVisible: window.getComputedStyle(c).visibility !== 'hidden' && window.getComputedStyle(c).display !== 'none' && window.getComputedStyle(c).opacity !== '0' }))")
            print("Children of main-card:")
            for i, child in enumerate(children):
                print(f"  {i}: <{child['tag']} class='{child['className']}'> -> isVisible: {child['isVisible']}")
        else:
            print("ERROR: main-card is not present!")
            await browser.close()
            return
            
        # Take initial screenshot
        await page.screenshot(path="initial_state.png")
        print("Saved initial_state.png")
        
        # Scroll down step by step to trigger animations and print status
        for scroll_pct in range(10, 101, 10):
            # Scroll page
            scroll_y = int(6500 * (scroll_pct / 100)) # 6500 is the scroll trigger end
            await page.evaluate(f"window.scrollTo(0, {scroll_y})")
            await page.wait_for_timeout(500)
            
            # Check visibility of slides
            card_style = await card.evaluate("node => ({ style: node.getAttribute('style'), className: node.className })")
            intro = await page.query_selector(".slide-intro-info")
            outro = await page.query_selector(".slide-outro-info")
            mockup = await page.query_selector(".mockup-scroll-wrapper")
            
            intro_visible = await intro.evaluate("node => window.getComputedStyle(node).visibility !== 'hidden' && window.getComputedStyle(node).opacity !== '0'") if intro else False
            outro_visible = await outro.evaluate("node => window.getComputedStyle(node).visibility !== 'hidden' && window.getComputedStyle(node).opacity !== '0'") if outro else False
            mockup_visible = await mockup.evaluate("node => window.getComputedStyle(node).visibility !== 'hidden' && window.getComputedStyle(node).opacity !== '0'") if mockup else False
            
            print(f"Scroll {scroll_pct}% ({scroll_y}px):")
            print(f"  card: {card_style['style']}")
            print(f"  intro visible: {intro_visible}")
            print(f"  mockup visible: {mockup_visible}")
            print(f"  outro visible: {outro_visible}")
            
            # Save screenshot for some key percentages
            if scroll_pct in [20, 40, 60, 80]:
                await page.screenshot(path=f"scroll_{scroll_pct}.png")
                print(f"  Saved scroll_{scroll_pct}.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
