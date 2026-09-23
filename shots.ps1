# Render pages/anchors of the site to PNG for visual QA.
# Uses $PSScriptRoot so it works regardless of how the path is encoded;
# no non-ASCII literals here (Windows PowerShell 5.1 reads .ps1 as ANSI).
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$base   = $PSScriptRoot
$out    = Join-Path $base ".shots"
$ud     = Join-Path $env:TEMP "dsh-chrome-qa"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$prefix = "file:///" + $base.Replace("\", "/") + "/"

$shots = @(
  @{ n = "01-index";        u = "index.html";                 w = 1440; h = 1250 },
  @{ n = "02-index-story";  u = "index.html#story";           w = 1440; h = 1250 },
  @{ n = "03-index-cast";   u = "index.html#cast";            w = 1440; h = 1250 },
  @{ n = "04-plot-world";   u = "plot.html#world";            w = 1440; h = 1250 },
  @{ n = "05-characters";   u = "characters.html";            w = 1440; h = 1250 },
  @{ n = "06-episodes";     u = "episodes.html";              w = 1440; h = 1250 },
  @{ n = "07-production";   u = "production.html#timeline";    w = 1440; h = 1250 },
  @{ n = "08-music";        u = "music.html";                 w = 1440; h = 1250 },
  @{ n = "09-bc-awards";    u = "broadcast.html#awards";      w = 1440; h = 1250 },
  @{ n = "10-bc-reception"; u = "broadcast.html#reception";   w = 1440; h = 1250 },
  @{ n = "11-bc-contro";    u = "broadcast.html#controversy"; w = 1440; h = 1250 },
  @{ n = "12-bc-conflict";  u = "broadcast.html#conflict";    w = 1440; h = 1250 },
  @{ n = "13-sources";      u = "sources.html";               w = 1440; h = 1250 },
  @{ n = "14-mobile-index"; u = "index.html";                 w = 430;  h = 1000 }
)

foreach ($s in $shots) {
  $file = Join-Path $out ($s.n + ".png")
  if (Test-Path $file) { Remove-Item $file -Force }
  & $chrome --headless=new --disable-gpu --no-sandbox --no-first-run --disable-extensions `
    --hide-scrollbars --virtual-time-budget=4000 --force-device-scale-factor=1 `
    --force-prefers-reduced-motion `
    --user-data-dir="$ud" --window-size="$($s.w),$($s.h)" --screenshot="$file" "$prefix$($s.u)" 2>$null | Out-Null
  if (Test-Path $file) {
    Write-Output ("OK   {0,-18} {1} bytes" -f $s.n, (Get-Item $file).Length)
  } else {
    Write-Output ("FAIL {0}" -f $s.n)
  }
}
