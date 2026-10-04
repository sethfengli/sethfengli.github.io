# ============================================================
#  慧灯禅院 · 图版续抓（可反复重跑）
# ------------------------------------------------------------
#  为什么需要它：Wikimedia Commons 对连续抓取限流很凶
#  （约 6-8 张/分钟就返回 429）。一次跑不完是常态。
#  本脚本负责「跑 → 冷却 → 再跑」；已下载的图片会自动复用，
#  不会重复下载（复用路径见 fetch-cn-picked.mjs 里 reencode 的第三参 resize=false）。
#
#  每轮结束会：核对清单与磁盘一致、重挑具名图、报告各桶余量。
#
#  用法：
#    .\scripts\fetch-photos.ps1                       # 补所有还缺的桶
#    .\scripts\fetch-photos.ps1 -Only halls,sutras    # 只补指定桶
#    .\scripts\fetch-photos.ps1 -Rounds 20 -PaceMs 20000
#
#  注：控制台输出刻意全用 ASCII —— PowerShell 5.1 读到脚本里的中文
#  字符串常量时会因为代码页不是 UTF-8 而把引号配对读错（实测报
#  "The string is missing the terminator"），中文只放在注释里。
# ============================================================
param(
  [string]$Only = '',
  [int]$Rounds = 12,
  [int]$PaceMs = 14000
)

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

Write-Host "== resume photo fetch  repo=$repo  rounds=$Rounds  PACE_MS=$PaceMs" -ForegroundColor Cyan

for ($i = 1; $i -le $Rounds; $i++) {
  Write-Host ""
  Write-Host "---- round $i / $Rounds ----" -ForegroundColor Yellow
  $env:PACE_MS = "$PaceMs"

  if ($Only) {
    node scripts/fetch-cn-picked.mjs "--only=$Only"
  } else {
    node scripts/fetch-cn-picked.mjs
  }

  # 清单与磁盘对齐（剔除已不存在的文件名）
  node scripts/photos-status.mjs --prune

  # 具名图重挑（桶内容变了就得重挑，否则具名图会指向已删除的文件）
  node scripts/pick-named-photos.mjs

  # 退出码 2 = 还有空桶 → 继续；0 = 齐了 → 收工
  node scripts/photos-status.mjs --quiet | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "all buckets covered - done." -ForegroundColor Green
    break
  }

  Write-Host ""
  Write-Host "some buckets still empty - cooling down 60s ..." -ForegroundColor DarkYellow
  Start-Sleep -Seconds 60
}

Write-Host ""
Write-Host "== final status ==" -ForegroundColor Cyan
node scripts/photos-status.mjs
Write-Host ""
Write-Host "next: npx tsc --noEmit  then  npx vite build" -ForegroundColor Cyan
