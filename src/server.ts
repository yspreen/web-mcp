import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchHtml } from "./tools/fetchHtml.js";
import { fetchPageContent } from "./tools/fetchPageContent.js";
import { searchGoogle } from "./tools/search.js";
import { screenshotPage } from "./tools/screenshotPage.js";
import { closeCachedBrowser } from "./utils/browser.js";

async function main() {
  const server = new McpServer({ name: "local-web-fetcher", version: "0.2.0" });

  // fetch-html tool
  server.registerTool(
    "fetch_html",
    {
      title: "Fetch Raw HTML",
      description:
        "Return the raw HTML (and inline JS/CSS) for a URL via simple HTTP GET.",
      inputSchema: { url: z.string().url() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ url }) => ({
      content: [{ type: "text", text: await fetchHtml(url) }],
    })
  );

  // fetch-page-content tool
  server.registerTool(
    "fetch_page_content",
    {
      title: "Fetch Rendered Page → Markdown",
      description:
        "Uses real Chrome with your profile; waits for network idle then returns clean Markdown.",
      inputSchema: { url: z.string().url() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ url }) => ({
      content: [{ type: "text", text: await fetchPageContent(url) }],
    })
  );

  // search tool
  server.registerTool(
    "search",
    {
      title: "Google Search (Markdown SERP)",
      description:
        "Runs a Google search in headless Chrome and returns the resulting page converted to Markdown.",
      inputSchema: { query: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query }) => ({
      content: [{ type: "text", text: await searchGoogle(query) }],
    })
  );

  // screenshot-page tool
  server.registerTool(
    "screenshot_page",
    {
      title: "Take Screenshot",
      description:
        "Uses real Chrome with your profile to take a screenshot of a page.",
      inputSchema: {
        url: z.string().url(),
        viewportWidth: z.number().int().positive(),
        viewportHeight: z.number().int().positive(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ url, viewportWidth, viewportHeight }) => ({
      content: [
        {
          type: "image",
          mimeType: "image/png",
          data: (await screenshotPage(url, viewportWidth, viewportHeight)).toString(
            "base64"
          ),
        },
      ],
    })
  );

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Cleanup on process exit
process.on("SIGINT", async () => {
  console.error("Received SIGINT, cleaning up...");
  await closeCachedBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.error("Received SIGTERM, cleaning up...");
  await closeCachedBrowser();
  process.exit(0);
});

main().catch(async (err) => {
  console.error("Fatal server error:", err);
  await closeCachedBrowser();
  process.exit(1);
});
