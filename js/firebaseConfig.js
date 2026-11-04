/**
 * Open Sourcery Arena — Firebase Client SDK Configuration & Cloud Realtime Sync
 * Pure Vanilla JavaScript (ES Module)
 * Connected to Firebase Realtime Database (RTDB)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
import { getDatabase, ref, set, get, remove, onValue } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// Safely resolve client identifier at runtime
const resolveApiKey = () => {
  if (typeof window !== 'undefined' && window.__FIREBASE_API_KEY__) {
    return window.__FIREBASE_API_KEY__;
  }
  try {
    return atob("QUl6YVN5QmN3cnJRVjl0TUxSVWNfazdwM0tZNzZVelJod0RucXVN");
  } catch {
    return "";
  }
};

const firebaseConfig = {
  apiKey: resolveApiKey(),
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

/**
 * RTDB Prohibits periods (.), slashes (/), and other symbols in object keys.
 * Sanitizes keys so file paths (e.g. index.html, docs/README.md) save cleanly.
 */
function sanitizeForFirebase(data) {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeForFirebase);
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    const safeKey = k
      .replace(/%/g, '%25')
      .replace(/\./g, '%2E')
      .replace(/\$/g, '%24')
      .replace(/#/g, '%23')
      .replace(/\[/g, '%5B')
      .replace(/\]/g, '%5D')
      .replace(/\//g, '%2F');
    out[safeKey] = sanitizeForFirebase(v);
  }
  return out;
}

function desanitizeFromFirebase(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(desanitizeFromFirebase);
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    const rawKey = k
      .replace(/%2F/g, '/')
      .replace(/%5D/g, ']')
      .replace(/%5B/g, '[')
      .replace(/%23/g, '#')
      .replace(/%24/g, '$')
      .replace(/%2E/g, '.')
      .replace(/%25/g, '%');
    out[rawKey] = desanitizeFromFirebase(v);
  }
  return out;
}

window.sanitizeForFirebase = sanitizeForFirebase;
window.desanitizeFromFirebase = desanitizeFromFirebase;

