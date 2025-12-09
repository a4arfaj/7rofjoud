@echo off
echo ========================================
echo Push to GitHub - Arabic Hex Game
echo ========================================
echo.
echo Step 1: Create repository at https://github.com/new
echo         (Don't add README or .gitignore)
echo.
echo Step 2: Enter your GitHub username:
set /p GITHUB_USERNAME="GitHub Username: "
echo.
echo Step 3: Enter your repository name (or press Enter for 'arabic-hex-game'):
set /p REPO_NAME="Repository Name: "
if "%REPO_NAME%"=="" set REPO_NAME=arabic-hex-game
echo.
echo Setting up and pushing to: https://github.com/%GITHUB_USERNAME%/%REPO_NAME%.git
echo.
git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USERNAME%/%REPO_NAME%.git
git branch -M main
git push -u origin main
echo.
echo ========================================
echo Done! Your repository is at:
echo https://github.com/%GITHUB_USERNAME%/%REPO_NAME%
echo ========================================
pause


