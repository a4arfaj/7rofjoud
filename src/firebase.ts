import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Firebase configuration
// See FIREBASE_EXPLANATION.md for detailed setup instructions
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

// Check if Firebase is configured
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
  console.error("⚠️ Firebase is NOT configured!");
  console.error("📖 See FIREBASE_EXPLANATION.md for step-by-step instructions");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
