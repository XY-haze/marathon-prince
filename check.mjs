/* 站点自检：链接、资源、模板残留、标签平衡、关键内容、单文件版内联情况
   用法：node check.mjs        （检查 dist/ 与 dist-standalone/）           */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const STANDALONE = join(ROOT, "dist-standalone");

let issues = 0;
const warn = (...a) => {
  console.log("  ✗", ...a);
  issues++;
};
const ok = (...a) => console.log("  ✓", ...a);

const REQUIRED_TEXT = {
  "index.html": ["马拉松王子", "2011", "52", "PRINCE MARATHON", "statband"],
  "plot.html": ["马拉松之环", "菲利比斯", "分集剧情全文"],
  "characters.html": ["孟飞", "阿修", "萨其马", "林英俊", "配音"],
  "episodes.html": ["马拉松的传说", "王者之墓", "epList", "epSearch"],
  "production.html": ["曹小卉", "刘可欣", "白婕", "2008-11-27"],
  "music.html": ["飞越地平线", "月下梦", "刘思超", "黄琬婷"],
  "broadcast.html": ["银河剧场", "动漫空间", "抄袭", "资料分歧对照表", "5.3", "9.4"],
  "sources.html": ["百度百科", "Firecrawl", "抓取失败"],
  "404.html": ["没有这个页面"],
};

const NON_PAGE = (f) => ["sitemap.xml", "robots.txt", "404.html"].includes(f);

console.log("=== dist/ 可部署站点 ===");
if (!existsSync(DIST)) {
  console.error("dist/ 不存在，请先运行 node build.mjs");
  process.exit(1);
}

const files = readdirSync(DIST).filter((f) => f.endsWith(".html"));
console.log(`页面数：${files.length}`);

for (const f of files) {
  const h = readFileSync(join(DIST, f), "utf8");

  for (const pat of ["undefined", "NaN", "[object Object]", "${"]) {
    if (h.includes(pat)) warn(f, "残留模板标记:", pat);
  }

  const links = [...h.matchAll(/(?:href|src)="([^"#:]+)(?:#[^"]*)?"/g)].map((m) => m[1]);
  for (const l of new Set(links)) {
    if (l.startsWith("http") || l.startsWith("mailto")) continue;
    if (!existsSync(join(DIST, l))) warn(f, "链接目标不存在 ->", l);
  }

  for (const tag of ["div", "section", "article", "table", "ul", "ol", "li", "details", "span", "p", "h1", "h2", "h3", "a"]) {
    const o = (h.match(new RegExp("<" + tag + "[ >]", "g")) || []).length;
    const c = (h.match(new RegExp("</" + tag + ">", "g")) || []).length;
    if (o !== c) warn(f, `标签不平衡 <${tag}> 开${o} 闭${c}`);
  }

  for (const t of REQUIRED_TEXT[f] || []) {
    if (!h.includes(t)) warn(f, "缺少关键内容:", t);
  }

  if (!/<title>[^<]{6,}<\/title>/.test(h)) warn(f, "缺少有效 title");
  if (!/name="description" content="[^"]{20,}"/.test(h)) warn(f, "缺少 meta description");
  if (!/<html lang="zh-CN">/.test(h)) warn(f, "缺少 lang");
  if (!/name="viewport"/.test(h)) warn(f, "缺少 viewport");
}

/* 关键页面存在性 */
for (const f of ["index.html", "404.html", ".nojekyll", "robots.txt", "assets/css/style.css", "assets/js/site.js"]) {
  if (existsSync(join(DIST, f))) ok(`${f} 存在`);
  else warn(`缺少 ${f}`);
}

/* 分集条目数 */
const epCount = (readFileSync(join(DIST, "episodes.html"), "utf8").match(/class="ep" /g) || []).length;
if (epCount === 52) ok("分集条目数：52");
else warn("episodes.html 分集条目数 =", epCount);

/* 角色条数 */
const charCount = (readFileSync(join(DIST, "characters.html"), "utf8").match(/class="char"/g) || []).length;
if (charCount === 7) ok("角色卡片数：7");
else warn("characters.html 角色卡片数 =", charCount);

/* SVG */
const svgs = readdirSync(join(DIST, "assets", "img")).filter((f) => f.endsWith(".svg"));
for (const s of svgs) {
  const v = readFileSync(join(DIST, "assets", "img", s), "utf8");
  if (!v.includes('xmlns="http://www.w3.org/2000/svg"')) warn(s, "缺少 xmlns");
  if (!v.includes("viewBox=")) warn(s, "缺少 viewBox");
  const g = (v.match(/<g[ >]/g) || []).length;
  const gc = (v.match(/<\/g>/g) || []).length;
  if (g !== gc) warn(s, `<g> 不平衡 ${g}/${gc}`);
  if (/undefined|NaN/.test(v)) warn(s, "含 undefined/NaN");
}
ok(`SVG 资源数：${svgs.length}`);

/* 站内引用的图片是否都存在 */
const referenced = new Set();
for (const f of files) {
  const h = readFileSync(join(DIST, f), "utf8");
  for (const m of h.matchAll(/assets\/img\/([a-z0-9-]+\.svg)/g)) referenced.add(m[1]);
}
for (const r of referenced) {
  if (!existsSync(join(DIST, "assets", "img", r))) warn("引用了不存在的插画", r);
}
const unreferenced = svgs.filter((s) => !referenced.has(s));
if (unreferenced.length) console.log("  · 未被页面引用（可作素材下载）:", unreferenced.join(", "));

/* dist-standalone */
console.log("\n=== dist-standalone/ 离线单文件版 ===");
if (!existsSync(STANDALONE)) {
  warn("dist-standalone/ 不存在");
} else {
  const sf = readdirSync(STANDALONE).filter((f) => f.endsWith(".html"));
  let bad = 0;
  for (const f of sf) {
    const h = readFileSync(join(STANDALONE, f), "utf8");
    if (!h.includes("<style>")) {
      warn(f, "CSS 未内联");
      bad++;
    }
    if (!h.includes("IntersectionObserver")) {
      warn(f, "JS 未内联");
      bad++;
    }
    const left = (h.match(/assets\//g) || []).length;
    if (left) {
      warn(f, `仍有 ${left} 处外部资源引用`);
      bad++;
    }
    if (!/data:image\/svg\+xml;base64,/.test(h)) {
      warn(f, "插画未内联为 data URI");
      bad++;
    }
    /* 内部页面链接仍指向同级文件 */
    for (const m of h.matchAll(/href="([a-z0-9-]+\.html)"/g)) {
      if (!existsSync(join(STANDALONE, m[1]))) warn(f, "指向缺失的页面", m[1]);
    }
  }
  if (!bad) ok(`${sf.length} 个文件全部自包含（无任何外部依赖）`);
}

/* 总量 */
const bytes = (dir) => {
  let t = 0;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    t += st.isDirectory() ? bytes(p) : st.size;
  }
  return t;
};
console.log(`\ndist/ 体积 ${(bytes(DIST) / 1024).toFixed(0)} KB · dist-standalone/ 体积 ${(bytes(STANDALONE) / 1024).toFixed(0)} KB`);
console.log(issues === 0 ? "全部检查通过 ✓" : `发现 ${issues} 个问题`);
process.exit(issues === 0 ? 0 : 1);
