/* ==========================================================================
   《马拉松王子》资料站 — 零依赖静态文件服务器
   用法：
     node serve.mjs                     # 默认 0.0.0.0:8788，服务 dist/
     node serve.mjs --port 9000         # 换端口
     node serve.mjs --root dist-standalone   # 服务离线单文件版
     node serve.mjs --host 127.0.0.1    # 只允许本机访问

   之所以自己写一个：项目要求零依赖，且需要把站点绑到 0.0.0.0 让同一局域网
   的其他人直接访问。功能上覆盖静态托管的基本要求（MIME、缓存、ETag、
   目录索引、404 页面、路径穿越防护、HEAD 请求）。
   ========================================================================== */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------------- 参数 */

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const PORT = Number(arg("port", process.env.PORT || 8788));
const HOST = arg("host", process.env.HOST || "0.0.0.0");
const ROOT_DIR = resolve(ROOT, arg("root", "dist"));

/* ---------------------------------------------------------------- 工具 */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff2": "font/woff2",
  ".zip": "application/zip",
  ".pdf": "application/pdf",
};

const mimeOf = (p) => MIME[extname(p).toLowerCase()] || "application/octet-stream";

/** 把请求路径安全地映射到磁盘路径；越界或含非法字节时返回 null */
function resolveSafe(urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (p.includes("\0")) return null;
  const rel = normalize(p).replace(/^([/\\])+/, "");
  const full = resolve(ROOT_DIR, rel);
  if (full !== ROOT_DIR && !full.startsWith(ROOT_DIR + sep)) return null;
  return full;
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 简易 404 / 500 响应；站点自带 404.html 时优先使用它 */
async function sendError(res, code, message, method) {
  if (code === 404) {
    const page = join(ROOT_DIR, "404.html");
    try {
      const html = await readFile(page);
      res.writeHead(404, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": html.length,
        "Cache-Control": "no-cache",
      });
      return res.end(method === "HEAD" ? undefined : html);
    } catch {
      /* 没有 404.html 就退回内置页面 */
    }
  }
  const body = Buffer.from(
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${code}</title>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#f7f4ee;color:#15202b;
font-family:'PingFang SC','Microsoft YaHei',system-ui,sans-serif;text-align:center">
<div><p style="font-size:3rem;margin:0;color:#10406e">${code}</p><p>${esc(message)}</p>
<p><a href="/" style="color:#ef5f18">返回首页</a></p></div></body></html>`,
    "utf8"
  );
  res.writeHead(code, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-cache",
  });
  res.end(method === "HEAD" ? undefined : body);
}

const log = (...a) => console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}]`, ...a);

/* ---------------------------------------------------------------- 服务器 */

const server = createServer(async (req, res) => {
  const started = Date.now();
  const method = req.method === "HEAD" ? "HEAD" : req.method;
  const urlPath = (req.url || "/").split("?")[0];

  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 Method Not Allowed");
    return log(`405 ${req.method} ${urlPath}`);
  }

  let target = resolveSafe(urlPath);
  if (!target) {
    await sendError(res, 403, "非法的请求路径", method);
    return log(`403 ${urlPath}`);
  }

  let info = await stat(target).catch(() => null);

  // 目录 → index.html
  if (info?.isDirectory()) {
    target = join(target, "index.html");
    info = await stat(target).catch(() => null);
  }

  if (!info?.isFile()) {
    await sendError(res, 404, "页面不存在", method);
    return log(`404 ${urlPath} (${Date.now() - started}ms)`);
  }

  const etag = `W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}"`;
  if (req.headers["if-none-match"] === etag) {
    res.writeHead(304, { ETag: etag });
    res.end();
    return;
  }

  const ext = extname(target).toLowerCase();
  const headers = {
    "Content-Type": mimeOf(target),
    "Content-Length": info.size,
    ETag: etag,
    "Last-Modified": info.mtime.toUTCString(),
    // HTML 每次校验（改版后立刻可见）；静态资源缓存 1 小时
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  res.writeHead(200, headers);
  if (method === "HEAD") {
    res.end();
  } else {
    createReadStream(target).pipe(res);
  }
  log(`200 ${urlPath} ${(info.size / 1024).toFixed(1)}KB (${Date.now() - started}ms)`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`端口 ${PORT} 已被占用，请换一个：node serve.mjs --port ${PORT + 1}`);
  } else {
    console.error("服务器错误：", err.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const lan = Object.entries(networkInterfaces())
    .flatMap(([name, addrs]) => (addrs || []).map((a) => ({ name, ...a })))
    .filter((a) => a.family === "IPv4" && !a.internal);

  console.log("");
  console.log("  《马拉松王子》资料站 — 本地已上线");
  console.log("  " + "─".repeat(52));
  console.log(`  站点目录   ${ROOT_DIR}`);
  console.log(`  本机访问   http://127.0.0.1:${PORT}/`);
  if (lan.length) {
    console.log("  局域网访问（同一 WiFi / 内网的人可直接打开）：");
    for (const a of lan) console.log(`             http://${a.address}:${PORT}/    （${a.name}）`);
  } else {
    console.log("  未检测到局域网地址，其他设备可能无法访问。");
  }
  console.log("  停止服务   Ctrl+C");
  console.log("  " + "─".repeat(52));
  console.log("");
});

const shutdown = () => {
  console.log("\n正在停止服务…");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
