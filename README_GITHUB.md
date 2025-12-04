# How to Push to GitHub - Step by Step

## Your Project Location
```
C:\Users\a4arf\OneDrive\Documents\7rofjoud
```

## Step 1: Create Repository on GitHub

1. Open your web browser
2. Go to: **https://github.com/new**
3. Sign in to GitHub (if not already signed in)
4. Fill in:
   - **Repository name**: `arabic-hex-game` (or any name you like)
   - Choose **Public** or **Private**
   - **IMPORTANT**: Do NOT check any boxes (no README, no .gitignore, no license)
5. Click **"Create repository"** button

## Step 2: Copy Your Repository URL

After creating the repository, GitHub will show you a page with commands.
Look for a URL like this:
```
https://github.com/YOUR_USERNAME/arabic-hex-game.git
```
Copy this URL or note down your GitHub username and repository name.

## Step 3: Open Terminal in Your Project Folder

**Option A - In VS Code/Cursor:**
- Press `Ctrl + ~` (or go to Terminal → New Terminal)
- Terminal will open in your project folder automatically

**Option B - In File Explorer:**
- Navigate to: `C:\Users\a4arf\OneDrive\Documents\7rofjoud`
- Right-click in an empty space
- Select "Open in Terminal" or "Open PowerShell window here"

**Option C - Windows Search:**
- Press Windows key
- Type "PowerShell" or "Terminal"
- Open it
- Type: `cd C:\Users\a4arf\OneDrive\Documents\7rofjoud`
- Press Enter

## Step 4: Run These Commands

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
git remote add origin https://github.com/YOUR_USERNAME/arabic-hex-game.git
git branch -M main
git push -u origin main
```

**Example:** If your username is `john123`, the first command would be:
```bash
git remote add origin https://github.com/john123/arabic-hex-game.git
```

## Step 5: Authenticate (if asked)

If GitHub asks for authentication:
- It may open a browser window
- Sign in and authorize
- Or you might need to use a Personal Access Token

## Done!

After pushing, your repository will be at:
```
https://github.com/YOUR_USERNAME/arabic-hex-game
```

## Need Help?

If you get an error, make sure:
- ✅ Repository exists on GitHub
- ✅ You typed the correct username and repository name
- ✅ You're signed in to GitHub

