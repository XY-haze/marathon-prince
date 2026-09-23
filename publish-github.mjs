/* ==========================================================================
   一键把本站发布到 GitHub（建仓库 → 推送 → 开启 GitHub Pages → 等待部署）
   --------------------------------------------------------------------------
   用法：
     node publish-github.mjs --repo marathon-prince
     node publish-github.mjs --repo marathon-prince --private
     node publish-github.mjs --repo marathon-prince --dry-run      # 只体检不动作
     node publish-github.mjs --repo existing-repo --no-api         # 仓库已存在，只推送

   Token 来源（按顺序）：
     1. 环境变量 GH_TOKEN / GITHUB_TOKEN
     2. 本机 Git 凭据管理器（Git Credential Manager）
        —— 没有时会用 GCM 弹浏览器登录，点一下授权即可
   需要的权限：repo（经典 token）/ 或 fine-grained 的 Administration + Pages + Contents 读写。
   Token 只在本进程内存中使用，不会写入磁盘、不会打印。
   ========================================================================== */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const API = "https://api.github.com";

/* ---------------------------------------------------------------- 参数 */

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const val = (f, d) => {
  const i = argv.indexOf(`--${f}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};

const REPO = val("repo", "marathon-prince");
const PRIVATE = has("private");
const DRY = has("dry-run");
const NO_API = has("no-api");
const DESCRIPTION =
  "《马拉松王子》(2011) 动画资料站 —— 零依赖静态站点：剧情、七位角色、全 52 集目录、幕后制作、音乐、播出与争议核查";

const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const ok = (msg) => console.log(`    ✓ ${msg}`);
const info = (msg) => console.log(`    · ${msg}`);
const die = (msg, hint) => {
  console.error(`\n✗ ${msg}`);
  if (hint) console.error(`  → ${hint}`);
  process.exit(1);
};

const git = (args, opts = {}) => {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", ...opts });
  if (r.error) die(`git ${args.join(" ")} 执行失败：${r.error.message}`);
  return r;
};
const gitOut = (args) => (git(args).stdout || "").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------- 1. 取 token */

async function resolveToken() {
  const fromEnv = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (fromEnv) {
    info("使用环境变量中的 token");
    return fromEnv.trim();
  }

  const tokenFile = join(ROOT, ".gh-token");
  if (existsSync(tokenFile)) {
    const t = readFileSync(tokenFile, "utf8").trim();
    if (t) {
      info("使用 .gh-token 文件中的 token（该文件已在 .gitignore 中排除）");
      return t;
    }
  }

  if (DRY) {
    info("--dry-run：跳过凭据获取（不会弹授权窗口）");
    return null;
  }

  info("没有环境变量 / .gh-token 文件，尝试从本机 Git 凭据管理器获取…");
  console.log("");
  console.log("    ┌──────────────────────────────────────────────────────────┐");
  console.log("    │  请留意屏幕上弹出的 GitHub 登录 / 授权窗口               │");
  console.log("    │  （Git Credential Manager）。点 “Sign in with your       │");
  console.log("    │   browser”，在浏览器里点 Authorize 同意授权即可。        │");
  console.log("    │  若弹出的是一个设备码，请到 https://github.com/login/device 输入。 │");
  console.log("    │  脚本最多等待 10 分钟。                                   │");
  console.log("    └──────────────────────────────────────────────────────────┘");
  console.log("");
  const r = spawnSync("git", ["credential", "fill"], {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Auto" },
    timeout: 600000,
  });
  const token = (r.stdout || "").match(/^password=(.+)$/m)?.[1];
  if (token) {
    info("已从凭据管理器取得 token（不显示内容）");
    return token;
  }
  return null;
}

async function api(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "marathon-prince-publisher",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  let body = null;
  try {
    body = res.status === 204 ? null : await res.json();
  } catch {
    /* 空响应 */
  }
  return { status: res.status, ok: res.ok, body, scopes: res.headers.get("x-oauth-scopes") || "" };
}

/* ---------------------------------------------------------------- 主流程 */

console.log("《马拉松王子》资料站 — GitHub 发布脚本");
console.log(`仓库名：${REPO}${PRIVATE ? "（私有）" : "（公开）"}`);

step(1, "检查本地构建产物");
for (const f of ["dist/index.html", "dist/.nojekyll", ".github/workflows/deploy-pages.yml"]) {
  if (!existsSync(join(ROOT, f))) die(`缺少 ${f}`, "先运行 node build.mjs");
  ok(f);
}

let token = null;
let login = null;

if (NO_API) {
  info("--no-api：跳过 GitHub API，仅用 SSH 推送到已存在的仓库");
} else {
  step(2, "确认 GitHub 身份");
  token = await resolveToken();
  if (!token) {
    die(
      "没有可用 token，无法创建仓库 / 开启 Pages",
      "任选其一：① export GH_TOKEN=<你的 token> 后重跑；② 让 GCM 弹窗登录；③ 先在网页上建好空仓库，再用 --no-api 推送"
    );
  }
  const me = await api(token, "/user");
  if (!me.ok) {
    die(
      `token 校验失败（HTTP ${me.status}）`,
      me.status === 401 ? "token 无效或已过期" : "检查 token 权限是否包含 repo / Administration + Pages"
    );
  }
  login = me.body.login;
  ok(`已登录为 ${login}${me.scopes ? `（scopes: ${me.scopes}）` : ""}`);

  step(3, "创建仓库（已存在则复用）");
  if (DRY) {
    info("--dry-run：跳过实际创建");
  } else {
    const created = await api(token, "/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name: REPO,
        description: DESCRIPTION,
        private: PRIVATE,
        has_issues: true,
        has_wiki: false,
        has_projects: false,
        auto_init: false,
      }),
    });
    if (created.status === 201) {
      ok(`已创建 https://github.com/${login}/${REPO}`);
    } else if (created.status === 422) {
      const exist = await api(token, `/repos/${login}/${REPO}`);
      if (!exist.ok) die(`仓库 ${REPO} 已存在但无法访问（HTTP ${exist.status}）`);
      ok(`仓库已存在，复用 https://github.com/${login}/${REPO}`);
    } else {
      die(`创建仓库失败（HTTP ${created.status}）：${JSON.stringify(created.body)}`);
    }
  }

  step(4, "开启 GitHub Pages（Actions 方式）");
  if (DRY) {
    info("--dry-run：跳过");
  } else {
    const pages = await api(token, `/repos/${login}/${REPO}/pages`, {
      method: "POST",
      body: JSON.stringify({ build_type: "workflow" }),
    });
    if (pages.status === 201) ok("Pages 已开启（build_type=workflow）");
    else if (pages.status === 409) ok("Pages 之前已开启");
    else info(`Pages 开启返回 HTTP ${pages.status}：${JSON.stringify(pages.body)}（工作流里的 configure-pages 还会再试一次）`);
  }
}

