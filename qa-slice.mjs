/* 生成"区块切片"页面：把某个页面的指定 section 单独渲染到页面顶部，便于无头截图验收。
   用法：node qa-slice.mjs     输出到 .shots/slice-*.html               */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, ".shots");
mkdirSync(OUT, { recursive: true });

const TARGETS = [
  ["index.html", "story"],
  ["index.html", "cast"],
  ["plot.html", "world"],
  ["plot.html", "plots"],
  ["production.html", "timeline"],
  ["broadcast.html", "broadcast"],
  ["broadcast.html", "awards"],
  ["broadcast.html", "reception"],
  ["broadcast.html", "controversy"],
  ["broadcast.html", "derivatives"],
  ["broadcast.html", "conflict"],
  ["sources.html", null], // 整页
  ["index.html", "__footer__"],
];

for (const [file, id] of TARGETS) {
  const html = readFileSync(join(DIST, file), "utf8");
  let body;
  if (id === "__footer__") {
    body = html.match(/<footer[\s\S]*?<\/footer>/)[0];
  } else if (id) {
    const re = new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`);
    const m = html.match(re);
    if (!m) {
      console.log(`! 未找到 #${id} in ${file}`);
      continue;
    }
    // 补回 toc（若有）以便同时检查锚点导航样式
    const toc = html.match(/<ul class="toc reveal">[\s\S]*?<\/ul>/);
    body = (id !== "broadcast" && id !== "awards" && toc ? toc[0] : "") + m[0];
  } else {
    body = html.match(/<main id="main">([\s\S]*?)<\/main>/)[1];
  }

  const wrapped = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>slice ${file} ${id || ""}</title>
<link rel="stylesheet" href="../dist/assets/css/style.css">
<noscript><style>.reveal{opacity:1 !important;transform:none !important}</style></noscript>
</head><body>${body}
<script src="../dist/assets/js/site.js" defer></script></body></html>`;

  const name = `slice-${file.replace(".html", "")}-${(id || "full").replace(/__/g, "")}.html`;
  writeFileSync(join(OUT, name), wrapped, "utf8");
  console.log(`✓ .shots/${name}`);
}
