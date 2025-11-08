# ============================================
# 🔧 Set Environment Variables to Vercel
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Set Environment Variables to Vercel  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is available
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI tidak ditemukan." -ForegroundColor Red
    Write-Host "   Install dengan: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ File .env tidak ditemukan." -ForegroundColor Red
    Write-Host "   Buat file .env terlebih dahulu dengan environment variables." -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Membaca environment variables dari .env..." -ForegroundColor Cyan
Write-Host ""

# Read .env file
$envVars = @{}
Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    # Skip comments and empty lines
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line.Split("=", 2)
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            $envVars[$key] = $value
        }
    }
}

Write-Host "✅ Ditemukan $($envVars.Count) environment variables:" -ForegroundColor Green
$envVars.Keys | ForEach-Object {
    $displayValue = $envVars[$_]
    # Mask sensitive values
    if ($_ -match "KEY|SECRET|PASSWORD|TOKEN") {
        $displayValue = "***" + $displayValue.Substring([Math]::Max(0, $displayValue.Length - 5))
    }
    Write-Host "   - $_ = $displayValue" -ForegroundColor Gray
}
Write-Host ""

Write-Host "⚠️  PENTING: Environment variables akan di-set untuk PRODUCTION" -ForegroundColor Yellow
Write-Host "   Pastikan values sudah benar sebelum melanjutkan!" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Lanjutkan set environment variables ke Vercel? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "❌ Dibatalkan." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Setting environment variables ke Vercel..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    
    Write-Host "Setting $key..." -NoNewline -ForegroundColor White
    
    try {
        # Set environment variable for production
        $result = vercel env add $key production --force 2>&1
        
        # Send the value via pipeline
        $value | vercel env add $key production --force 2>&1 | Out-Null
        
        Write-Host " ✅" -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Hasil: $successCount sukses, $failCount gagal" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "✅ Semua environment variables berhasil di-set!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Langkah selanjutnya:" -ForegroundColor Yellow
    Write-Host "   1. Deploy ke Vercel dengan: vercel --prod" -ForegroundColor White
    Write-Host "   2. Atau gunakan script: .\deploy.ps1" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️  Beberapa environment variables gagal di-set." -ForegroundColor Yellow
    Write-Host "   Silakan set manual di Vercel Dashboard." -ForegroundColor Yellow
    Write-Host ""
}
