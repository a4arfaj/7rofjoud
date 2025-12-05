import { initializeApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

// ============================================
// 🔥 FIREBASE CONFIGURATION - إعداد Firebase
// ============================================
// To get your Firebase config values:
// للحصول على قيم إعداد Firebase:
//
// 1. Go to: https://console.firebase.google.com/
//    اذهب إلى: https://console.firebase.google.com/
//
// 2. Create/Select project → Enable "Realtime Database"
//    أنشئ/اختر مشروع → فعّل "Realtime Database"
//
// 3. Project Settings ⚙️ → Your apps → Add web app → Copy config
//    إعدادات المشروع ⚙️ → تطبيقاتك → أضف تطبيق ويب → انسخ الإعدادات
//
// 4. Paste your values below ↓
//    الصق قيمك أدناه ↓
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyDNdrGIPOVWwjGY_AntRjzfdatAUz6xR3c",
  authDomain: "rofjoud.firebaseapp.com",
  databaseURL: "https://rofjoud-default-rtdb.firebaseio.com", // ⚠️ Get this from Realtime Database settings
  projectId: "rofjoud",
  storageBucket: "rofjoud.firebasestorage.app",
  messagingSenderId: "162791939054",
  appId: "1:162791939054:web:c0d80ff779638401d7ccff"
};

// Firebase configuration check removed - Firebase is configured and working!

// Initialize Firebase
let app;
let db: Database;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  console.log("✅ Firebase initialized successfully");
  console.log("✅ Database URL:", firebaseConfig.databaseURL);
  console.log("✅ Multiplayer is ready!");
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  throw error;
}

export { db };
