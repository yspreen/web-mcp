# MCP Server

## Quick start

```bash
pnpm install
pnpm run build   # or: pnpm dev for ts-node\mcp fetch-html https://example.com
mcp fetch-page-content https://example.com
mcp search "site:example.com awesome article"
```

### Why Puppeteer?

We rely on your installed Chrome profile (`userDataDir`) so Google and most websites treat the process like a normal browsing session, dramatically reducing bot detection warnings.

### Timeout behaviour

Each tool fails fast after 5 s if navigation stalls. Adjust with the `MCP_TIMEOUT_MS` environment variable or by passing a numeric second argument.
