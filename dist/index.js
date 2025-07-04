import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { fetchHtml } from "./tools/fetchHtml.js";
import { fetchPageContent } from "./tools/fetchPageContent.js";
import { searchGoogle } from "./tools/search.js";
import { screenshotPage } from "./tools/screenshotPage.js";
yargs(hideBin(process.argv))
    .scriptName("mcp")
    .command("fetch-html <url>", "Fetch raw HTML (and inline JS/CSS) for a URL", (y) => y.positional("url", { type: "string", describe: "Target URL" }), async (args) => {
    const html = await fetchHtml(args.url);
    console.log(html);
})
    .command("fetch-page-content <url>", "Load a page with a real Chrome profile, wait network idle, then output Markdown", (y) => y.positional("url", { type: "string", describe: "Target URL" }), async (args) => {
    const md = await fetchPageContent(args.url);
    console.log(md);
})
    .command("search <query...>", "Perform a Google search and return the SERP as Markdown", (y) => y.positional("query", {
    type: "string",
    array: true,
    describe: "Search terms",
}), async (args) => {
    const md = await searchGoogle(args.query.join(" "));
    console.log(md);
})
    .command("screenshot-page <url> <width> <height>", "Take a screenshot of a page", (y) => y
    .positional("url", { type: "string", describe: "Target URL" })
    .positional("width", { type: "number", describe: "Viewport width" })
    .positional("height", { type: "number", describe: "Viewport height" }), async (args) => {
    const buffer = await screenshotPage(args.url, args.width, args.height);
    process.stdout.write(buffer);
})
    .demandCommand()
    .strict()
    .parse();
