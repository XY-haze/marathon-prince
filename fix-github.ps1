# =============================================================================
#  修复「GitHub 进不去」—— 把 github.com 固定到当前最稳的 IP
#  ---------------------------------------------------------------------------
#  背景：本机所在的网络到 GitHub 国际出口存在间歇性丢包，域名解析出来的
#        github.com 地址有时会在几十秒内完全连不上，浏览器表现为一直转圈。
#        本脚本实测多个候选 IP，挑出成功率最高、延迟最低的那个写进 hosts。
#
#  用法（会自动请求管理员权限，会弹 UAC，点「是」即可）：
#      .\fix-github.ps1            探测并写入最优 IP
#      .\fix-github.ps1 -Status    只看当前状态，不改动
#      .\fix-github.ps1 -Revert    撤销本脚本写入的条目
#      .\fix-github.ps1 -Rounds 6  提高探测轮数（默认 4）
#
#  注意：GitHub 的 IP 会变。若日后 GitHub 又打不开，先跑 -Revert 再跑一次即可。
#        脚本每次都会先把原 hosts 备份成 hosts.bak.<时间戳>。
# =============================================================================

[CmdletBinding()]
param(
    [switch]$Revert,
    [switch]$Status,
    [switch]$Restore,
    [int]$Rounds = 4
)

$ErrorActionPreference = 'Stop'
$HostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$Marker    = 'marathon-prince github fix'
$BeginTag  = "# >>> $Marker >>>"
$EndTag    = "# <<< $Marker <<<"

# 候选 IP：Preferred = 长期稳定的 GitHub 段（优先选它们，即使延迟略高）
# 20.205.243.166 是校园网 DNS 默认返回的地址，实测会周期性整体超时，因此排在最后。
$Candidates = @(
    @{ Ip = '20.27.177.113';  Note = 'Azure 新加坡新段 · 长期稳定'; Preferred = $true },
    @{ Ip = '140.82.113.3';   Note = '美国 经典段 · 长期稳定';      Preferred = $true },
    @{ Ip = '140.82.114.3';   Note = '美国 经典段 · 长期稳定';      Preferred = $true },
    @{ Ip = '20.205.243.166'; Note = 'DNS 默认 · 会周期性丢包';     Preferred = $false },
    @{ Ip = '20.201.28.151';  Note = 'Azure 备用 · 表现不稳';       Preferred = $false }
)

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Show-Status {
    Write-Host ''
    Write-Host '当前 hosts 中与本脚本相关的条目：' -ForegroundColor Cyan
    $lines = Get-Content -LiteralPath $HostsPath -ErrorAction SilentlyContinue
    $inside = $false; $found = $false
    foreach ($l in $lines) {
        if ($l -like "*$BeginTag*") { $inside = $true }
        if ($inside) { Write-Host "  $l" -ForegroundColor Yellow; $found = $true }
        if ($l -like "*$EndTag*") { $inside = $false }
    }
    if (-not $found) { Write-Host '  (无，说明当前用的是 DNS 解析结果)' -ForegroundColor DarkGray }

    Write-Host ''
    Write-Host '系统实际解析结果：' -ForegroundColor Cyan
    try {
        Resolve-DnsName github.com -Type A -ErrorAction Stop |
            Where-Object { $_.IPAddress } |
            ForEach-Object { Write-Host ("  github.com -> " + $_.IPAddress) -ForegroundColor Green }
    } catch { Write-Host '  解析失败' -ForegroundColor Red }
    Write-Host ''
}

function Probe([string]$Ip) {
    # 对某个 IP 做 $Rounds 轮 TCP+TLS(SNI=github.com)+HTTPS 请求
    $ok = 0; $times = @()
    for ($i = 0; $i -lt $Rounds; $i++) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $client = $null; $ssl = $null
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $iar = $client.BeginConnect($Ip, 443, $null, $null)
            if (-not $iar.AsyncWaitHandle.WaitOne(5000, $false)) { throw 'TCP 超时' }
            $client.EndConnect($iar)

            $ssl = New-Object System.Net.Security.SslStream($client.GetStream(), $false,
                        ([System.Net.Security.RemoteCertificateValidationCallback] { param($a,$b,$c,$d) $true }))
            $ssl.AuthenticateAsClient('github.com')

            $req = [Text.Encoding]::ASCII.GetBytes("HEAD / HTTP/1.1`r`nHost: github.com`r`nUser-Agent: fix-github`r`nConnection: close`r`n`r`n")
            $ssl.Write($req); $ssl.Flush()

            $buf = New-Object byte[] 256
            $read = $ssl.Read($buf, 0, $buf.Length)
            $head = [Text.Encoding]::ASCII.GetString($buf, 0, $read)
            if ($head -match '^HTTP/1\.[01] (\d{3})') {
                $ok++
                $times += $sw.ElapsedMilliseconds
            }
        } catch {
            # 这一轮失败，继续
        } finally {
            if ($ssl) { $ssl.Dispose() }
            if ($client) { $client.Close() }
        }
    }
    $avg = if ($times.Count) { [int](($times | Measure-Object -Average).Average) } else { [int]::MaxValue }
    [pscustomobject]@{ Ip = $Ip; Ok = $ok; Rounds = $Rounds; AvgMs = $avg }
}

