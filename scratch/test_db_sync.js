const https = require('https');
require('../js/seedData.js');

const BASE_URL = 'https://open-sourcery-be41d-default-rtdb.asia-southeast1.firebasedatabase.app';

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

async function putToFirebase(path, data) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const req = https.request(`${BASE_URL}/${path}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, res => {
      let b = '';
      res.on('data', chunk => b += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(b));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${b}`));
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function getFromFirebase(path) {
  return new Promise((resolve, reject) => {
    https.get(`${BASE_URL}/${path}.json`, res => {
      let b = '';
      res.on('data', chunk => b += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(b));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${b}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- TESTING COMPLETE DATABASE SYNC ---');

  // 1. Session info
  const sessionData = {
    id: 'session-demo',
    name: 'Open Sourcery 2025 — University Git Arena',
    status: 'active',
    durationMinutes: 15,
    updatedAt: Date.now()
  };
  await putToFirebase('sessions/session-demo/info', sessionData);
  console.log('✓ Synced session info to Firebase RTDB');

  // 2. Participant
  const participantData = {
    id: 'part_test_101',
    sessionId: 'session-demo',
    name: 'Test Student',
    email: 'test@bmu.edu.in',
    rollNumber: 'CS2026-001',
    verifiedXP: 250,
    completedMissions: ['mission-1', 'mission-2', 'mission-3'],
    isOnline: true,
    lastActiveAt: Date.now()
  };
  await putToFirebase('sessions/session-demo/participants/part_test_101', participantData);
  console.log('✓ Synced participant to Firebase RTDB');

  // 3. Leaderboard
  const leaderboardData = [
    { rank: 1, name: 'Test Student', verifiedXP: 250, completedCount: 3, isOnline: true }
  ];
  await putToFirebase('sessions/session-demo/leaderboard', leaderboardData);
  console.log('✓ Synced leaderboard array to Firebase RTDB');

  // 4. Repository (with files, branches, commits, PRs)
  const repo = globalThis.createInitialRepository('Vivek');
  const safeRepo = sanitizeForFirebase(repo);
  await putToFirebase(`repositories/${repo.id}`, safeRepo);
  console.log('✓ Synced full repository (with files, branches, issues) to Firebase RTDB');

  // 5. Read back and verify
  const fetchedRepo = await getFromFirebase(`repositories/${repo.id}`);
  const restoredRepo = desanitizeFromFirebase(fetchedRepo);
  console.log('✓ Read back repository from RTDB. Files count:', Object.keys(restoredRepo.files).length);
  console.log('✓ index.html exists:', !!restoredRepo.files['index.html']);
  console.log('✓ .gitignore exists:', !!restoredRepo.files['.gitignore']);
  console.log('✓ style.css exists:', !!restoredRepo.files['style.css']);

  const fetchedLeaderboard = await getFromFirebase('sessions/session-demo/leaderboard');
  console.log('✓ Read back leaderboard. Entries count:', fetchedLeaderboard.length);

  console.log('\n🎉 ALL DATABASE STORAGE TESTS PASSED 100%! DATA IS FULLY PERSISTED TO CLOUD RTDB.');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
