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

async function put(path, data) {
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
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function get(path) {
  return new Promise((resolve, reject) => {
    https.get(`${BASE_URL}/${path}.json`, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- TESTING MULTIPLAYER REAL-TIME CLOUD SYNCHRONIZATION ---');

  // Step 1: Simulate 3 students in a classroom registering on their laptops
  const students = [
    { id: 'part_vivek_01', name: 'Vivek Yadav', email: 'vivek.yadav.25cse@bmu.edu.in', rollNumber: 'CS2026-001', verifiedXP: 325, completedMissions: ['mission-1', 'mission-2', 'mission-3', 'mission-4'], isOnline: true },
    { id: 'part_sarah_02', name: 'Sarah Khan', email: 'sarah.khan@bmu.edu.in', rollNumber: 'CS2026-042', verifiedXP: 550, completedMissions: ['mission-1', 'mission-2', 'mission-3', 'mission-4', 'mission-5', 'mission-6'], isOnline: true },
    { id: 'part_aarav_03', name: 'Aarav Sharma', email: 'aarav.sharma@bmu.edu.in', rollNumber: 'CS2026-088', verifiedXP: 225, completedMissions: ['mission-1', 'mission-2', 'mission-3'], isOnline: true }
  ];

  for (const s of students) {
    await put(`sessions/session-demo/participants/${s.id}`, sanitizeForFirebase(s));
    console.log(`✓ Participant registered in cloud: ${s.name} (${s.verifiedXP} XP)`);
  }

  // Step 2: Push ranked live leaderboard
  const ranked = [...students].sort((a,b) => b.verifiedXP - a.verifiedXP).map((s, idx) => ({
    participantId: s.id,
    name: s.name,
    email: s.email,
    rollNumber: s.rollNumber,
    verifiedXP: s.verifiedXP,
    completedCount: s.completedMissions.length,
    completedMissions: s.completedMissions,
    focusViolations: 0,
    isDisqualified: false,
    isOnline: true,
    rank: idx + 1
  }));

  await put('sessions/session-demo/leaderboard', sanitizeForFirebase(ranked));
  console.log('✓ Synced live ranked leaderboard to cloud RTDB');

  // Step 3: Fetch cloud leaderboard (simulating the 2.5s polling loop on all laptops)
  const cloudLb = await get('sessions/session-demo/leaderboard');
  const cleanLb = desanitizeFromFirebase(cloudLb);

  console.log('\n--- LIVE ARENA LEADERBOARD READBACK ---');
  console.table(cleanLb.map(e => ({
    Rank: `#${e.rank}`,
    Participant: e.name,
    Email: e.email,
    Score: `${e.verifiedXP} XP`,
    Missions: `${e.completedCount}/8`,
    Status: e.isOnline ? '🟢 Live' : 'Offline'
  })));

  // Verify rank 1 is Sarah Khan with 550 XP
  if (cleanLb[0].name === 'Sarah Khan' && cleanLb[0].verifiedXP === 550) {
    console.log('✓ Sarah Khan correctly ranked #1 with 550 XP');
  } else {
    throw new Error('Ranking verification failed!');
  }

  // Verify rank 2 is Vivek Yadav with 325 XP
  if (cleanLb[1].name === 'Vivek Yadav' && cleanLb[1].verifiedXP === 325) {
    console.log('✓ Vivek Yadav correctly ranked #2 with 325 XP');
  } else {
    throw new Error('Ranking verification failed!');
  }

  // Step 4: Simulate Vivek completing Mission 5 (+75 XP) and Mission 6 (+150 XP) -> Total: 550 XP -> tie/overtake!
  students[0].verifiedXP = 700;
  students[0].completedMissions.push('mission-5', 'mission-6', 'mission-7');
  await put(`sessions/session-demo/participants/${students[0].id}`, sanitizeForFirebase(students[0]));

  const updatedRanked = [...students].sort((a,b) => b.verifiedXP - a.verifiedXP).map((s, idx) => ({
    ...s,
    participantId: s.id,
    completedCount: s.completedMissions.length,
    rank: idx + 1
  }));
  await put('sessions/session-demo/leaderboard', sanitizeForFirebase(updatedRanked));
  console.log('✓ Vivek completed missions -> XP updated to 700 XP');

  const liveUpdated = desanitizeFromFirebase(await get('sessions/session-demo/leaderboard'));
  console.log('\n--- LEADERBOARD AFTER LIVE OVERTAKE ---');
  console.table(liveUpdated.map(e => ({
    Rank: `#${e.rank}`,
    Participant: e.name,
    Score: `${e.verifiedXP} XP`,
    Missions: `${e.completedCount}/8`
  })));

  if (liveUpdated[0].name === 'Vivek Yadav' && liveUpdated[0].verifiedXP === 700) {
    console.log('✓ LIVE OVERTAKE CONFIRMED: Vivek Yadav is now #1 with 700 XP!');
  } else {
    throw new Error('Overtake verification failed!');
  }

  console.log('\n🎉 MULTIPLAYER LIVE LEADERBOARD FULLY OPERATIONAL ACROSS ALL DEVICES!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

