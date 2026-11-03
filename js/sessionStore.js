/**
 * Open Sourcery Arena — Collaborative Repository & Session Manager
 * Pure Vanilla JavaScript
 */

const STORAGE_PREFIX = 'open_sourcery_';
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('open_sourcery_arena_channel')
  : null;

class SessionStore {
  static checkAndMigrateCleanState() {
    const CLEAN_VERSION = 'v3_clean_nodummy';
    if (typeof localStorage === 'undefined') return;
    const currentVersion = localStorage.getItem(`${STORAGE_PREFIX}schema_version`);
    if (currentVersion !== CLEAN_VERSION) {
      // Clear legacy dummy/mock repository data, old mock users, and mock PRs/issues
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem(`${STORAGE_PREFIX}schema_version`, CLEAN_VERSION);
    }
  }

  static initDefaultSession() {
    this.checkAndMigrateCleanState();
    const existing = this.getSession('session-demo');
    if (existing) return existing;

    const demoSession = {
      id: 'session-demo',
      name: 'Open Sourcery 2025 — University Git Arena',
      description: 'Hands-on practical Git & GitHub simulation workshop. Scan, explore, commit, and contribute!',
      durationMinutes: 15,
      status: 'active',
      createdAt: Date.now(),
      startedAt: Date.now(),
      resultsPublished: false,
      allowFreeOrderMissions: true,
      participantCount: 0,
      createdBy: 'Open Sourcery Organizers'
    };

    this.saveSession(demoSession);
    return demoSession;
  }

