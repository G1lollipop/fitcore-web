$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:npm_config_https_proxy = "http://127.0.0.1:7890"

$supabaseDir = "$PSScriptRoot\..\node_modules\supabase"
$postinstallScript = "$supabaseDir\scripts\postinstall.js"

if (Test-Path $postinstallScript) {
    Push-Location $supabaseDir
    try {
        node scripts/postinstall.js
        Write-Host "Supabase CLI installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install Supabase CLI: $_" -ForegroundColor Red
        exit 1
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Supabase package not found. Run 'npm install supabase --save-dev --ignore-scripts' first." -ForegroundColor Yellow
}