/* ------------------------------------------------------------------ 提交并推送 */

step(5, "初始化本地仓库并提交");
if (!existsSync(join(ROOT, ".git"))) {
  git(["init", "-q"]);
  git(["branch", "-M", "main"]);
  ok("已 git init（分支 main）");
} else {
  ok("本地已经是 git 仓库");
}

const name = gitOut(["config", "user.name"]) || "";
const email = gitOut(["config", "user.email"]) || "";
if (!name || !email) die("git 还没配置提交身份", '执行：git config --global user.name "你的名字" 与 user.email "你的邮箱"');
ok(`提交身份：${name} <${email}>`);

git(["add", "-A"]);
const staged = gitOut(["diff", "--cached", "--name-only"]);
if (staged) {
  const commit = git(["commit", "-q", "-m", "《马拉松王子》资料站：9 个页面 + 零依赖构建 + 一键部署"]);
  if (commit.status !== 0) die("提交失败", commit.stderr);
  const count = staged.split("\n").length;
  ok(`已提交 ${count} 个文件`);
} else {
  ok("没有新改动，跳过提交");
}

if (DRY) {
  console.log("\n--dry-run 结束，未做任何远程改动。");
  process.exit(0);
}

step(6, "推送到 GitHub");
const remote = NO_API ? gitOut(["remote", "get-url", "origin"]) || "" : `git@github.com:${login}/${REPO}.git`;
if (!NO_API) {
  if (remote) git(["remote", "set-url", "origin", remote]);
  else git(["remote", "add", "origin", remote]);
}
if (!remote) die("没有配置 origin 远程仓库", "用 --repo <已存在的仓库名> 重跑，或先 git remote add origin <地址>");
ok(`origin = ${remote}`);

