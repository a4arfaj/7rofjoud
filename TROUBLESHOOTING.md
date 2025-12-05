# 🔧 Troubleshooting: Firebase Not Syncing

## Quick Checklist

### ✅ Step 1: Check Browser Console
1. Open your app: `npm run dev`
2. Press **F12** to open browser console
3. Look for these messages:
   - ✅ "Firebase initialized successfully" = Firebase is connected
   - ❌ Any red errors = Problem found

### ✅ Step 2: Verify Database Rules
1. Go to: https://console.firebase.google.com/
2. Select your project "rofjoud"
3. Click **"Realtime Database"** → **"Rules"** tab
4. Make sure rules look like this:

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true
    }
  }
}
```

5. Click **"Publish"**

### ✅ Step 3: Test Database Connection
1. In Firebase Console → Realtime Database → **"Data"** tab
2. Create a room in your app
3. You should see data appear in Firebase Console like:
   ```
   rooms
     └── 1234
         ├── grid: [...]
         ├── winner: null
         └── createdAt: ...
   ```

### ✅ Step 4: Check Database URL
1. In Firebase Console → Realtime Database
2. At the top, you'll see a URL like:
   ```
   https://rofjoud-default-rtdb.firebaseio.com
   ```
3. Verify this matches `src/firebase.ts` line 26:
   ```typescript
   databaseURL: "https://rofjoud-default-rtdb.firebaseio.com"
   ```
   (Should NOT have trailing slash `/`)

### ✅ Step 5: Common Errors

#### Error: "Permission denied"
- **Fix**: Check database rules (Step 2)

#### Error: "Failed to get document"
- **Fix**: Make sure Realtime Database (not Firestore) is enabled

#### Error: Database URL mismatch
- **Fix**: Copy exact URL from Firebase Console → Realtime Database

#### No errors but still not syncing
- Check console logs - you should see:
  - "Setting up Firebase sync for room: XXXX"
  - "Firebase data received: ..."
  - "Updating grid from Firebase"

## Test Steps

1. Open app in **two different browser windows/tabs**
2. In Window 1: Create a room
3. Check console: Should see "Room created successfully"
4. In Window 2: Enter the same room number
5. Check console: Should see "Synced grid from Firebase"
6. Click a cell in Window 1
7. Window 2 should update automatically

## Still Not Working?

Share these from browser console:
- All error messages (red text)
- All console.log messages starting with "Firebase"
- Screenshot of Firebase Console → Realtime Database → Rules tab

