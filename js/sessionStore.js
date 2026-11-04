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
    const CLEAN_VERSION = 'v4_rich_codebase';
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
    if (typeof window !== 'undefined' && typeof window.syncSessionToCloud === 'function') {
      window.syncSessionToCloud(session);
    }
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
    const custom = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_PREFIX}custom_contributor_`)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (item && item.name) custom.push(item);
        } catch {}
      }
    }

    const active = this.getActiveContributor();
    if (!custom.some(c => c.name.toLowerCase() === active.toLowerCase())) {
      custom.unshift({ name: active, rollNumber: '', github: '', xp: 0, isOnline: true });
    }

    return custom;
  }

  static addCustomContributor(name, rollNumber = '', github = '', email = '', initialXP = 0) {
    const trimmedName = name.trim();
    let currentXP = initialXP;

    // Preserve existing XP if participant already has accumulated score
    const existingRaw = localStorage.getItem(`${STORAGE_PREFIX}custom_contributor_${trimmedName}`);
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (typeof parsed.xp === 'number') {
          currentXP = Math.max(parsed.xp, initialXP);
        }
      } catch {}
    }

    const profile = {
      name: trimmedName,
      email: email ? email.trim() : '',
      rollNumber: rollNumber ? rollNumber.trim().toUpperCase() : '',
      github: github ? github.trim() : '',
      xp: currentXP,
      isOnline: true
    };
    localStorage.setItem(`${STORAGE_PREFIX}custom_contributor_${trimmedName}`, JSON.stringify(profile));
    this.setActiveContributor(trimmedName);
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

  static getParticipantByEmail(sessionId = 'session-demo', email = '') {
    if (!email) return null;
    const target = email.trim().toLowerCase();
    const all = this.getAllParticipants(sessionId);
    const found = all.find(p => (p.email || '').trim().toLowerCase() === target);
    if (found) return found;

    if (typeof window !== 'undefined' && Array.isArray(window._cachedCloudLeaderboard)) {
      const cloudMatch = window._cachedCloudLeaderboard.find(e => (e.email || '').trim().toLowerCase() === target);
      if (cloudMatch) return cloudMatch;
    }
    return null;
  }

  static getParticipantByName(sessionId = 'session-demo', name = '') {
    if (!name) return null;
    const target = name.trim().toLowerCase();
    const all = this.getAllParticipants(sessionId);
    const found = all.find(p => (p.name || '').trim().toLowerCase() === target);
    if (found) return found;

    if (typeof window !== 'undefined' && Array.isArray(window._cachedCloudLeaderboard)) {
      const cloudMatch = window._cachedCloudLeaderboard.find(e => (e.name || '').trim().toLowerCase() === target);
      if (cloudMatch) return cloudMatch;
    }
    return null;
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

    const trimmedName = name.trim();
    const trimmedEmail = email ? email.trim() : '';
    const trimmedRoll = rollNumber ? rollNumber.trim().toUpperCase() : '';
    const trimmedGithub = githubUsername ? githubUsername.trim() : '';

    // Check if participant already exists by email, rollNumber, or name (to preserve score upon re-login)
    let existingParticipant = null;
    if (trimmedEmail) {
      existingParticipant = this.getParticipantByEmail(sessionId, trimmedEmail);
    }
    if (!existingParticipant && trimmedRoll) {
      const all = this.getAllParticipants(sessionId);
      existingParticipant = all.find(p => (p.rollNumber || '').toUpperCase() === trimmedRoll) || null;
      if (!existingParticipant && typeof window !== 'undefined' && Array.isArray(window._cachedCloudLeaderboard)) {
        existingParticipant = window._cachedCloudLeaderboard.find(e => (e.rollNumber || '').toUpperCase() === trimmedRoll) || null;
      }
    }
    if (!existingParticipant && trimmedName) {
      existingParticipant = this.getParticipantByName(sessionId, trimmedName);
    }

    // Deterministic ID derived from email, roll number, or name to eliminate duplicate creations
    const cleanKey = (trimmedEmail || trimmedRoll || trimmedName).toLowerCase().replace(/[^a-z0-9]/g, '_');
    const deterministicId = `part_${cleanKey}`;

    if (!existingParticipant) {
      const byId = this.getParticipant(sessionId, deterministicId);
      if (byId) existingParticipant = byId;
    }

    let participant;
    let isReLogin = false;

    if (existingParticipant) {
      // Re-login: PRESERVE score, XP, missions, and timer
      isReLogin = true;
      participant = {
        ...existingParticipant,
        id: existingParticipant.id || existingParticipant.participantId || deterministicId,
        sessionId,
        name: trimmedName || existingParticipant.name,
        email: trimmedEmail || existingParticipant.email || '',
        rollNumber: trimmedRoll || existingParticipant.rollNumber || '',
        githubUsername: trimmedGithub || existingParticipant.githubUsername || '',
        verifiedXP: existingParticipant.verifiedXP || 0,
        completedMissions: existingParticipant.completedMissions || [],
        focusViolations: existingParticipant.focusViolations || 0,
        lastActiveAt: Date.now(),
        isOnline: true
      };

      if (typeof existingParticipant.timerRemainingMs === 'number') {
        participant.timerRemainingMs = existingParticipant.timerRemainingMs;
      }
    } else {
      // First-time registration with deterministic ID
      participant = {
        id: deterministicId,
        sessionId,
        name: trimmedName,
        email: trimmedEmail,
        rollNumber: trimmedRoll,
        githubUsername: trimmedGithub,
        registeredAt: Date.now(),
        lastActiveAt: Date.now(),
        isOnline: true,
        currentMissionIndex: 0,
        completedMissions: [],
        verifiedXP: 0,
        focusViolations: 0,
        timerRemainingMs: 15 * 60 * 1000
      };
    }

    localStorage.setItem(
      `${STORAGE_PREFIX}participant_${sessionId}_${participant.id}`,
      JSON.stringify(participant)
    );
    localStorage.setItem(`${STORAGE_PREFIX}current_participant_id`, participant.id);

    // Sync or update custom contributor while keeping accumulated XP intact
    this.addCustomContributor(
      participant.name,
      participant.rollNumber || trimmedRoll,
      participant.githubUsername || trimmedGithub,
      participant.email || trimmedEmail,
      participant.verifiedXP || 0
    );
    this.setActiveContributor(participant.name);

    this.recordActivity(
      this.getActiveRepoId(),
      participant.name,
      'session',
      isReLogin
        ? `Re-entered workshop sprint with ${participant.verifiedXP || 0} XP`
        : `Registered for workshop challenge`
    );
    this.broadcast({ type: 'PARTICIPANT_REGISTERED', participant, isReLogin });

    // Sync participant and updated leaderboard to Firebase Cloud Database
    if (typeof window !== 'undefined') {
      if (typeof window.syncParticipantToCloud === 'function') {
        window.syncParticipantToCloud(sessionId, participant);
      }
      if (typeof window.syncLeaderboardToCloud === 'function') {
        window.syncLeaderboardToCloud(sessionId, this.getLeaderboard(sessionId));
      }
    }

    return {
      success: true,
      participant,
      isReLogin,
      message: isReLogin
        ? `Welcome back, ${participant.name}! Your ${participant.verifiedXP || 0} XP score and progress have been restored.`
        : 'Welcome to Open Sourcery Arena!'
    };
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

    if (typeof window !== 'undefined' && typeof window.syncParticipantToCloud === 'function') {
      window.syncParticipantToCloud(sessionId, participant);
    }
  }

  static disqualifyParticipant(sessionId, participantId, reason = 'Tab switch / window minimized') {
    let participant = this.getParticipant(sessionId, participantId);
    if (!participant) {
      const activeName = this.getActiveContributor();
      participant = this.getParticipantByName(sessionId, activeName);
    }
    if (!participant) return { success: false };

    participant.isDisqualified = true;
    participant.disqualifiedReason = reason;
    participant.disqualifiedAt = Date.now();
    participant.lastActiveAt = Date.now();

    localStorage.setItem(
      `${STORAGE_PREFIX}participant_${sessionId}_${participant.id}`,
      JSON.stringify(participant)
    );

    this.recordActivity(this.getActiveRepoId(), participant.name, 'security', `🚨 DISQUALIFIED (OUT OF GAME): ${reason}`);
    this.broadcast({ type: 'PARTICIPANT_DISQUALIFIED', participantId: participant.id, name: participant.name, reason });

    if (typeof window !== 'undefined') {
      if (typeof window.syncParticipantToCloud === 'function') {
        window.syncParticipantToCloud(sessionId, participant);
      }
      if (typeof window.syncLeaderboardToCloud === 'function') {
        window.syncLeaderboardToCloud(sessionId, this.getLeaderboard(sessionId));
      }
    }

    return { success: true, participant };
  }

  static reinstateParticipant(sessionId, participantId) {
    let participant = this.getParticipant(sessionId, participantId);
    if (!participant) return { success: false };

    participant.isDisqualified = false;
    delete participant.disqualifiedReason;
    delete participant.disqualifiedAt;

    localStorage.setItem(
      `${STORAGE_PREFIX}participant_${sessionId}_${participant.id}`,
      JSON.stringify(participant)
    );

    this.recordActivity(this.getActiveRepoId(), 'Admin (Vivek)', 'audit', `Reinstated participant ${participant.name} to active sprint.`);
    this.broadcast({ type: 'PARTICIPANT_REINSTATED', participantId: participant.id, name: participant.name });

    if (typeof window !== 'undefined') {
      if (typeof window.syncParticipantToCloud === 'function') {
        window.syncParticipantToCloud(sessionId, participant);
      }
      if (typeof window.syncLeaderboardToCloud === 'function') {
        window.syncLeaderboardToCloud(sessionId, this.getLeaderboard(sessionId));
      }
    }

    return { success: true, participant };
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

    // Sync updated XP and leaderboard to Firebase Cloud Database
    if (typeof window !== 'undefined') {
      if (typeof window.syncParticipantToCloud === 'function') {
        window.syncParticipantToCloud(sessionId, participant);
      }
      if (typeof window.syncLeaderboardToCloud === 'function') {
        window.syncLeaderboardToCloud(sessionId, this.getLeaderboard(sessionId));
      }
    }

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

    if (typeof window !== 'undefined') {
      if (typeof window.syncParticipantToCloud === 'function') {
        window.syncParticipantToCloud(sessionId, participant);
      }
      if (typeof window.syncLeaderboardToCloud === 'function') {
        window.syncLeaderboardToCloud(sessionId, this.getLeaderboard(sessionId));
      }
    }

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

    if (typeof window !== 'undefined') {
      if (typeof window.removeParticipantFromCloud === 'function') {
        window.removeParticipantFromCloud(sessionId, realId);
      }
      if (typeof window.syncLeaderboardToCloud === 'function') {
        window.syncLeaderboardToCloud(sessionId, this.getLeaderboard(sessionId));
      }
    }

    return { success: true, name };
  }

  static hydrateParticipant(sessionId, remoteParticipant) {
    if (!remoteParticipant || !remoteParticipant.id) return;
    const local = this.getParticipant(sessionId, remoteParticipant.id);
    if (!local || (remoteParticipant.verifiedXP || 0) > (local.verifiedXP || 0) || remoteParticipant.isDisqualified !== local.isDisqualified) {
      localStorage.setItem(
        `${STORAGE_PREFIX}participant_${sessionId}_${remoteParticipant.id}`,
        JSON.stringify(remoteParticipant)
      );
      if (remoteParticipant.name) {
        this.addCustomContributor(
          remoteParticipant.name,
          remoteParticipant.rollNumber || '',
          remoteParticipant.githubUsername || '',
          remoteParticipant.email || ''
        );
      }
    }
  }

  static mergeRemoteLeaderboard(remoteLb) {
    if (!Array.isArray(remoteLb)) return;
    if (typeof window !== 'undefined') {
      window._cachedCloudLeaderboard = remoteLb;
    }
    remoteLb.forEach(entry => {
      if (entry && entry.participantId && entry.name) {
        const p = {
          id: entry.participantId,
          sessionId: 'session-demo',
          name: entry.name,
          email: entry.email || '',
          rollNumber: entry.rollNumber || '',
          githubUsername: entry.githubUsername || '',
          verifiedXP: entry.verifiedXP || 0,
          completedMissions: entry.completedMissions || [],
          focusViolations: entry.focusViolations || 0,
          isDisqualified: Boolean(entry.isDisqualified),
          disqualifiedReason: entry.disqualifiedReason || '',
          isOnline: Boolean(entry.isOnline),
          lastActiveAt: entry.lastCompletedAt || Date.now()
        };
        this.hydrateParticipant('session-demo', p);
      }
    });
  }

  static mergeRemoteRepo(remote) {
    if (!remote || !remote.id) return false;
    const activeId = this.getActiveRepoId();
    if (remote.id !== activeId) return false;

    const local = this.getRepository(activeId);
    if (!local) return false;

    let changed = false;

    // 1. Merge Issues
    const issueMap = new Map();
    (local.issues || []).forEach(i => issueMap.set(i.id, i));
    const initIssueCount = issueMap.size;
    (remote.issues || []).forEach(i => {
      if (!issueMap.has(i.id)) {
        issueMap.set(i.id, i);
        changed = true;
      } else {
        const existing = issueMap.get(i.id);
        if ((i.comments && i.comments.length > (existing.comments || []).length) || i.status !== existing.status) {
          issueMap.set(i.id, i);
          changed = true;
        }
      }
    });
    if (issueMap.size !== initIssueCount) changed = true;
    local.issues = Array.from(issueMap.values()).sort((a, b) => b.id - a.id);

    // 2. Merge Pull Requests
    const prMap = new Map();
    (local.pullRequests || []).forEach(p => prMap.set(p.id, p));
    const initPrCount = prMap.size;
    (remote.pullRequests || []).forEach(p => {
      if (!prMap.has(p.id)) {
        prMap.set(p.id, p);
        changed = true;
      } else {
        const existing = prMap.get(p.id);
        if ((p.comments && p.comments.length > (existing.comments || []).length) || p.status !== existing.status) {
          prMap.set(p.id, p);
          changed = true;
        }
      }
    });
    if (prMap.size !== initPrCount) changed = true;
    local.pullRequests = Array.from(prMap.values()).sort((a, b) => b.id - a.id);

    // 3. Merge Branches
    if (!local.branches) local.branches = {};
    for (const [b, commitId] of Object.entries(remote.branches || {})) {
      if (!local.branches[b]) {
        local.branches[b] = commitId;
        changed = true;
      }
    }

    // 4. Merge Commits
    const commitMap = new Map();
    (local.commits || []).forEach(c => commitMap.set(c.id, c));
    const initCommitCount = commitMap.size;
    (remote.commits || []).forEach(c => {
      if (!commitMap.has(c.id)) {
        commitMap.set(c.id, c);
        changed = true;
      }
    });
    if (commitMap.size !== initCommitCount) changed = true;
    local.commits = Array.from(commitMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // 5. Merge Activities
    const actMap = new Map();
    (local.activities || []).forEach(a => actMap.set(a.id, a));
    const initActCount = actMap.size;
    (remote.activities || []).forEach(a => {
      if (!actMap.has(a.id)) {
        actMap.set(a.id, a);
        changed = true;
      }
    });
    if (actMap.size !== initActCount) changed = true;
    local.activities = Array.from(actMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (changed) {
      localStorage.setItem(`${STORAGE_PREFIX}shared_repo_${local.id}`, JSON.stringify(local));
      this.broadcast({ type: 'REPO_UPDATED', repoId: local.id, repo: local });
    }

    return changed;
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
      if (!p || !p.name) return;
      if (disqualified.includes(p.name.toLowerCase())) return;

      const dedupeKey = (p.email && p.email !== 'N/A' && p.email.includes('@'))
        ? p.email.trim().toLowerCase()
        : p.name.trim().toLowerCase();

      const violations = p.focusViolations || (p.name === this.getActiveContributor() ? parseInt(localStorage.getItem('open_sourcery_tab_switch_count') || '0', 10) : 0);
      const isDisq = Boolean(p.isDisqualified);

      if (!map.has(dedupeKey)) {
        map.set(dedupeKey, {
          participantId: p.id,
          name: p.name,
          email: p.email || '',
          rollNumber: p.rollNumber || 'PARTICIPANT',
          githubUsername: p.githubUsername || '',
          verifiedXP: p.verifiedXP || 0,
          completedCount: (p.completedMissions || []).length,
          completedMissions: p.completedMissions || [],
          focusViolations: violations,
          isDisqualified: isDisq,
          disqualifiedReason: p.disqualifiedReason || '',
          timerRemainingMs: p.timerRemainingMs,
          lastCompletedAt: p.lastActiveAt || Date.now(),
          isOnline: isDisq ? false : Boolean(p.isOnline),
          registeredAt: p.registeredAt || Date.now()
        });
      } else {
        const existing = map.get(dedupeKey);
        const higherXP = Math.max(existing.verifiedXP || 0, p.verifiedXP || 0);
        const mergedMissions = Array.from(new Set([...(existing.completedMissions || []), ...(p.completedMissions || [])]));
        map.set(dedupeKey, {
          ...existing,
          ...p,
          verifiedXP: higherXP,
          completedCount: mergedMissions.length,
          completedMissions: mergedMissions,
          focusViolations: Math.max(existing.focusViolations || 0, violations)
        });
      }
    });

    // Merge in any custom contributors that weren't stored as participant record
    contributors.forEach(c => {
      if (!c || !c.name) return;
      const key = (c.email && c.email.includes('@'))
        ? c.email.trim().toLowerCase()
        : c.name.trim().toLowerCase();

      if (!map.has(key) && !disqualified.includes(c.name.toLowerCase())) {
        map.set(key, {
          participantId: `part_${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
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

    // Merge in cached cloud leaderboard entries if available
    if (typeof window !== 'undefined' && Array.isArray(window._cachedCloudLeaderboard)) {
      window._cachedCloudLeaderboard.forEach(entry => {
        if (!entry || !entry.name) return;
        const key = (entry.email && entry.email !== 'N/A' && entry.email.includes('@'))
          ? entry.email.trim().toLowerCase()
          : entry.name.trim().toLowerCase();

        if (disqualified.includes(entry.name.toLowerCase())) return;
        if (!map.has(key)) {
          map.set(key, entry);
        } else {
          const existing = map.get(key);
          const higherXP = Math.max(existing.verifiedXP || 0, entry.verifiedXP || 0);
          const mergedMissions = Array.from(new Set([...(existing.completedMissions || []), ...(entry.completedMissions || [])]));
          map.set(key, {
            ...existing,
            ...entry,
            verifiedXP: higherXP,
            completedCount: mergedMissions.length,
            completedMissions: mergedMissions
          });
        }
      });
    }

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
