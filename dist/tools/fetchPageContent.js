import htmlToMd from "html-to-md";
import { getCachedBrowser } from "../utils/browser.js";
export async function fetchPageContent(url, timeoutMs = 5_000) {
    // if no protocol, assume https:
    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }
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