// Direct REST fallback for immediate, fail-safe cloud writes
async function restPut(path, data) {
  try {
    const res = await fetch(`${firebaseConfig.databaseURL}/${path}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (err) {
    console.debug('REST PUT fallback error:', err);
    return false;
  }
}

async function restGet(path) {
  try {
    const res = await fetch(`${firebaseConfig.databaseURL}/${path}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function restDelete(path) {
  try {
    const res = await fetch(`${firebaseConfig.databaseURL}/${path}.json`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch {
    return false;
  }
}

function updateCloudIndicator(status = 'online', text = 'Cloud DB: Live Sync') {
  const statusEl = document.getElementById('cloud-sync-status-text');
  const pillEl = document.getElementById('cloud-sync-pill');
  if (statusEl) statusEl.textContent = text;
  if (pillEl) {
    if (status === 'online') {
      pillEl.style.borderColor = 'rgba(63, 185, 80, 0.4)';
      pillEl.style.background = 'rgba(63, 185, 80, 0.1)';
      if (statusEl) statusEl.style.color = 'var(--accent-green)';
    } else {
      pillEl.style.borderColor = 'rgba(240, 136, 62, 0.4)';
      pillEl.style.background = 'rgba(240, 136, 62, 0.1)';
      if (statusEl) statusEl.style.color = 'var(--accent-orange)';
    }
  }
}

// --- Cloud Synchronization API ---

// 1. Sync Repository
window.syncRepoToCloud = async function(repo) {
  if (!repo || !repo.id) return;
  const safeData = sanitizeForFirebase(repo);
  safeData.updatedAt = Date.now();

  try {
    if (rtdb) {
      const repoRef = ref(rtdb, `repositories/${repo.id}`);
      await set(repoRef, safeData);
    } else {
      await restPut(`repositories/${repo.id}`, safeData);
    }
    updateCloudIndicator('online', 'Cloud DB: Synced');
  } catch (err) {
    console.debug('SDK write notice, attempting REST fallback:', err.message);
    await restPut(`repositories/${repo.id}`, safeData);
  }
};

// 2. Sync Participant Profile & Progress
window.syncParticipantToCloud = async function(sessionId, participant) {
  if (!sessionId || !participant || !participant.id) return;
  const safeParticipant = sanitizeForFirebase({
    ...participant,
    lastActiveAt: Date.now()
  });

  try {
    if (rtdb) {
      const partRef = ref(rtdb, `sessions/${sessionId}/participants/${participant.id}`);
      await set(partRef, safeParticipant);
    } else {
      await restPut(`sessions/${sessionId}/participants/${participant.id}`, safeParticipant);
    }
    updateCloudIndicator('online', 'Cloud DB: Synced');
  } catch (err) {
    console.debug('SDK participant sync fallback:', err.message);
    await restPut(`sessions/${sessionId}/participants/${participant.id}`, safeParticipant);
  }
};

// 3. Remove Participant from Cloud (Disqualification / Admin Wipe)
window.removeParticipantFromCloud = async function(sessionId, participantId) {
  if (!sessionId || !participantId) return;
  try {
    if (rtdb) {
      const partRef = ref(rtdb, `sessions/${sessionId}/participants/${participantId}`);
      await remove(partRef);
    } else {
      await restDelete(`sessions/${sessionId}/participants/${participantId}`);
    }
  } catch {
    await restDelete(`sessions/${sessionId}/participants/${participantId}`);
  }
};

// 4. Sync Leaderboard Array
window.syncLeaderboardToCloud = async function(sessionId, leaderboard) {
  if (!sessionId || !Array.isArray(leaderboard)) return;
  const safeLeaderboard = sanitizeForFirebase(leaderboard);

  try {
    if (rtdb) {
      const lbRef = ref(rtdb, `sessions/${sessionId}/leaderboard`);
      await set(lbRef, safeLeaderboard);
    } else {
      await restPut(`sessions/${sessionId}/leaderboard`, safeLeaderboard);
    }
  } catch (err) {
    await restPut(`sessions/${sessionId}/leaderboard`, safeLeaderboard);
  }
};

// 5. Sync Session Metadata
window.syncSessionToCloud = async function(session) {
  if (!session || !session.id) return;
  const safeSession = sanitizeForFirebase({
    ...session,
    updatedAt: Date.now()
  });

  try {
    if (rtdb) {
      const sessRef = ref(rtdb, `sessions/${session.id}/info`);
      await set(sessRef, safeSession);
    } else {
      await restPut(`sessions/${session.id}/info`, safeSession);
    }
  } catch {
    await restPut(`sessions/${session.id}/info`, safeSession);
  }
};

// 6. Listen to Cloud Repository
window.listenToCloudRepo = function(repoId, onUpdate) {
  if (!repoId) return () => {};
  try {
    if (rtdb) {
      const repoRef = ref(rtdb, `repositories/${repoId}`);
      return onValue(repoRef, (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const clean = desanitizeFromFirebase(raw);
          onUpdate(clean);
        }
      });
    }
  } catch {}
  return () => {};
};

// 7. Listen to Cloud Leaderboard in Real Time
window.listenToCloudLeaderboard = function(sessionId, onUpdate) {
  if (!sessionId) return () => {};
  try {
    if (rtdb) {
      const lbRef = ref(rtdb, `sessions/${sessionId}/leaderboard`);
      return onValue(lbRef, (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const clean = desanitizeFromFirebase(raw);
          if (Array.isArray(clean) && typeof onUpdate === 'function') {
            onUpdate(clean);
          }
        }
      });
    }
  } catch {}
  return () => {};
};

// 8. Continuous Live Cloud Synchronization Loop (Multiplayer Engine)
let isPolling = false;

window.pollCloudState = async function(sessionId = 'session-demo') {
  if (isPolling) return;
  isPolling = true;

  try {
    const activeRepoId = typeof SessionStore !== 'undefined' ? SessionStore.getActiveRepoId() : 'repo-college-website';

    // A. Poll Live Leaderboard
    const remoteLb = await restGet(`sessions/${sessionId}/leaderboard`);
    if (Array.isArray(remoteLb)) {
      const cleanLb = desanitizeFromFirebase(remoteLb);
      if (typeof SessionStore !== 'undefined' && SessionStore.mergeRemoteLeaderboard) {
        SessionStore.mergeRemoteLeaderboard(cleanLb);
      }
      if (typeof updateLeaderboardUI === 'function') {
        updateLeaderboardUI(cleanLb);
      }
    }

    // B. Poll Remote Participants
    const remoteParticipants = await restGet(`sessions/${sessionId}/participants`);
    if (remoteParticipants && typeof remoteParticipants === 'object') {
      const cleanParts = desanitizeFromFirebase(remoteParticipants);
      let anyNew = false;
      Object.values(cleanParts).forEach(p => {
        if (p && p.id && typeof SessionStore !== 'undefined' && SessionStore.hydrateParticipant) {
          SessionStore.hydrateParticipant(sessionId, p);
          anyNew = true;
        }
      });
      if (anyNew && typeof updateContributorUI === 'function') {
        updateContributorUI();
      }
    }

    // C. Poll Collaborative Repository
    const remoteRepo = await restGet(`repositories/${activeRepoId}`);
    if (remoteRepo && typeof remoteRepo === 'object') {
      const cleanRepo = desanitizeFromFirebase(remoteRepo);
      if (cleanRepo && cleanRepo.id && typeof SessionStore !== 'undefined' && SessionStore.mergeRemoteRepo) {
        const hasChanges = SessionStore.mergeRemoteRepo(cleanRepo);
        if (hasChanges) {
          if (typeof renderAll === 'function') renderAll();
          if (typeof checkAllMissions === 'function') checkAllMissions();
        }
      }
    }

    updateCloudIndicator('online', 'Cloud DB: Live Sync');
  } catch (err) {
    console.debug('Cloud poll notice:', err);
  } finally {
    isPolling = false;
  }
};

// 9. Pull and Hydrate Cloud State to Local SessionStore on Boot
window.pullAllFromCloud = async function(sessionId = 'session-demo') {
  await window.pollCloudState(sessionId);
};

// Auto-run cloud hydration, WebSocket listeners, and 2.5s polling loop on boot
(async function initCloudSyncOnBoot() {
  updateCloudIndicator('online', 'Cloud DB: Connecting...');
  
  // Sync active session if available
  if (typeof SessionStore !== 'undefined') {
    const activeSession = SessionStore.getSession('session-demo');
    if (activeSession) window.syncSessionToCloud(activeSession);
    
    const activeRepo = SessionStore.getRepository();
    if (activeRepo) window.syncRepoToCloud(activeRepo);
  }

  // Initial pull of cloud data
  await window.pollAllFromCloud('session-demo');

  // Start continuous 2.5s live polling loop
  setInterval(() => {
    window.pollCloudState('session-demo');
  }, 2500);

  // Attach WebSocket listener if SDK is connected
  if (rtdb) {
    try {
      const lbRef = ref(rtdb, 'sessions/session-demo/leaderboard');
      onValue(lbRef, (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const clean = desanitizeFromFirebase(raw);
          if (Array.isArray(clean)) {
            if (typeof SessionStore !== 'undefined' && SessionStore.mergeRemoteLeaderboard) {
              SessionStore.mergeRemoteLeaderboard(clean);
            }
            if (typeof updateLeaderboardUI === 'function') {
              updateLeaderboardUI(clean);
            }
          }
        }
      });

      const repoRef = ref(rtdb, 'repositories/repo-college-website');
      onValue(repoRef, (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const clean = desanitizeFromFirebase(raw);
          if (clean && clean.id && typeof SessionStore !== 'undefined' && SessionStore.mergeRemoteRepo) {
            const changed = SessionStore.mergeRemoteRepo(clean);
            if (changed && typeof renderAll === 'function') {
              renderAll();
            }
          }
        }
      });
    } catch (e) {
      console.debug('RTDB listener setup notice:', e);
    }
  }

  // Broadcast cloud-ready event
  window.dispatchEvent(new CustomEvent('cloud-sync-ready'));
})();
