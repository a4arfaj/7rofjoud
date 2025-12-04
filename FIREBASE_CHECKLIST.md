# ✅ Firebase Setup Checklist - قائمة إعداد Firebase

## Quick Steps - خطوات سريعة

- [ ] **Step 1**: Go to https://console.firebase.google.com/
- [ ] **Step 2**: Click "Add project" / اضغط "إضافة مشروع"
- [ ] **Step 3**: Enter project name: `7rofjoud` (or any name)
- [ ] **Step 4**: Click "Realtime Database" from left menu
- [ ] **Step 5**: Click "Create Database"
- [ ] **Step 6**: Choose location (e.g., `us-central1`)
- [ ] **Step 7**: Select "Start in test mode"
- [ ] **Step 8**: Click gear icon ⚙️ → "Project settings"
- [ ] **Step 9**: Scroll down → Click web icon `</>` → "Register app"
- [ ] **Step 10**: Copy the config code
- [ ] **Step 11**: Paste into `src/firebase.ts`

## What Your Config Should Look Like

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",  // ← This should start with "AIza"
  authDomain: "something.firebaseapp.com",
  databaseURL: "https://something-default-rtdb.firebaseio.com",
  projectId: "something",
  storageBucket: "something.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## After Setup

1. Open `src/firebase.ts`
2. Replace ALL placeholder values with your real values
3. Save the file
4. Run `npm run dev`
5. Test by creating a room!

---

**Need help? Check FIREBASE_SETUP.md for detailed instructions!**

