# 🔥 دليل إعداد Firebase - Firebase Setup Guide

## بالعربية (Arabic)

### الخطوة 1: إنشاء مشروع Firebase
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اضغط على **"Add project"** (إضافة مشروع)
3. أدخل اسم المشروع (مثلاً: "7rofjoud")
4. اتبع الخطوات لإكمال الإنشاء

### الخطوة 2: تفعيل Realtime Database
1. في لوحة التحكم، اضغط على **"Realtime Database"** من القائمة اليسرى
2. اضغط **"Create Database"**
3. اختر موقعاً قريباً (مثلاً: `us-central1`)
4. اختر **"Start in test mode"** (للتجربة)
5. اضغط **"Enable"**

### الخطوة 3: الحصول على مفاتيح التطبيق
1. اضغط على أيقونة الإعدادات ⚙️ بجانب "Project Overview"
2. اضغط **"Project settings"**
3. انتقل إلى قسم **"Your apps"** في الأسفل
4. اضغط على أيقونة الويب `</>` لإضافة تطبيق ويب
5. أدخل اسماً للتطبيق (مثلاً: "Hex Game")
6. اضغط **"Register app"**
7. **انسخ الكود** الذي يظهر - سيبدو هكذا:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### الخطوة 4: تحديث ملف `src/firebase.ts`
افتح ملف `src/firebase.ts` واستبدل القيم المثال بالقيم الحقيقية من Firebase.

---

## In English

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter a project name (e.g., "7rofjoud")
4. Follow the prompts to complete setup

### Step 2: Enable Realtime Database
1. In dashboard, click **"Realtime Database"** from left menu
2. Click **"Create Database"**
3. Choose a location (e.g., `us-central1`)
4. Select **"Start in test mode"** (for testing)
5. Click **"Enable"**

### Step 3: Get Your Web App Config
1. Click the settings gear ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Scroll to **"Your apps"** section
4. Click the web icon `</>` to add a web app
5. Enter app nickname (e.g., "Hex Game")
6. Click **"Register app"**
7. **Copy the config code** that appears - it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 4: Update `src/firebase.ts`
Open `src/firebase.ts` and replace the placeholder values with your actual Firebase values.

### Step 5: Set Database Rules (Optional but Recommended)
1. Go to **Realtime Database** > **Rules** tab
2. For testing, use:

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

3. Click **"Publish"**

---

## ✅ After Setup

1. Run `npm run dev`
2. Open browser console (F12)
3. If you see a Firebase error, double-check your config keys
4. Try creating a room - multiplayer should work!

## 🆘 Need Help?

- Make sure Realtime Database (not Firestore) is enabled
- Verify `databaseURL` includes `-default-rtdb.firebaseio.com`
- Check browser console for specific errors
