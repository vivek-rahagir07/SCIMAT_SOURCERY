/**
 * Test Mission CLI Revision MCQ Quizzes
 */

class MockStorage {
  constructor() { this.store = {}; }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; }
  setItem(key, val) { this.store[key] = String(val); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
  get length() { return Object.keys(this.store).length; }
  key(i) { return Object.keys(this.store)[i] || null; }
}

globalThis.localStorage = new MockStorage();
globalThis.sessionStorage = new MockStorage();
globalThis.BroadcastChannel = class { postMessage() {} addEventListener() {} };
globalThis.document = {
  addEventListener() {},
  getElementById() { return null; },
  querySelectorAll() { return []; }
};
globalThis.window = { addEventListener() {} };

// Load modules
require('../js/seedData.js');
require('../js/gitSimulator.js');
require('../js/sessionStore.js');
require('../js/missionValidator.js');
require('../js/app.js');

console.log('--- TESTING MISSION MCQ QUIZZES ---');

// Verify all 8 missions have quizzes
for (let i = 1; i <= 8; i++) {
  const mId = `mission-${i}`;
  const quiz = MISSION_QUIZZES[mId];
  if (!quiz || quiz.length !== 2) {
    throw new Error(`Mission ${mId} does not have exactly 2 MCQ questions!`);
  }

  quiz.forEach((q, qIdx) => {
    if (!q.question || q.question.length < 10) throw new Error(`${mId} Q${qIdx} has empty question`);
    if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`${mId} Q${qIdx} must have 4 options`);
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      throw new Error(`${mId} Q${qIdx} has invalid correctIndex: ${q.correctIndex}`);
    }
    if (!q.explanation || q.explanation.length < 5) throw new Error(`${mId} Q${qIdx} missing explanation`);
  });

  const mission = DEFAULT_MISSIONS.find(m => m.id === mId);
  console.log(`✓ Mission ${i} (${mission.title}): 2 MCQs validated with explanations.`);
}

console.log('\n--- TESTING BONUS XP AWARD ON PERFECT QUIZ ---');
SessionStore.initDefaultSession();
const partRes = SessionStore.registerParticipant('session-demo', 'Rohan Verma', 'rohan.25cse@bmu.edu.in', '25CSE099');
const p = partRes.participant;
console.log('Registered participant score before quiz:', p.verifiedXP, 'XP');

// Award bonus XP for completing quiz
const adj = SessionStore.adjustParticipantXP('session-demo', p.id, 25, 'CLI Quiz Bonus');
console.log('Score after perfect quiz bonus:', adj.newXP, 'XP');
if (adj.newXP !== 25) throw new Error('Bonus XP not applied correctly');

console.log('\n🎉 ALL QUIZ TESTS PASSED! FULL SYSTEM REVISED.');