  static getSession(sessionId) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}session_${sessionId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static saveSession(session) {
    localStorage.setItem(`${STORAGE_PREFIX}session_${session.id}`, JSON.stringify(session));
    this.broadcast({ type: 'SESSION_UPDATED', session });
  }

  // --- Multi-Repository Management ---

  static getAllRepositories() {
    const repos = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_PREFIX}shared_repo_`)) {
        try {
          repos.push(JSON.parse(localStorage.getItem(key)));
        } catch {}
      }
    }

    if (repos.length === 0) {
      const initialRepo = createInitialRepository('Vivek');
      this.saveRepository(initialRepo);
      this.setActiveRepoId(initialRepo.id);
      return [initialRepo];
    }

    return repos.sort((a, b) => (b.stars || 0) - (a.stars || 0));
  }

  static getActiveRepoId() {
    return localStorage.getItem(`${STORAGE_PREFIX}active_repo_id`) || 'repo-college-website';
  }

  static setActiveRepoId(repoId) {
    localStorage.setItem(`${STORAGE_PREFIX}active_repo_id`, repoId);
    this.broadcast({ type: 'ACTIVE_REPO_CHANGED', repoId });
  }

  static getRepository(repoId = this.getActiveRepoId()) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}shared_repo_${repoId}`);
    if (!raw) {
      const all = this.getAllRepositories();
      return all[0] || createInitialRepository('Vivek');
    }
    try {
      return JSON.parse(raw);
    } catch {
      return createInitialRepository('Vivek');
    }
  }

  static saveRepository(repo) {
    localStorage.setItem(`${STORAGE_PREFIX}shared_repo_${repo.id}`, JSON.stringify(repo));
    this.broadcast({ type: 'REPO_UPDATED', repoId: repo.id, repo });
    if (typeof window !== 'undefined' && typeof window.syncRepoToCloud === 'function') {
      window.syncRepoToCloud(repo);
    }
  }

  static createRepository(name, description = '', isPublic = true, initReadme = true, creator = 'Vivek') {
    const newRepo = createNewBlankRepository(name, description, 'open-sourcery', isPublic, initReadme, creator);
    this.saveRepository(newRepo);
    this.setActiveRepoId(newRepo.id);
    this.recordActivity(newRepo.id, creator, 'repo', `Created repository ${newRepo.owner}/${newRepo.name}`);
    return newRepo;
  }

  static deleteRepository(repoId) {
    const all = this.getAllRepositories();
    if (all.length <= 1) return { success: false, message: 'Cannot delete the only remaining repository.' };
    
    localStorage.removeItem(`${STORAGE_PREFIX}shared_repo_${repoId}`);
    const remaining = this.getAllRepositories();
    this.setActiveRepoId(remaining[0].id);
    this.broadcast({ type: 'REPO_DELETED', repoId });
    return { success: true };
  }

  static forkRepository(sourceRepoId, forkerName = 'Vivek') {
    const sourceRepo = this.getRepository(sourceRepoId);
    if (!sourceRepo) return { success: false, message: 'Source repository not found.' };

    const sanitizedForker = forkerName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const forkRepoId = `repo-${sanitizedForker}-${sourceRepo.name}`;

    // Increment fork count on source repo
    sourceRepo.forks = (sourceRepo.forks || 0) + 1;
    if (!sourceRepo.forkedBy) sourceRepo.forkedBy = [];
    if (!sourceRepo.forkedBy.includes(forkerName)) sourceRepo.forkedBy.push(forkerName);
    this.saveRepository(sourceRepo);

    // Deep clone the repository for the fork
    const forkedRepo = JSON.parse(JSON.stringify(sourceRepo));
    forkedRepo.id = forkRepoId;
    forkedRepo.owner = sanitizedForker;
    forkedRepo.name = sourceRepo.name;
    forkedRepo.forkedFrom = `${sourceRepo.owner}/${sourceRepo.name}`;
    forkedRepo.forkedFromId = sourceRepo.id;
    forkedRepo.stars = 0;
    forkedRepo.forks = 0;
    forkedRepo.watchers = 1;
    forkedRepo.watchedBy = [forkerName];
    forkedRepo.starredBy = [];

    if (!forkedRepo.activities) forkedRepo.activities = [];
    forkedRepo.activities.unshift({
      id: `act-${Date.now()}`,
      user: forkerName,
      avatar: forkerName.charAt(0).toUpperCase(),
      action: 'fork',
      details: `Forked ${sourceRepo.owner}/${sourceRepo.name} to ${forkedRepo.owner}/${forkedRepo.name}`,
      timestamp: Date.now()
    });

    this.saveRepository(forkedRepo);
    this.setActiveRepoId(forkedRepo.id);
    return { success: true, repo: forkedRepo };
  }

  static toggleWatchRepository(repoId, contributorName = 'Vivek') {
    const repo = this.getRepository(repoId);
    if (!repo) return { success: false, message: 'Repository not found.' };

    if (!repo.watchedBy) repo.watchedBy = [];
    const index = repo.watchedBy.indexOf(contributorName);
    let isWatching = false;

    if (index >= 0) {
      repo.watchedBy.splice(index, 1);
      repo.watchers = Math.max(0, (repo.watchers || 1) - 1);
      isWatching = false;
    } else {
      repo.watchedBy.push(contributorName);
      repo.watchers = (repo.watchers || 0) + 1;
      isWatching = true;
      this.recordActivity(repo.id, contributorName, 'watch', `Started watching ${repo.owner}/${repo.name}`);
    }

    this.saveRepository(repo);
    return { success: true, isWatching, watchers: repo.watchers, repo };
  }

  static toggleStarRepository(repoId, contributorName = 'Vivek') {
    const repo = this.getRepository(repoId);
    if (!repo) return { success: false, message: 'Repository not found.' };

    if (!repo.starredBy) repo.starredBy = [];
    const index = repo.starredBy.indexOf(contributorName);
    let isStarred = false;

    if (index >= 0) {
      repo.starredBy.splice(index, 1);
      repo.stars = Math.max(0, (repo.stars || 1) - 1);
      isStarred = false;
    } else {
      repo.starredBy.push(contributorName);
      repo.stars = (repo.stars || 0) + 1;
      isStarred = true;
      this.recordActivity(repo.id, contributorName, 'star', `Starred ${repo.owner}/${repo.name}`);
    }

    this.saveRepository(repo);
    return { success: true, isStarred, stars: repo.stars, repo };
  }

  static recordActivity(repoId, user, action, details) {
    const repo = this.getRepository(repoId);
    if (!repo) return;

    if (!repo.activities) repo.activities = [];
    repo.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
      user,
      avatar: user.charAt(0).toUpperCase(),
      action,
      details,
      timestamp: Date.now()
    });

    if (!repo.contributors) repo.contributors = [];
    if (!repo.contributors.includes(user)) repo.contributors.push(user);

    this.saveRepository(repo);
  }

  // --- Collaborative Contributor Personas ---

  static getActiveContributor() {
    return localStorage.getItem(`${STORAGE_PREFIX}active_contributor`) || 'Vivek';
  }

  static setActiveContributor(name) {
    localStorage.setItem(`${STORAGE_PREFIX}active_contributor`, name.trim());
    this.broadcast({ type: 'CONTRIBUTOR_CHANGED', name: name.trim() });
  }

  static getAllContributors() {
    const active = this.getActiveContributor();
    const defaultContributors = [
      { name: active, rollNumber: '', github: '', xp: 0, isOnline: true }
    ];

    const custom = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_PREFIX}custom_contributor_`)) {
        try {
          custom.push(JSON.parse(localStorage.getItem(key)));
        } catch {}
      }
    }

    return [...defaultContributors, ...custom];
  }

  static addCustomContributor(name, rollNumber = '', github = '', email = '') {
    const profile = {
      name: name.trim(),
      email: email ? email.trim() : '',
      rollNumber: rollNumber.trim().toUpperCase(),
      github: github.trim(),
      xp: 0,
      isOnline: true
    };
    localStorage.setItem(`${STORAGE_PREFIX}custom_contributor_${name.trim()}`, JSON.stringify(profile));
    this.setActiveContributor(name.trim());
    return profile;
  }

  // --- Participant & Leaderboard ---

  static getCurrentParticipantId() {
    return localStorage.getItem(`${STORAGE_PREFIX}current_participant_id`) || '';
  }

  static getCurrentParticipant(sessionId = 'session-demo') {
    const id = this.getCurrentParticipantId();
    if (id) {
      const part = this.getParticipant(sessionId, id);
      if (part) return part;
    }
    const activeName = this.getActiveContributor();
    return this.getParticipantByName(sessionId, activeName);
  }

  static getParticipantByName(sessionId = 'session-demo', name = '') {
    if (!name) return null;
    const target = name.trim().toLowerCase();
    const all = this.getAllParticipants(sessionId);
    return all.find(p => (p.name || '').trim().toLowerCase() === target) || null;
  }

  static getAllParticipants(sessionId = 'session-demo') {
    const prefix = `${STORAGE_PREFIX}participant_${sessionId}_`;
    const participants = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (item && item.id) participants.push(item);
        } catch {}
      }
    }
    return participants;
  }

  static registerParticipant(sessionId, name, email = '', rollNumber = '', githubUsername = '') {
    const session = this.getSession(sessionId);
    if (!session) return { success: false, message: 'Session does not exist.' };

    const participantId = `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newParticipant = {
      id: participantId,
      sessionId,
      name: name.trim(),
      email: email ? email.trim() : '',
      rollNumber: rollNumber.trim().toUpperCase(),
      githubUsername: githubUsername ? githubUsername.trim() : '',
      registeredAt: Date.now(),
      lastActiveAt: Date.now(),
      isOnline: true,
      currentMissionIndex: 0,
      completedMissions: [],
      verifiedXP: 0,
      focusViolations: 0
    };

    localStorage.setItem(
      `${STORAGE_PREFIX}participant_${sessionId}_${participantId}`,
      JSON.stringify(newParticipant)
    );
    localStorage.setItem(`${STORAGE_PREFIX}current_participant_id`, participantId);

    this.addCustomContributor(name, rollNumber, githubUsername, email);
    this.setActiveContributor(name);

    this.recordActivity(this.getActiveRepoId(), name.trim(), 'session', `Registered for workshop challenge`);
    this.broadcast({ type: 'PARTICIPANT_REGISTERED', participant: newParticipant });
    return { success: true, participant: newParticipant, message: 'Welcome to Open Sourcery Arena!' };
  }

  static getParticipant(sessionId, participantId) {
    if (!participantId) return null;
    const raw = localStorage.getItem(`${STORAGE_PREFIX}participant_${sessionId}_${participantId}`);
    if (!raw) {
      // Fallback: check if participantId was actually a name
      return this.getParticipantByName(sessionId, participantId);
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static recordParticipantViolation(sessionId, participantId, reason = 'Tab switch / focus loss') {
    let participant = this.getParticipant(sessionId, participantId);
    if (!participant) {
      const activeName = this.getActiveContributor();
      participant = this.getParticipantByName(sessionId, activeName);
    }
    if (!participant) return;

    participant.focusViolations = (participant.focusViolations || 0) + 1;
    participant.lastActiveAt = Date.now();
    localStorage.setItem(
      `${STORAGE_PREFIX}participant_${sessionId}_${participant.id}`,
      JSON.stringify(participant)
    );
    this.recordActivity(this.getActiveRepoId(), participant.name, 'security', `Focus alert #${participant.focusViolations} (${reason})`);
    this.broadcast({ type: 'FOCUS_VIOLATION', participantId: participant.id, violations: participant.focusViolations });
  }

  static awardMission(sessionId, participantId, missionId, evidence = {}) {
    let participant = this.getParticipant(sessionId, participantId);
    if (!participant) {
      // Fallback to active contributor
      const activeName = this.getActiveContributor();
      participant = this.getParticipantByName(sessionId, activeName);
    }
    if (!participant) return { success: false, message: 'Participant not found.' };

    const mission = DEFAULT_MISSIONS.find(m => m.id === missionId);
    if (!mission) return { success: false, message: 'Mission not found.' };

    if (!participant.completedMissions) participant.completedMissions = [];

    if (participant.completedMissions.includes(missionId)) {
      return { success: true, xpAwarded: 0, totalXP: participant.verifiedXP, message: 'Mission already awarded.' };
    }

    const newXP = (participant.verifiedXP || 0) + mission.xp;
    participant.verifiedXP = newXP;
    participant.completedMissions.push(missionId);
    participant.lastActiveAt = Date.now();

    localStorage.setItem(
      `${STORAGE_PREFIX}participant_${sessionId}_${participant.id}`,
      JSON.stringify(participant)
    );

    // Sync XP to custom contributor record
    const contributorRaw = localStorage.getItem(`${STORAGE_PREFIX}custom_contributor_${participant.name}`);
    if (contributorRaw) {
      try {
        const contributor = JSON.parse(contributorRaw);
        contributor.xp = newXP;
        localStorage.setItem(`${STORAGE_PREFIX}custom_contributor_${participant.name}`, JSON.stringify(contributor));
      } catch {}
    }

    this.recordActivity(this.getActiveRepoId(), participant.name, 'mission', `Completed Mission ${mission.number}: ${mission.title} (+${mission.xp} XP)`);
    this.broadcast({ type: 'MISSION_AWARDED', sessionId, participantId: participant.id, missionId, newXP });
    return {
      success: true,
      xpAwarded: mission.xp,
      totalXP: newXP,
      message: `🎉 Awesome! ${mission.title} verified! +${mission.xp} XP earned!`
    };
  }

  static adjustParticipantXP(sessionId, participantId, deltaXP, reason = 'Admin Adjustment') {
    let participant = this.getParticipant(sessionId, participantId);
    if (!participant) return { success: false, message: 'Participant not found.' };

    const oldXP = participant.verifiedXP || 0;
    const newXP = Math.max(0, oldXP + deltaXP);
    participant.verifiedXP = newXP;
    participant.lastActiveAt = Date.now();

    localStorage.setItem(
      `${STORAGE_PREFIX}participant_${sessionId}_${participant.id}`,
      JSON.stringify(participant)
    );

    const contributorRaw = localStorage.getItem(`${STORAGE_PREFIX}custom_contributor_${participant.name}`);
    if (contributorRaw) {
      try {
        const contributor = JSON.parse(contributorRaw);
        contributor.xp = newXP;
        localStorage.setItem(`${STORAGE_PREFIX}custom_contributor_${participant.name}`, JSON.stringify(contributor));
      } catch {}
    }

    const sign = deltaXP >= 0 ? '+' : '';
    this.recordActivity(this.getActiveRepoId(), 'Admin (Vivek)', 'audit', `Adjusted XP for ${participant.name}: ${sign}${deltaXP} XP (${reason}). Total: ${newXP} XP`);
    this.broadcast({ type: 'XP_ADJUSTED', sessionId, participantId: participant.id, newXP, deltaXP });
    return { success: true, newXP, deltaXP };
  }

  static removeParticipant(sessionId, participantId) {
    let participant = this.getParticipant(sessionId, participantId);
    if (!participant) {
      // Try by matching participantId to id
      const all = this.getAllParticipants(sessionId);
      participant = all.find(p => p.id === participantId || `part_${p.name}` === participantId);
    }
    const name = participant ? participant.name : participantId;
    const realId = participant ? participant.id : participantId;

    localStorage.removeItem(`${STORAGE_PREFIX}participant_${sessionId}_${realId}`);
    localStorage.removeItem(`${STORAGE_PREFIX}custom_contributor_${name}`);

    // Track in disqualified list so they never re-appear on leaderboard
    try {
      const disq = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}disqualified_names`) || '[]');
      if (name && !disq.includes(name.toLowerCase())) {
        disq.push(name.toLowerCase());
        localStorage.setItem(`${STORAGE_PREFIX}disqualified_names`, JSON.stringify(disq));
      }
    } catch {}

    // If active contributor was this participant, reset to Vivek
    if (this.getActiveContributor() === name) {
      this.setActiveContributor('Vivek');
    }

    // If current participant was removed, reset active participant state
    if (localStorage.getItem(`${STORAGE_PREFIX}current_participant_id`) === realId) {
      localStorage.removeItem(`${STORAGE_PREFIX}current_participant_id`);
      localStorage.removeItem('open_sourcery_user_registered');
    }

    this.recordActivity(this.getActiveRepoId(), 'Admin (Vivek)', 'audit', `Disqualified/removed participant ${name} from leaderboard.`);
    this.broadcast({ type: 'PARTICIPANT_REMOVED', sessionId, participantId: realId, name });
    return { success: true, name };
  }

  static getLeaderboard(sessionId = 'session-demo') {
    const participants = this.getAllParticipants(sessionId);
    const contributors = this.getAllContributors();
    const map = new Map();

    let disqualified = [];
    try {
      disqualified = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}disqualified_names`) || '[]');
    } catch {}

    // Index all registered participants
    participants.forEach(p => {
      if (p.name && disqualified.includes(p.name.toLowerCase())) return;

      const violations = p.focusViolations || (p.name === this.getActiveContributor() ? parseInt(localStorage.getItem('open_sourcery_tab_switch_count') || '0', 10) : 0);
      map.set(p.name.toLowerCase(), {
        participantId: p.id,
        name: p.name,
        email: p.email || '',
        rollNumber: p.rollNumber || 'PARTICIPANT',
        githubUsername: p.githubUsername || '',
        verifiedXP: p.verifiedXP || 0,
        completedCount: (p.completedMissions || []).length,
        completedMissions: p.completedMissions || [],
        focusViolations: violations,
        lastCompletedAt: p.lastActiveAt || Date.now(),
        isOnline: Boolean(p.isOnline),
        registeredAt: p.registeredAt || Date.now()
      });
    });

    // Merge in any custom contributors that weren't stored as participant record
    contributors.forEach(c => {
      const key = (c.name || '').toLowerCase();
      if (!map.has(key) && c.name && !disqualified.includes(key)) {
        map.set(key, {
          participantId: `part_${c.name}`,
          name: c.name,
          email: c.email || '',
          rollNumber: c.rollNumber || 'CONTRIBUTOR',
          githubUsername: c.github || '',
          verifiedXP: c.xp || 0,
          completedCount: Math.min(8, Math.floor((c.xp || 0) / 70)),
          completedMissions: [],
          focusViolations: 0,
          lastCompletedAt: Date.now(),
          isOnline: Boolean(c.isOnline),
          registeredAt: Date.now()
        });
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.verifiedXP - a.verifiedXP);

    return list.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  static getAuditLogs(sessionId) {
    const repo = this.getRepository();
    return (repo.activities || []).map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      participantName: a.user,
      reason: a.details
    }));
  }

  static subscribe(callback) {
    if (channel) {
      channel.addEventListener('message', e => callback(e.data));
    }
    window.addEventListener('storage', () => callback({ type: 'STORAGE_EVENT' }));
  }

  static broadcast(data) {
    if (channel) {
      try { channel.postMessage(data); } catch {}
    }
  }
}

if (typeof window !== 'undefined') {
  window.SessionStore = SessionStore;
}
if (typeof globalThis !== 'undefined') {
  globalThis.SessionStore = SessionStore;
}
