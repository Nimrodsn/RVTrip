$ErrorActionPreference = 'Stop'
$days = @(
  @{ id = 1; search = 'Bohemian Paradise Czech'; file = 'day1-bohemian-paradise' },
  @{ id = 2; search = 'Hruboskalsko'; file = 'day2-hruboskalsko' },
  @{ id = 3; search = 'Adrspach rocks'; file = 'day3-adrspach' },
  @{ id = 4; search = 'Tatralandia aquapark'; file = 'day4-tatralandia' },
  @{ id = 5; search = 'Demanovska ice cave'; file = 'day5-ice-cave' },
  @{ id = 6; search = 'Bachledka treetop walk'; file = 'day6-bachledka' },
  @{ id = 7; search = 'Jedovnice lake Czech'; file = 'day7-jedovnice' },
  @{ id = 8; search = 'Macocha abyss'; file = 'day8-macocha' }
)
$dashboardRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outDir = Join-Path $dashboardRoot 'public\images\days'
$metaPath = Join-Path $PSScriptRoot 'day-images-meta.json'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$meta = @()

foreach ($day in $days) {
  $q = [uri]::EscapeDataString($day.search)
  $api = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=$q&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280"
  $raw = curl.exe -s $api
  $json = $raw | ConvertFrom-Json
  $picked = $null

  if ($json.query.pages) {
    foreach ($p in ($json.query.pages.PSObject.Properties | ForEach-Object { $_.Value } | Sort-Object index)) {
      $ii = $p.imageinfo[0]
      $license = $ii.extmetadata.LicenseShortName.value
      if ($ii.thumburl -and $license -match 'CC|Public domain|PD') {
        $picked = [PSCustomObject]@{
          day = $day.id
          file = $day.file
          title = $p.title
          url = ($ii.thumburl -split '\?')[0]
          artist = ($ii.extmetadata.Artist.value -replace '<[^>]+>', '' -replace '&amp;', '&' -replace '&#039;', "'").Trim()
          license = $license
        }
        break
      }
    }
  }

  if (-not $picked) {
    Write-Output "FAIL day $($day.id): no licensed image"
    continue
  }

  $dest = Join-Path $outDir ($day.file + '.jpg')
  curl.exe -sL $picked.url -o $dest
  $bytes = [System.IO.File]::ReadAllBytes($dest)
  $size = $bytes.Length
  $magic = if ($size -ge 3 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8) { 'JPEG' }
    elseif ($size -ge 8 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50) { 'PNG' }
    else { 'INVALID' }

  $destRelative = 'public/images/days/' + $day.file + '.jpg'
  $picked | Add-Member -NotePropertyName dest -NotePropertyValue $destRelative
  $picked | Add-Member -NotePropertyName size -NotePropertyValue $size
  $picked | Add-Member -NotePropertyName magic -NotePropertyValue $magic
  $meta += $picked
  Write-Output "OK day $($day.id): $magic $size bytes -> $dest"
}

$meta | ConvertTo-Json -Depth 4 | Set-Content $metaPath -Encoding UTF8
Write-Output "TOTAL: $($meta.Count)/8"
