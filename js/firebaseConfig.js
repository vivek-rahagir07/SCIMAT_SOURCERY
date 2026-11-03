/**
 * Open Sourcery Arena — Firebase Client SDK Configuration
 * Pure Vanilla JavaScript (ES Module)
 * Connected to Firebase Realtime Database (RTDB)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBcwrrQV9tMLRUc_k7p3KY76UzRhwDnquM",
  authDomain: "open-sourcery-be41d.firebaseapp.com",
  databaseURL: "https://open-sourcery-be41d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "open-sourcery-be41d",
  storageBucket: "open-sourcery-be41d.firebasestorage.app",
  messagingSenderId: "404249962614",
  appId: "1:404249962614:web:f9d039fbb4755a206cd757",
  measurementId: "G-6F0GB0CCHQ"
};

let app = null;
let analytics = null;
let rtdb = null;

try {
  app = initializeApp(firebaseConfig);
  rtdb = getDatabase(app);
  isAnalyticsSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
  console.log("⚡ Firebase Realtime Database initialized: " + firebaseConfig.databaseURL);
} catch (e) {
  console.warn("Firebase initialization notice (running offline/local):", e);
}

window.firebaseConfig = firebaseConfig;
window.firebaseApp = app;
window.firebaseRtdb = rtdb;

// Realtime Database synchronization for collaborative repositories
window.syncRepoToCloud = async function(repo) {
  if (!rtdb || !repo || !repo.id) return;
  try {
    const repoRef = ref(rtdb, `repositories/${repo.id}`);
    await set(repoRef, {
      ...repo,
      updatedAt: Date.now()
    });
  } catch (err) {
    // Falls back seamlessly to localStorage
    console.debug("Cloud sync fallback to local storage:", err.message);
  }
};

window.listenToCloudRepo = function(repoId, onUpdate) {
  if (!rtdb || !repoId) return () => {};
  try {
    const repoRef = ref(rtdb, `repositories/${repoId}`);
    return onValue(repoRef, (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.val());
      }
    });
  } catch (err) {
    return () => {};
  }
};

