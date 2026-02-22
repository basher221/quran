param(
  [switch]$DownloadAudio = $false,
  [string[]]$Reciters = @("Yasser_Ad-Dussary_128kbps", "MaherAlMuaiqly128kbps")
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$offlineDir = Join-Path $root "offline-data"
$audioDir = Join-Path $offlineDir "audio"
$quranFile = Join-Path $offlineDir "quran-uthmani.json"

if (!(Test-Path $offlineDir)) {
  New-Item -Path $offlineDir -ItemType Directory | Out-Null
}

Write-Host "Downloading local Quran text file..."
Invoke-WebRequest -Uri "https://api.alquran.cloud/v1/quran/quran-uthmani" -OutFile $quranFile
Write-Host "Saved: $quranFile"

if (-not $DownloadAudio) {
  Write-Host ""
  Write-Host "Audio was not downloaded."
  Write-Host "To download full offline recitation for the selected reciters, run:"
  Write-Host "  .\prepare-offline.ps1 -DownloadAudio"
  exit 0
}

if (!(Test-Path $audioDir)) {
  New-Item -Path $audioDir -ItemType Directory | Out-Null
}

# Number of ayat for each surah from 1 to 114.
$ayahCounts = @(
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
)

foreach ($reciter in $Reciters) {
  $reciterDir = Join-Path $audioDir $reciter
  if (!(Test-Path $reciterDir)) {
    New-Item -Path $reciterDir -ItemType Directory | Out-Null
  }

  Write-Host ""
  Write-Host "Downloading recitation files for: $reciter"
  Write-Host "This is large and may take many hours."

  for ($surah = 1; $surah -le 114; $surah++) {
    $s = "{0:D3}" -f $surah
    $count = $ayahCounts[$surah - 1]
    Write-Host "  Surah $surah / 114 ..."

    for ($ayah = 1; $ayah -le $count; $ayah++) {
      $a = "{0:D3}" -f $ayah
      $fileName = "$s$a.mp3"
      $targetFile = Join-Path $reciterDir $fileName

      if (Test-Path $targetFile) {
        continue
      }

      $url = "https://everyayah.com/data/$reciter/$fileName"
      try {
        Invoke-WebRequest -Uri $url -OutFile $targetFile
      } catch {
        Write-Warning "Failed: $url"
      }
    }
  }
}

Write-Host ""
Write-Host "Offline data is ready."
