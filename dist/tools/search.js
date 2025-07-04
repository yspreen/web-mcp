import htmlToMd from "html-to-md";
import { getCachedBrowser } from "../utils/browser.js";
export async function searchGoogle(q, timeoutMs = 5_000) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en`;
    const browser = await getCachedBrowser();
    const page = await browser.newPage();
    try {
        await Promise.race([
            page.goto(url, { waitUntil: "networkidle2" }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("Navigation timeout")), timeoutMs)),
        ]);
        return htmlToMd(await page.content());
    }
    finally {
        await page.close(); // Close the page, not the browser
    }
}
