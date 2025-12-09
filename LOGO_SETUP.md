# Logo Image Setup

## To add your logo:

1. **Save your logo image** to the `public` folder in your project
2. **Name it**: `logo.png` (or `logo.jpg`, `logo.svg`, etc.)
3. The code is already set up to use `/logo.png`

### Supported formats:
- PNG (`.png`) - Recommended for logos with transparency
- JPG (`.jpg`) - Good for photos
- SVG (`.svg`) - Best for scalable graphics
- WEBP (`.webp`) - Modern, efficient format

### File location:
```
7rofjoud/
  └── public/
      └── logo.png  ← Put your image here
```

### After adding the image:
- If it's not named `logo.png`, update `src/components/Lobby.tsx` line 42 to match your filename
- Example: If your file is `logo.jpg`, change `src="/logo.png"` to `src="/logo.jpg"`

The logo will automatically appear in the lobby screen!


