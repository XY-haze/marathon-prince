/* ==========================================================================
   GitHub 连通性体检 —— 一条命令看清「到底是哪里不通」
   用法：
     node doctor.mjs              完整体检（DNS / 代理 / hosts / 连通性 / 稳定性）
     node doctor.mjs --quick      只做快速通断检查（每项 1 轮）
     node doctor.mjs --rounds 6   自定义稳定性轮数
   ========================================================================== */

import { connect } from "node:net";
import tls from "node:tls";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { lookup } from "node:dns/promises";

const argv = process.argv.slice(2);
const QUICK = argv.includes("--quick");
const ROUNDS = QUICK ? 1 : Number((argv[argv.indexOf("--rounds") + 1] || 4)) || 4;

const HOSTS_FILE = "C:\\Windows\\System32\\drivers\\etc\\hosts";
const pad = (s, n) => String(s).padEnd(n);
const H = (t) => `\n${"═".repeat(74)}\n${t}\n${"═".repeat(74)}`;

/* ---------------------------------------------------------------- 探测原语 */

const tcp = (host, port = 443, ms = 6000) =>
  new Promise((res) => {
    const t0 = Date.now();
    const s = connect({ host, port, family: 4 });
    const end = (ok, extra = "") => { s.destroy(); res({ ok, ms: Date.now() - t0, extra }); };
    s.setTimeout(ms);
    s.once("connect", () => end(true));
    s.once("timeout", () => end(false, "超时"));
    s.once("error", (e) => end(false, e.code || e.message));
  });

/** TCP + TLS(SNI) + HTTPS 完整一轮 */
const full = (ip, servername, path = "/", ms = 10000) =>
  new Promise((res) => {
    const t0 = Date.now();
    let settled = false;
    let sock;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      try { sock?.destroy(); } catch {}
      res({ ...v, ms: Date.now() - t0 });
    };
    sock = tls.connect(
      { host: ip, port: 443, servername, rejectUnauthorized: true, timeout: ms, family: 4 },
      () => {
        sock.write(`HEAD ${path} HTTP/1.1\r\nHost: ${servername}\r\nUser-Agent: doctor\r\nConnection: close\r\n\r\n`);
        let buf = "";
        sock.on("data", (d) => {
          buf += d.toString("utf8");
          const m = buf.match(/^HTTP\/1\.[01] (\d{3})/);
          if (m) finish({ ok: true, status: +m[1], auth: sock.authorized, proto: sock.getProtocol() });
        });
      }
    );
    sock.setTimeout(ms);
    sock.once("timeout", () => finish({ ok: false, extra: "超时" }));
    sock.once("error", (e) => finish({ ok: false, extra: e.code || e.message }));
  });

const resolveA = async (h) => {
  try {
    const r = await lookup(h, { family: 4, all: true });
    return [...new Set(r.map((x) => x.address))];
  } catch (e) {
    return [`解析失败：${e.code || e.message}`];
  }
};

/* ---------------------------------------------------------------- 1. 本机环境 */

console.log(H("① 本机环境"));
let isAdmin = false;
try {
  isAdmin = execFileSync("powershell", ["-NoProfile", "-Command", "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"], { encoding: "utf8" }).trim() === "True";
} catch {}
console.log(`  管理员权限      ${isAdmin ? "✓ 有（可以改 hosts）" : "✗ 无（改 hosts 会弹 UAC）"}`);

try {
  const dns = execFileSync("powershell", ["-NoProfile", "-Command", "(Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object {$_.ServerAddresses} | ForEach-Object { $_.ServerAddresses }) -join ', '"], { encoding: "utf8" }).trim();
  console.log(`  DNS 服务器      ${dns || "(未取到)"}`);
} catch {}

try {
  const proxy = execFileSync("powershell", ["-NoProfile", "-Command", "$k='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; $p=Get-ItemProperty $k; \"$($p.ProxyEnable)|$($p.ProxyServer)|$($p.AutoConfigURL)\""], { encoding: "utf8" }).trim();
  const [enable, server, pac] = proxy.split("|");
  const on = enable === "1";
  console.log(`  系统代理        ${on ? `✓ 已启用 ${server}` : `✗ 未启用（残留配置：${server || "无"}）`}`);
  if (pac) console.log(`  PAC 脚本        ${pac}`);
} catch {}

let hostsLines = [];
if (existsSync(HOSTS_FILE)) {
  hostsLines = readFileSync(HOSTS_FILE, "utf8")
    .split(/\r?\n/)
    .filter((l) => /github/i.test(l) && !l.trim().startsWith("#"));
}
console.log(`  hosts 覆盖      ${hostsLines.length ? hostsLines.join(" ; ") : "无 GitHub 相关条目"}`);

/* ---------------------------------------------------------------- 2. 解析 */

