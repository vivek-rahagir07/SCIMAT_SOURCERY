/**
 * Open Sourcery Arena — Firebase Realtime Database Engine
 * Pure Vanilla JavaScript (Non-Module, Zero-Dependency, 100% Reliable across http, https & file://)
 * Connected to Firebase Realtime Database (RTDB)
 */

(function (window) {
  'use strict';

  // Safely resolve client identifier
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

  const RTDB_BASE_URL = "https://open-sourcery-be41d-default-rtdb.asia-southeast1.firebasedatabase.app";

  const firebaseConfig = {
    apiKey: resolveApiKey(),
    authDomain: "open-sourcery-be41d.firebaseapp.com",
    databaseURL: RTDB_BASE_URL,
    projectId: "open-sourcery-be41d",
    storageBucket: "open-sourcery-be41d.firebasestorage.app",
    messagingSenderId: "404249962614",
    appId: "1:404249962614:web:f9d039fbb4755a206cd757"
  };

  window.firebaseConfig = firebaseConfig;

  /**
   * Sanitizes object keys so file paths (. and /) don't trigger Firebase 400 Bad Request
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

  // Direct REST API calls (instant, zero CDN dependencies)
  async function restPut(path, data) {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/${path}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (err) {
      console.debug('REST PUT notice:', err.message);
      return false;
    }
  }

  async function restGet(path) {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/${path}.json`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function restDelete(path) {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/${path}.json`, {
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

  // 1. Sync Active Repository
  window.syncRepoToCloud = async function(repo) {
    if (!repo || !repo.id) return;
    const safeData = sanitizeForFirebase(repo);
    safeData.updatedAt = Date.now();
    await restPut(`repositories/${repo.id}`, safeData);
    updateCloudIndicator('online', 'Cloud DB: Synced');
  };

  // 2. Sync Participant
  window.syncParticipantToCloud = async function(sessionId, participant) {
    if (!sessionId || !participant || !participant.id) return;
    const safeParticipant = sanitizeForFirebase({
      ...participant,
      lastActiveAt: Date.now()
    });
    await restPut(`sessions/${sessionId}/participants/${participant.id}`, safeParticipant);
    updateCloudIndicator('online', 'Cloud DB: Synced');
    // Refresh unified live leaderboard immediately
    window.refreshLiveLeaderboardNow();
  };

  // 3. Remove Participant
  window.removeParticipantFromCloud = async function(sessionId, participantId) {
    if (!sessionId || !participantId) return;
    await restDelete(`sessions/${sessionId}/participants/${participantId}`);
    window.refreshLiveLeaderboardNow();
  };

  // 3b. Wipe All Cloud Data for Session
  window.clearAllCloudData = async function(sessionId = 'session-demo') {
    try {
      await restDelete(`sessions/${sessionId}/participants`);
      await restDelete(`sessions/${sessionId}/leaderboard`);
      await restDelete(`sessions/${sessionId}/otps`);
      if (typeof window.refreshLiveLeaderboardNow === 'function') {
        window.refreshLiveLeaderboardNow(sessionId);
      }
    } catch (e) {
      console.warn('Firebase wipe error:', e);
    }
  };

  // 3c. Sync OTP to Cloud
  window.syncOtpToCloud = async function(sessionId, email, otp, name) {
    if (!sessionId || !email) return;
    const cleanKey = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await restPut(`sessions/${sessionId}/otps/${cleanKey}`, {
      email,
      name,
      otp,
      createdAt: Date.now()
    });
  };

  // 3d. Fetch Active Cloud OTPs for Admin
  window.fetchCloudOtps = async function(sessionId = 'session-demo') {
    try {
      const raw = await restGet(`sessions/${sessionId}/otps`);
      if (!raw || typeof raw !== 'object') return [];
      return Object.values(raw).filter(item => item && item.otp);
    } catch {
      return [];
    }
  };

  // 4. Sync Leaderboard
  window.syncLeaderboardToCloud = async function(sessionId, leaderboard) {
    if (!sessionId || !Array.isArray(leaderboard)) return;
    const safeLeaderboard = sanitizeForFirebase(leaderboard);
    await restPut(`sessions/${sessionId}/leaderboard`, safeLeaderboard);
  };

  // 5. Sync Session Metadata
  window.syncSessionToCloud = async function(session) {
    if (!session || !session.id) return;
    const safeSession = sanitizeForFirebase({
      ...session,
      updatedAt: Date.now()
    });
    await restPut(`sessions/${session.id}/info`, safeSession);
  };

  // 6. Primary Real-Time Leaderboard Fetch & Build
  // Fetches ALL participants across ALL laptops from sessions/session-demo/participants.json
  // Ranks them cleanly and updates the UI instantly
  window.refreshLiveLeaderboardNow = async function(sessionId = 'session-demo') {
    try {
      const rawParticipants = await restGet(`sessions/${sessionId}/participants`);
      if (!rawParticipants || typeof rawParticipants !== 'object') return;

      const cleanParts = desanitizeFromFirebase(rawParticipants);
      const rawList = Object.values(cleanParts).filter(p => p && p.name);

      if (rawList.length === 0) return;

      // Deduplicate participants by email / normalized name to completely eliminate duplicate entries
      const dedupeMap = new Map();
      rawList.forEach(p => {
        const dedupeKey = (p.email && p.email !== 'N/A' && p.email.includes('@'))
          ? p.email.trim().toLowerCase()
          : (p.name || '').trim().toLowerCase();

        if (!dedupeMap.has(dedupeKey)) {
          dedupeMap.set(dedupeKey, { ...p });
        } else {
          const existing = dedupeMap.get(dedupeKey);
          const higherXP = Math.max(existing.verifiedXP || 0, p.verifiedXP || 0);
          const mergedMissions = Array.from(new Set([
            ...(existing.completedMissions || []),
            ...(p.completedMissions || [])
          ]));
          const violations = Math.max(existing.focusViolations || 0, p.focusViolations || 0);
          const bestTimer = (typeof p.timerRemainingMs === 'number' && p.timerRemainingMs > 0 && p.timerRemainingMs < 15 * 60 * 1000)
            ? p.timerRemainingMs
            : existing.timerRemainingMs;

          dedupeMap.set(dedupeKey, {
            ...existing,
            ...p,
            id: existing.id || p.id,
            verifiedXP: higherXP,
            completedMissions: mergedMissions,
            focusViolations: violations,
            timerRemainingMs: bestTimer,
            isDisqualified: Boolean(existing.isDisqualified || p.isDisqualified),
            disqualifiedReason: existing.disqualifiedReason || p.disqualifiedReason || ''
          });
        }
      });

      const participantsList = Array.from(dedupeMap.values());

      // Hydrate all participants into local SessionStore so dossiers & tracking work
      participantsList.forEach(p => {
        if (typeof SessionStore !== 'undefined' && SessionStore.hydrateParticipant) {
          SessionStore.hydrateParticipant(sessionId, p);
        }
      });

      // Sort by verifiedXP descending
      participantsList.sort((a, b) => (b.verifiedXP || 0) - (a.verifiedXP || 0));

      const ranked = participantsList.map((p, idx) => ({
        rank: idx + 1,
        participantId: p.id,
        name: p.name,
        email: p.email || 'N/A',
        rollNumber: p.rollNumber || '',
        githubUsername: p.githubUsername || '',
        verifiedXP: p.verifiedXP || 0,
        completedCount: (p.completedMissions || []).length,
        completedMissions: p.completedMissions || [],
        focusViolations: p.focusViolations || 0,
        isDisqualified: Boolean(p.isDisqualified),
        disqualifiedReason: p.disqualifiedReason || '',
        isOnline: Boolean(p.isOnline),
        timerRemainingMs: p.timerRemainingMs,
        lastCompletedAt: p.lastActiveAt || Date.now(),
        registeredAt: p.registeredAt || Date.now()
      }));

      window._cachedCloudLeaderboard = ranked;

      // Update UI tables immediately
      if (typeof updateLeaderboardUI === 'function') {
        updateLeaderboardUI(ranked);
      }
      if (typeof updateContributorUI === 'function') {
        updateContributorUI();
      }

      // Also persist unified leaderboard to RTDB
      window.syncLeaderboardToCloud(sessionId, ranked);
      updateCloudIndicator('online', 'Cloud DB: Live Sync');
    } catch (err) {
      console.debug('Leaderboard refresh notice:', err);
    }
  };

  // 7. Continuous Polling Loop (Multiplayer Engine)
  let isPolling = false;

  window.pollCloudState = async function(sessionId = 'session-demo') {
    if (isPolling) return;
    isPolling = true;

    try {
      // 1. Refresh full live leaderboard from participants
      await window.refreshLiveLeaderboardNow(sessionId);

      // 2. Pull collaborative repository
      const activeRepoId = typeof SessionStore !== 'undefined' ? SessionStore.getActiveRepoId() : 'repo-college-website';
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
    } catch (err) {
      console.debug('Cloud poll notice:', err);
    } finally {
      isPolling = false;
    }
  };

  // 8. Pull all from cloud on demand
  window.pullAllFromCloud = async function(sessionId = 'session-demo') {
    await window.pollCloudState(sessionId);
  };

  // Auto-init on boot
  function initCloudEngine() {
    updateCloudIndicator('online', 'Cloud DB: Live Sync');

    // Run initial fetch immediately
    window.pollCloudState('session-demo');

    // Continuous 2-second live polling loop for real-time multiplayer updates
    setInterval(() => {
      window.pollCloudState('session-demo');
    }, 2000);

    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cloud-sync-ready'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCloudEngine);
  } else {
    initCloudEngine();
  }

})(typeof window !== 'undefined' ? window : this);
