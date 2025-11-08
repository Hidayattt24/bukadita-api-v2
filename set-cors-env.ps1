# ============================================
# 🔧 Set CORS Environment Variables
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Set CORS URLs ke Vercel Production   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# CORS URLs untuk production
$ADMIN_URL = "https://admin.bukadita.id"
$USER_URL = "https://www.bukadita.id,https://bukadita.id"

Write-Host "📋 Environment Variables yang akan di-set:" -ForegroundColor Yellow
Write-Host "   ADMIN_URL = $ADMIN_URL" -ForegroundColor White
Write-Host "   USER_URL  = $USER_URL" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Lanjutkan? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "❌ Dibatalkan." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Setting ADMIN_URL..." -ForegroundColor Cyan
echo $ADMIN_URL | vercel env add ADMIN_URL production

Write-Host ""
Write-Host "🚀 Setting USER_URL..." -ForegroundColor Cyan
echo $USER_URL | vercel env add USER_URL production

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ CORS URLs berhasil di-set!        " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Langkah selanjutnya:" -ForegroundColor Yellow
Write-Host "   1. Redeploy dengan: vercel --prod" -ForegroundColor White
Write-Host "   2. Test CORS dari browser" -ForegroundColor White
Write-Host ""