/* 本机到 GitHub 的国际链路有间歇性丢包，push 失败多半是网络抖动，重试即可 */
let pushed = false;
for (let attempt = 1; attempt <= 3 && !pushed; attempt++) {
  const push = git(["push", "-u", "origin", "HEAD:main"], { env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  if (push.status === 0) {
    pushed = true;
    ok(`推送完成（第 ${attempt} 次尝试）`);
    break;
  }
  const err = (push.stderr || "").trim().split("\n").slice(-3).join(" | ");
  if (attempt < 3) {
    info(`第 ${attempt} 次推送失败：${err}`);
    info("8 秒后自动重试…（本机到 GitHub 存在间歇性丢包，可先跑 node doctor.mjs 体检）");
    await sleep(8000);
  } else {
    console.error(push.stderr);
    die("推送失败（已重试 3 次）", "先运行 node doctor.mjs 看链路;或改用手机热点/代理后再跑本脚本");
  }
}

/* ------------------------------------------------------------------ 等部署 */

const owner = (remote.match(/github\.com[:/]([^/]+)\//) || [])[1] || login;
const pagesUrl = `https://${owner}.github.io/${REPO}/`;

step(7, "等待 GitHub Actions 部署");
console.log(`    工作流地址：https://github.com/${owner}/${REPO}/actions`);
if (!token) {
  info("没有 token，无法查询部署状态。稍后自行打开上面链接查看。");
  console.log(`\n预计发布地址：${pagesUrl}`);
  process.exit(0);
}

const sleepAlreadyDefined = true; // sleep 已在文件顶部定义
let run = null;
for (let i = 0; i < 20 && !run; i++) {
  await sleep(6000);
  const runs = await api(token, `/repos/${owner}/${REPO}/actions/runs?per_page=1`);
  const first = runs.ok ? runs.body.workflow_runs?.[0] : null;
  if (first) run = first;
  else info(`还没有工作流运行记录…（${(i + 1) * 6}s）`);
}
if (!run) {
  info("没等到工作流，请自行打开 Actions 页面查看。");
  console.log(`\n预计发布地址：${pagesUrl}`);
  process.exit(0);
}
ok(`工作流已触发：${run.name} #${run.run_number}`);

const terminal = ["success", "failure", "cancelled", "timed_out", "skipped"];
let state = run;
for (let i = 0; i < 60 && !terminal.includes(state.status === "completed" ? state.conclusion : "running"); i++) {
  await sleep(8000);
  const one = await api(token, `/repos/${owner}/${REPO}/actions/runs/${run.id}`);
  if (one.ok) state = one.body;
  process.stdout.write(`\r    部署中… ${i * 8}s（${state.status}）    `);
}
process.stdout.write("\n");

if (state.conclusion === "success") {
  ok("GitHub Pages 部署成功");
} else {
  info(`工作流结束状态：${state.conclusion}`);
  info(`请打开 https://github.com/${owner}/${REPO}/actions/runs/${run.id} 查看日志`);
}

const site = await api(token, `/repos/${owner}/${REPO}/pages`);
if (site.ok && site.body?.html_url) ok(`Pages 地址：${site.body.html_url}（状态：${site.body.status}）`);

console.log("\n" + "─".repeat(56));
console.log(`  仓库：https://github.com/${owner}/${REPO}`);
console.log(`  站点：${pagesUrl}`);
console.log("  说明：首次部署可能需要 1–2 分钟才会生效；若 Actions 报 Pages 未开启，");
console.log("        到仓库 Settings → Pages → Source 选 “GitHub Actions” 即可。");
console.log("─".repeat(56));
