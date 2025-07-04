import { Browser } from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getChromeUserDataDir, findChromeExecutable } from "./chrome.js";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { PuppeteerExtraPlugin } from "puppeteer-extra-plugin";
import type { Page } from "puppeteer";

class StorageQuotaFix extends PuppeteerExtraPlugin {
  get name() {
    return "storage-quota-fix";
  }

  /** Runs on every new Page (tab, popup, incognito). */
  async onPageCreated(page: Page) {
    await page.evaluateOnNewDocument(() => {
      // Patch the Storage Buckets quota probe Google now uses
      Object.defineProperty(navigator as any, "webkitTemporaryStorageQuota", {
        get: () => undefined,
      });
    });
  }
}
class ClientHintsFix extends PuppeteerExtraPlugin {
  get name() {
    return "client-hints-fix";
  }
  async onPageCreated(page: Page) {
    await page.evaluateOnNewDocument(() => {
      // ❶ UA-CH headers appear only after first request; spoof them manually
      Object.defineProperty(navigator, "userAgentData", {
        get: () => ({
          brands: [{ brand: "Chromium", version: "138" }],
          mobile: false,
        }),
      });
      // ❷ Chrome DevTools Protocol detector
      // Many anti-bots look for window.cdp or trace.debug
      Object.defineProperty(window, "cdp", { get: () => undefined });
    });
  }
}
puppeteer.use(StealthPlugin());
puppeteer.use(new ClientHintsFix());
puppeteer.use(new StorageQuotaFix());

// Browser cache
let cachedBrowser: Browser | null = null;
let browserCleanupCallback: (() => void) | null = null;

/**
 * Launches Chrome with the user profile when possible. If Chrome GUI already holds the
 * profile lock, it clones the critical profile data (cookies, local storage, prefs) into
 * a temporary directory, launches from there, and schedules that directory for removal
 * once the browser disconnects. The calling code doesn’t have to care about cleanup.
 */
export async function launchBrowser(): Promise<{
  browser: Browser;
  cleanup?: () => void;
}> {
  const executablePath = await findChromeExecutable();
  const primaryProfile = getChromeUserDataDir();

  const attempt = (userDataDir: string) =>
    puppeteer.launch({
      headless: true,
      executablePath,
      userDataDir,
      args: ["--start-maximized", "--lang=en-US,en;q=0.9", "--no-sandbox"],
    });

  try {
    const browser = await attempt(primaryProfile);
    return { browser }; // Normal path – real cookies, no temp dir.
  } catch (err: any) {
    if (!String(err).includes("ProcessSingleton")) throw err;

    // ----- fallback: clone minimal profile -----
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-profile-"));
    const itemsToCopy = [
      "Default", // cookies & storage live here
      "Local State",
      "Secure Preferences",
      "Preferences",
      "First Run",
    ];
    for (const item of itemsToCopy) {
      const src = path.join(primaryProfile, item);
      if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(tempDir, item), { recursive: true });
      }
    }

    const browser = await attempt(tempDir);
    // schedule deletion after use
    const cleanup = () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    };
    browser.on("disconnected", cleanup);
    return { browser, cleanup };
  }
}

/**
 * Gets a cached browser instance or creates a new one if none exists.
 * The browser is reused across multiple calls for better performance.
 */
export async function getCachedBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.isConnected()) {
    return cachedBrowser;
  }

  // Clean up any existing browser
  if (cachedBrowser) {
    try {
      await cachedBrowser.close();
    } catch {}
    cachedBrowser = null;
  }

  // Launch new browser
  const { browser, cleanup } = await launchBrowser();
  cachedBrowser = browser;
  browserCleanupCallback = cleanup || null;

  // Handle browser disconnection
  browser.on("disconnected", () => {
    cachedBrowser = null;
    browserCleanupCallback = null;
  });

  return browser;
}

/**
 * Closes the cached browser and cleans up resources.
 * This should be called when the application is shutting down.
 */
export async function closeCachedBrowser(): Promise<void> {
  if (cachedBrowser) {
    try {
      await cachedBrowser.close();
    } catch {}
    cachedBrowser = null;
  }

  if (browserCleanupCallback) {
    browserCleanupCallback();
    browserCleanupCallback = null;
  }
}
