# Generates config/supabase-env.js from a root ".env" (SUPABASE_URL, SUPABASE_ANON_KEY,
# COLLECTION_OWNER or SUPABASE_OWNER).
# Usage (from repo root): powershell -ExecutionPolicy Bypass -File scripts/sync-supabase-env-from-dotenv.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$dotEnvFile = Join-Path $repoRoot ".env"
if (!(Test-Path -LiteralPath $dotEnvFile)) {
    Write-Error "File not found: $dotEnvFile - copy .env.example to .env first."
}

function Read-DotEnv {
    param([string]$LiteralPath)
    $dict = @{}
    Get-Content -LiteralPath $LiteralPath -Encoding UTF8 | ForEach-Object {
        $trim = ($_ -replace "`r", "").Trim()
        if ($trim -eq "" -or $trim.StartsWith("#")) { return }
        $idx = $trim.IndexOf("=")
        if ($idx -lt 1) { return }
        $key = $trim.Substring(0, $idx).Trim()
        $val = $trim.Substring($idx + 1).Trim()
        if ($val.StartsWith("`"") -and $val.EndsWith("`"") -and $val.Length -ge 2) {
            $val = $val.Substring(1, $val.Length - 2)
        } elseif ($val.StartsWith("'") -and $val.EndsWith("'") -and $val.Length -ge 2) {
            $val = $val.Substring(1, $val.Length - 2)
        }
        $dict[$key] = $val
    }
    return $dict
}

function Escape-JsString {
    param([string]$Str)
    if ($null -eq $Str) { return '""' }
    $escaped = $Str.Replace("\", "\\").Replace("`"", "\`"").Replace("`n", "\n").Replace("`r", "\r").Replace("`t", "\t")
    return '"' + $escaped + '"'
}

$m = Read-DotEnv -LiteralPath $dotEnvFile
$url = ([string]$m["SUPABASE_URL"]).Trim()
$key = ([string]$m["SUPABASE_ANON_KEY"]).Trim()
if ($key -eq "") { $key = ([string]$m["SUPABASE_PUBLISHABLE_KEY"]).Trim() }
$owner = ([string]$m["SUPABASE_OWNER"]).Trim()
if ($owner -eq "") { $owner = ([string]$m["COLLECTION_OWNER"]).Trim() }

if ($url -eq "") { Write-Warning ".env: SUPABASE_URL is empty." }
if ($key -eq "") { Write-Warning ".env: SUPABASE_ANON_KEY is empty." }
if ($owner -eq "") { Write-Warning ".env: SUPABASE_OWNER/COLLECTION_OWNER is empty." }

$hdr = "// AUTO-GENERATED from project .env - run scripts/sync-supabase-env-from-dotenv.ps1"
$stamp = "// " + [DateTime]::UtcNow.ToString("yyyy-MM-dd HH:mm:ss") + " UTC"
$body =
    "$hdr`r`n" +
    "$stamp`r`n" +
    "window.__SUPABASE_ENV__ = {`r`n" +
    "  SUPABASE_URL: $(Escape-JsString -Str $url),`r`n" +
    "  SUPABASE_ANON_KEY: $(Escape-JsString -Str $key),`r`n" +
    "  SUPABASE_OWNER: $(Escape-JsString -Str $owner)`r`n" +
    "};`r`n"

$outDir = Join-Path $repoRoot "config"
if (!(Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$outFile = Join-Path $outDir "supabase-env.js"
[System.IO.File]::WriteAllText($outFile, $body)
Write-Host "Wrote $outFile"

