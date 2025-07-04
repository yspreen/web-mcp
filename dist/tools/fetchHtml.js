import got from "got";
export async function fetchHtml(url) {
    // if no protocol, assume https:
    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
    }
    const res = await got(url, { timeout: { request: 5_000 } });
    return res.body;
}
