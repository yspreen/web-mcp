import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchHtml } from "./tools/fetchHtml.js";
import { fetchPageContent } from "./tools/fetchPageContent.js";
import { searchGoogle } from "./tools/search.js";
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