# ------------------------------------------------------------------ 提权

if (-not (Test-Admin)) {
    Write-Host ''
    Write-Host '需要管理员权限来修改 hosts 文件，正在请求提权（请在 UAC 弹窗中点「是」）…' -ForegroundColor Yellow
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Rounds', $Rounds)
    if ($Revert) { $argList += '-Revert' }
    if ($Status) { $argList += '-Status' }
    if ($Restore) { $argList += '-Restore' }
    try {
        Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs -Wait
    } catch {
        Write-Host '提权被取消，未做任何修改。' -ForegroundColor Red
    }
    exit
}

# ------------------------------------------------------------------ 状态 / 撤销

if ($Status) { Show-Status; exit }

if ($Restore) {
    $newest = Get-ChildItem "$HostsPath.bak.*" -ErrorAction SilentlyContinue |
              Sort-Object Name -Descending | Select-Object -First 1
    if (-not $newest) {
        Write-Host '找不到任何 hosts 备份（hosts.bak.*），无法恢复。' -ForegroundColor Red
        exit 1
    }
    Copy-Item -LiteralPath $newest.FullName -Destination $HostsPath -Force
    ipconfig /flushdns | Out-Null
    Write-Host ''
    Write-Host "已从备份恢复 hosts：$($newest.Name)" -ForegroundColor Green
    Show-Status
    exit
}

