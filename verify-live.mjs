/* ==========================================================================
   发布后校验：轮询 GitHub Pages 地址，确认真实公网可访问且内容正确
   用法：
     node verify-live.mjs --url https://xy-haze.github.io/marathon-prince/
     node verify-live.mjs --repo marathon-prince --owner xy-haze
   ========================================================================== */

const argv = process.argv.slice(2);
const val = (f, d) => {
  const i = argv.indexOf(`--${f}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : d;
};

const owner = val("owner", "XY-haze");
const repo = val("repo", "marathon-prince");
const base = (val("url", `https://${owner.toLowerCase()}.github.io/${repo}/`)).replace(/\/?$/, "/");

const PAGES = [
  ["index.html", ["马拉松王子", "PRINCE MARATHON", "statband"]],
  ["plot.html", ["马拉松之环", "分集剧情全文"]],
  ["characters.html", ["孟飞", "阿修", "配音"]],
  ["episodes.html", ["马拉松的传说", "王者之墓", "epList"]],
  ["production.html", ["曹小卉", "刘可欣"]],
  ["music.html", ["飞越地平线", "月下梦"]],
  ["broadcast.html", ["银河剧场", "抄袭", "5.3", "9.4"]],
  ["sources.html", ["百度百科", "Firecrawl", "抓取失败"]],
  ["404.html", ["没有这个页面"]],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`校验地址：${base}\n`);

/* ---- 1. 等站点上线 ---- */
let firstOk = false;
for (let i = 1; i <= 30; i++) {
  try {
    const res = await fetch(base, { redirect: "follow", headers: { "User-Agent": "verify-live" } });
    if (res.ok) {
      console.log(`✓ 第 ${i} 次尝试：站点已上线（HTTP ${res.status}）`);
      firstOk = true;
      break;
    }
    console.log(`· 第 ${i} 次尝试：HTTP ${res.status}`);
  } catch (e) {
    console.log(`· 第 ${i} 次尝试：${e.cause?.code || e.message}`);
  }
  if (i < 30) await sleep(15000);
}

if (!firstOk) {
  console.error("\n✗ 等待超时：站点还没上线。请到仓库 Actions 页面查看工作流是否失败。");
  process.exit(1);
}

/* ---- 2. 逐页校验 ---- */
let bad = 0;
for (const [file, needles] of PAGES) {
  const url = file === "index.html" ? base : base + file;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "verify-live" } });
    const html = await res.text();
    const missing = needles.filter((n) => !html.includes(n));
    if (res.ok && !missing.length) {
      console.log(`  ✓ ${file.padEnd(18)} ${res.status}  ${(html.length / 1024).toFixed(1)} KB`);
    } else {
      console.log(`  ✗ ${file.padEnd(18)} ${res.status}  缺少：${missing.join(", ") || "-"}`);
      bad++;
    }
  } catch (e) {
    console.log(`  ✗ ${file.padEnd(18)} 请求失败：${e.message}`);
    bad++;
  }
}

/* ---- 3. 静态资源与响应头 ---- */
const assets = [
  ["assets/css/style.css", "text/css"],
  ["assets/js/site.js", "javascript"],
  ["assets/img/hero.svg", "image/svg+xml"],
  ["robots.txt", "text/plain"],
];
console.log("");
for (const [path, expected] of assets) {
  try {
    const res = await fetch(base + path, { headers: { "User-Agent": "verify-live" } });
    const ct = res.headers.get("content-type") || "";
    const good = res.ok && ct.includes(expected);
    console.log(`  ${good ? "✓" : "✗"} ${path.padEnd(24)} ${res.status}  ${ct}`);
    if (!good) bad++;
  } catch (e) {
    console.log(`  ✗ ${path.padEnd(24)} 请求失败：${e.message}`);
    bad++;
  }
}

/* ---- 4. 404 行为（GitHub Pages 会返回 404 状态 + 自定义页面）---- */
try {
  const res = await fetch(`${base}this-page-should-not-exist.html`, { headers: { "User-Agent": "verify-live" } });
  const html = await res.text();
  const custom = html.includes("没有这个页面");
  console.log(`  ${custom ? "✓" : "✗"} 自定义 404 页面：状态 ${res.status}，${custom ? "已生效" : "未生效（显示的是 GitHub 默认页）"}`);
  if (!custom) bad++;
} catch (e) {
  console.log(`  ✗ 404 检查失败：${e.message}`);
  bad++;
}

/* ---- 5. HTTPS / 跳转 ---- */
try {
  const res = await fetch(base, { redirect: "manual", headers: { "User-Agent": "verify-live" } });
  console.log(`  ✓ 协议：${new URL(base).protocol}，最终响应 ${res.status}`);
} catch {
  /* 忽略 */
}

console.log("");
if (bad === 0) {
  console.log(`全部通过 ✓  公网站点：${base}`);
} else {
  console.log(`有 ${bad} 项异常，请检查上面的输出。`);
  process.exit(1);
}
