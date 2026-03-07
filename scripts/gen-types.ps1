$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:npm_config_https_proxy = "http://127.0.0.1:7890"

$output = & .\node_modules\supabase\bin\supabase.exe gen types --linked --lang=typescript 2>&1

$lines = $output -split "`n"
$filteredLines = $lines | Where-Object { $_ -match "^export" -or $_ -match "^type" -or $_ -match "^public" -or $_ -match "^  " }

$cleanOutput = $filteredLines -join "`n"
[System.IO.File]::WriteAllText("$PSScriptRoot\..\lib\database.types.ts", $cleanOutput, [System.Text.Encoding]::UTF8)

Write-Host "Types generated successfully to lib/database.types.ts"
