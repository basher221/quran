$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "Starting local server at http://localhost:5500"

if (Get-Command py -ErrorAction SilentlyContinue) {
  py -m http.server 5500
  exit
}

if (Get-Command python -ErrorAction SilentlyContinue) {
  python -m http.server 5500
  exit
}

Write-Host "Python is not installed. Use Live Server in VS Code/Cursor."
