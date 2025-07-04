import { getCachedBrowser } from "../utils/browser.js";
export async function screenshotPage(url, viewportWidth, viewportHeight) {
    // if no protocol, assume https:
    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }
    const browser = await getCachedBrowser();
    const page = await browser.newPage();
    try {
        await page.setViewport({ width: viewportWidth, height: viewportHeight });
        await page.goto(url, { waitUntil: "networkidle2" });
        return (await page.screenshot());
    }
    finally {
        await page.close();
    }
}
