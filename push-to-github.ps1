# GitHub Repository Setup and Push Script
# This script will help you push your code to GitHub

Write-Host "=== Arabic Hex Game - GitHub Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if repository name is provided
$repoName = "arabic-hex-game"
Write-Host "Repository name: $repoName" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check if remote already exists
$remoteExists = git remote get-url origin 2>$null
if ($remoteExists) {
    Write-Host "Remote 'origin' already exists: $remoteExists" -ForegroundColor Yellow
    Write-Host "Do you want to update it? (y/n): " -NoNewline
    $update = Read-Host
    if ($update -eq "y") {
        git remote remove origin
    } else {
        Write-Host "Keeping existing remote." -ForegroundColor Green
        Write-Host "Run: git push -u origin main" -ForegroundColor Cyan
        exit
    }
}

Write-Host ""
Write-Host "Please follow these steps:" -ForegroundColor Cyan
Write-Host "1. Go to: https://github.com/new" -ForegroundColor White
Write-Host "2. Repository name: $repoName" -ForegroundColor White
Write-Host "3. Choose Public or Private" -ForegroundColor White
Write-Host "4. DO NOT check 'Add README' or 'Add .gitignore' (we already have them)" -ForegroundColor White
Write-Host "5. Click 'Create repository'" -ForegroundColor White
Write-Host ""
Write-Host "After creating the repository, enter your GitHub username:" -ForegroundColor Yellow
$githubUsername = Read-Host "GitHub Username"

if ([string]::IsNullOrWhiteSpace($githubUsername)) {
    Write-Host "Username is required. Exiting." -ForegroundColor Red
    exit
}

$repoUrl = "https://github.com/$githubUsername/$repoName.git"

Write-Host ""
Write-Host "Setting up remote and pushing..." -ForegroundColor Cyan
Write-Host "Repository URL: $repoUrl" -ForegroundColor Yellow
Write-Host ""

# Add remote
git remote add origin $repoUrl

# Rename branch to main if needed
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    git branch -M main
    Write-Host "Renamed branch to 'main'" -ForegroundColor Green
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Success! ===" -ForegroundColor Green
    Write-Host "Your repository is now available at:" -ForegroundColor Cyan
    Write-Host "https://github.com/$githubUsername/$repoName" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "=== Push failed ===" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. Repository exists at: $repoUrl" -ForegroundColor White
    Write-Host "2. You have push access" -ForegroundColor White
    Write-Host "3. Your GitHub credentials are configured" -ForegroundColor White
    Write-Host ""
    Write-Host "You may need to authenticate. Try:" -ForegroundColor Cyan
    Write-Host "git push -u origin main" -ForegroundColor White
}

