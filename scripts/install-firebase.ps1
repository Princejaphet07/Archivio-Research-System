# PowerShell Script to Install Firebase in All Projects
Write-Host "🔥 Installing Firebase in all ARCHIVIO projects..." -ForegroundColor Cyan

# Set execution policy for this session
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$projects = @(
    "research-adviser-system",
    "dean-system",
    "system-administrator",
    "public-archive",
    "."
)

$projectNames = @(
    "Research Adviser System",
    "Dean System",
    "System Administrator",
    "Public Archive",
    "Student System"
)

for ($i = 0; $i -lt $projects.Length; $i++) {
    $project = $projects[$i]
    $name = $projectNames[$i]
    
    Write-Host "`n📦 Installing Firebase in $name..." -ForegroundColor Yellow
    
    if ($project -eq ".") {
        npm install firebase
    } else {
        Set-Location $project
        npm install firebase
        Set-Location ..
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $name - Firebase installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ $name - Installation failed!" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Firebase installation complete for all projects!" -ForegroundColor Green
Write-Host "📖 Next: Read FIREBASE_SETUP.md for configuration instructions" -ForegroundColor Cyan
