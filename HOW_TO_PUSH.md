# How to Push Your Code to GitHub

## Step 1: Create Repository on GitHub

1. Go to: https://github.com/new
2. **Repository name**: `arabic-hex-game` (or any name you prefer)
3. Choose **Public** or **Private**
4. **Important**: Do NOT check any boxes (no README, no .gitignore, no license)
5. Click **"Create repository"**

## Step 2: Copy Your Repository URL

After creating, GitHub will show you a URL like:
```
https://github.com/YOUR_USERNAME/arabic-hex-game.git
```

## Step 3: Push Your Code

Open your terminal in this folder and run these commands (replace YOUR_USERNAME with your GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/arabic-hex-game.git
git branch -M main
git push -u origin main
```

That's it! Your code will be pushed to GitHub.

## Your Repository Link

After pushing, your repository will be available at:
```
https://github.com/YOUR_USERNAME/arabic-hex-game
```


