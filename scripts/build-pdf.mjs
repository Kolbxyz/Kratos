// Prints every built lesson to dist/pdf/<id>.pdf with the site's print stylesheet, so the PDF matches the page.
import { readdirSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const BASE = "/Power/";
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!path.startsWith(BASE)) return res.writeHead(404).end();
  path = join("dist", path.slice(BASE.length));
  if (path.endsWith("/") || !extname(path)) path = join(path, "index.html");
  try {
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" }).end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const origin = `http://127.0.0.1:${server.address().port}`;

const ids = readdirSync("dist/lecons", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
mkdirSync("dist/pdf", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
for (const id of ids) {
  await page.goto(`${origin}${BASE}lecons/${id}/`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print", colorScheme: "light" });
  await page.pdf({
    path: `dist/pdf/${id}.pdf`,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="font:8px sans-serif;width:100%;padding:0 16mm;display:flex;justify-content:space-between;color:#666"><span>Kratos</span><span class="pageNumber"></span></div>`,
    margin: { top: "18mm", bottom: "20mm", left: "16mm", right: "16mm" },
  });
  console.log(`dist/pdf/${id}.pdf`);
}
await browser.close();
server.close();
