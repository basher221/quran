$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$www = Join-Path $root "www"

if (Test-Path $www) {
  Remove-Item -Recurse -Force $www
}
New-Item -ItemType Directory -Path $www | Out-Null

$itemsToCopy = @(
  "index.html",
  "styles.css",
  "script.js",
  "service-worker.js",
  "manifest.webmanifest",
  "app-icon.svg",
  "google43c36c8998e04d90.html"
)

foreach ($item in $itemsToCopy) {
  $source = Join-Path $root $item
  if (Test-Path $source) {
    Copy-Item -Path $source -Destination $www -Force
  }
}

$offlineSource = Join-Path $root "offline-data"
$offlineTarget = Join-Path $www "offline-data"
if (Test-Path $offlineSource) {
  Copy-Item -Path $offlineSource -Destination $offlineTarget -Recurse -Force
}

$assetsSource = Join-Path $root "assets"
$assetsTarget = Join-Path $www "assets"
if (Test-Path $assetsSource) {
  Copy-Item -Path $assetsSource -Destination $assetsTarget -Recurse -Force
}

Write-Host "Mobile web assets are ready in: $www"
