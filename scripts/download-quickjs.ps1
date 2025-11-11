# Download QuickJS binary for Vercel deployment (Windows)
# This script downloads the official QuickJS binary from bellard.org

Write-Host "Downloading official QuickJS binary..." -ForegroundColor Cyan

# Create directory if it doesn't exist
$binDir = Join-Path $PSScriptRoot "..\api\_bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

# Download official QuickJS binary release
Write-Host "Fetching official QuickJS binary (2025-09-13)..." -ForegroundColor Yellow
$zipUrl = "https://bellard.org/quickjs/binary_releases/quickjs-linux-x86_64-2025-09-13.zip"
$zipPath = Join-Path $env:TEMP "quickjs.zip"

Write-Host "Download URL: $zipUrl" -ForegroundColor Gray
Write-Host "Download to: $zipPath" -ForegroundColor Gray

try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "Downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to download: $_" -ForegroundColor Red
    exit 1
}

# Verify download
if (-not (Test-Path $zipPath)) {
    Write-Host "Error: Downloaded file not found at $zipPath" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $zipPath).Length / 1MB
Write-Host "Downloaded file size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray

# Extract the ZIP file
Write-Host "Extracting package..." -ForegroundColor Yellow
$extractDir = Join-Path $env:TEMP "quickjs_extract"

# Remove old extract directory if it exists
if (Test-Path $extractDir) {
    Remove-Item -Path $extractDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $extractDir | Out-Null

try {
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
    Write-Host "Extracted successfully" -ForegroundColor Green
} catch {
    Write-Host "Extraction failed: $_" -ForegroundColor Red
    exit 1
}

# List extracted contents for debugging
Write-Host "Extracted contents:" -ForegroundColor Gray
Get-ChildItem -Path $extractDir -Recurse | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Gray }

# Copy the qjs binary
Write-Host "Copying qjs binary..." -ForegroundColor Yellow
$qjsSource = Join-Path $extractDir "quickjs-linux-x86_64-2025-09-13\qjs"

Write-Host "Looking for binary at: $qjsSource" -ForegroundColor Gray

if (Test-Path $qjsSource) {
    $qjsDest = Join-Path $binDir "qjs"
    Copy-Item -Path $qjsSource -Destination $qjsDest -Force
    Write-Host "Binary copied successfully" -ForegroundColor Green
} else {
    Write-Host "Could not find qjs binary at expected location" -ForegroundColor Red
    Write-Host "Expected: $qjsSource" -ForegroundColor Yellow
    
    # Try to find it anywhere in the extract directory
    Write-Host "Searching for qjs file..." -ForegroundColor Yellow
    $foundQjs = Get-ChildItem -Path $extractDir -Recurse -Filter "qjs" -File | Select-Object -First 1
    
    if ($foundQjs) {
        Write-Host "Found qjs at: $($foundQjs.FullName)" -ForegroundColor Yellow
        $qjsDest = Join-Path $binDir "qjs"
        Copy-Item -Path $foundQjs.FullName -Destination $qjsDest -Force
        Write-Host "Binary copied successfully" -ForegroundColor Green
    } else {
        Write-Host "Could not find qjs binary anywhere in the package" -ForegroundColor Red
        exit 1
    }
}

# Verify the destination file
$qjsDest = Join-Path $binDir "qjs"
if (Test-Path $qjsDest) {
    Write-Host ""
    Write-Host "QuickJS binary installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Binary info:" -ForegroundColor Cyan
    Get-Item $qjsDest | Format-List Name, Length, LastWriteTime
} else {
    Write-Host "Error: Binary was not copied to destination" -ForegroundColor Red
    exit 1
}

# Cleanup
Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item -Path $extractDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done! QuickJS is ready for YouTube downloads." -ForegroundColor Green
Write-Host "Location: api\_bin\qjs" -ForegroundColor Cyan
Write-Host "Next: Commit this file and deploy to Vercel" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: On Windows, the binary won't run locally (it's Linux-only)" -ForegroundColor Yellow
Write-Host "It will work when deployed to Vercel's Linux environment" -ForegroundColor Yellow
