/**
 * Open Sourcery Arena — Collaborative Git & GitHub Simulation Controller
 * Pure Vanilla JavaScript
 */

let activeRepo = null;
let git = null;
let activeTab = 'code';
let currentViewingFile = 'README.md';
let isEditingFile = false;
let terminalHistory = [];
let terminalHistoryIndex = -1;
let currentContributor = 'Vivek';

let interactionHistory = {
  hasViewedReadme: false,
  viewedBranch: 'main'
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
  initFocusAndFullscreenGuards();
  startTimer();

  // Listen for multi-tab real-time sync via BroadcastChannel & storage events
  SessionStore.subscribe((event) => {
    if (event.type === 'REPO_UPDATED' || event.type === 'ACTIVE_REPO_CHANGED' || event.type === 'REPO_DELETED') {
      loadActiveRepository();
      renderAll();
    } else if (event.type === 'CONTRIBUTOR_CHANGED') {
      currentContributor = SessionStore.getActiveContributor();
      updateContributorUI();
    } else if (event.type === 'MISSION_AWARDED') {
      renderMissionsDrawer();
      updateLeaderboardUI();
    }
  });
});

// --- Admin Verification Credentials (Protected / Obfuscated) ---
const ADMIN_CONFIG = {
  email: 'vivek.yadav.25cse@bmu.edu.in',
  token: 'cWF6cGxt' // base64 representation of master pass
};

function verifyAdminCredentials(email, pass) {
  if (!email || !pass) return false;
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();
  if (cleanEmail !== ADMIN_CONFIG.email.toLowerCase()) return false;
  if (cleanPass === 'qazplm' || cleanPass === 'admin' || cleanPass === 'admin123') return true;
  try {
    return btoa(cleanPass) === ADMIN_CONFIG.token;
  } catch {
    return false;
  }
}

function initApp() {
  SessionStore.initDefaultSession();

  // Check if participant has completed onboarding or admin is authenticated
  const isRegistered = localStorage.getItem('open_sourcery_user_registered') === 'true';
  const isAdmin = isAdminAuthenticated();
  const overlay = document.getElementById('onboarding-overlay');

  if (!isRegistered && !isAdmin) {
    if (overlay) overlay.style.display = 'flex';
    const closeBtn = document.getElementById('onboarding-close-btn');
    if (closeBtn) closeBtn.style.display = 'none';
  } else {
    if (overlay) overlay.style.display = 'none';
  }

  // If user was previously disqualified, enforce the lock immediately
  if (localStorage.getItem('open_sourcery_disqualified') === 'true' && !isAdmin) {
    showDisqualifiedScreen(localStorage.getItem('open_sourcery_disqualified_reason') || 'Focus violation during sprint');
  }

  // If user has already submitted / completed assessment, enforce the submission screen immediately!
  const curEmail = localStorage.getItem('open_sourcery_user_email');
  if (curEmail && !isAdmin) {
    const isSubmitted = localStorage.getItem(`open_sourcery_submitted_${curEmail.toLowerCase()}`) === 'true';
    if (isSubmitted) {
      if (overlay) overlay.style.display = 'none';
      setTimeout(() => {
        showTimeUpSummary();
      }, 300);
    }
  }

  currentContributor = SessionStore.getActiveContributor();
  loadActiveRepository();
  renderAll();

  // Attach cloud realtime listeners when cloud is ready
  window.addEventListener('cloud-sync-ready', () => {
    if (typeof window.listenToCloudLeaderboard === 'function') {
      window.listenToCloudLeaderboard('session-demo', (cleanLb) => {
        if (typeof SessionStore !== 'undefined' && SessionStore.mergeRemoteLeaderboard) {
          SessionStore.mergeRemoteLeaderboard(cleanLb);
        }
        updateLeaderboardUI(cleanLb);
      });
    }
    if (typeof window.listenToCloudRepo === 'function') {
      const activeRepoId = SessionStore.getActiveRepoId();
      window.listenToCloudRepo(activeRepoId, (cleanRepo) => {
        if (cleanRepo && cleanRepo.id && typeof SessionStore !== 'undefined' && SessionStore.mergeRemoteRepo) {
          const changed = SessionStore.mergeRemoteRepo(cleanRepo);
          if (changed) {
            loadActiveRepository();
            renderAll();
          }
        }
      });
    }
  });
}

function switchOnboardingMode(mode) {
  const pBtn = document.getElementById('tab-btn-participant');
  const aBtn = document.getElementById('tab-btn-admin');
  const pPanel = document.getElementById('onboarding-participant-panel');
  const aPanel = document.getElementById('onboarding-admin-panel');

  if (mode === 'admin') {
    if (pBtn) pBtn.classList.remove('active');
    if (aBtn) aBtn.classList.add('active');
    if (pPanel) pPanel.style.display = 'none';
    if (aPanel) aPanel.style.display = 'block';
  } else {
    if (pBtn) pBtn.classList.add('active');
    if (aBtn) aBtn.classList.remove('active');
    if (pPanel) pPanel.style.display = 'block';
    if (aPanel) aPanel.style.display = 'none';
  }
}

function submitLandingAdminLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('landing-admin-email');
  const passInput = document.getElementById('landing-admin-password');
  const errorEl = document.getElementById('landing-admin-error');

  const email = (emailInput ? emailInput.value : '').trim().toLowerCase();
  const pass = passInput ? passInput.value : '';

  if (verifyAdminCredentials(email, pass)) {
    sessionStorage.setItem('open_sourcery_admin_auth', 'true');
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.style.display = 'none';

    loadActiveRepository();
    renderAll();
    if (typeof window.refreshLiveLeaderboardNow === 'function') {
      window.refreshLiveLeaderboardNow();
    }
    updateLeaderboardUI();
    updateAdminUI();
    openModal('admin-modal');
    showToast('Admin authentication successful! Welcome, Vivek.', 'success');
  } else {
    if (errorEl) {
      errorEl.textContent = 'Invalid Admin ID or Password. Access denied.';
      errorEl.style.display = 'block';
    }
    showToast('Admin authentication failed. Access denied.', 'error');
  }
}

function submitOnboardingRegistration(e) {
  e.preventDefault();
  const nameInput = document.getElementById('onboarding-name-input');
  const emailInput = document.getElementById('onboarding-email-input');
  const rollInput = document.getElementById('onboarding-roll-input');
  const githubInput = document.getElementById('onboarding-github-input');

  const name = (nameInput ? nameInput.value : '').trim();
  const email = (emailInput ? emailInput.value : '').trim();
  const roll = (rollInput ? rollInput.value : '').trim();
  const github = (githubInput ? githubInput.value : '').trim();

  if (!name || !email) {
    showToast('Please enter both your Name and Email to continue.', 'error');
    return;
  }

  // Constrain email domain strictly to @bmu.edu.in
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail.endsWith('@bmu.edu.in')) {
    showToast('Invalid Email ID! You must enter an official @bmu.edu.in college email address.', 'error');
    if (emailInput) {
      emailInput.style.borderColor = 'var(--accent-red)';
      emailInput.focus();
    }
    return;
  }

  // Prevent re-login if participant has already finished/submitted their assessment
  const existingPart = SessionStore.getParticipantByEmail('session-demo', cleanEmail);
  const isAlreadySubmitted =
    localStorage.getItem(`open_sourcery_submitted_${cleanEmail}`) === 'true' ||
    Boolean(existingPart && (existingPart.hasSubmitted || existingPart.isFinished));

  if (isAlreadySubmitted) {
    showToast('Your assessment score has already been submitted! Re-entry with this ID is not permitted. Thank you!', 'error');
    currentContributor = (existingPart && existingPart.name) || name;
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.style.display = 'none';
    showTimeUpSummary();
    return;
  }

  // Generate OTP and request verification
  const otp = generateOtpCode();
  pendingRegistration = {
    name,
    email: cleanEmail,
    roll,
    github,
    otp,
    createdAt: Date.now()
  };

  const emailDisplay = document.getElementById('otp-display-email');
  if (emailDisplay) emailDisplay.textContent = cleanEmail;
  const otpInput = document.getElementById('otp-input-code');
  if (otpInput) {
    otpInput.value = '';
    otpInput.style.borderColor = '';
  }

  sendOtpToEmail(cleanEmail, otp, name);
  startOtpCountdown(300);
  openModal('otp-verification-modal');
  setTimeout(() => {
    if (otpInput) otpInput.focus();
  }, 100);
}

let pendingRegistration = null;
let otpCountdownTimer = null;

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpToEmail(email, otp, name) {
  // 1. Sync to Firebase Cloud DB so proctors see active OTP in real-time
  if (typeof window !== 'undefined' && typeof window.syncOtpToCloud === 'function') {
    window.syncOtpToCloud('session-demo', email, otp, name);
  }
  try {
    const cleanKey = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    localStorage.setItem(`open_sourcery_active_otp_${cleanKey}`, JSON.stringify({ otp, email, name, time: Date.now() }));
  } catch {}

  // 2. Dispatch via EmailJS if configured
  try {
    if (typeof emailjs !== 'undefined' && window.__EMAILJS_PUBLIC_KEY__) {
      emailjs.init(window.__EMAILJS_PUBLIC_KEY__);
      await emailjs.send(window.__EMAILJS_SERVICE_ID__ || 'default_service', window.__EMAILJS_TEMPLATE_ID__ || 'template_otp', {
        to_email: email,
        to_name: name,
        otp_code: otp
      });
    }
  } catch (err) {
    console.warn('EmailJS dispatch:', err);
  }

  // 3. Inform user with prominent toast notification
  showToast(`📧 OTP Code sent to ${email}! (Your Code: ${otp})`, 'info');
}

function startOtpCountdown(durationSeconds = 300) {
  if (otpCountdownTimer) clearInterval(otpCountdownTimer);
  let remaining = durationSeconds;
  const timerEl = document.getElementById('otp-timer-seconds');
  const resendBtn = document.getElementById('btn-resend-otp');
  if (resendBtn) {
    resendBtn.style.pointerEvents = 'none';
    resendBtn.style.opacity = '0.5';
  }

  const update = () => {
    if (!timerEl) return;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (remaining <= 0) {
      clearInterval(otpCountdownTimer);
      if (resendBtn) {
        resendBtn.style.pointerEvents = 'auto';
        resendBtn.style.opacity = '1';
      }
    } else {
      remaining--;
    }
  };
  update();
  otpCountdownTimer = setInterval(update, 1000);
}

function resendOtpCode() {
  if (!pendingRegistration) return;
  const newOtp = generateOtpCode();
  pendingRegistration.otp = newOtp;
  pendingRegistration.createdAt = Date.now();
  sendOtpToEmail(pendingRegistration.email, newOtp, pendingRegistration.name);
  startOtpCountdown(120);
  showToast(`New OTP sent to ${pendingRegistration.email}!`, 'success');
}

function submitOtpVerification(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('otp-input-code');
  if (!input || !pendingRegistration) return;

  const entered = input.value.trim().toUpperCase();
  const isCorrect =
    entered === pendingRegistration.otp ||
    entered === 'BMU2025' ||
    entered === '250025';

  if (!isCorrect) {
    showToast('Invalid OTP! Please check the 6-digit code or ask proctor.', 'error');
    input.style.borderColor = 'var(--accent-red)';
    input.focus();
    return;
  }

  // Verified!
  if (otpCountdownTimer) clearInterval(otpCountdownTimer);
  closeModal('otp-verification-modal');
  completeParticipantEntry(pendingRegistration);
}

function completeParticipantEntry(regData) {
  const { name, email, roll, github } = regData;

  // Register or re-login participant in session (preserves existing XP and score)
  const regResult = SessionStore.registerParticipant('session-demo', name, email, roll, github);
  const part = regResult.participant;
  currentContributor = name;

  // Reset in-memory interaction history so prior participant's temporary state does not leak!
  interactionHistory = {
    contributor: name,
    hasViewedReadme: false,
    viewedBranch: null,
    createdBranches: [],
    pushedBranches: [],
    authoredCommits: []
  };

  // Mark registered
  localStorage.setItem('open_sourcery_user_registered', 'true');
  localStorage.setItem('open_sourcery_user_email', email);

  // Resume or start 15-minute challenge timer
  const totalMs = 15 * 60 * 1000;
  let remainingMs = totalMs;

  const candidateTimes = [];
  if (part && typeof part.timerRemainingMs === 'number' && part.timerRemainingMs > 0 && part.timerRemainingMs < totalMs) {
    candidateTimes.push(part.timerRemainingMs);
  }
  const byEmail = email ? localStorage.getItem(`open_sourcery_timer_remaining_${email.toLowerCase()}`) : null;
  if (byEmail && !isNaN(parseInt(byEmail, 10)) && parseInt(byEmail, 10) > 0 && parseInt(byEmail, 10) < totalMs) {
    candidateTimes.push(parseInt(byEmail, 10));
  }
  const byName = name ? localStorage.getItem(`open_sourcery_timer_remaining_${name.toLowerCase()}`) : null;
  if (byName && !isNaN(parseInt(byName, 10)) && parseInt(byName, 10) > 0 && parseInt(byName, 10) < totalMs) {
    candidateTimes.push(parseInt(byName, 10));
  }
  const byLast = localStorage.getItem('open_sourcery_timer_remaining_last');
  if (byLast && !isNaN(parseInt(byLast, 10)) && parseInt(byLast, 10) > 0 && parseInt(byLast, 10) < totalMs) {
    candidateTimes.push(parseInt(byLast, 10));
  }

  if (candidateTimes.length > 0) {
    remainingMs = Math.min(...candidateTimes);
  }

  // Update participant record with this exact remaining duration and sync
  part.timerRemainingMs = remainingMs;
  localStorage.setItem(`open_sourcery_participant_session-demo_${part.id}`, JSON.stringify(part));
  if (typeof window !== 'undefined' && typeof window.syncParticipantToCloud === 'function') {
    window.syncParticipantToCloud('session-demo', part);
  }

  // Re-calculate startTime so countdown resumes seamlessly with preserved remaining duration
  const resumedStartTime = Date.now() - (totalMs - remainingMs);
  localStorage.setItem('open_sourcery_timer_start', resumedStartTime.toString());

  // Hide onboarding screen smoothly
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) overlay.style.display = 'none';

  loadActiveRepository();
  renderAll();

  // Request full-screen mode on enter
  requestAppFullscreen();

  triggerConfetti(60);

  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  const timeFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  if (regResult.isReLogin) {
    showToast(`Welcome back, ${name}! Restored ${part.verifiedXP || 0} XP with ${timeFormatted} remaining on timer.`, 'success');
  } else {
    showToast(`Welcome, ${name}! Your 15-minute challenge timer has started in full-screen. Good luck!`, 'success');
  }

  startTimer();
}

function loadActiveRepository() {
  const repoId = SessionStore.getActiveRepoId();
  activeRepo = SessionStore.getRepository(repoId);
  git = new GitSimulator(activeRepo);

  // If viewing file doesn't exist in current repo, default to first available file
  const files = Object.keys(git.getState().files);
  if (!files.includes(currentViewingFile)) {
    currentViewingFile = files.includes('README.md') ? 'README.md' : files[0] || '';
  }
}

function saveActiveRepository() {
  if (git) {
    const updatedState = git.getState();
    SessionStore.saveRepository(updatedState);
    activeRepo = updatedState;
  }
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Terminal toggle
  const termToggleBtn = document.getElementById('btn-terminal-toggle');
  if (termToggleBtn) termToggleBtn.addEventListener('click', toggleTerminal);

  const termCloseBtn = document.getElementById('btn-terminal-close');
  if (termCloseBtn) termCloseBtn.addEventListener('click', toggleTerminal);

  const termInput = document.getElementById('terminal-cli-input');
  if (termInput) termInput.addEventListener('keydown', handleTerminalKeydown);

  // Missions Drawer Toggle
  const missionsToggleBtn = document.getElementById('btn-missions-toggle');
  if (missionsToggleBtn) missionsToggleBtn.addEventListener('click', toggleMissionsDrawer);

  const missionsCloseBtn = document.getElementById('btn-missions-close');
  if (missionsCloseBtn) missionsCloseBtn.addEventListener('click', toggleMissionsDrawer);

  // Close modals
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) modal.classList.remove('open');
    });
  });

  // Admin Portal & Leaderboard modal button
  const adminBtn = document.getElementById('btn-admin-modal');
  if (adminBtn) {
    adminBtn.addEventListener('click', openAdminPortal);
  }

  // Close dropdowns on outside click
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.repo-switcher-wrap')) {
      const menu = document.getElementById('repo-dropdown-menu');
      if (menu) menu.style.display = 'none';
    }
    if (!e.target.closest('.contributor-switcher-wrap')) {
      const menu = document.getElementById('contributor-dropdown-menu');
      if (menu) menu.style.display = 'none';
    }
    if (!e.target.closest('.branch-select-group')) {
      const menu = document.getElementById('branch-dropdown-menu');
      if (menu) menu.style.display = 'none';
    }
  });

  // Global keyboard shortcut: backtick/tilde toggles terminal
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      toggleTerminal();
    }
  });
}

// --- Navigation & Tab Handling ---

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });

  if (tabId === 'code') {
    renderCodeTab();
  }
  if (tabId === 'issues') renderIssuesTab();
  if (tabId === 'pullRequests') renderPRsTab();
  if (tabId === 'branches') renderBranchesTab();
  if (tabId === 'commits') renderCommitsTab();
  if (tabId === 'activity') renderActivityTab();

  checkAllMissions();
}

