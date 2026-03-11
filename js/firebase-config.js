// =========================================
// Firebase Configuration — READ-ONLY
// Replace placeholder values with your
// actual Firebase project credentials from
// https://console.firebase.google.com
// =========================================
// Firebase Frontend Config — READ ONLY
// Replace YOUR_API_KEY and YOUR_APP_ID with
// values from: Firebase Console → Project Settings → Your Apps
// =========================================

// Firebase SDK v9 (modular) via CDN is loaded in HTML.
// This file exports the initialized app, db, etc.

const firebaseConfig = {
  apiKey: "AIzaSyAAX9G-v5uihSc8PF_Zawf0918LMpYl-y4",
  authDomain: "rrpv-papers.firebaseapp.com",
  projectId: "rrpv-papers",
  storageBucket: "rrpv-papers.firebasestorage.app",
  messagingSenderId: "776353043697",
  appId: "1:776353043697:web:f35c66ed2f56dfe4568550",
  measurementId: "G-FGN7GS7E78"
};

// Initialize Firebase (compat SDK loaded globally via CDN)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Optional: Enable offline persistence for faster repeat visits
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

// Export for use in other scripts
window.RGPV = window.RGPV || {};
window.RGPV.db = db;