if ($Revert) {
    $backup = "$HostsPath.bak.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -LiteralPath $HostsPath -Destination $backup -Force
    $lines = Get-Content -LiteralPath $HostsPath
    $out = New-Object System.Collections.Generic.List[string]
    $skip = $false; $removed = 0
    foreach ($l in $lines) {
        if ($l -like "*$BeginTag*") { $skip = $true }
        if (-not $skip) { $out.Add($l) } else { $removed++ }
        if ($l -like "*$EndTag*") { $skip = $false }
    }
    $tmp = Join-Path $env:TEMP ("hosts.new." + [guid]::NewGuid().ToString('N') + ".txt")
    try {
        [System.IO.File]::WriteAllLines($tmp, $out, (New-Object System.Text.ASCIIEncoding))
        if ((Get-Item -LiteralPath $tmp).Length -lt 1) { throw '临时文件为空' }
        Copy-Item -LiteralPath $tmp -Destination $HostsPath -Force
    } catch {
        Write-Host "写入 hosts 失败：$($_.Exception.Message)，已从备份恢复。" -ForegroundColor Red
        Copy-Item -LiteralPath $backup -Destination $HostsPath -Force
        throw
    } finally {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
    ipconfig /flushdns | Out-Null
    Write-Host ''
    Write-Host "已移除 $removed 行脚本写入的条目，DNS 缓存已刷新。" -ForegroundColor Green
    Write-Host "备份：$backup" -ForegroundColor DarkGray
    Show-Status
    exit
}

# ------------------------------------------------------------------ 探测

Write-Host ''
Write-Host "正在探测 $($Candidates.Count) 个候选 IP（每个 $Rounds 轮），约需 $([int]($Candidates.Count * $Rounds * 1.5)) 秒…" -ForegroundColor Cyan
Write-Host ''
Write-Host ('  ' + 'IP'.PadRight(18) + '成功'.PadRight(8) + '平均延迟'.PadRight(12) + '备注')
Write-Host ('  ' + ('-' * 62))

$results = @()
foreach ($c in $Candidates) {
    $r = Probe $c.Ip
    $r | Add-Member -NotePropertyName Note -NotePropertyValue $c.Note
    $r | Add-Member -NotePropertyName Preferred -NotePropertyValue $c.Preferred
    $results += $r
    $mark = if ($r.Ok -eq $r.Rounds) { '✓' } elseif ($r.Ok -eq 0) { '✗' } else { '△' }
    $avgText = if ($r.AvgMs -eq [int]::MaxValue) { '—' } else { "$($r.AvgMs)ms" }
    Write-Host ('  ' + "$mark $($r.Ip)".PadRight(18) + "$($r.Ok)/$($r.Rounds)".PadRight(8) + $avgText.PadRight(12) + $c.Note)
}

# 选优规则：全通过的优先 → 全通过里优先长期稳定的段 → 再按平均延迟取最快
$perfect = @($results | Where-Object { $_.Ok -eq $_.Rounds })
$pool    = if ($perfect.Count) { $perfect } else { @($results) }
$stable  = @($pool | Where-Object { $_.Preferred })
if ($stable.Count) { $pool = $stable }
$best = $pool | Sort-Object @{E={$_.AvgMs}; Descending=$false} | Select-Object -First 1

Write-Host ''
if ($best.Ok -eq 0) {
    Write-Host '所有候选 IP 都不通 —— 这不是 IP 问题，而是网络对 GitHub 的硬阻断。' -ForegroundColor Red
    Write-Host '建议改用手机热点 / 代理，本脚本不做修改。' -ForegroundColor Red
    exit 1
}
if ($best.Ok -lt $best.Rounds) {
    Write-Host "注意：最优 IP $($best.Ip) 也只有 $($best.Ok)/$($best.Rounds) 成功，链路仍在丢包。" -ForegroundColor Yellow
}

Write-Host "选定：$($best.Ip)（$($best.Ok)/$($best.Rounds) 成功，平均 $($best.AvgMs)ms）—— $($best.Note)" -ForegroundColor Green

# ------------------------------------------------------------------ 写入 hosts

$backup = "$HostsPath.bak.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $HostsPath -Destination $backup -Force
Write-Host "已备份原 hosts：$backup" -ForegroundColor DarkGray

$lines = Get-Content -LiteralPath $HostsPath
$out = New-Object System.Collections.Generic.List[string]
$skip = $false
foreach ($l in $lines) {
    if ($l -like "*$BeginTag*") { $skip = $true }
    if (-not $skip) { $out.Add($l) }
    if ($l -like "*$EndTag*") { $skip = $false }
}
$out.Add('')
$out.Add($BeginTag)
$out.Add("# added by fix-github.ps1 at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - pin github.com to the most reliable IP")
$out.Add("# if GitHub breaks again: run fix-github.ps1 -Revert and then fix-github.ps1 again")
$out.Add("$($best.Ip)`tgithub.com")
$out.Add($EndTag)

# 安全写入：先写临时文件并校验，确认无误后再整体替换目标。
# 绝不能直接 Set-Content 覆盖 hosts —— 一旦写入被拒就会留下 0 字节文件（曾经踩过）。
$tmp = Join-Path $env:TEMP ("hosts.new." + [guid]::NewGuid().ToString('N') + ".txt")
try {
    [System.IO.File]::WriteAllLines($tmp, $out, (New-Object System.Text.ASCIIEncoding))
    $tmpLen = (Get-Item -LiteralPath $tmp).Length
    $tmpTxt = Get-Content -LiteralPath $tmp -Raw
    if ($tmpLen -lt 64) { throw "临时文件过小（$tmpLen 字节），判定为异常" }
    if ($tmpTxt -notmatch [regex]::Escape($best.Ip) -or $tmpTxt -notmatch 'github\.com') {
        throw '临时文件内容不完整（缺少目标 IP 或 github.com）'
    }
    Copy-Item -LiteralPath $tmp -Destination $HostsPath -Force
    Write-Host "hosts 已更新（$tmpLen 字节，写入前已校验）。" -ForegroundColor Green
} catch {
    Write-Host "写入 hosts 失败：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host '正在从备份恢复原 hosts …' -ForegroundColor Yellow
    Copy-Item -LiteralPath $backup -Destination $HostsPath -Force
    Write-Host '已恢复原 hosts，本次未做任何修改。' -ForegroundColor Yellow
    throw
} finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
ipconfig /flushdns | Out-Null
Write-Host 'DNS 缓存已刷新。' -ForegroundColor Green

# ------------------------------------------------------------------ 验证

Write-Host ''
Write-Host '验证 https://github.com/ …' -ForegroundColor Cyan
$okCount = 0
for ($i = 1; $i -le 3; $i++) {
    try {
        $r = Invoke-WebRequest -Uri 'https://github.com/' -UseBasicParsing -TimeoutSec 20 -MaximumRedirection 2
        Write-Host "  第 $i 次：HTTP $($r.StatusCode)（$([math]::Round($r.RawContentLength/1KB,1)) KB）" -ForegroundColor Green
        $okCount++
    } catch {
        Write-Host "  第 $i 次：失败 —— $($_.Exception.Message.Split("`n")[0])" -ForegroundColor Red
    }
}
Write-Host ''
if ($okCount -gt 0) {
    Write-Host "修复完成：3 次验证中 $okCount 次成功。现在可以刷新浏览器访问 GitHub 了。" -ForegroundColor Green
    Write-Host '（如果浏览器仍打不开，请重启浏览器以清掉它自己的 DNS 缓存。）' -ForegroundColor DarkGray
} else {
    Write-Host '写入后验证仍失败，说明丢包是网络层面的，hosts 无法根治。' -ForegroundColor Yellow
    Write-Host '建议：换手机热点，或执行 .\fix-github.ps1 -Revert 撤销本次改动。' -ForegroundColor Yellow
}
Write-Host ''