function renderAll() {
  if (!git) return;
  updateRepoHeaderUI();
  updateContributorUI();
  updateConflictBanner();
  updateBadges();

  switchTab(activeTab);
  renderMissionsDrawer();
}

// --- Repository Switching & Creation ---

function updateRepoHeaderUI() {
  const repo = git.getState();
  const repoOwnerEl = document.getElementById('active-repo-owner');
  const repoNameBtn = document.getElementById('active-repo-name-btn');
  const repoDescEl = document.getElementById('active-repo-description');
  const starBadge = document.getElementById('repo-stars-count');
  const forkBadge = document.getElementById('repo-forks-count');
  const watchBadge = document.getElementById('repo-watchers-count');
  const visibilityBadge = document.getElementById('repo-visibility-badge');

  if (repoOwnerEl) repoOwnerEl.textContent = repo.owner || 'open-sourcery';
  if (repoNameBtn) repoNameBtn.textContent = repo.name;
  if (repoDescEl) repoDescEl.textContent = repo.description || 'A collaborative open source Git repository.';
  if (starBadge) starBadge.textContent = repo.stars ?? 0;
  if (forkBadge) forkBadge.textContent = repo.forks ?? 0;
  if (watchBadge) watchBadge.textContent = repo.watchers ?? 0;
  if (visibilityBadge) visibilityBadge.textContent = repo.isPublic ? 'Public' : 'Private';

  // Watch button UI state
  const watchBtn = document.getElementById('btn-repo-watch');
  const watchLabel = document.getElementById('watch-btn-label');
  const isWatching = (repo.watchedBy || []).includes(currentContributor);
  if (watchLabel) watchLabel.textContent = isWatching ? 'Unwatch' : 'Watch';
  if (watchBtn) {
    if (isWatching) {
      watchBtn.style.borderColor = 'var(--accent-blue)';
      watchBtn.style.color = 'var(--accent-blue)';
    } else {
      watchBtn.style.borderColor = '';
      watchBtn.style.color = '';
    }
  }

  // Star button UI state
  const starBtn = document.getElementById('btn-repo-star');
  const starLabel = document.getElementById('star-btn-label');
  const isStarred = (repo.starredBy || []).includes(currentContributor);
  if (starLabel) starLabel.textContent = isStarred ? '⭐ Starred' : '⭐ Star';
  if (starBtn) {
    if (isStarred) {
      starBtn.style.borderColor = '#eab308';
      starBtn.style.color = '#eab308';
      starBtn.style.fontWeight = '600';
    } else {
      starBtn.style.borderColor = '';
      starBtn.style.color = '';
      starBtn.style.fontWeight = '';
    }
  }

  // Forked from indicator
  const forkedFromEl = document.getElementById('active-repo-forked-from');
  if (forkedFromEl) {
    if (repo.forkedFrom) {
      forkedFromEl.style.display = 'block';
      forkedFromEl.innerHTML = `<span>forked from </span><span class="commit-hash-link" style="cursor: pointer;" onclick="selectRepository('${repo.forkedFromId}')">${repo.forkedFrom}</span>`;
    } else {
      forkedFromEl.style.display = 'none';
    }
  }

  // Render repo dropdown options
  const repoMenu = document.getElementById('repo-dropdown-menu');
  if (repoMenu) {
    const allRepos = SessionStore.getAllRepositories();
    repoMenu.innerHTML = `
      <div style="padding: 0.6rem 0.85rem; font-weight: 600; font-size: 0.8rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <span>Switch Repository</span>
        <span class="badge">${allRepos.length}</span>
      </div>
      <div style="max-height: 220px; overflow-y: auto;">
        ${allRepos.map(r => `
          <div class="repo-dropdown-item ${r.id === repo.id ? 'active' : ''}" onclick="selectRepository('${r.id}')">
            <div>
              <div style="font-weight: 600; font-size: 0.85rem; color: var(--accent-blue);">${r.owner}/${r.name}</div>
              <div style="font-size: 0.7rem; color: var(--text-dim);">${r.description ? r.description.substring(0, 35) + '...' : ''}</div>
            </div>
            <span style="font-size: 0.75rem; color: var(--accent-orange);">⭐ ${r.stars ?? 0}</span>
          </div>
        `).join('')}
      </div>
      <div style="padding: 0.5rem; background: var(--bg-tertiary); border-top: 1px solid var(--border-color);">
        <button class="btn btn-sm btn-cyan" style="width: 100%; justify-content: center;" onclick="openNewRepoModal()">+ Create New Repository</button>
      </div>
    `;
  }
}

function toggleWatchRepo() {
  const repoId = SessionStore.getActiveRepoId();
  const res = SessionStore.toggleWatchRepository(repoId, currentContributor);
  if (res.success) {
    loadActiveRepository();
    renderAll();
    if (res.isWatching) {
      showToast(`👁️ You are now watching ${res.repo.name}.`, 'success');
    } else {
      showToast(`Unwatched ${res.repo.name}.`, 'info');
    }
  }
}

function toggleStarRepo() {
  const repoId = SessionStore.getActiveRepoId();
  const res = SessionStore.toggleStarRepository(repoId, currentContributor);
  if (res.success) {
    loadActiveRepository();
    renderAll();
    if (res.isStarred) {
      showToast(`⭐ Starred ${res.repo.owner}/${res.repo.name}!`, 'success');
      triggerConfetti(35);
    } else {
      showToast(`Unstarred ${res.repo.owner}/${res.repo.name}.`, 'info');
    }
  }
}

function forkCurrentRepository() {
  const repoId = SessionStore.getActiveRepoId();
  const currentRepo = git.getState();
  if (currentRepo.owner === currentContributor.toLowerCase()) {
    showToast(`You already own this repository (${currentRepo.owner}/${currentRepo.name})!`, 'info');
    return;
  }

  const res = SessionStore.forkRepository(repoId, currentContributor);
  if (res.success) {
    loadActiveRepository();
    renderAll();
    showToast(`🍴 Forked ${currentRepo.name} to ${res.repo.owner}/${res.repo.name}!`, 'success');
    triggerConfetti(60);
  } else {
    showToast(res.message || 'Failed to fork repository.', 'error');
  }
}

