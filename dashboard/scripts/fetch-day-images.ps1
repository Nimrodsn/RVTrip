# Pass -Only to refetch a subset, e.g. -Only olomouc,mumlava-falls
param([string[]]$Only)

$ErrorActionPreference = 'Stop'

# Named by subject, not by day number, so reshuffling the itinerary does not rename files.
$days = @(
  @{ id = 1; search = 'Bohemian Paradise'; file = 'bohemian-paradise' },
  @{ id = 2; search = 'Mumlava waterfall Harrachov'; file = 'mumlava-falls' },
  @{ id = 3; search = 'Adrspach rocks'; file = 'adrspach' },
  @{ id = 4; search = 'Olomouc Holy Trinity Column'; file = 'olomouc' },
  @{ id = 5; search = 'Tatralandia aquapark'; file = 'tatralandia' },
  @{ id = 6; search = 'Demanovska ice cave'; file = 'ice-cave' },
  @{ id = 7; search = 'Olsovec Jedovnice rybnik'; file = 'jedovnice' },
  @{ id = 8; search = 'Macocha gorge Moravian Karst'; file = 'macocha' }
)

if ($Only) { $days = $days | Where-Object { $Only -contains $_.file } }
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
      # Commons hands back the original when it is narrower than iiurlwidth, so check the
      # delivered width. Anything under 1000px looks soft across the full-width hero.
      if (-not $ii.thumburl -or $ii.thumbwidth -lt 1000) { continue }
      if ($license -notmatch 'CC|Public domain|PD') { continue }

      # Attribution is the field Commons designates for credit lines. Artist is free-form HTML
      # and on some files holds a whole licensing notice instead of a name, so prefer Attribution.
      $artist = $ii.extmetadata.Attribution.value
      if (-not $artist) { $artist = $ii.extmetadata.Artist.value }
      $artist = ($artist -replace '<[^>]+>', '' -replace '&amp;', '&' -replace '&#039;', "'").Trim()
      $artist = ($artist -split "`n")[0].Trim()
      if ($artist.Length -gt 60) { $artist = $artist.Substring(0, 60).Trim() + '...' }

      $picked = [PSCustomObject]@{
        day = $day.id
        file = $day.file
        title = $p.title
        url = ($ii.thumburl -split '\?')[0]
        originalUrl = ($ii.url -split '\?')[0]
        artist = $artist
        license = $license
      }
      break
    }
  }

  if (-not $picked) {
    Write-Output "FAIL day $($day.id): no licensed image"
    continue
  }

  $dest = Join-Path $outDir ($day.file + '.jpg')
  # Download to a scratch file so a failed fetch never clobbers a good image already in place.
  $tmp = "$dest.download"
  $size = 0
  $magic = 'INVALID'
  $usedUrl = $null

  # Thumb URLs with Czech diacritics sometimes come back as an error page, so fall back
  # to the original file before giving up.
  foreach ($candidate in @($picked.url, $picked.originalUrl)) {
    if (-not $candidate) { continue }
    curl.exe -sL $candidate -o $tmp
    $bytes = [System.IO.File]::ReadAllBytes($tmp)
    $size = $bytes.Length
    $magic = if ($size -ge 3 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8) { 'JPEG' }
      elseif ($size -ge 8 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50) { 'PNG' }
      else { 'INVALID' }
    if ($magic -ne 'INVALID') { $usedUrl = $candidate; break }
  }

  if ($magic -eq 'INVALID') {
    Remove-Item $tmp -ErrorAction SilentlyContinue
    Write-Output "FAIL day $($day.id): download not a valid image ($($day.file))"
    continue
  }

  Move-Item -Force $tmp $dest

  $picked.url = $usedUrl
  $destRelative = 'public/images/days/' + $day.file + '.jpg'
  $picked | Add-Member -NotePropertyName dest -NotePropertyValue $destRelative
  $picked | Add-Member -NotePropertyName size -NotePropertyValue $size
  $picked | Add-Member -NotePropertyName magic -NotePropertyValue $magic
  $meta += $picked
  Write-Output "OK day $($day.id) $($day.file): $magic $size bytes"
}

# Merge rather than overwrite, so a -Only run does not drop the entries it did not fetch.
$merged = @()
if (Test-Path $metaPath) {
  $existing = Get-Content $metaPath -Raw | ConvertFrom-Json
  $fetched = $meta | ForEach-Object { $_.file }
  $merged += $existing | Where-Object { $fetched -notcontains $_.file }
}
$merged += $meta
$merged = $merged | Sort-Object day

$merged | ConvertTo-Json -Depth 4 | Set-Content $metaPath -Encoding UTF8
Write-Output "FETCHED: $($meta.Count)  META TOTAL: $($merged.Count)"