console.log(H("② 域名解析"));
const DOMAINS = [
  "github.com",
  "api.github.com",
  "codeload.github.com",
  "ssh.github.com",
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "github.io",
];
const resolved = {};
for (const d of DOMAINS) {
  resolved[d] = await resolveA(d);
  console.log(`  ${pad(d, 32)} ${resolved[d].join(", ")}`);
}

/* ---------------------------------------------------------------- 3. 连通性 */

console.log(H(`③ 连通性与稳定性（每个目标 ${ROUNDS} 轮 TCP+TLS+HTTPS）`));
console.log(pad("目标", 40) + pad("成功", 8) + pad("平均", 9) + "说明");
console.log("─".repeat(80));

const verdict = [];

async function checkTarget(label, ip, servername, path = "/", note = "") {
  let okc = 0;
  const times = [];
  const fails = [];
  for (let i = 0; i < ROUNDS; i++) {
    const r = await full(ip, servername, path);
    if (r.ok && (r.status === 200 || r.status === 301 || r.status === 302 || r.status === 404)) {
      okc++;
      times.push(r.ms);
    } else {
      fails.push(r.extra || `HTTP ${r.status}`);
    }
  }
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const mark = okc === ROUNDS ? "✓" : okc === 0 ? "✗" : "△";
  console.log(pad(`${mark} ${label}`, 40) + pad(`${okc}/${ROUNDS}`, 8) + pad(times.length ? `${avg}ms` : "—", 9) + note);
  if (fails.length) console.log(pad("", 40) + `└ ${[...new Set(fails)].join(", ")}`);
  return { label, ip, okc, avg, total: ROUNDS };
}

/* github.com：当前解析 + 备选 IP 一起测，看看有没有更稳的 */
const ghIps = resolved["github.com"].filter((x) => !x.includes("失败"));
const ALT = ["20.27.177.113", "140.82.113.3", "140.82.114.3"].filter((ip) => !ghIps.includes(ip));
const ghResults = [];
for (const ip of ghIps) ghResults.push(await checkTarget(`github.com ← ${ip}`, ip, "github.com", "/", "(当前 DNS)"));
for (const ip of ALT) ghResults.push(await checkTarget(`github.com ← ${ip}`, ip, "github.com", "/", "(备选)"));

/* 其他域名：用它们各自解析到的第一个 IP */
for (const d of ["api.github.com", "codeload.github.com", "raw.githubusercontent.com", "github.io"]) {
  const ip = resolved[d].find((x) => !x.includes("失败"));
  if (ip) await checkTarget(`${d} ← ${ip}`, ip, d, d.includes("codeload") ? "/" : "/");
}

/* ---------------------------------------------------------------- 4. 结论 */

console.log(H("④ 结论与建议"));

const ghOk = ghResults.filter((r) => r.okc === r.total);
const ghBest = [...ghResults].sort((a, b) => b.okc - a.okc || a.avg - b.avg)[0];
const ghWorst = [...ghResults].sort((a, b) => a.okc - b.okc)[0];

if (ghBest.okc === ghBest.total && ghWorst.okc < ghWorst.total) {
  console.log(`  · 链路**抖动**：${ghBest.label} 全通（${ghBest.avg}ms），而 ${ghWorst.label} 只有 ${ghWorst.okc}/${ghWorst.total}。`);
  console.log("    这不是 DNS 污染、也不是 SNI 封锁，而是国际出口丢包——浏览器要开几十条连接，");
  console.log("    几条超时就会一直转圈，表现成「GitHub 进不去」。");
  console.log(`  → 可用 fix-github.ps1 把 github.com 固定到目前最稳的 ${ghBest.ip}（可 -Revert 撤销）。`);
  console.log("  → 浏览器遇到转圈时直接刷新（Ctrl+R）通常就能进去；关键操作建议改用手机热点。");
} else if (ghBest.okc === ghBest.total) {
  console.log(`  · github.com 目前 ${ghBest.total}/${ghBest.total} 全部成功（${ghBest.label}，${ghBest.avg}ms）。`);
  console.log("    此刻访问是正常的；如果刚才进不去，说明你遇到的是间歇性丢包窗口，重试即可。");
} else if (ghBest.okc === 0) {
  console.log("  · github.com 所有已知 IP 全部不通 —— 这是硬性阻断，不是抖动。");
  console.log("  → 只能用代理 / 手机热点，或改用域名镜像（登录类操作切勿走第三方镜像）。");
} else {
  console.log(`  · 部分可达：最优 ${ghBest.label}（${ghBest.okc}/${ghBest.total}，${ghBest.avg}ms）。`);
  console.log("  → 属严重丢包，建议换网络（手机热点）完成登录类操作。");
}

const apiRes = ghResults.find((r) => r.label.startsWith("api.github.com"));
if (apiRes && apiRes.okc > 0 && (!ghBest || ghBest.okc < ghBest.total)) {
  console.log(`  · 注意：api.github.com 比 github.com 稳（${apiRes.okc}/${apiRes.total}），`);
  console.log("    所以「命令行能推、浏览器打不开」是这台机器的典型症状。");
}

console.log("\n  体检完成。");
