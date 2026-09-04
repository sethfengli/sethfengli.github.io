param(
  [string]$SrcJson,
  [string]$TransJson,
  [string]$OutJson,
  [int]$Start = 0,
  [int]$End = 0
)
$src = Get-Content -Raw -Encoding UTF8 $SrcJson | ConvertFrom-Json
$tr  = Get-Content -Raw -Encoding UTF8 $TransJson | ConvertFrom-Json
# meta
$meta = [ordered]@{}
if ($tr.PSObject.Properties['title']) {
  $meta['title'] = $tr.title
} else {
  $meta['title'] = $src.title
}
if ($tr.PSObject.Properties['author'] -and $tr.author -ne '') { $meta['author'] = $tr.author }
if ($tr.PSObject.Properties['excerpt'] -and $tr.excerpt -ne '') { $meta['excerpt'] = $tr.excerpt }
if ($tr.PSObject.Properties['slug'] -and $tr.slug -ne '') { $meta['slug'] = $tr.slug }

$blocks = @()
for ($i = $Start; $i -le $End; $i++) {
  $key = [string]$i
  if (-not $tr.PSObject.Properties[$key]) { Write-Host ("MISSING key " + $key); exit 1 }
  $srcB = $src.blocks[$i]
  $val = $tr.$key
  if ($val -is [System.Array]) {
    $tseg = @($val)
    $inline = @()
    for ($j = 0; $j -lt $srcB.inline.Count; $j++) {
      $seg = @{ s = $tseg[$j] }
      if ($srcB.inline[$j].href) { $seg.href = $srcB.inline[$j].href }
      $inline += $seg
    }
    $blk = [ordered]@{ t = $srcB.t; inline = $inline }
  } else {
    $txt = [string]$val
    if ($srcB.t -eq 'hr') { $blk = [ordered]@{ t = 'hr' } }
    else { $blk = [ordered]@{ t = $srcB.t; text = $txt } }
  }
  $blocks += ,$blk
}
$obj = [ordered]@{}
foreach ($k in $meta.Keys) { $obj[$k] = $meta[$k] }
$obj['firstBlock'] = $Start
$obj['blocks'] = $blocks
$json = $obj | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($OutJson, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("WROTE " + $OutJson + " firstBlock=" + $Start + " blocks=" + $blocks.Count)
