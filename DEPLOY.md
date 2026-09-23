# 让别人打开这个网站

> ## ✅ 已经发布
> - 公网地址：**<https://xy-haze.github.io/marathon-prince/>**
> - 仓库：<https://github.com/XY-haze/marathon-prince>
> - 部署方式：GitHub Actions（`.github/workflows/deploy-pages.yml`）→ GitHub Pages，Pages 的 Source 已设为 “GitHub Actions”
>
> **以后更新站点**：改完内容后 `node build.mjs && node check.mjs`，然后 `git add -A && git commit -m "更新" && git push`，Actions 会自动重新构建并部署（约 30 秒）。
> 首次发布时踩到的坑（GCM 只能拿到凭据、`github.com` 间歇性丢包）记录在本文末尾。

站点是纯静态的：**没有任何后端、数据库或运行时依赖**，`node build.mjs` 产出的 `dist/` 目录可以直接扔到任何静态托管上。下面按"要让谁看"分四种情况。

---

## 情况一：同一局域网的人现在就要看（已启动）

本机已经跑起来一个零依赖静态服务器：

```bash
node serve.mjs                 # 默认 0.0.0.0:8788，服务 dist/
node serve.mjs --port 9000     # 换端口
node serve.mjs --root dist-standalone   # 服务离线单文件版
node serve.mjs --host 127.0.0.1         # 只允许本机
```

启动后终端会打印两个地址：

- 本机：`http://127.0.0.1:8788/`
- 局域网：`http://<本机内网IP>:8788/`（同一 WiFi/内网的人直接打开即可）

**如果同一局域网的其他人打不开**，通常是 Windows 防火墙拦了 Node 的入站连接。以管理员身份执行一次即可放行（把端口换成你实际用的）：

```powershell
New-NetFirewallRule -DisplayName "马拉松王子资料站 8788" -Direction Inbound -Protocol TCP -LocalPort 8788 -Action Allow
```

> 注意：`0.0.0.0` 只对本机所在的局域网可见，不会把站点暴露到公网。

---

## 情况二：要一个公网地址（推荐 GitHub Pages，免费且稳定）

仓库里已经准备好了工作流 `.github/workflows/deploy-pages.yml`，它会自动构建、自检并发布。

```bash
git init
git add .
git commit -m "add marathon prince fansite"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

然后在 GitHub 仓库页面：**Settings → Pages → Build and deployment → Source 选择 “GitHub Actions”**。
推送完成后 Actions 会自动跑，几分钟后站点出现在：

```
https://<你的用户名>.github.io/<仓库名>/
```

工作流会把该地址作为 `SITE_URL` 传给构建脚本，因此页面里会自动带上 `canonical` 链接并生成 `sitemap.xml`。

### 想用"分支部署"而不跑 Actions？

把构建产物提交到 `docs/` 目录，然后在 Settings → Pages 里选 `main` 分支的 `/docs` 文件夹：

```bash
node build.mjs
# 把 dist/ 的内容复制为 docs/ 后提交
```

（仓库已在 `.nojekyll` 中处理了 GitHub Pages 跳过 Jekyll 的问题，产物里自带该文件。）

---

## 情况三：Netlify / Vercel / Cloudflare Pages

三个平台的配置都已经写进仓库，导入后**不需要任何手动设置**：

| 平台 | 操作 | 配置文件 |
| --- | --- | --- |
| Netlify | 连接仓库，或直接把 `dist/` 文件夹拖进 Netlify Drop | `netlify.toml`（build `node build.mjs`，publish `dist`） |
| Vercel | 导入仓库，框架选 “Other” | `vercel.json`（`buildCommand` / `outputDirectory`） |
| Cloudflare Pages | 导入仓库，Framework preset 选 “None” | 构建命令 `node build.mjs`，输出目录 `dist` |

Netlify 的**拖拽部署**最省事：本地跑一次 `node build.mjs`，把 `dist` 目录拖到 <https://app.netlify.com/drop>，几十秒后拿到一个 `*.netlify.app` 公网地址，不需要 Git。

---

## 情况四：不想开服务器，直接把文件发给别人

`node build.mjs` 会同时产出 **`dist-standalone/`**：9 个**完全自包含**的 HTML 文件——CSS、JavaScript、全部插画都以 `<style>` / `<script>` / base64 data URI 的形式内联进去了，没有任何外部文件依赖。

- 直接把 `dist-standalone/index.html` 用微信/邮件发给别人，对方双击就能看；
- 页面之间的导航链接仍然有效，所以整个 `dist-standalone/` 目录一起发过去体验最完整；
- 仓库根目录下的 `marathon-prince-standalone.zip` 就是这个目录的压缩包，适合当作附件发送。

---

## 构建与自检

```bash
node build.mjs     # 产出 dist/ 与 dist-standalone/
node check.mjs     # 冒烟测试：链接、资源、标签平衡、关键内容、单文件版内联情况
```

设置 `SITE_URL` 可生成 canonical 链接与 sitemap：

```bash
SITE_URL=https://example.com/marathon-prince node build.mjs
```

Windows PowerShell 下对应：

```powershell
$env:SITE_URL="https://example.com/marathon-prince"; node build.mjs
```