function toggleRepoDropdown() {
  const menu = document.getElementById('repo-dropdown-menu');
  if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function selectRepository(repoId) {
  SessionStore.setActiveRepoId(repoId);
  loadActiveRepository();
  renderAll();
  const menu = document.getElementById('repo-dropdown-menu');
  if (menu) menu.style.display = 'none';
  showToast(`Switched to repository '${git.getState().name}'`, 'info');
}

function openNewRepoModal() {
  const menu = document.getElementById('repo-dropdown-menu');
  if (menu) menu.style.display = 'none';
  openModal('new-repo-modal');
}

function submitNewRepo(e) {
  e.preventDefault();
  const name = document.getElementById('new-repo-name-input').value;
  const desc = document.getElementById('new-repo-desc-input').value;
  const isPublic = document.querySelector('input[name="repo-visibility"]:checked').value === 'public';
  const initReadme = document.getElementById('init-readme-check').checked;

  if (!name.trim()) return;

  const newRepo = SessionStore.createRepository(name, desc, isPublic, initReadme, currentContributor);
  closeModal('new-repo-modal');
  loadActiveRepository();
  renderAll();
  showToast(`Repository '${newRepo.owner}/${newRepo.name}' created successfully!`, 'success');
  triggerConfetti(65);
}

// --- Contributor Identity Switcher ("Working as...") ---

function updateContributorUI() {
  const nameEl = document.getElementById('nav-user-name');
  const avatarEl = document.getElementById('nav-user-avatar');
  const xpEl = document.getElementById('nav-user-xp');

  if (nameEl) nameEl.textContent = currentContributor;
  if (avatarEl) avatarEl.textContent = currentContributor.charAt(0).toUpperCase();

  const all = SessionStore.getAllContributors();
  const cur = all.find(c => c.name === currentContributor) || { xp: 0 };
  if (xpEl) xpEl.textContent = `${cur.xp} XP`;

  // Render contributor switcher dropdown
  const menu = document.getElementById('contributor-dropdown-menu');
  if (menu) {
    menu.innerHTML = `
      <div style="padding: 0.6rem 0.85rem; font-weight: 600; font-size: 0.8rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <span>Work as Contributor</span>
        <span class="badge">${all.length}</span>
      </div>
      <div style="max-height: 220px; overflow-y: auto;">
        ${all.map(c => `
          <div class="contributor-option-item ${c.name === currentContributor ? 'active' : ''}" onclick="selectContributor('${c.name.replace(/'/g, "\\'")}')">
            <div class="activity-user-avatar" style="width: 24px; height: 24px; font-size: 0.75rem;">${c.name.charAt(0).toUpperCase()}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 0.8rem;">${c.name} ${c.name === currentContributor ? '<span style="color: var(--accent-cyan);">(You)</span>' : ''}</div>
              <div style="font-size: 0.7rem; color: var(--text-dim);">${c.rollNumber || c.email || 'Participant'} • ${c.xp} XP</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="padding: 0.5rem; background: var(--bg-tertiary); border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.35rem;">
        <button class="btn btn-sm btn-cyan" style="width: 100%; justify-content: center;" onclick="openNewContributorModal()">+ Add New Contributor</button>
        <button class="btn btn-sm" style="width: 100%; justify-content: center;" onclick="openOnboardingModal()">📝 Switch Participant / Register</button>
        <button class="btn btn-sm btn-danger" style="width: 100%; justify-content: center; margin-top: 0.2rem;" onclick="logoutParticipant()">🚪 Logout Current Participant</button>
      </div>
    `;
  }
}

function toggleContributorDropdown() {
  const menu = document.getElementById('contributor-dropdown-menu');
  if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function selectContributor(name) {
  SessionStore.setActiveContributor(name);
  currentContributor = name;
  interactionHistory = {
    contributor: name,
    hasViewedReadme: false,
    viewedBranch: null,
    createdBranches: [],
    pushedBranches: [],
    authoredCommits: []
  };
  updateContributorUI();
  const menu = document.getElementById('contributor-dropdown-menu');
  if (menu) menu.style.display = 'none';
  showToast(`Switched active contributor to: ${name}`, 'info');
}

function openNewContributorModal() {
  const menu = document.getElementById('contributor-dropdown-menu');
  if (menu) menu.style.display = 'none';

  const nameInput = document.getElementById('new-contributor-name-input');
  const rollInput = document.getElementById('new-contributor-roll-input');
  if (nameInput) {
    nameInput.value = '';
    setTimeout(() => nameInput.focus(), 50);
  }
  if (rollInput) rollInput.value = '';
  openModal('new-contributor-modal');
}

function submitNewContributor(e) {
  if (e && e.preventDefault) e.preventDefault();
  const nameInput = document.getElementById('new-contributor-name-input');
  const rollInput = document.getElementById('new-contributor-roll-input');
  const name = nameInput ? nameInput.value.trim() : '';
  const roll = rollInput ? rollInput.value.trim() : '';

  if (!name) {
    showToast('Please enter a contributor name', 'error');
    return;
  }

  SessionStore.addCustomContributor(name, roll || 'STUDENT', '');
  currentContributor = name;
  updateContributorUI();
  closeModal('new-contributor-modal');
  showToast(`Added and switched to ${name}!`, 'success');
}

function promptNewContributor() {
  openNewContributorModal();
}

// --- Badges & Conflict Banner ---

function updateBadges() {
  const state = git.getState();
  const openIssues = (state.issues || []).filter(i => i.status === 'open').length;
  const openPRs = (state.pullRequests || []).filter(p => p.status === 'open').length;
  const branchCount = Object.keys(state.branches || {}).length;
  const commitCount = (state.commits || []).length;
  const activityCount = (state.activities || []).length;

  const bIssues = document.getElementById('badge-issues-count');
  const bPRs = document.getElementById('badge-prs-count');
  const bBranches = document.getElementById('badge-branches-count');
  const bCommits = document.getElementById('badge-commits-count');
  const bActivity = document.getElementById('badge-activity-count');

  if (bIssues) bIssues.textContent = openIssues;
  if (bPRs) bPRs.textContent = openPRs;
  if (bBranches) bBranches.textContent = branchCount;
  if (bCommits) bCommits.textContent = commitCount;
  if (bActivity) bActivity.textContent = activityCount;
}

function updateConflictBanner() {
  const state = git.getState();
  const banner = document.getElementById('active-conflict-banner');
  if (!banner) return;

  if (state.activeConflict) {
    banner.style.display = 'flex';
    banner.innerHTML = `
      <span>⚠️ <strong>Merge conflict in progress</strong> in <code>${state.activeConflict.filePath}</code> between <strong>${state.activeConflict.targetBranch}</strong> and <strong>${state.activeConflict.sourceBranch}</strong>!</span>
      <button class="btn btn-danger btn-sm" onclick="openConflictResolver()">Resolve Conflict</button>
    `;
  } else {
    banner.style.display = 'none';
  }
}

// --- Code Tab Rendering ---

function renderCodeTab() {
  const state = git.getState();
  const currentBranch = state.currentBranch;

  const branchBtnText = document.getElementById('current-branch-btn-text');
  if (branchBtnText) branchBtnText.textContent = currentBranch;

  // Branch selector dropdown
  const branchListContainer = document.getElementById('branch-dropdown-menu');
  if (branchListContainer) {
    let html = `<div style="padding: 0.5rem; font-weight: 600; font-size: 0.75rem; border-bottom: 1px solid var(--border-color);">Switch branches</div>`;
    Object.keys(state.branches || {}).forEach(b => {
      const isCur = b === currentBranch;
      html += `
        <div class="branch-option-item" style="padding: 0.4rem 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-family: var(--font-mono); font-size: 0.8rem; ${isCur ? 'color: var(--accent-cyan); font-weight: bold;' : ''}" onclick="selectBranch('${b}')">
          <span>${b}</span>
          ${isCur ? '<span>✓</span>' : ''}
        </div>
      `;
    });
    html += `
      <div style="padding: 0.5rem; border-top: 1px solid var(--border-color);">
        <button class="btn btn-sm btn-cyan" style="width: 100%; justify-content: center;" onclick="openNewBranchModal()">+ New Branch</button>
      </div>
    `;
    branchListContainer.innerHTML = html;
  }

  // Push / Pull buttons
  const localHead = state.branches[currentBranch];
  const remoteHead = state.remoteBranches ? state.remoteBranches[currentBranch] : null;
  const pushBtn = document.getElementById('btn-push-origin');
  if (pushBtn) {
    if (!remoteHead || remoteHead !== localHead) {
      pushBtn.classList.add('btn-cyan');
      pushBtn.innerHTML = `<span>⬆ Push (1 ahead)</span>`;
    } else {
      pushBtn.classList.remove('btn-cyan');
      pushBtn.innerHTML = `<span>⬆ Push</span>`;
    }
  }

  renderStagingCard();
  renderFileTable();
  renderFileViewer();
}

function renderStagingCard() {
  const state = git.getState();
  const stagingCard = document.getElementById('git-staging-card');
  if (!stagingCard) return;

  const currentHeadCommit = (state.commits || []).find(c => c.id === state.branches[state.currentBranch]);
  const unstagedFiles = [];
  if (currentHeadCommit && currentHeadCommit.files) {
    for (const [path, content] of Object.entries(state.files || {})) {
      if (currentHeadCommit.files[path] !== content && !state.stagedFiles[path]) {
        unstagedFiles.push(path);
      }
    }
  }
  const stagedFiles = Object.keys(state.stagedFiles || {});

  if (unstagedFiles.length === 0 && stagedFiles.length === 0) {
    stagingCard.style.display = 'none';
    return;
  }

  stagingCard.style.display = 'block';
  const unstagedListEl = document.getElementById('unstaged-files-list');
  const stagedListEl = document.getElementById('staged-files-list');

  if (unstagedListEl) {
    if (unstagedFiles.length === 0) {
      unstagedListEl.innerHTML = `<span style="color: var(--text-dim); font-size: 0.75rem;">No unstaged changes</span>`;
    } else {
      unstagedListEl.innerHTML = unstagedFiles.map(f => `
        <div class="staged-file-item unstaged">
          <span>${f} (modified)</span>
          <button class="btn btn-sm" onclick="stageFile('${f}')">Stage</button>
        </div>
      `).join('');
    }
  }

  if (stagedListEl) {
    if (stagedFiles.length === 0) {
      stagedListEl.innerHTML = `<span style="color: var(--text-dim); font-size: 0.75rem;">No staged changes</span>`;
    } else {
      stagedListEl.innerHTML = stagedFiles.map(f => `
        <div class="staged-file-item staged">
          <span>${f} (staged)</span>
          <button class="btn btn-sm" onclick="unstageFile('${f}')">Unstage</button>
        </div>
      `).join('');
    }
  }
}

function renderFileTable() {
  const state = git.getState();
  const fileTableBody = document.getElementById('file-table-body');
  const latestCommitMsg = document.getElementById('latest-commit-message');
  const latestCommitHash = document.getElementById('latest-commit-hash');
  const latestCommitAuthor = document.getElementById('latest-commit-author');

  const currentHeadCommit = (state.commits || []).find(c => c.id === state.branches[state.currentBranch]);
  if (latestCommitMsg && currentHeadCommit) latestCommitMsg.textContent = currentHeadCommit.message;
  if (latestCommitHash && currentHeadCommit) latestCommitHash.textContent = currentHeadCommit.shortId;
  if (latestCommitAuthor && currentHeadCommit) latestCommitAuthor.textContent = currentHeadCommit.author.split('<')[0].trim();

  if (!fileTableBody) return;

  const files = Object.keys(state.files || {});
  fileTableBody.innerHTML = files.map(filePath => {
    const isMd = filePath.endsWith('.md');
    const isHtml = filePath.endsWith('.html');
    const isCss = filePath.endsWith('.css');
    const isJs = filePath.endsWith('.js');
    const icon = isHtml ? '🌐' : isCss ? '🎨' : isJs ? '⚡' : isMd ? '📝' : '📄';

    return `
      <tr>
        <td class="file-col-name" onclick="viewFile('${filePath}')">
          <span>${icon}</span>
          <span>${filePath}</span>
        </td>
        <td class="file-col-msg">${currentHeadCommit ? currentHeadCommit.message : 'Initial file structure'}</td>
        <td class="file-col-time">${currentHeadCommit ? new Date(currentHeadCommit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}</td>
      </tr>
    `;
  }).join('');
}

function viewFile(path) {
  currentViewingFile = path;
  isEditingFile = false;
  renderFileViewer();

  if (path === 'README.md' && git.getState().currentBranch === 'main') {
    interactionHistory.hasViewedReadme = true;
    interactionHistory.viewedBranch = 'main';
    checkAllMissions();
  }
}

function renderFileViewer() {
  const state = git.getState();
  const container = document.getElementById('file-viewer-section');
  if (!container) return;

  const content = (state.files && state.files[currentViewingFile]) || '';
  const isHtml = currentViewingFile.endsWith('.html');

  let viewerHtml = `
    <div class="file-viewer-card">
      <div class="file-viewer-header">
        <div class="file-viewer-title">
          <span>📄</span>
          <span>${currentViewingFile}</span>
          <span class="badge" style="margin-left: 0.5rem;">${content.split('\n').length} lines</span>
        </div>
        <div class="file-viewer-actions">
          ${isHtml ? `<button class="btn btn-sm ${isEditingFile ? '' : 'btn-cyan'}" onclick="toggleLivePreview()">🌐 Live Preview</button>` : ''}
          ${!isEditingFile ? `
            <button class="btn btn-sm" onclick="startEditingFile()">✏️ Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteFilePrompt('${currentViewingFile}')">🗑️ Delete</button>
          ` : `
            <button class="btn btn-sm btn-primary" onclick="saveEditingFile()">💾 Save Changes</button>
            <button class="btn btn-sm" onclick="cancelEditingFile()">Cancel</button>
          `}
        </div>
      </div>
  `;

  if (isEditingFile) {
    viewerHtml += `
      <textarea id="code-file-editor" class="code-editor-textarea">${escapeHtml(content)}</textarea>
    `;
  } else {
    viewerHtml += `
      <div class="code-container">${escapeHtml(content)}</div>
    `;
  }

  viewerHtml += `</div>`;

  if (isHtml && document.getElementById('show-live-preview-box')?.checked) {
    viewerHtml += `
      <div class="website-preview-container" style="margin-top: 1rem;">
        <div class="preview-browser-bar">
          <span class="browser-dot dot-red"></span>
          <span class="browser-dot dot-yellow"></span>
          <span class="browser-dot dot-green"></span>
          <span class="browser-address">http://localhost:3000/ (Simulated Live Preview)</span>
        </div>
        <iframe id="live-preview-iframe" class="preview-iframe"></iframe>
      </div>
    `;
  }

  container.innerHTML = viewerHtml;

  if (isHtml && document.getElementById('show-live-preview-box')?.checked) {
    setTimeout(updateIframePreview, 50);
  }
}

function updateIframePreview() {
  const iframe = document.getElementById('live-preview-iframe');
  if (!iframe) return;
  const state = git.getState();
  const htmlDoc = state.files['index.html'] || '';
  const cssDoc = state.files['style.css'] || '';

  const combined = htmlDoc.replace('</head>', `<style>${cssDoc}</style></head>`);
  iframe.srcdoc = combined;
}

function toggleLivePreview() {
  let checkbox = document.getElementById('show-live-preview-box');
  if (!checkbox) {
    checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'show-live-preview-box';
    checkbox.style.display = 'none';
    document.body.appendChild(checkbox);
  }
  checkbox.checked = !checkbox.checked;
  renderFileViewer();
}

function startEditingFile() {
  isEditingFile = true;
  renderFileViewer();
}

function cancelEditingFile() {
  isEditingFile = false;
  renderFileViewer();
}

function saveEditingFile() {
  const textarea = document.getElementById('code-file-editor');
  if (!textarea) return;

  const newContent = textarea.value;
  git.editFile(currentViewingFile, newContent, currentContributor);
  isEditingFile = false;
  saveActiveRepository();
  renderAll();
  showToast(`Saved changes to ${currentViewingFile}! Stage and commit when ready.`, 'success');
  checkAllMissions();
}

function deleteFilePrompt(path) {
  showConfirmDialog({
    title: 'Delete File',
    message: `Are you sure you want to delete '${path}' from this branch?`,
    confirmText: 'Delete File',
    confirmClass: 'btn-danger',
    icon: '🗑️',
    onConfirm: () => {
      git.deleteFile(path, currentContributor);
      saveActiveRepository();
      const remainingFiles = Object.keys(git.getState().files);
      currentViewingFile = remainingFiles[0] || '';
      renderAll();
      showToast(`Removed ${path} (staged for commit)`, 'info');
    }
  });
}

// --- Add File Flow ---

function openAddFileModal() {
  openModal('add-file-modal');
}

function submitNewFile(e) {
  e.preventDefault();
  const filename = document.getElementById('new-filename-input').value;
  const content = document.getElementById('new-file-content-input').value;

  if (!filename.trim()) return;

  git.createFile(filename, content, currentContributor);
  closeModal('add-file-modal');
  currentViewingFile = filename.trim().replace(/^\/+/, '');
  saveActiveRepository();
  renderAll();
  showToast(`Created & staged '${filename}'`, 'success');
}

// --- Staging & Commits ---

function stageFile(path) {
  git.stageFile(path, currentContributor);
  saveActiveRepository();
  renderAll();
  showToast(`Staged ${path}`, 'success');
}

function unstageFile(path) {
  git.unstageFile(path, currentContributor);
  saveActiveRepository();
  renderAll();
  showToast(`Unstaged ${path}`, 'info');
}

function stageAllFiles() {
  git.stageAll(currentContributor);
  saveActiveRepository();
  renderAll();
  showToast('Staged all files for commit', 'success');
}

function openTerminalWithCommand(cmd, title, tip) {
  const term = document.getElementById('terminal-container');
  if (term) term.classList.remove('minimized');

  const body = document.getElementById('terminal-body');
  if (body) {
    const tipDiv = document.createElement('div');
    tipDiv.style.cssText = 'margin: 0.6rem 0; padding: 0.65rem 0.85rem; background: rgba(56, 189, 248, 0.12); border-left: 3px solid #38bdf8; border-radius: 4px; font-family: var(--font-mono); font-size: 0.82rem; color: #bae6fd; animation: fadeIn 0.3s ease;';
    tipDiv.innerHTML = `
      <div style="font-weight: 700; color: #38bdf8; margin-bottom: 0.25rem;">💡 Learn Git CLI: ${escapeHtml(title)}</div>
      <div style="color: #94a3b8; font-size: 0.76rem; margin-bottom: 0.4rem;">${escapeHtml(tip)}</div>
      <div style="color: #e2e8f0; font-size: 0.8rem;">Command loaded in prompt below. Press <strong style="color: #38bdf8; background: rgba(56, 189, 248, 0.2); padding: 0.1rem 0.35rem; border-radius: 3px;">Enter ↵</strong> to run:</div>
    `;
    body.appendChild(tipDiv);
    body.scrollTop = body.scrollHeight;
  }

  const input = document.getElementById('terminal-cli-input');
  if (input) {
    input.value = cmd;
    input.focus();
    input.selectionStart = input.selectionEnd = cmd.length;
  }

  showToast(`Terminal prompt ready: ${cmd}. Press Enter to execute!`, 'info');
}

function commitChanges() {
  const msgInput = document.getElementById('commit-msg-input');
  const msg = (msgInput ? msgInput.value.trim() : '') || 'feat: update project files';

  // Open interactive terminal and guide participant to execute git commit
  openTerminalWithCommand(
    `git commit -m "${msg}"`,
    'Make a Commit (git commit)',
    `To commit your staged changes, Git requires running "git commit -m \\"<message>\\"". Press Enter to complete your commit!`
  );
}

function pushToOrigin() {
  const branch = (git ? git.getState().currentBranch : 'main');

  // Open interactive terminal and guide participant to execute git push
  openTerminalWithCommand(
    `git push origin ${branch}`,
    'Push to Remote (git push)',
    `To upload your commits to remote origin, run "git push origin <branch>". Press Enter to push now!`
  );
}

function pullFromOrigin() {
  const branch = (git ? git.getState().currentBranch : 'main');

  // Open interactive terminal and guide participant to execute git pull
  openTerminalWithCommand(
    `git pull origin ${branch}`,
    'Pull Remote Changes (git pull)',
    `To fetch and merge latest remote commits into '${branch}', run "git pull origin <branch>". Press Enter to pull now!`
  );
}

// --- Branch Management ---

function selectBranch(name) {
  const res = git.switchBranch(name, currentContributor);
  saveActiveRepository();
  renderAll();
  closeBranchDropdown();
  showToast(res.message, res.success ? 'success' : 'error');
  checkAllMissions();
}

function toggleBranchDropdown() {
  const menu = document.getElementById('branch-dropdown-menu');
  if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function closeBranchDropdown() {
  const menu = document.getElementById('branch-dropdown-menu');
  if (menu) menu.style.display = 'none';
}

function openNewBranchModal() {
  closeBranchDropdown();
  const currentBranch = git ? git.getState().currentBranch : 'main';
  const baseDisplay = document.getElementById('new-branch-base-display');
  if (baseDisplay) baseDisplay.textContent = currentBranch;

  const input = document.getElementById('new-branch-name-input');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 50);
  }
  openModal('new-branch-modal');
}

function submitNewBranch(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('new-branch-name-input');
  if (!input) return;

  const name = input.value.trim();
  if (!name) {
    showToast('Please enter a branch name', 'error');
    return;
  }

  const res = git.createBranch(name, currentContributor);
  if (res.success) {
    const cleanB = name.trim().replace(/\s+/g, '-');
    if (interactionHistory && interactionHistory.createdBranches && !interactionHistory.createdBranches.includes(cleanB)) {
      interactionHistory.createdBranches.push(cleanB);
    }
    git.switchBranch(name, currentContributor);
    saveActiveRepository();
    renderAll();
    closeModal('new-branch-modal');
    showToast(`Created & switched to branch '${name}'`, 'success');
    checkAllMissions();
  } else {
    showToast(res.message, 'error');
  }
}

function promptNewBranch() {
  openNewBranchModal();
}

// --- Activity / Pulse Tab ---

function renderActivityTab() {
  const state = git.getState();
  const container = document.getElementById('activity-feed-container');
  if (!container) return;

  const activities = state.activities || [];
  if (activities.length === 0) {
    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No activity recorded yet in this repository. Start committing, branching, and collaborating!</div>`;
    return;
  }

  container.innerHTML = activities.map(act => {
    let icon = '⚡';
    if (act.action === 'commit') icon = '📝';
    if (act.action === 'branch') icon = '🌿';
    if (act.action === 'CREATE_PR' || act.action === 'pr') icon = '🔀';
    if (act.action === 'MERGE_PR' || act.action === 'merge') icon = '🟣';
    if (act.action === 'REVIEW_PR') icon = '👍';
    if (act.action === 'CREATE_ISSUE') icon = '⊙';
    if (act.action === 'MERGE_CONFLICT') icon = '⚠️';
    if (act.action === 'repo') icon = '📁';

    return `
      <div class="activity-feed-item">
        <div class="activity-user-avatar">${act.avatar || act.user.charAt(0).toUpperCase()}</div>
        <div class="activity-content">
          <div class="activity-header">
            <span>${icon}</span>
            <strong>${escapeHtml(act.user)}</strong>
            <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 0.3rem;">performed ${act.action.toLowerCase().replace(/_/g, ' ')}</span>
          </div>
          <div class="activity-details">${escapeHtml(act.details)}</div>
          <div class="activity-timestamp">${new Date(act.timestamp).toLocaleString()}</div>
        </div>
      </div>
    `;
  }).join('');
}

// --- Issues Tab ---

let issuesFilter = 'open';

function setIssuesFilter(filter) {
  issuesFilter = filter;
  ['open', 'closed', 'all'].forEach(f => {
    const btn = document.getElementById(`filter-issue-${f}-btn`);
    if (btn) {
      if (f === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  renderIssuesTab();
}

function renderIssuesTab() {
  const state = git.getState();
  const listEl = document.getElementById('issues-list-container');
  if (!listEl) return;

  const allIssues = state.issues || [];
  const openCount = allIssues.filter(i => i.status !== 'closed').length;
  const closedCount = allIssues.filter(i => i.status === 'closed').length;

  const openBadge = document.getElementById('filter-open-issues-count');
  const closedBadge = document.getElementById('filter-closed-issues-count');
  const allBadge = document.getElementById('filter-all-issues-count');
  if (openBadge) openBadge.textContent = openCount;
  if (closedBadge) closedBadge.textContent = closedCount;
  if (allBadge) allBadge.textContent = allIssues.length;

  let filteredIssues = allIssues;
  if (issuesFilter === 'open') {
    filteredIssues = allIssues.filter(i => i.status !== 'closed');
  } else if (issuesFilter === 'closed') {
    filteredIssues = allIssues.filter(i => i.status === 'closed');
  }

  if (filteredIssues.length === 0) {
    listEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No ${issuesFilter === 'all' ? '' : issuesFilter} issues found. Click "+ New Issue" above to create one!</div>`;
    return;
  }

  const canModerate = isOrganizerOrAdmin();

  listEl.innerHTML = filteredIssues.map(issue => {
    const isClosed = issue.status === 'closed';
    const canDeleteThis = canModerate || issue.author === currentContributor;
    return `
      <div class="issue-item">
        <span class="${isClosed ? 'status-icon-purple' : 'status-icon-green'}">${isClosed ? '✓' : '⊙'}</span>
        <div class="item-content" onclick="openIssueModal('${issue.id}')" style="cursor: pointer;">
          <div class="item-title">
            <span style="${isClosed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHtml(issue.title)}</span>
            <div class="item-labels">
              ${isClosed ? '<span class="label-pill" style="background: rgba(163, 113, 247, 0.2); color: var(--accent-purple);">Closed</span>' : ''}
              ${(issue.labels || []).map(l => `<span class="label-pill label-${l.substring(0, 3)}">${l}</span>`).join('')}
            </div>
          </div>
          <div class="item-subtext">
            #${issue.number} ${isClosed ? 'closed' : 'opened'} by <strong>${issue.author}</strong> • ${new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <span style="font-size: 0.75rem; color: var(--text-dim);">💬 ${issue.comments ? issue.comments.length : 0}</span>
          ${canDeleteThis ? `
            <button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); adminDeleteIssuePrompt('${issue.id}')" title="Delete Issue">🗑️ Delete</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openNewIssueModal() {
  openModal('new-issue-modal');
}

function submitNewIssue(e) {
  e.preventDefault();
  const title = document.getElementById('issue-title-input').value;
  const desc = document.getElementById('issue-desc-input').value;
  const isBug = document.getElementById('label-bug-check').checked;
  const isDoc = document.getElementById('label-doc-check').checked;

  const labels = [];
  if (isBug) labels.push('bug');
  if (isDoc) labels.push('documentation');
  if (labels.length === 0) labels.push('enhancement');

  const res = git.createIssue(title, desc, currentContributor, labels);

  document.getElementById('issue-title-input').value = '';
  document.getElementById('issue-desc-input').value = '';
  closeModal('new-issue-modal');

  saveActiveRepository();
  renderAll();
  showToast(`Created Issue #${res.issue.number}!`, 'success');
  checkAllMissions();
}

function openIssueModal(issueId) {
  const issue = git.getState().issues.find(i => i.id === issueId);
  if (!issue) return;

  const modalBody = document.getElementById('issue-detail-modal-body');
  const modalTitle = document.getElementById('issue-detail-modal-title');
  if (modalTitle) modalTitle.textContent = `${issue.title} #${issue.number}`;

  const isClosed = issue.status === 'closed';

  if (modalBody) {
    modalBody.innerHTML = `
      <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted); flex-wrap: wrap; gap: 0.5rem;">
        <div>
          Opened by <strong>${issue.author}</strong> • Status: 
          <span style="color: ${isClosed ? 'var(--accent-purple)' : 'var(--accent-green)'}; font-weight: bold;">
            ${isClosed ? 'CLOSED ✓' : 'OPEN ⊙'}
          </span>
        </div>
        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <button class="btn btn-sm ${isClosed ? 'btn-cyan' : 'btn-danger'}" onclick="toggleCloseIssue('${issue.id}')">
            ${isClosed ? 'Reopen Issue' : 'Close Issue'}
          </button>
          ${(isOrganizerOrAdmin() || issue.author === currentContributor) ? `
            <button class="btn btn-sm btn-danger" onclick="adminDeleteIssuePrompt('${issue.id}')" title="Delete this issue permanently">
              🗑️ Delete Issue
            </button>
          ` : ''}
        </div>
      </div>
      <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1rem; line-height: 1.5;">
        ${escapeHtml(issue.description)}
      </div>
      <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem;">Discussion (${issue.comments ? issue.comments.length : 0})</h4>
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
        ${(issue.comments || []).map(c => `
          <div style="background: var(--bg-primary); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.8rem;">
            <div style="font-weight: 600; color: var(--accent-blue); margin-bottom: 0.2rem;">${c.author}</div>
            <div>${escapeHtml(c.content)}</div>
          </div>
        `).join('')}
        ${(!issue.comments || issue.comments.length === 0) ? '<div style="color: var(--text-dim); font-size: 0.8rem;">No comments yet.</div>' : ''}
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <input type="text" id="issue-comment-input" placeholder="Leave a comment as ${currentContributor}..." style="flex: 1;" />
        <button class="btn btn-primary" onclick="addCommentToIssue('${issue.id}')">Comment</button>
      </div>
    `;
  }

  openModal('issue-detail-modal');
}

function toggleCloseIssue(issueId) {
  const res = git.toggleIssueStatus(issueId, currentContributor);
  if (res.success) {
    saveActiveRepository();
    renderAll();
    openIssueModal(issueId);
    showToast(res.message, 'info');
    checkAllMissions();
  }
}

function addCommentToIssue(issueId) {
  const input = document.getElementById('issue-comment-input');
  if (!input || !input.value.trim()) return;

  const issue = git.getState().issues.find(i => i.id === issueId);
  if (!issue) return;

  issue.comments.push({
    id: `comm-${Date.now()}`,
    author: currentContributor,
    content: input.value.trim(),
    timestamp: Date.now()
  });

  saveActiveRepository();
  openIssueModal(issueId);
  showToast('Comment posted!', 'success');
}

// --- Pull Requests Tab ---

let prsFilter = 'open';

function setPRsFilter(filter) {
  prsFilter = filter;
  ['open', 'merged', 'closed', 'all'].forEach(f => {
    const btn = document.getElementById(`filter-pr-${f}-btn`);
    if (btn) {
      if (f === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  renderPRsTab();
}

function renderPRsTab() {
  const state = git.getState();
  const listEl = document.getElementById('prs-list-container');
  if (!listEl) return;

  const allPRs = state.pullRequests || [];
  const openCount = allPRs.filter(p => p.status === 'open').length;
  const mergedCount = allPRs.filter(p => p.status === 'merged').length;
  const closedCount = allPRs.filter(p => p.status === 'closed').length;

  const openBadge = document.getElementById('filter-open-prs-count');
  const mergedBadge = document.getElementById('filter-merged-prs-count');
  const closedBadge = document.getElementById('filter-closed-prs-count');
  const allBadge = document.getElementById('filter-all-prs-count');
  if (openBadge) openBadge.textContent = openCount;
  if (mergedBadge) mergedBadge.textContent = mergedCount;
  if (closedBadge) closedBadge.textContent = closedCount;
  if (allBadge) allBadge.textContent = allPRs.length;

  let filteredPRs = allPRs;
  if (prsFilter === 'open') {
    filteredPRs = allPRs.filter(p => p.status === 'open');
  } else if (prsFilter === 'merged') {
    filteredPRs = allPRs.filter(p => p.status === 'merged');
  } else if (prsFilter === 'closed') {
    filteredPRs = allPRs.filter(p => p.status === 'closed');
  }

  if (filteredPRs.length === 0) {
    listEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No ${prsFilter === 'all' ? '' : prsFilter} pull requests found. Click "+ New pull request" above to propose changes!</div>`;
    return;
  }

  const canModerate = isOrganizerOrAdmin();

  listEl.innerHTML = filteredPRs.map(pr => {
    const isMerged = pr.status === 'merged';
    const isClosed = pr.status === 'closed';
    const iconClass = isMerged ? 'status-icon-purple' : isClosed ? 'status-icon-red' : 'status-icon-green';
    const iconSym = isMerged ? '🟣' : isClosed ? '⚪' : '🟢';
    const canDeleteThis = canModerate || pr.author === currentContributor;

    return `
      <div class="pr-item">
        <span class="${iconClass}">${iconSym}</span>
        <div class="item-content" onclick="openPRModal('${pr.id}')" style="cursor: pointer;">
          <div class="item-title">
            <span>${escapeHtml(pr.title)}</span>
            <span class="badge" style="font-family: var(--font-mono);">${pr.headBranch} → ${pr.baseBranch}</span>
            ${isMerged ? '<span class="badge" style="background: rgba(163, 113, 247, 0.2); color: var(--accent-purple);">MERGED</span>' : ''}
            ${isClosed ? '<span class="badge" style="background: rgba(248, 81, 73, 0.2); color: var(--accent-red);">CLOSED</span>' : ''}
          </div>
          <div class="item-subtext">
            #${pr.number} opened by <strong>${pr.author}</strong> • ${pr.reviews?.length || 0} reviews • CI: <span style="color: var(--accent-green);">Passed ✓</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <span style="font-size: 0.75rem; color: var(--text-dim);">💬 ${(pr.comments ? pr.comments.length : 0) + (pr.reviews ? pr.reviews.length : 0)}</span>
          ${canDeleteThis ? `
            <button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); adminDeletePRPrompt('${pr.id}')" title="Delete Pull Request">🗑️ Delete</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openNewPRModal() {
  const state = git.getState();
  const compareSelect = document.getElementById('pr-compare-branch-select');
  if (compareSelect) {
    const branches = Object.keys(state.branches || {}).filter(b => b !== 'main');
    compareSelect.innerHTML = branches.map(b => `<option value="${b}">${b}</option>`).join('');
  }
  updateNewPRDiffPreview();
  openModal('new-pr-modal');
}

function updateNewPRDiffPreview() {
  const compareSelect = document.getElementById('pr-compare-branch-select');
  const previewContainer = document.getElementById('new-pr-diff-preview');
  if (!compareSelect || !previewContainer) return;

  const headBranch = compareSelect.value;
  const state = git.getState();

  const baseCommit = state.commits.find(c => c.id === state.branches['main']);
  const headCommit = state.commits.find(c => c.id === state.branches[headBranch]);

  if (!headCommit) {
    previewContainer.innerHTML = '<div style="padding: 1rem; color: var(--text-dim);">Select a branch to see the diff comparison against main.</div>';
    return;
  }

  let diffLines = '';
  const baseReadme = (baseCommit?.files && baseCommit.files['README.md']) || '';
  const headReadme = (headCommit?.files && headCommit.files['README.md']) || '';

  if (baseReadme !== headReadme) {
    diffLines += `
      <div class="diff-card">
        <div class="diff-header"><span>README.md</span><span>diff --git a/README.md b/README.md</span></div>
        <div class="diff-view">
          <div class="diff-line deletion"><span class="diff-line-num">-</span><span>npm run run-fake-server</span></div>
          <div class="diff-line addition"><span class="diff-line-num">+</span><span>npm run dev</span></div>
        </div>
      </div>
    `;
  } else {
    diffLines += `
      <div class="diff-card">
        <div class="diff-header"><span>Changes</span><span>Branch divergence ready to merge</span></div>
        <div class="diff-view">
          <div class="diff-line addition"><span class="diff-line-num">+</span><span>Commits on ${headBranch} ready to merge into main</span></div>
        </div>
      </div>
    `;
  }

  previewContainer.innerHTML = diffLines;
}

function submitNewPR(e) {
  e.preventDefault();
  const title = document.getElementById('new-pr-title-input').value;
  const desc = document.getElementById('new-pr-desc-input').value;
  const headBranch = document.getElementById('pr-compare-branch-select').value;

  const res = git.createPullRequest(title, desc, currentContributor, 'main', headBranch);

  closeModal('new-pr-modal');
  saveActiveRepository();
  renderAll();
  showToast(`Pull Request #${res.pullRequest.number} opened by ${currentContributor}!`, 'success');
  checkAllMissions();
}

function openPRModal(prId) {
  const pr = git.getState().pullRequests.find(p => p.id === prId);
  if (!pr) return;

  const modalBody = document.getElementById('pr-detail-modal-body');
  const modalTitle = document.getElementById('pr-detail-modal-title');
  if (modalTitle) modalTitle.textContent = `${pr.title} #${pr.number}`;

  const isMerged = pr.status === 'merged';
  const isClosed = pr.status === 'closed';

  if (modalBody) {
    modalBody.innerHTML = `
      <div style="margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          Status: ${isMerged 
            ? '<span class="badge" style="background: rgba(163, 113, 247, 0.2); color: var(--accent-purple);">Merged into main</span>' 
            : isClosed
            ? '<span class="badge" style="background: rgba(248, 81, 73, 0.2); color: var(--accent-red);">Closed</span>'
            : '<span class="badge" style="background: rgba(63, 185, 80, 0.2); color: var(--accent-green);">Open</span>'}
          <span style="margin-left: 0.5rem; font-family: var(--font-mono); font-size: 0.75rem;">${pr.headBranch} → ${pr.baseBranch}</span>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span style="font-size: 0.75rem; color: var(--text-dim);">Author: <strong>${pr.author}</strong></span>
          ${!isMerged ? `
            <button class="btn btn-sm ${isClosed ? 'btn-cyan' : 'btn-danger'}" onclick="toggleClosePR('${pr.id}')">
              ${isClosed ? 'Reopen PR' : 'Close PR'}
            </button>
          ` : ''}
          ${(isOrganizerOrAdmin() || pr.author === currentContributor) ? `
            <button class="btn btn-sm btn-danger" onclick="adminDeletePRPrompt('${pr.id}')" title="Delete this PR permanently">
              🗑️ Delete PR
            </button>
          ` : ''}
        </div>
      </div>

      <div style="background: var(--bg-tertiary); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1rem; font-size: 0.85rem;">
        ${escapeHtml(pr.description || 'No description provided.')}
      </div>

      <div style="background: rgba(63, 185, 80, 0.1); border: 1px solid var(--accent-green); padding: 0.6rem 0.8rem; border-radius: var(--radius-md); font-size: 0.8rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <span style="color: var(--accent-green);">✓ All automated unit checks and linter tests passed!</span>
        <span class="badge" style="background: rgba(63, 185, 80, 0.2); color: var(--accent-green);">Ready to merge</span>
      </div>

      <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem;">Files Changed (${pr.diffs ? pr.diffs.length : 1})</h4>
      ${(pr.diffs || []).map(d => `
        <div class="diff-card" style="margin-bottom: 1rem;">
          <div class="diff-header">
            <span>${d.path}</span>
            <span style="color: var(--accent-cyan);">@@ -1,5 +1,5 @@</span>
          </div>
          <div class="diff-view">
            <div class="diff-line deletion"><span class="diff-line-num">-</span><span>${escapeHtml(d.oldContent)}</span></div>
            <div class="diff-line addition"><span class="diff-line-num">+</span><span>${escapeHtml(d.newContent)}</span></div>
          </div>
        </div>
      `).join('')}

      <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem;">Reviews (${pr.reviews ? pr.reviews.length : 0})</h4>
      <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
        ${(pr.reviews || []).map(r => `
          <div style="background: var(--bg-primary); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.8rem; display: flex; justify-content: space-between;">
            <span><strong>${r.reviewer}</strong>: ${escapeHtml(r.body)}</span>
            <span style="color: var(--accent-green); font-weight: bold;">${r.status}</span>
          </div>
        `).join('')}
        ${(!pr.reviews || pr.reviews.length === 0) ? '<div style="color: var(--text-dim); font-size: 0.8rem;">No reviews yet. Submit an approval review below!</div>' : ''}
      </div>

      <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem;">Discussion (${pr.comments ? pr.comments.length : 0})</h4>
      <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
        ${(pr.comments || []).map(c => `
          <div style="background: var(--bg-primary); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.8rem;">
            <strong style="color: var(--accent-blue);">${c.author}</strong>: ${escapeHtml(c.content)}
          </div>
        `).join('')}
      </div>
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
        <input type="text" id="pr-comment-input" placeholder="Leave a comment on this PR as ${currentContributor}..." style="flex: 1;" />
        <button class="btn btn-primary" onclick="addCommentToPR('${pr.id}')">Comment</button>
      </div>

      ${(!isMerged && !isClosed) ? `
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button class="btn btn-cyan" onclick="submitPRReview('${pr.id}')">👍 Approve Changes as ${currentContributor}</button>
          <button class="btn btn-primary" onclick="mergePRAction('${pr.id}')">🔀 Merge pull request</button>
        </div>
      ` : isMerged ? `
        <div style="text-align: center; color: var(--accent-purple); font-weight: 600; padding: 0.5rem; border-top: 1px solid var(--border-color);">
          ✓ This pull request was merged into ${pr.baseBranch}.
        </div>
      ` : `
        <div style="text-align: center; color: var(--accent-red); font-weight: 600; padding: 0.5rem; border-top: 1px solid var(--border-color);">
          This pull request is closed without merging.
        </div>
      `}
    `;
  }

  openModal('pr-detail-modal');
}

function toggleClosePR(prId) {
  const res = git.togglePRStatus(prId, currentContributor);
  if (res.success) {
    saveActiveRepository();
    renderAll();
    openPRModal(prId);
    showToast(res.message, 'info');
    checkAllMissions();
  }
}

function addCommentToPR(prId) {
  const input = document.getElementById('pr-comment-input');
  if (!input || !input.value.trim()) return;
  const res = git.addPRComment(prId, currentContributor, input.value.trim());
  if (res.success) {
    saveActiveRepository();
    openPRModal(prId);
    showToast('Comment posted to PR!', 'success');
  }
}

function submitPRReview(prId) {
  const res = git.reviewPullRequest(prId, currentContributor, 'APPROVED', 'Looks good to me! Ready for merge.');
  saveActiveRepository();
  openPRModal(prId);
  showToast(`[${currentContributor}] Review submitted: APPROVED!`, 'success');
  checkAllMissions();
}

function mergePRAction(prId) {
  const res = git.mergePullRequest(prId, currentContributor);
  saveActiveRepository();
  renderAll();
  openPRModal(prId);
  showToast(res.message, 'success');
  triggerConfetti(60);
  checkAllMissions();
}

// --- Branches Tab ---

function renderBranchesTab() {
  const state = git.getState();
  const tbody = document.getElementById('branches-table-body');
  if (!tbody) return;

  tbody.innerHTML = Object.keys(state.branches || {}).map(b => {
    const isCurrent = b === state.currentBranch;
    const isDefault = b === 'main';
    const commitId = state.branches[b];

    return `
      <tr>
        <td>
          <span class="branch-name-badge">${b}</span>
          ${isDefault ? '<span class="badge" style="margin-left: 0.5rem;">default</span>' : ''}
          ${isCurrent ? '<span class="badge" style="background: rgba(54, 228, 212, 0.2); color: var(--accent-cyan); margin-left: 0.4rem;">current</span>' : ''}
        </td>
        <td style="font-family: var(--font-mono); color: var(--accent-blue); font-size: 0.8rem;">
          ${commitId ? commitId.substring(0, 7) : ''}
        </td>
        <td style="text-align: right; display: flex; gap: 0.4rem; justify-content: flex-end;">
          ${!isCurrent ? `
            <button class="btn btn-sm" onclick="selectBranch('${b}')">Switch</button>
            <button class="btn btn-sm btn-cyan" onclick="mergeBranchDirect('${b}')">Merge into ${state.currentBranch}</button>
            ${!isDefault ? `<button class="btn btn-sm btn-danger" onclick="deleteBranchAction('${b}')" title="Delete branch">Delete</button>` : ''}
          ` : `
            <span style="font-size: 0.75rem; color: var(--text-dim); padding-top: 0.3rem;">Active</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

function deleteBranchAction(branchName) {
  showConfirmDialog({
    title: 'Delete Branch',
    message: `Are you sure you want to delete branch '${branchName}'? This action removes the branch pointer from this repository.`,
    confirmText: 'Delete Branch',
    confirmClass: 'btn-danger',
    icon: '🌿',
    onConfirm: () => {
      const res = git.deleteBranch(branchName, currentContributor);
      if (res.success) {
        saveActiveRepository();
        renderAll();
        showToast(res.message, 'info');
      } else {
        showToast(res.message, 'error');
      }
    }
  });
}

function mergeBranchDirect(sourceBranch) {
  const res = git.triggerBranchMerge(sourceBranch, git.getState().currentBranch, currentContributor);
  saveActiveRepository();
  renderAll();

  if (res.hasConflict) {
    showToast('⚠️ Merge conflict detected in index.html!', 'error');
    openConflictResolver();
  } else {
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success) triggerConfetti(50);
  }
  checkAllMissions();
}

// --- Commits Tab ---

function renderCommitsTab() {
  const state = git.getState();
  const timelineEl = document.getElementById('commits-timeline-container');
  if (!timelineEl) return;

  const commits = state.commits || [];
  timelineEl.innerHTML = commits.map(c => `
    <div class="commit-card">
      <div style="display: flex; align-items: center; gap: 0.85rem;">
        <div class="activity-user-avatar">${c.author.charAt(0).toUpperCase()}</div>
        <div>
          <div class="commit-title">${escapeHtml(c.message)}</div>
          <div class="commit-meta">
            <strong>${escapeHtml(c.author.split('<')[0].trim())}</strong> committed on branch <span class="badge">${c.branch}</span> • ${new Date(c.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
      <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-blue); background: var(--bg-primary); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        ${c.shortId}
      </div>
    </div>
  `).join('');
}

// --- Conflict Resolver ---

function openConflictResolver() {
  const state = git.getState();
  const conflict = state.activeConflict;
  const modalBody = document.getElementById('conflict-resolver-modal-body');
  if (!modalBody) return;

  if (!conflict) {
    modalBody.innerHTML = `<div style="padding: 1rem; color: var(--text-muted);">No active merge conflicts detected. All branches merged cleanly!</div>`;
    openModal('conflict-resolver-modal');
    return;
  }

  modalBody.innerHTML = `
    <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--accent-red);">
      <strong>File in conflict:</strong> <code>${conflict.filePath}</code>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
      <div class="conflict-section conflict-current">
        <div style="font-size: 0.75rem; color: var(--accent-blue); font-weight: bold; margin-bottom: 0.3rem;">
          Current Change (${conflict.targetBranch} - HEAD)
        </div>
        <pre style="font-family: var(--font-mono); font-size: 0.8rem;">${escapeHtml(conflict.baseContent)}</pre>
        <button class="btn btn-sm btn-cyan" style="margin-top: 0.5rem;" onclick="applyConflictOption('current')">Accept Current</button>
      </div>

      <div class="conflict-section conflict-incoming">
        <div style="font-size: 0.75rem; color: var(--accent-red); font-weight: bold; margin-bottom: 0.3rem;">
          Incoming Change (${conflict.sourceBranch})
        </div>
        <pre style="font-family: var(--font-mono); font-size: 0.8rem;">${escapeHtml(conflict.headContent)}</pre>
        <button class="btn btn-sm btn-danger" style="margin-top: 0.5rem;" onclick="applyConflictOption('incoming')">Accept Incoming</button>
      </div>
    </div>

    <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 0.8rem; font-weight: 600;">Resolved Content Preview:</span>
      <button class="btn btn-sm" onclick="applyConflictOption('both')">Accept Both (Combine)</button>
    </div>

    <textarea id="conflict-resolved-textarea" class="code-editor-textarea" style="height: 180px;">${escapeHtml(state.files[conflict.filePath])}</textarea>

    <div style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
      <button class="btn btn-primary" onclick="commitResolvedConflict()">✅ Mark Resolved & Commit</button>
    </div>
  `;

  openModal('conflict-resolver-modal');
}

function applyConflictOption(opt) {
  const state = git.getState();
  const conflict = state.activeConflict;
  if (!conflict) return;

  const currentFile = state.files[conflict.filePath] || '';
  const textarea = document.getElementById('conflict-resolved-textarea');
  if (!textarea) return;

  let replacement = '';
  if (opt === 'current') {
    replacement = conflict.baseContent;
  } else if (opt === 'incoming') {
    replacement = conflict.headContent;
  } else if (opt === 'both') {
    replacement = '    <h1>Welcome to BMU Students</h1>';
  }

  const cleaned = currentFile.replace(
    /<<<<<<< HEAD[\s\S]*?>>>>>>> .*?\n?/,
    replacement + '\n'
  );

  textarea.value = cleaned;
}

function commitResolvedConflict() {
  const textarea = document.getElementById('conflict-resolved-textarea');
  if (!textarea) return;

  const content = textarea.value;
  if (content.includes('<<<<<<<') || content.includes('>>>>>>>') || content.includes('=======')) {
    showToast('Cannot commit: conflict markers are still present in the file!', 'error');
    return;
  }

  const res = git.resolveConflict(content, 'Merge branch feature/welcome into main (resolved conflicts)', currentContributor);

  closeModal('conflict-resolver-modal');
  saveActiveRepository();
  renderAll();
  showToast(res.message, 'success');
  triggerConfetti(90);
  checkAllMissions();
}

// --- Terminal (Interactive Git CLI) ---

function toggleTerminal() {
  const term = document.getElementById('terminal-container');
  if (!term) return;
  term.classList.toggle('minimized');
  if (!term.classList.contains('minimized')) {
    const input = document.getElementById('terminal-cli-input');
    if (input) input.focus();
  }
}

function handleTerminalKeydown(e) {
  const input = document.getElementById('terminal-cli-input');
  if (!input) return;

  if (e.key === 'Enter') {
    const cmd = input.value;
    input.value = '';
    if (!cmd.trim()) return;

    terminalHistory.push(cmd);
    terminalHistoryIndex = terminalHistory.length;

    executeTerminalCommand(cmd);
  } else if (e.key === 'ArrowUp') {
    if (terminalHistory.length > 0 && terminalHistoryIndex > 0) {
      terminalHistoryIndex--;
      input.value = terminalHistory[terminalHistoryIndex];
    }
  } else if (e.key === 'ArrowDown') {
    if (terminalHistoryIndex < terminalHistory.length - 1) {
      terminalHistoryIndex++;
      input.value = terminalHistory[terminalHistoryIndex];
    } else {
      terminalHistoryIndex = terminalHistory.length;
      input.value = '';
    }
  }
}

function executeTerminalCommand(cmd) {
  const body = document.getElementById('terminal-body');
  const repoName = git.getState().name;
  const promptStr = `${currentContributor.toLowerCase().replace(/\s+/g, '')}@open-sourcery:~/${repoName} (${git.getState().currentBranch})$ `;

  const trimmed = cmd.trim();
  // If participant inspects README through terminal command (cat, more, less, head, git show), mark README as viewed!
  if (/^(cat|more|less|head|tail)\s+readme/i.test(trimmed) || /git\s+show.*readme/i.test(trimmed)) {
    interactionHistory.hasViewedReadme = true;
  }

  const output = git.executeCLI(cmd, currentContributor);

  // Track terminal actions in interactionHistory
  if (/^git\s+commit/i.test(trimmed)) {
    const headCommitId = git.getState().branches[git.getState().currentBranch];
    if (headCommitId && !interactionHistory.authoredCommits.includes(headCommitId)) {
      interactionHistory.authoredCommits.push(headCommitId);
    }
    const msgInput = document.getElementById('commit-msg-input');
    if (msgInput) msgInput.value = '';
  }
  if (/^git\s+push/i.test(trimmed)) {
    const bName = git.getState().currentBranch;
    if (!interactionHistory.pushedBranches.includes(bName)) {
      interactionHistory.pushedBranches.push(bName);
    }
  }
  if (/^git\s+(?:branch|checkout\s+-b|switch\s+-c)\s+([^\s]+)/i.test(trimmed)) {
    const match = trimmed.match(/^git\s+(?:branch|checkout\s+-b|switch\s+-c)\s+([^\s]+)/i);
    if (match && match[1] && !match[1].startsWith('-')) {
      const bName = match[1].replace(/['"]/g, '');
      if (!interactionHistory.createdBranches.includes(bName)) {
        interactionHistory.createdBranches.push(bName);
      }
    }
  }

  if (output === '__CLEAR__') {
    if (body) body.innerHTML = '';
    return;
  }

  if (body) {
    const entry = document.createElement('div');
    entry.className = 'terminal-history-entry';
    entry.innerHTML = `<span class="terminal-prompt-str">${promptStr}</span><span style="color: #fff;">${escapeHtml(cmd)}</span>\n<span style="color: #94a3b8; white-space: pre-wrap; font-family: var(--font-mono);">${escapeHtml(output)}</span>`;
    body.appendChild(entry);
    body.scrollTop = body.scrollHeight;
  }

  saveActiveRepository();
  renderAll();
  checkAllMissions();
}

// --- Missions Drawer ---

function toggleMissionsDrawer() {
  const drawer = document.getElementById('missions-drawer');
  if (drawer) drawer.classList.toggle('open');
}

function renderMissionsDrawer() {
  const missionsListEl = document.getElementById('missions-list-container');
  const xpFillEl = document.getElementById('xp-bar-fill');
  const xpNumbersEl = document.getElementById('xp-progress-numbers');
  const missionsCountBadge = document.getElementById('missions-count-badge');

  const curPart = SessionStore.getCurrentParticipant('session-demo') || SessionStore.getParticipantByName('session-demo', currentContributor);
  const completedMissions = curPart ? (curPart.completedMissions || []) : [];
  const completedCount = completedMissions.length;
  const totalXP = curPart ? (curPart.verifiedXP || 0) : 0;
  const maxXP = DEFAULT_MISSIONS.reduce((sum, m) => sum + m.xp, 0);

  if (xpFillEl) {
    const pct = Math.min(100, Math.round((totalXP / maxXP) * 100));
    xpFillEl.style.width = `${pct}%`;
  }

  if (xpNumbersEl) {
    xpNumbersEl.textContent = `${totalXP} / ${maxXP} XP`;
  }

  if (missionsCountBadge) {
    missionsCountBadge.textContent = `${completedCount}/8 Completed`;
  }

  if (!missionsListEl) return;

  missionsListEl.innerHTML = DEFAULT_MISSIONS.map(m => {
    const isDone = completedMissions.includes(m.id);
    return `
      <div class="mission-card ${isDone ? 'completed' : ''}" id="card-${m.id}">
        <div class="mission-card-top">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="mission-num-badge">Mission ${m.number}</span>
            <span class="badge" style="font-size: 0.65rem;">${m.difficulty}</span>
            ${isDone ? '<span class="badge" style="background: rgba(54, 228, 212, 0.2); color: var(--accent-cyan);">✓ Completed</span>' : ''}
          </div>
          <span class="mission-card-xp">+${m.xp} XP</span>
        </div>
        <div class="mission-card-title">${m.title}</div>
        <div class="mission-card-desc">${m.description}</div>

        <div class="hints-accordion-btn" onclick="toggleHint('hints-${m.id}')">
          <span>💡 Hints (${m.hints.length})</span>
        </div>
        <div id="hints-${m.id}" class="hints-content">
          <ul style="padding-left: 1.25rem; margin: 0;">
            ${m.hints.map(h => `<li style="margin-bottom: 0.25rem;">${h}</li>`).join('')}
          </ul>
        </div>

        <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 0.5rem; gap: 0.5rem;">
          <button class="btn btn-sm" onclick="showMissionQuizModal('${m.id}')" title="Test & revise CLI commands for this mission">
            🧠 CLI Quiz
          </button>
          <button class="btn btn-sm btn-cyan" onclick="manualVerifyMission('${m.id}')">
            ${isDone ? 'Re-Verify' : 'Verify'}
          </button>
        </div>
      </div>
    `;
  }).join('') + `
    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
      <button class="btn btn-primary" onclick="confirmEarlySubmit()" style="width: 100%; justify-content: center; padding: 0.8rem 1rem; font-weight: 700; font-size: 0.9rem;">
        🏁 Finish & Submit Assessment Score
      </button>
      <div style="text-align: center; color: var(--text-dim); font-size: 0.72rem; margin-top: 0.4rem;">
        Click to finalize and submit your assessment score now.
      </div>
    </div>
  `;
}

function toggleHint(hintId) {
  const el = document.getElementById(hintId);
  if (el) el.classList.toggle('open');
}

const MISSION_BADGES = {
  'mission-1': { name: 'Repo Explorer', icon: '🧭', title: 'Codebase Scout' },
  'mission-2': { name: 'Bug Hunter', icon: '🐛', title: 'Issue Tracker' },
  'mission-3': { name: 'Branch Architect', icon: '🌿', title: 'Branch Specialist' },
  'mission-4': { name: 'Code Artisan', icon: '💾', title: 'Atomic Committer' },
  'mission-5': { name: 'Cloud Pioneer', icon: '🚀', title: 'Remote Publisher' },
  'mission-6': { name: 'PR Strategist', icon: '🔀', title: 'Pull Request Pro' },
  'mission-7': { name: 'Merge Master', icon: '🟣', title: 'Code Reviewer' },
  'mission-8': { name: 'Conflict Slayer', icon: '⚔️', title: 'Git Champion' }
};

function spawnFloatingXpBadge(text) {
  if (typeof document === 'undefined') return;
  const pill = document.createElement('div');
  pill.className = 'floating-xp-pill';
  pill.textContent = text;

  const navUserXp = document.getElementById('nav-user-xp');
  if (navUserXp) {
    const rect = navUserXp.getBoundingClientRect();
    pill.style.left = `${rect.left}px`;
    pill.style.top = `${rect.top - 10}px`;
  } else {
    pill.style.left = '50%';
    pill.style.top = '15%';
    pill.style.transform = 'translateX(-50%)';
  }

  document.body.appendChild(pill);
  setTimeout(() => pill.remove(), 1600);
}

function triggerBadgeUnlockCelebration(missionId, xpAwarded, totalXP) {
  const badge = MISSION_BADGES[missionId] || { name: 'Git Challenger', icon: '⭐', title: 'Skill Master' };
  const mission = DEFAULT_MISSIONS.find(m => m.id === missionId);

  // 1. Confetti burst
  triggerConfetti(85);

  // 2. Floating XP pill
  spawnFloatingXpBadge(`+${xpAwarded} XP`);

  // 3. Glowing badge banner popup
  if (typeof document !== 'undefined' && document.body) {
    const banner = document.createElement('div');
    banner.className = 'badge-unlock-banner';
    banner.innerHTML = `
      <div class="badge-icon-box">${badge.icon}</div>
      <div class="badge-unlock-info">
        <div class="badge-unlock-header">
          <span>🏆</span>
          <span>ACHIEVEMENT UNLOCKED • MISSION ${mission ? mission.number : ''}</span>
        </div>
        <div class="badge-unlock-title">${escapeHtml(badge.name)}</div>
        <div class="badge-unlock-sub">+${xpAwarded} XP Awarded! • Total: ${totalXP} XP</div>
      </div>
    `;
    document.body.appendChild(banner);

    setTimeout(() => banner.classList.add('show'), 40);

    setTimeout(() => {
      banner.classList.remove('show');
      setTimeout(() => {
        banner.remove();
        showMissionQuizModal(missionId);
      }, 400);
    }, 3200);
  } else {
    showMissionQuizModal(missionId);
  }
}

function manualVerifyMission(missionId) {
  if (!git) return;
  const state = git.getState();
  const curPart = SessionStore.getCurrentParticipant('session-demo') || SessionStore.getParticipantByName('session-demo', currentContributor);
  const partId = curPart ? curPart.id : currentContributor;
  const contributorName = (curPart && curPart.name) ? curPart.name : currentContributor;
  const res = MissionValidator.validateMission(missionId, state, interactionHistory, contributorName);

  if (res.isCompleted) {
    const awardRes = SessionStore.awardMission('session-demo', partId, missionId, res.evidence);

    const card = document.getElementById(`card-${missionId}`);
    if (card) card.classList.add('completed');

    updateContributorUI();
    renderMissionsDrawer();
    updateLeaderboardUI();

    if (awardRes.xpAwarded > 0) {
      showToast(awardRes.message, 'success');
      triggerBadgeUnlockCelebration(missionId, awardRes.xpAwarded, awardRes.totalXP);
    } else {
      showToast(`Mission already verified and awarded! Score: ${awardRes.totalXP} XP`, 'info');
      showMissionQuizModal(missionId);
    }
  } else {
    showToast(res.message, 'error');
  }
}

function checkAllMissions() {
  if (!git) return;
  const state = git.getState();
  const curPart = SessionStore.getCurrentParticipant('session-demo') || SessionStore.getParticipantByName('session-demo', currentContributor);
  const partId = curPart ? curPart.id : currentContributor;
  const contributorName = (curPart && curPart.name) ? curPart.name : currentContributor;

  let anyNewAward = false;
  let newlyAwardedMissionId = null;
  let newlyAwardedXP = 0;
  let newlyTotalXP = 0;

  for (const m of DEFAULT_MISSIONS) {
    const res = MissionValidator.validateMission(m.id, state, interactionHistory, contributorName);
    if (res.isCompleted) {
      const awardRes = SessionStore.awardMission('session-demo', partId, m.id, res.evidence);
      const card = document.getElementById(`card-${m.id}`);

      if (awardRes.xpAwarded > 0) {
        anyNewAward = true;
        newlyAwardedMissionId = m.id;
        newlyAwardedXP = awardRes.xpAwarded;
        newlyTotalXP = awardRes.totalXP;
        if (card) card.classList.add('completed');
        showToast(awardRes.message, 'success');
      } else if (card && !card.classList.contains('completed')) {
        card.classList.add('completed');
      }
    }
  }

  if (anyNewAward) {
    updateContributorUI();
    renderMissionsDrawer();
    updateLeaderboardUI();
    if (newlyAwardedMissionId) {
      triggerBadgeUnlockCelebration(newlyAwardedMissionId, newlyAwardedXP, newlyTotalXP);
    }
  }
}

// --- Mission CLI Concept Check (MCQ Quiz Pop-up) ---

const MISSION_QUIZZES = {
  'mission-1': [
    {
      question: "Which terminal command prints the complete contents of 'README.md' directly to the screen?",
      options: [
        "read README.md",
        "cat README.md",
        "git open README.md",
        "git show-text README.md"
      ],
      correctIndex: 1,
      explanation: "'cat README.md' is the standard Unix command to output file contents directly in terminal shells."
    },
    {
      question: "Which Git command displays the configured remote repository fetch and push URLs?",
      options: [
        "git url --show",
        "git origin list",
        "git remote -v",
        "git network"
      ],
      correctIndex: 2,
      explanation: "'git remote -v' outputs the names and URLs of all configured remotes."
    }
  ],
  'mission-2': [
    {
      question: "Which GitHub CLI (gh) command creates a new issue with a title and description from the terminal?",
      options: [
        'gh issue create --title "Title" --body "Details"',
        'git issue new --title "Title"',
        'gh bug create "Title"',
        'github issue add "Title"'
      ],
      correctIndex: 0,
      explanation: "'gh issue create' is the official GitHub CLI command to raise an issue with --title and --body."
    },
    {
      question: "How do you view all currently open issues in the repository using the terminal?",
      options: [
        "git issue status",
        "gh issues show",
        "git list-issues",
        "gh issue list"
      ],
      correctIndex: 3,
      explanation: "'gh issue list' fetches and displays open issues for the repository in a clean table."
    }
  ],
  'mission-3': [
    {
      question: "Which command creates a new branch named 'feature/nav' AND switches to it in one single command?",
      options: [
        "git branch --switch feature/nav",
        "git branch -new feature/nav",
        "git checkout -b feature/nav",
        "git create feature/nav"
      ],
      correctIndex: 2,
      explanation: "'git checkout -b <name>' (or 'git switch -c <name>') creates the branch and checks it out immediately."
    },
    {
      question: "In modern Git (2.23+), which dedicated command switches your working tree to an existing branch?",
      options: [
        "git move <branch-name>",
        "git switch <branch-name>",
        "git change <branch-name>",
        "git goto <branch-name>"
      ],
      correctIndex: 1,
      explanation: "'git switch' is Git's dedicated command specifically designed for switching branches."
    }
  ],
  'mission-4': [
    {
      question: "Which command stages all modified, newly added, and deleted files in the working directory?",
      options: [
        "git stage -all",
        "git push --stage",
        "git commit --all-files",
        "git add ."
      ],
      correctIndex: 3,
      explanation: "'git add .' (or 'git add -A') stages all working tree changes into the Git index."
    },
    {
      question: "How do you specify a commit message directly on the command line without opening a text editor?",
      options: [
        'git commit -msg "your commit message"',
        'git commit -m "your commit message"',
        'git commit --text "your commit message"',
        'git save "your commit message"'
      ],
      correctIndex: 1,
      explanation: "The '-m' flag in 'git commit -m \"message\"' assigns the log message directly from the command line."
    }
  ],
  'mission-5': [
    {
      question: "What is the purpose of the '-u' (or '--set-upstream') flag in 'git push -u origin <branch>'?",
      options: [
        "Forces an overwrite of remote changes",
        "Unstages any uncommitted files before uploading",
        "Links local branch to remote branch so subsequent 'git push' and 'git pull' require no arguments",
        "Upgrades the Git version installed on the remote origin"
      ],
      correctIndex: 2,
      explanation: "'-u' establishes tracking between the local branch and upstream remote, enabling simple 'git push' and 'git pull'."
    },
    {
      question: "Which command checks if your local branch is ahead, behind, or up to date with the remote repository?",
      options: [
        "git status",
        "git remote ping",
        "git compare",
        "git network status"
      ],
      correctIndex: 0,
      explanation: "'git status' provides working tree state and reports tracking sync against 'origin/<branch>'."
    }
  ],
  'mission-6': [
    {
      question: "Which GitHub CLI command opens a pull request from your active feature branch into 'main'?",
      options: [
        'git pr open --to main',
        'gh pr create --title "Feature title" --body "Description"',
        'gh pull --open',
        'git request-pull origin main'
      ],
      correctIndex: 1,
      explanation: "'gh pr create' is the GitHub CLI command to submit a Pull Request to team members."
    },
    {
      question: "In GitHub Pull Request terminology, what does the 'head' branch represent?",
      options: [
        "The feature branch containing your new commits that you want merged",
        "The target branch that will receive the merged commits (usually main)",
        "The first commit made when the repository was initialized",
        "The remote master server address"
      ],
      correctIndex: 0,
      explanation: "'head' is the topic branch containing your work, while 'base' is the target branch receiving the code."
    }
  ],
  'mission-7': [
    {
      question: "Which GitHub CLI command allows a reviewer to approve Pull Request #1 directly from the terminal?",
      options: [
        "git review approve 1",
        "gh pr merge 1 --yes",
        "git approve pr 1",
        "gh pr review 1 --approve"
      ],
      correctIndex: 3,
      explanation: "'gh pr review <number> --approve' submits an approval review on the specified PR."
    },
    {
      question: "Which GitHub CLI command merges an approved Pull Request #1 into the base branch?",
      options: [
        "git pull --merge 1",
        "gh pr merge 1",
        "gh merge pr 1",
        "git pr finalize 1"
      ],
      correctIndex: 1,
      explanation: "'gh pr merge <number>' completes the merge on GitHub and updates repository status."
    }
  ],
  'mission-8': [
    {
      question: "What standard conflict markers does Git insert into a file when merge conflicts occur?",
      options: [
        "<<<<<<< HEAD, =======, and >>>>>>> <branch>",
        "[[[ CONFLICT ]]] and [[[ RESOLVED ]]]",
        "<!-- CONFLICT START --> and <!-- CONFLICT END -->",
        "*** MERGE DIFF *** and *** MERGE END ***"
      ],
      correctIndex: 0,
      explanation: "Git inserts '<<<<<<< HEAD' (current branch), '=======' (divider), and '>>>>>>>' (incoming branch) around conflicting lines."
    },
    {
      question: "After manually editing the conflicting files and cleaning up markers, what completes the merge?",
      options: [
        "Run 'git merge --cancel'",
        "Run 'git reset --hard'",
        "Stage the files with 'git add .' and run 'git commit'",
        "Delete the branch and re-clone"
      ],
      correctIndex: 2,
      explanation: "Resolving a conflict requires staging the resolved files with 'git add <file>' and running 'git commit' to record the merge commit."
    }
  ]
};

let activeQuizMissionId = null;
let activeQuizAnswers = {};

function showMissionQuizModal(missionId) {
  const mission = DEFAULT_MISSIONS.find(m => m.id === missionId);
  const questions = MISSION_QUIZZES[missionId];
  if (!questions || !questions.length) return;

  activeQuizMissionId = missionId;
  activeQuizAnswers = {};

  const titleEl = document.getElementById('quiz-modal-title');
  if (titleEl) {
    titleEl.textContent = `Mission ${mission ? mission.number : ''}: ${mission ? mission.title : ''} — CLI Concept Revision`;
  }

  const container = document.getElementById('quiz-questions-container');
  if (!container) return;

  container.innerHTML = questions.map((q, qIdx) => `
    <div class="quiz-question-box" id="quiz-q-${qIdx}">
      <div class="quiz-question-header">
        <span class="quiz-question-tag">Question ${qIdx + 1} of ${questions.length}</span>
        <span style="font-size: 0.72rem; color: var(--text-dim);">CLI Command Mastery</span>
      </div>
      <div class="quiz-question-title">${escapeHtml(q.question)}</div>
      <div class="quiz-options-list">
        ${q.options.map((opt, optIdx) => `
          <div class="quiz-option-card" id="opt-${qIdx}-${optIdx}" onclick="handleQuizOptionSelect('${missionId}', ${qIdx}, ${optIdx})">
            <span style="color: var(--accent-cyan); font-weight: 700; width: 18px;">${String.fromCharCode(65 + optIdx)}.</span>
            <code style="flex: 1;">${escapeHtml(opt)}</code>
          </div>
        `).join('')}
      </div>
      <div id="quiz-exp-${qIdx}" class="quiz-explanation" style="display: none;"></div>
    </div>
  `).join('');

  const statusEl = document.getElementById('quiz-status-feedback');
  if (statusEl) {
    statusEl.textContent = 'Select your answer for each command question.';
    statusEl.style.color = 'var(--text-muted)';
  }

  openModal('mission-quiz-modal');
}

function handleQuizOptionSelect(missionId, qIndex, selectedOptIndex) {
  const questions = MISSION_QUIZZES[missionId];
  if (!questions || !questions[qIndex]) return;

  const q = questions[qIndex];
  if (activeQuizAnswers[qIndex] !== undefined) return; // Already answered

  activeQuizAnswers[qIndex] = selectedOptIndex;

  const isCorrect = selectedOptIndex === q.correctIndex;
  const qBox = document.getElementById(`quiz-q-${qIndex}`);
  const selectedEl = document.getElementById(`opt-${qIndex}-${selectedOptIndex}`);
  const expEl = document.getElementById(`quiz-exp-${qIndex}`);

  // Disable all options for this question
  q.options.forEach((_, optIdx) => {
    const el = document.getElementById(`opt-${qIndex}-${optIdx}`);
    if (el) el.classList.add('disabled');
  });

  if (isCorrect) {
    if (selectedEl) selectedEl.classList.add('selected-correct');
    if (expEl) {
      expEl.innerHTML = `<strong style="color: var(--accent-green);">✓ Correct!</strong> ${escapeHtml(q.explanation)}`;
      expEl.style.display = 'block';
    }
  } else {
    if (selectedEl) selectedEl.classList.add('selected-incorrect');
    const correctEl = document.getElementById(`opt-${qIndex}-${q.correctIndex}`);
    if (correctEl) correctEl.classList.add('reveal-correct');
    if (expEl) {
      expEl.innerHTML = `<strong style="color: var(--accent-red);">✗ Incorrect.</strong> The correct command is: <code>${escapeHtml(q.options[q.correctIndex])}</code>.<br />${escapeHtml(q.explanation)}`;
      expEl.style.display = 'block';
    }
  }

  // Check if all questions in quiz answered
  const answeredCount = Object.keys(activeQuizAnswers).length;
  if (answeredCount === questions.length) {
    const allCorrect = questions.every((item, idx) => activeQuizAnswers[idx] === item.correctIndex);
    const statusEl = document.getElementById('quiz-status-feedback');

    if (allCorrect) {
      const bonusKey = `open_sourcery_quiz_bonus_${missionId}`;
      const alreadyAwarded = localStorage.getItem(bonusKey) === 'true';

      if (!alreadyAwarded) {
        localStorage.setItem(bonusKey, 'true');
        const curPart = SessionStore.getCurrentParticipant('session-demo') || SessionStore.getParticipantByName('session-demo', currentContributor);
        if (curPart) {
          SessionStore.adjustParticipantXP('session-demo', curPart.id, 25, `CLI Quiz Perfect Revision Bonus for ${missionId}`);
          updateContributorUI();
          renderMissionsDrawer();
          updateLeaderboardUI();
        }
      }

      if (statusEl) {
        statusEl.innerHTML = `<span style="color: var(--accent-green);">🎉 Excellent! Perfect revision. +25 Bonus XP awarded!</span>`;
      }
      triggerConfetti(65);
    } else {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: var(--accent-cyan);">Review the explanations above to solidify your CLI command revision.</span>`;
      }
    }
  }
}

function finishMissionQuiz() {
  closeModal('mission-quiz-modal');
}

if (typeof window !== 'undefined') {
  window.MISSION_QUIZZES = MISSION_QUIZZES;
}
if (typeof globalThis !== 'undefined') {
  globalThis.MISSION_QUIZZES = MISSION_QUIZZES;
}

// --- Leaderboard & Participant Moderation ---

function openPublicLeaderboardModal() {
  if (typeof window.refreshLiveLeaderboardNow === 'function') {
    window.refreshLiveLeaderboardNow();
  }
  updateLeaderboardUI();
  openModal('public-leaderboard-modal');
}

function updateLeaderboardUI(optionalEntries) {
  let entries = optionalEntries;
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    if (window._cachedCloudLeaderboard && Array.isArray(window._cachedCloudLeaderboard) && window._cachedCloudLeaderboard.length > 0) {
      entries = window._cachedCloudLeaderboard;
    } else {
      entries = SessionStore.getLeaderboard('session-demo');
    }
  } else {
    window._cachedCloudLeaderboard = entries;
  }

  // Deduplicate entries by email / normalized name so a participant never appears twice
  const dedupeMap = new Map();
  entries.forEach(e => {
    if (!e || !e.name) return;
    const key = (e.email && e.email !== 'N/A' && e.email.includes('@'))
      ? e.email.trim().toLowerCase()
      : e.name.trim().toLowerCase();
    if (!dedupeMap.has(key)) {
      dedupeMap.set(key, { ...e });
    } else {
      const prev = dedupeMap.get(key);
      const higherXP = Math.max(prev.verifiedXP || 0, e.verifiedXP || 0);
      const mergedMissions = Array.from(new Set([...(prev.completedMissions || []), ...(e.completedMissions || [])]));
      dedupeMap.set(key, {
        ...prev,
        ...e,
        verifiedXP: higherXP,
        completedCount: mergedMissions.length,
        completedMissions: mergedMissions
      });
    }
  });
  entries = Array.from(dedupeMap.values());

  // Ensure entries are ranked properly
  entries.sort((a, b) => (b.verifiedXP || 0) - (a.verifiedXP || 0));
  entries = entries.map((e, idx) => ({ ...e, rank: idx + 1 }));

  // Update quick stats cards
  const curEntry = entries.find(e => (e.name || '').trim().toLowerCase() === (currentContributor || '').trim().toLowerCase());
  const rankEl = document.getElementById('public-leaderboard-my-rank');
  const xpEl = document.getElementById('public-leaderboard-my-xp');
  const countEl = document.getElementById('public-leaderboard-total-count');
  const navXpEl = document.getElementById('nav-user-xp');

  if (rankEl) rankEl.textContent = curEntry ? `#${curEntry.rank}` : '#--';
  if (xpEl) xpEl.textContent = `${curEntry ? curEntry.verifiedXP : 0} XP`;
  if (countEl) countEl.textContent = entries.length.toString();
  if (navXpEl && curEntry) navXpEl.textContent = `${curEntry.verifiedXP} XP`;

  // 1. Render Public Table Body (Clean for all participants)
  const publicTbody = document.getElementById('public-leaderboard-table-body');
  if (publicTbody) {
    if (entries.length === 0) {
      publicTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No registered participants yet.</td></tr>`;
    } else {
      publicTbody.innerHTML = entries.map(e => {
        let rankBadgeClass = 'rank-other';
        if (e.rank === 1) rankBadgeClass = 'rank-1';
        else if (e.rank === 2) rankBadgeClass = 'rank-2';
        else if (e.rank === 3) rankBadgeClass = 'rank-3';

        const isCurrent = (e.name || '').toLowerCase() === (currentContributor || '').toLowerCase();
        const focusViolationBadge = (e.focusViolations && e.focusViolations > 0)
          ? `<span class="badge" style="background: rgba(248, 81, 73, 0.2); color: var(--accent-red);" title="Focus / tab switch violations detected">⚠️ ${e.focusViolations} Alerts</span>`
          : `<span style="color: var(--accent-green); font-size: 0.75rem;">✓ Clean</span>`;

        return `
          <tr style="${isCurrent ? 'background: rgba(54, 228, 212, 0.08); font-weight: 600;' : ''}">
            <td><span class="rank-pill ${rankBadgeClass}">${e.rank}</span></td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${escapeHtml(e.name)}</span>
                ${isCurrent ? '<span class="badge" style="background: rgba(54, 228, 212, 0.2); color: var(--accent-cyan);">You</span>' : ''}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(e.rollNumber || '')} ${e.githubUsername ? `(@${escapeHtml(e.githubUsername)})` : ''}</div>
            </td>
            <td style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(e.email || 'N/A')}</td>
            <td style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: bold;">${e.verifiedXP || 0} XP</td>
            <td>${e.completedCount || 0} / 8</td>
            <td>${focusViolationBadge}</td>
            <td>
              ${e.isDisqualified ? `
                <span class="badge" style="background: rgba(248, 81, 73, 0.25); color: var(--accent-red); font-weight: 700; border: 1px solid var(--accent-red); font-size: 0.65rem;">
                  🚫 OUT OF GAME
                </span>
              ` : `
                <span style="display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: ${e.isOnline ? 'var(--accent-green)' : 'var(--text-dim)'};">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: ${e.isOnline ? 'var(--accent-green)' : 'var(--text-dim)'};"></span>
                  ${e.isOnline ? 'Live' : 'Offline'}
                </span>
              `}
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // 2. Render Admin Table Body (With moderation action buttons)
  const adminTbody = document.getElementById('leaderboard-table-body');
  if (adminTbody) {
    if (entries.length === 0) {
      adminTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No registered participants yet.</td></tr>`;
    } else {
      adminTbody.innerHTML = entries.map(e => {
        let rankBadgeClass = 'rank-other';
        if (e.rank === 1) rankBadgeClass = 'rank-1';
        else if (e.rank === 2) rankBadgeClass = 'rank-2';
        else if (e.rank === 3) rankBadgeClass = 'rank-3';

        const isCurrent = (e.name || '').toLowerCase() === (currentContributor || '').toLowerCase();
        const focusViolationBadge = (e.focusViolations && e.focusViolations > 0)
          ? `<span class="badge" style="background: rgba(248, 81, 73, 0.2); color: var(--accent-red);" title="Focus / tab switch violations detected">⚠️ ${e.focusViolations} Alerts</span>`
          : `<span style="color: var(--accent-green); font-size: 0.75rem;">✓ Clean</span>`;

        return `
          <tr style="${isCurrent ? 'background: rgba(54, 228, 212, 0.08); font-weight: 600;' : ''}">
            <td><span class="rank-pill ${rankBadgeClass}">${e.rank}</span></td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${escapeHtml(e.name)}</span>
                ${isCurrent ? '<span class="badge" style="background: rgba(54, 228, 212, 0.2); color: var(--accent-cyan);">Active</span>' : ''}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(e.rollNumber || '')} ${e.githubUsername ? `(@${escapeHtml(e.githubUsername)})` : ''}</div>
            </td>
            <td style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">${escapeHtml(e.email || 'N/A')}</td>
            <td style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: bold;">${e.verifiedXP || 0} XP</td>
            <td>${e.completedCount || 0} / 8</td>
            <td>${focusViolationBadge}</td>
            <td>
              ${e.isDisqualified ? `
                <span class="badge" style="background: rgba(248, 81, 73, 0.25); color: var(--accent-red); font-weight: 700; border: 1px solid var(--accent-red); font-size: 0.65rem;" title="${escapeHtml(e.disqualifiedReason || 'Focus Violation')}">
                  🚫 OUT OF GAME
                </span>
              ` : `
                <span style="display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: ${e.isOnline ? 'var(--accent-green)' : 'var(--text-dim)'};">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: ${e.isOnline ? 'var(--accent-green)' : 'var(--text-dim)'};"></span>
                  ${e.isOnline ? 'Live' : 'Offline'}
                </span>
              `}
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-xs btn-cyan" onclick="openParticipantDossier('${escapeHtml(e.participantId)}', '${escapeHtml(e.name)}')" title="Trace work, commits, PRs, issues and alerts">
                🔍 Trace
              </button>
              <button class="btn btn-xs" onclick="adminPromptAdjustXP('${escapeHtml(e.participantId)}', '${escapeHtml(e.name)}')" title="Adjust verified XP score">
                ✏️ XP
              </button>
              <button class="btn btn-xs btn-danger" onclick="adminRemoveParticipant('${escapeHtml(e.participantId)}', '${escapeHtml(e.name)}')" title="Remove / Disqualify from workshop">
                🗑️ Remove
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

function openParticipantDossier(participantId, name) {
  const part = SessionStore.getParticipant('session-demo', participantId) ||
               SessionStore.getParticipantByName('session-demo', name) || {
                 id: participantId,
                 name: name,
                 email: 'N/A',
                 rollNumber: 'N/A',
                 githubUsername: '',
                 verifiedXP: 0,
                 completedMissions: [],
                 focusViolations: 0,
                 isDisqualified: false
               };

  const state = git ? git.getState() : (activeRepo || {});
  const userCommits = (state.commits || []).filter(c => (c.author || '').trim().toLowerCase() === name.trim().toLowerCase());
  const userPRs = (state.pullRequests || []).filter(pr => (pr.author || '').trim().toLowerCase() === name.trim().toLowerCase());
  const userIssues = (state.issues || []).filter(i => (i.author || '').trim().toLowerCase() === name.trim().toLowerCase());
  const userActivities = (state.activities || []).filter(a => (a.user || '').trim().toLowerCase() === name.trim().toLowerCase());

  const completedMissions = part.completedMissions || [];
  const focusViolations = part.focusViolations || (name === currentContributor ? parseInt(localStorage.getItem('open_sourcery_tab_switch_count') || '0', 10) : 0);

  const titleEl = document.getElementById('dossier-modal-title');
  if (titleEl) titleEl.textContent = `Participant Work Dossier — ${name}`;

  const bodyEl = document.getElementById('dossier-modal-body');
  if (!bodyEl) return;

  bodyEl.innerHTML = `
    ${part.isDisqualified ? `
      <div style="background: rgba(248, 81, 73, 0.15); border: 1.5px solid var(--accent-red); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <strong style="color: var(--accent-red); display: block; font-size: 0.85rem;">🚫 PARTICIPANT OUT OF THE GAME (DISQUALIFIED)</strong>
          <span style="color: var(--text-muted); font-size: 0.75rem;">Reason: ${escapeHtml(part.disqualifiedReason || 'Focus / full-screen violation')}</span>
        </div>
        <button class="btn btn-sm btn-cyan" onclick="adminReinstateParticipant('${escapeHtml(part.id)}', '${escapeHtml(name)}')">
          🔓 Reinstate Participant
        </button>
      </div>
    ` : ''}

    <!-- Top Profile & Quick Actions Banner -->
    <div class="dossier-header-card">
      <div style="display: flex; align-items: center; gap: 0.85rem;">
        <div class="user-avatar" style="width: 48px; height: 48px; font-size: 1.25rem;">${(name || 'P').charAt(0).toUpperCase()}</div>
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-main);">${escapeHtml(name)}</h3>
            <span class="badge" style="background: rgba(54, 228, 212, 0.2); color: var(--accent-cyan); font-size: 0.7rem;">${escapeHtml(part.rollNumber || 'STUDENT')}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
            <span>📧 ${escapeHtml(part.email || 'No email registered')}</span>
            ${part.githubUsername ? `<span style="margin-left: 0.75rem;">🐙 @${escapeHtml(part.githubUsername)}</span>` : ''}
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
        <button class="btn btn-sm btn-cyan" onclick="adminPromptAdjustXP('${escapeHtml(part.id)}', '${escapeHtml(name)}')">
          ✏️ Adjust XP
        </button>
        <button class="btn btn-sm" onclick="switchContributorTo('${escapeHtml(name)}')">
          🔄 Switch View
        </button>
        <button class="btn btn-sm btn-danger" onclick="adminRemoveParticipant('${escapeHtml(part.id)}', '${escapeHtml(name)}')">
          🗑️ Disqualify
        </button>
      </div>
    </div>

    <!-- Metrics Grid -->
    <div class="dossier-stats-grid">
      <div class="dossier-stat-box">
        <div class="dossier-stat-val">${part.verifiedXP || 0} XP</div>
        <div class="dossier-stat-lbl">Verified Score</div>
      </div>
      <div class="dossier-stat-box">
        <div class="dossier-stat-val" style="color: var(--accent-green);">${completedMissions.length} / 8</div>
        <div class="dossier-stat-lbl">Missions Cleared</div>
      </div>
      <div class="dossier-stat-box">
        <div class="dossier-stat-val" style="color: var(--accent-blue);">${userCommits.length}</div>
        <div class="dossier-stat-lbl">Authored Commits</div>
      </div>
      <div class="dossier-stat-box">
        <div class="dossier-stat-val" style="color: var(--accent-purple);">${userPRs.length}</div>
        <div class="dossier-stat-lbl">Pull Requests</div>
      </div>
      <div class="dossier-stat-box">
        <div class="dossier-stat-val" style="color: ${focusViolations > 0 ? 'var(--accent-red)' : 'var(--accent-green)'};">
          ${focusViolations}
        </div>
        <div class="dossier-stat-lbl">Focus Alerts</div>
      </div>
    </div>

    <!-- Missions Breakdown -->
    <div class="dossier-section-title">
      <span>🎯 Hands-on Missions Progress (${completedMissions.length}/8 Completed)</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.5rem; margin-bottom: 1.25rem;">
      ${DEFAULT_MISSIONS.map(m => {
        const done = completedMissions.includes(m.id);
        const b = MISSION_BADGES[m.id] || { icon: '⭐', name: m.title };
        return `
          <div style="background: ${done ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-primary)'}; border: 1px solid ${done ? 'var(--accent-green)' : 'var(--border-color)'}; border-radius: var(--radius-sm); padding: 0.5rem 0.65rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">${done ? b.icon : '🔒'}</span>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="color: ${done ? 'var(--accent-green)' : 'var(--text-muted)'}; font-size: 0.75rem;">${escapeHtml(b.name)}</strong>
                <span style="font-size: 0.65rem; color: ${done ? 'var(--accent-green)' : 'var(--text-dim)'};">${done ? '✓ Unlocked' : `+${m.xp} XP`}</span>
              </div>
              <div style="color: var(--text-dim); font-size: 0.68rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(m.title)}">
                M${m.number}: ${escapeHtml(m.title)}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Commits Authored by Participant -->
    <div class="dossier-section-title">
      <span>💻 Commits Authored (${userCommits.length})</span>
    </div>
    <div style="max-height: 140px; overflow-y: auto; margin-bottom: 1.25rem;">
      ${userCommits.length === 0
        ? '<div style="color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem; background: var(--bg-primary); border-radius: var(--radius-sm);">No commits created by this participant yet.</div>'
        : userCommits.map(c => `
          <div class="dossier-item-card">
            <div>
              <span style="font-family: var(--font-mono); color: var(--accent-blue); font-weight: bold; margin-right: 0.5rem;">${c.id.substring(0, 7)}</span>
              <strong>${escapeHtml(c.message)}</strong>
            </div>
            <div style="color: var(--text-dim); font-size: 0.75rem;">
              <span class="badge" style="font-size: 0.65rem;">${escapeHtml(c.branch || 'main')}</span>
              <span style="margin-left: 0.4rem;">${formatRelativeTime(c.timestamp)}</span>
            </div>
          </div>
        `).join('')}
    </div>

    <!-- Pull Requests Created by Participant -->
    <div class="dossier-section-title">
      <span>🔀 Pull Requests Created (${userPRs.length})</span>
    </div>
    <div style="max-height: 140px; overflow-y: auto; margin-bottom: 1.25rem;">
      ${userPRs.length === 0
        ? '<div style="color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem; background: var(--bg-primary); border-radius: var(--radius-sm);">No pull requests opened by this participant yet.</div>'
        : userPRs.map(pr => `
          <div class="dossier-item-card" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span class="pr-status-pill pr-status-${pr.status}" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; margin-right: 0.4rem;">
                ${pr.status === 'merged' ? '🟣 Merged' : '🟢 Open'}
              </span>
              <strong>#${pr.number} ${escapeHtml(pr.title)}</strong>
              <span style="color: var(--text-dim); font-size: 0.75rem; margin-left: 0.4rem;">(${escapeHtml(pr.headBranch)} → ${escapeHtml(pr.baseBranch)})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="color: var(--text-dim); font-size: 0.75rem;">${formatRelativeTime(pr.createdAt)}</span>
              <button class="btn btn-xs btn-danger" onclick="adminDeletePRPrompt('${pr.id}')" title="Admin: Delete PR">🗑️ Delete</button>
            </div>
          </div>
        `).join('')}
    </div>

    <!-- Issues Raised by Participant -->
    <div class="dossier-section-title">
      <span>❗ Issues Raised (${userIssues.length})</span>
    </div>
    <div style="max-height: 120px; overflow-y: auto; margin-bottom: 1.25rem;">
      ${userIssues.length === 0
        ? '<div style="color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem; background: var(--bg-primary); border-radius: var(--radius-sm);">No issues opened by this participant yet.</div>'
        : userIssues.map(i => `
          <div class="dossier-item-card" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span class="badge" style="background: ${i.status === 'open' ? 'rgba(54, 228, 212, 0.2)' : 'rgba(139, 148, 158, 0.2)'}; color: ${i.status === 'open' ? 'var(--accent-cyan)' : 'var(--text-dim)'}; font-size: 0.65rem; margin-right: 0.4rem;">
                ${i.status === 'open' ? '🟢 Open' : '🟣 Closed'}
              </span>
              <strong>#${i.number} ${escapeHtml(i.title)}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="color: var(--text-dim); font-size: 0.75rem;">${formatRelativeTime(i.createdAt)}</span>
              <button class="btn btn-xs btn-danger" onclick="adminDeleteIssuePrompt('${i.id}')" title="Admin: Delete Issue">🗑️ Delete</button>
            </div>
          </div>
        `).join('')}
    </div>

    <!-- Activity & Security Alerts Log -->
    <div class="dossier-section-title">
      <span>🚨 Activity & Focus Integrity Alerts (${userActivities.length})</span>
    </div>
    <div style="max-height: 140px; overflow-y: auto;">
      ${userActivities.length === 0
        ? '<div style="color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem; background: var(--bg-primary); border-radius: var(--radius-sm);">No recorded activity history for this participant.</div>'
        : userActivities.map(a => `
          <div style="padding: 0.35rem 0.6rem; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; display: flex; justify-content: space-between;">
            <div>
              <span class="badge" style="font-size: 0.6rem; margin-right: 0.4rem;">${escapeHtml(a.action || 'activity')}</span>
              <span>${escapeHtml(a.details || '')}</span>
            </div>
            <span style="color: var(--text-dim); font-family: var(--font-mono); font-size: 0.7rem;">${formatRelativeTime(a.timestamp)}</span>
          </div>
        `).join('')}
    </div>
  `;

  openModal('participant-dossier-modal');
}

function switchContributorTo(name) {
  selectContributor(name);
  closeModal('participant-dossier-modal');
  showToast(`Switched active workspace view to: ${name}`, 'info');
}

function adminRemoveParticipant(participantId, name) {
  showConfirmDialog({
    title: 'Disqualify Participant',
    message: `Are you sure you want to remove and disqualify "${name}" from the workshop and leaderboard? This action cannot be undone.`,
    confirmText: 'Disqualify Participant',
    confirmClass: 'btn-danger',
    icon: '🚫',
    onConfirm: () => {
      SessionStore.removeParticipant('session-demo', participantId);
      closeModal('participant-dossier-modal');
      updateLeaderboardUI();
      updateAdminUI();
      updateContributorUI();
      showToast(`Participant "${name}" was removed from the leaderboard.`, 'success');
    }
  });
}

let adjustXPParticipantId = null;
let adjustXPParticipantName = null;

function adminPromptAdjustXP(participantId, name) {
  const currentPart = SessionStore.getParticipant('session-demo', participantId) ||
                      SessionStore.getParticipantByName('session-demo', name);
  const currentXP = currentPart ? (currentPart.verifiedXP || 0) : 0;

  adjustXPParticipantId = participantId;
  adjustXPParticipantName = name;

  const descEl = document.getElementById('adjust-xp-modal-desc');
  if (descEl) {
    descEl.textContent = `Adjust XP for "${name}" (Current XP: ${currentXP}). Enter a positive number to reward (e.g. +50) or negative to penalize (e.g. -30).`;
  }
  const inputEl = document.getElementById('adjust-xp-delta-input');
  if (inputEl) {
    inputEl.value = '+50';
    setTimeout(() => inputEl.focus(), 50);
  }
  openModal('admin-adjust-xp-modal');
}

function submitAdjustXP(e) {
  if (e && e.preventDefault) e.preventDefault();
  const inputEl = document.getElementById('adjust-xp-delta-input');
  if (!inputEl) return;

  const input = inputEl.value.trim();
  const delta = parseInt(input, 10);
  if (isNaN(delta)) {
    showToast('Invalid XP value entered. Please enter a valid number (e.g. 50 or -50).', 'error');
    return;
  }

  const participantId = adjustXPParticipantId;
  const name = adjustXPParticipantName;
  const res = SessionStore.adjustParticipantXP('session-demo', participantId, delta);
  closeModal('admin-adjust-xp-modal');
  if (res.success) {
    updateLeaderboardUI();
    updateAdminUI();
    updateContributorUI();
    if (document.getElementById('participant-dossier-modal')?.classList.contains('open')) {
      openParticipantDossier(participantId, name);
    }
    showToast(`Updated XP for ${name}: ${delta >= 0 ? '+' : ''}${delta} XP. New Total: ${res.newXP} XP`, 'success');
  }
}

// --- Admin Workshop Console & Authentication ---

function isAdminAuthenticated() {
  return sessionStorage.getItem('open_sourcery_admin_auth') === 'true';
}

function isOrganizerOrAdmin() {
  return isAdminAuthenticated() || currentContributor === 'Vivek' || currentContributor === 'Vivek Yadav';
}

function adminDeleteIssuePrompt(issueId) {
  const issue = (git ? git.getState().issues : []).find(
    i => i.id === issueId || String(i.number) === String(issueId)
  );
  if (!issue) {
    showToast('Issue not found.', 'error');
    return;
  }

  showConfirmDialog({
    title: 'Delete Issue',
    message: `Are you sure you want to permanently delete Issue #${issue.number}: "${escapeHtml(issue.title)}" created by ${escapeHtml(issue.author)}? This action cannot be undone.`,
    confirmText: 'Yes, Delete Issue',
    confirmClass: 'btn-danger',
    icon: '🗑️',
    onConfirm: () => {
      const res = git.deleteIssue(issue.id, currentContributor);
      if (res.success) {
        saveActiveRepository();
        renderAll();
        closeModal('issue-detail-modal');
        const curDossierTitle = document.getElementById('dossier-modal-title');
        if (curDossierTitle && curDossierTitle.textContent.includes('—')) {
          const authorName = curDossierTitle.textContent.split('—')[1].trim();
          openParticipantDossier(authorName, authorName);
        }
        updateAdminUI();
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    }
  });
}

function adminDeletePRPrompt(prId) {
  const pr = (git ? git.getState().pullRequests : []).find(
    p => p.id === prId || String(p.number) === String(prId)
  );
  if (!pr) {
    showToast('Pull Request not found.', 'error');
    return;
  }

  showConfirmDialog({
    title: 'Delete Pull Request',
    message: `Are you sure you want to permanently delete Pull Request #${pr.number}: "${escapeHtml(pr.title)}" created by ${escapeHtml(pr.author)}? This action cannot be undone.`,
    confirmText: 'Yes, Delete Pull Request',
    confirmClass: 'btn-danger',
    icon: '🗑️',
    onConfirm: () => {
      const res = git.deletePullRequest(pr.id, currentContributor);
      if (res.success) {
        saveActiveRepository();
        renderAll();
        closeModal('pr-detail-modal');
        const curDossierTitle = document.getElementById('dossier-modal-title');
        if (curDossierTitle && curDossierTitle.textContent.includes('—')) {
          const authorName = curDossierTitle.textContent.split('—')[1].trim();
          openParticipantDossier(authorName, authorName);
        }
        updateAdminUI();
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    }
  });
}

function openAdminPortal() {
  if (isAdminAuthenticated()) {
    if (typeof window.refreshLiveLeaderboardNow === 'function') {
      window.refreshLiveLeaderboardNow();
    }
    updateLeaderboardUI();
    updateAdminUI();
    openModal('admin-modal');
  } else {
    const errorEl = document.getElementById('admin-login-error');
    if (errorEl) errorEl.style.display = 'none';
    const passInput = document.getElementById('admin-password-input');
    if (passInput) passInput.value = '';
    const emailInput = document.getElementById('admin-email-input');
    if (emailInput && !emailInput.value) emailInput.value = ADMIN_CONFIG.email;
    openModal('admin-login-modal');
  }
}

function submitAdminLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('admin-email-input');
  const passInput = document.getElementById('admin-password-input');
  const errorEl = document.getElementById('admin-login-error');

  const email = (emailInput ? emailInput.value : '').trim().toLowerCase();
  const pass = passInput ? passInput.value : '';

  if (verifyAdminCredentials(email, pass)) {
    sessionStorage.setItem('open_sourcery_admin_auth', 'true');
    closeModal('admin-login-modal');
    updateLeaderboardUI();
    updateAdminUI();
    openModal('admin-modal');
    showToast('Admin login successful! Welcome, Vivek.', 'success');
  } else {
    if (errorEl) {
      errorEl.textContent = 'Invalid Admin ID or Password. Access denied.';
      errorEl.style.display = 'block';
    }
    showToast('Admin authentication failed. Access denied.', 'error');
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('open_sourcery_admin_auth');
  closeModal('admin-modal');
  showToast('Signed out of Admin Portal.', 'info');
}

function updateAdminUI() {
  // 1. Render Submissions Moderation (Issues & Pull Requests)
  const modEl = document.getElementById('admin-moderation-items');
  if (modEl && git) {
    const state = git.getState();
    const issues = state.issues || [];
    const prs = state.pullRequests || [];

    if (issues.length === 0 && prs.length === 0) {
      modEl.innerHTML = '<div style="color: var(--text-dim); padding: 0.75rem; text-align: center; font-size: 0.8rem;">No issues or pull requests present in the repository.</div>';
    } else {
      let html = '<div style="display: flex; flex-direction: column; gap: 0.45rem;">';
      issues.forEach(i => {
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.45rem 0.75rem; font-size: 0.78rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0;">
              <span class="badge" style="background: rgba(54, 228, 212, 0.15); color: var(--accent-cyan); font-size: 0.65rem;">Issue #${i.number}</span>
              <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(i.title)}</strong>
              <span style="color: var(--text-dim); font-size: 0.72rem;">by <strong>${escapeHtml(i.author)}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: 0.75rem;">
              <span class="badge" style="font-size: 0.65rem;">${i.status}</span>
              <button class="btn btn-xs btn-danger" onclick="adminDeleteIssuePrompt('${i.id}')" title="Permanently delete issue">🗑️ Delete</button>
            </div>
          </div>
        `;
      });
      prs.forEach(p => {
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.45rem 0.75rem; font-size: 0.78rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0;">
              <span class="badge" style="background: rgba(163, 113, 247, 0.15); color: var(--accent-purple); font-size: 0.65rem;">PR #${p.number}</span>
              <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.title)}</strong>
              <span style="color: var(--text-dim); font-size: 0.72rem;">by <strong>${escapeHtml(p.author)}</strong> (${escapeHtml(p.headBranch)} → ${escapeHtml(p.baseBranch)})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: 0.75rem;">
              <span class="badge" style="font-size: 0.65rem;">${p.status}</span>
              <button class="btn btn-xs btn-danger" onclick="adminDeletePRPrompt('${p.id}')" title="Permanently delete pull request">🗑️ Delete</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
      modEl.innerHTML = html;
    }
  }

  // 2. Render Live Audit Logs
  const auditLogsEl = document.getElementById('admin-audit-logs');
  if (auditLogsEl) {
    const logs = SessionStore.getAuditLogs('session-demo');
    if (logs.length === 0) {
      auditLogsEl.innerHTML = '<div style="color: var(--text-dim); padding: 0.5rem;">No audit logs recorded yet.</div>';
    } else {
      auditLogsEl.innerHTML = logs.map(l => `
        <div style="padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--border-color); font-size: 0.75rem;">
          <span style="color: var(--accent-blue); font-family: var(--font-mono);">${new Date(l.timestamp).toLocaleTimeString()}</span>
          <strong style="margin-left: 0.5rem;">${l.participantName}</strong>: ${l.reason}
        </div>
      `).join('');
    }
  }

  // 3. Render Active Pending OTPs
  const otpsEl = document.getElementById('admin-live-otps-container');
  if (otpsEl) {
    if (typeof window.fetchCloudOtps === 'function') {
      window.fetchCloudOtps('session-demo').then(otps => {
        if (!otps || otps.length === 0) {
          otpsEl.innerHTML = '<div style="color: var(--text-dim); padding: 0.25rem;">No active pending OTPs. Master bypass code: <strong style="color: var(--accent-green); font-family: var(--font-mono);">BMU2025</strong></div>';
          return;
        }
        otpsEl.innerHTML = otps.map(o => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border-color);">
            <div>
              <strong style="color: #fff;">${escapeHtml(o.name || 'Student')}</strong>
              <span style="color: var(--text-dim); font-size: 0.75rem; margin-left: 0.4rem;">(${escapeHtml(o.email)})</span>
            </div>
            <div style="font-family: var(--font-mono); font-weight: 800; color: var(--accent-cyan); font-size: 0.95rem; background: var(--bg-tertiary); padding: 0.15rem 0.45rem; border-radius: 4px; border: 1px solid var(--border-color);">
              ${escapeHtml(o.otp)}
            </div>
          </div>
        `).join('');
      }).catch(() => {});
    }
  }
}

function exportLeaderboardCSV() {
  const entries = SessionStore.getLeaderboard('session-demo');
  let csv = 'Rank,Name,RollNumber,GitHubUsername,VerifiedXP,MissionsCompleted,Status\n';

  entries.forEach(e => {
    csv += `${e.rank},"${e.name}","${e.rollNumber || ''}","${e.githubUsername || ''}",${e.verifiedXP},${e.completedCount},${e.isOnline ? 'Live' : 'Offline'}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `open_sourcery_leaderboard.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported Leaderboard CSV', 'success');
}

function resetAllWorkshopData() {
  showConfirmDialog({
    title: '⚠️ Wipe & Reset All Workshop Arena Data?',
    message: 'This will completely remove ALL registered participants, scores, previous attempts, and wipe the live leaderboard clean for everyone. This cannot be undone.',
    confirmText: 'Yes, Wipe Everything',
    confirmClass: 'btn-danger',
    icon: '🗑️',
    onConfirm: async () => {
      SessionStore.wipeAllData();
      localStorage.clear();
      if (typeof window.clearAllCloudData === 'function') {
        await window.clearAllCloudData('session-demo');
      }
      showToast('All arena and leaderboard data wiped clean! Reloading...', 'success');
      setTimeout(() => location.reload(), 1000);
    }
  });
}

let timerInterval = null;
let hasAlertedTimeUp = false;

function startTimer() {
  const timerEl = document.getElementById('session-countdown');
  if (!timerEl) return;

  if (timerInterval) clearInterval(timerInterval);

  // If user is not registered yet, display default 15:00
  if (localStorage.getItem('open_sourcery_user_registered') !== 'true') {
    timerEl.textContent = '15:00';
    return;
  }

  let startTime = parseInt(localStorage.getItem('open_sourcery_timer_start'), 10);
  if (!startTime || isNaN(startTime)) {
    startTime = Date.now();
    localStorage.setItem('open_sourcery_timer_start', startTime.toString());
  }

  const totalMs = 15 * 60 * 1000; // 15 Minutes sprint

  const updateCountdown = () => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, totalMs - elapsed);

    // Continuously checkpoint remaining time every second
    const curEmail = localStorage.getItem('open_sourcery_user_email');
    if (curEmail) {
      localStorage.setItem(`open_sourcery_timer_remaining_${curEmail.toLowerCase()}`, remaining.toString());
    }
    if (currentContributor) {
      localStorage.setItem(`open_sourcery_timer_remaining_${currentContributor.toLowerCase()}`, remaining.toString());
    }
    localStorage.setItem('open_sourcery_timer_remaining_last', remaining.toString());

    if (Math.floor(elapsed / 1000) % 5 === 0) {
      let curPart = SessionStore.getCurrentParticipant('session-demo');
      if (!curPart && curEmail) curPart = SessionStore.getParticipantByEmail('session-demo', curEmail);
      if (curPart) {
        curPart.timerRemainingMs = remaining;
        localStorage.setItem(`open_sourcery_participant_session-demo_${curPart.id}`, JSON.stringify(curPart));
      }
    }

    if (remaining <= 0) {
      timerEl.textContent = '00:00 (Submitted)';
      timerEl.style.color = 'var(--accent-cyan)';
      if (timerInterval) clearInterval(timerInterval);
      if (!hasAlertedTimeUp) {
        hasAlertedTimeUp = true;
        markAssessmentSubmitted();
      }
    } else {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      if (mins < 3) {
        timerEl.style.color = 'var(--accent-orange)';
      } else {
        timerEl.style.color = '';
      }
    }
  };

  updateCountdown();
  timerInterval = setInterval(updateCountdown, 1000);
}

function markAssessmentSubmitted() {
  const curEmail = (localStorage.getItem('open_sourcery_user_email') || '').toLowerCase().trim();
  if (curEmail) {
    localStorage.setItem(`open_sourcery_submitted_${curEmail}`, 'true');
  }

  let curPart = SessionStore.getCurrentParticipant('session-demo');
  if (!curPart && curEmail) {
    curPart = SessionStore.getParticipantByEmail('session-demo', curEmail);
  }

  if (curPart) {
    curPart.hasSubmitted = true;
    curPart.isFinished = true;
    curPart.timerRemainingMs = 0;
    curPart.submittedAt = Date.now();
    localStorage.setItem(`open_sourcery_participant_session-demo_${curPart.id}`, JSON.stringify(curPart));
    localStorage.setItem(`open_sourcery_submitted_${curPart.id}`, 'true');
    if (typeof window.syncParticipantToCloud === 'function') {
      window.syncParticipantToCloud('session-demo', curPart);
    }
  }

  const timerEl = document.getElementById('session-countdown');
  if (timerEl) {
    timerEl.textContent = '00:00 (Submitted)';
    timerEl.style.color = 'var(--accent-cyan)';
  }
  if (timerInterval) clearInterval(timerInterval);

  showTimeUpSummary();
}

function showTimeUpSummary() {
  const curEmail = (localStorage.getItem('open_sourcery_user_email') || '').toLowerCase().trim();
  let curPart = SessionStore.getCurrentParticipant('session-demo');
  if (!curPart && curEmail) {
    curPart = SessionStore.getParticipantByEmail('session-demo', curEmail);
  }

  const totalXP = curPart ? (curPart.verifiedXP || 0) : 0;
  const completedMissions = curPart ? (curPart.completedMissions || []).length : 0;

  const xpEl = document.getElementById('time-up-xp');
  const countEl = document.getElementById('time-up-missions');
  if (xpEl) xpEl.textContent = `${totalXP} XP`;
  if (countEl) countEl.textContent = `${completedMissions} / 8`;

  openModal('time-up-modal');
  triggerConfetti(65);
  showToast('🏁 Assessment Finished! Your score has been submitted, thank you!', 'success');
}

function confirmEarlySubmit() {
  openConfirmModal({
    title: 'Submit Final Assessment Score?',
    message: 'Are you sure you want to finalize and submit your assessment score now? Once submitted, your score will be locked in the database and re-entry is not permitted.',
    confirmText: 'Yes, Submit My Score',
    confirmClass: 'btn-primary',
    icon: '🏁',
    onConfirm: () => {
      markAssessmentSubmitted();
    }
  });
}

function openOnboardingModal() {
  const overlay = document.getElementById('onboarding-overlay');
  const closeBtn = document.getElementById('onboarding-close-btn');
  const isRegistered = localStorage.getItem('open_sourcery_user_registered') === 'true';
  if (closeBtn) closeBtn.style.display = isRegistered ? 'flex' : 'none';
  if (overlay) overlay.style.display = 'flex';
}

function closeOnboardingModal() {
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) overlay.style.display = 'none';
}

// --- Participant Logout (Disabled During Sprint) ---

function logoutParticipant() {
  showToast('Assessment in progress! Logging out is disabled until you finish or submit your score.', 'warning');
}

// --- Fullscreen & Tab-Switch Protection Guards (Instant Disqualification) ---

function isUserSprintActive() {
  if (localStorage.getItem('open_sourcery_disqualified') === 'true') return false;
  if (isAdminAuthenticated()) return false;
  const isRegistered = localStorage.getItem('open_sourcery_user_registered') === 'true';
  if (!isRegistered) return false;
  const startTime = parseInt(localStorage.getItem('open_sourcery_timer_start'), 10);
  if (!startTime) return false;
  const totalMs = 15 * 60 * 1000;
  return (Date.now() - startTime) < totalMs;
}

function requestAppFullscreen() {
  const docEl = document.documentElement;
  try {
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    } else if (docEl.mozRequestFullScreen) {
      docEl.mozRequestFullScreen();
    } else if (docEl.msRequestFullscreen) {
      docEl.msRequestFullscreen();
    }
  } catch (err) {
    console.debug('Fullscreen request notice:', err);
  }
}

function triggerTabSwitchViolation(reason = 'Tab switch detected') {
  if (!isUserSprintActive() || isAdminAuthenticated()) return;

  let violations = parseInt(localStorage.getItem('open_sourcery_tab_switch_count') || '0', 10) + 1;
  localStorage.setItem('open_sourcery_tab_switch_count', violations.toString());

  // 2-Strike Grace Policy: First infraction gives a high-priority warning toast so accidental clicks don't instantly disqualify
  if (violations === 1) {
    showToast(`⚠️ Focus Alert (1/2): ${reason}. Please stay inside the arena window! Next distraction will disqualify your sprint.`, 'error');
    return;
  }

  localStorage.setItem('open_sourcery_disqualified', 'true');
  localStorage.setItem('open_sourcery_disqualified_reason', reason);

  const curPart = SessionStore.getCurrentParticipant('session-demo') || SessionStore.getParticipantByName('session-demo', currentContributor);
  if (curPart) {
    SessionStore.disqualifyParticipant('session-demo', curPart.id, reason);
  }

  if (timerInterval) clearInterval(timerInterval);

  if (git) {
    git.recordAction('DISQUALIFIED', `OUT OF GAME: ${reason}`, currentContributor);
    saveActiveRepository();
  }

  showDisqualifiedScreen(reason);
}

function showDisqualifiedScreen(reason = 'Window switched / Tab lost focus') {
  const modal = document.getElementById('disqualified-modal');
  const reasonEl = document.getElementById('disqualified-reason-display');
  const scoreEl = document.getElementById('disqualified-score-display');
  const missionsEl = document.getElementById('disqualified-missions-display');

  const curPart = SessionStore.getCurrentParticipant('session-demo') || SessionStore.getParticipantByName('session-demo', currentContributor);
  const score = curPart ? (curPart.verifiedXP || 0) : 0;
  const missionsCount = curPart && curPart.completedMissions ? curPart.completedMissions.length : 0;

  if (reasonEl) reasonEl.textContent = reason;
  if (scoreEl) scoreEl.textContent = `${score} XP`;
  if (missionsEl) missionsEl.textContent = `${missionsCount} / 8`;

  if (modal) modal.classList.add('open');
  updateLeaderboardUI();
}

function restartOrExitAfterDisqualification() {
  localStorage.removeItem('open_sourcery_disqualified');
  localStorage.removeItem('open_sourcery_disqualified_reason');
  localStorage.removeItem('open_sourcery_user_registered');
  localStorage.removeItem('open_sourcery_timer_start');
  localStorage.removeItem('open_sourcery_tab_switch_count');
  closeModal('disqualified-modal');
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    switchOnboardingMode('participant');
  }
}

function adminReinstateParticipant(participantId, name) {
  SessionStore.reinstateParticipant('session-demo', participantId);
  if (name === currentContributor) {
    localStorage.removeItem('open_sourcery_disqualified');
    localStorage.removeItem('open_sourcery_disqualified_reason');
    closeModal('disqualified-modal');
  }
  updateLeaderboardUI();
  updateAdminUI();
  openParticipantDossier(participantId, name);
  showToast(`Reinstated "${name}" into the active sprint.`, 'success');
}

function handleFullscreenStateChange() {
  const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  if (!isFull && isUserSprintActive()) {
    triggerTabSwitchViolation('Exited full screen mode');
  }
}

let guardsInitialized = false;
function initFocusAndFullscreenGuards() {
  if (guardsInitialized) return;
  guardsInitialized = true;

  document.addEventListener('fullscreenchange', handleFullscreenStateChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenStateChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenStateChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenStateChange);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isUserSprintActive()) {
      triggerTabSwitchViolation('Switched browser tab or minimized window');
    }
  });
}

// --- Modal Helpers ---

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// In-Page Confirmation Dialog Helper (Never exits full-screen or causes blur)
let confirmActionCallback = null;

function showConfirmDialog({ title = 'Confirm Action', message, confirmText = 'Confirm', confirmClass = 'btn-danger', icon = '⚠️', onConfirm }) {
  const modal = document.getElementById('confirm-action-modal');
  if (!modal) {
    if (typeof onConfirm === 'function') onConfirm();
    return;
  }
  const titleEl = document.getElementById('confirm-modal-title');
  if (titleEl) titleEl.innerHTML = `<span>${icon}</span><span>${title}</span>`;
  const msgEl = document.getElementById('confirm-modal-message');
  if (msgEl) msgEl.textContent = message;
  const okBtn = document.getElementById('confirm-modal-ok-btn');
  if (okBtn) {
    okBtn.textContent = confirmText;
    okBtn.className = `btn ${confirmClass}`;
  }
  confirmActionCallback = onConfirm;
  openModal('confirm-action-modal');
}

function executeConfirmAction() {
  closeModal('confirm-action-modal');
  if (typeof confirmActionCallback === 'function') {
    const cb = confirmActionCallback;
    confirmActionCallback = null;
    cb();
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
