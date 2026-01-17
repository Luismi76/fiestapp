# Script para configurar el archivo .env del backend
# Ejecutar: .\setup-env.ps1

$envContent = @"
NODE_ENV=development
DATABASE_URL=postgresql://postgres:@Habita76@192.168.1.38:5432/fiestapp_dev?schema=public
JWT_SECRET=dev-secret-key-change-in-production-12345
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
PORT=3001
"@

# Crear archivo .env
$envContent | Out-File -FilePath "backend\.env" -Encoding ASCII -NoNewline

Write-Host "✅ Archivo .env creado correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "Contenido del archivo:" -ForegroundColor Cyan
Get-Content "backend\.env"
Write-Host ""
Write-Host "Ahora ejecuta:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npx prisma generate" -ForegroundColor White
Write-Host "  npx prisma db push" -ForegroundColor White
