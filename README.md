# Open Sourcery Arena ⚡

> **Tagline: Scan. Explore. Commit. Contribute.**

Open Sourcery Arena is a stateful, interactive Git & GitHub simulation learning platform built for university workshops and hackathons. It enables first-year students and aspiring developers to experience realistic open-source collaboration workflows without writing complex code.

---

## 🌟 Key Features

1. **GitHub-Inspired Developer Interface**:
   - Polished dark developer theme (`#0D1117`, `#161B22`, `#21262D`, `#30363D`, `#58A6FF`, `#36E4D4`, `#3FB950`).
   - Repository navigation tabs: **Code**, **Issues**, **Pull Requests**, **Branches**, **Commits**, **Activity**, and **Terminal**.
   - Responsive multi-column layout on desktop; optimized touch drawers on mobile.

2. **Stateful Git Simulation Engine**:
   - Real state machine tracking: **Working Directory → Staging Index → Local Repository → Remote Origin**.
   - Precise branch isolation, commit history graphs, and diff generation.
   - Interactive merge conflict simulator with standard conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`).

3. **8 Hands-on Workshop Missions (900 Total XP)**:
   - **Mission 1 (50 XP)**: *Explore the Repository* — Inspect `README.md` on `main`.
   - **Mission 2 (100 XP)**: *Raise an Issue* — File a bug report for an incorrect installation command.
   - **Mission 3 (75 XP)**: *Create a Branch* — Create an isolated feature branch (`fix/readme-command`).
   - **Mission 4 (100 XP)**: *Make a Commit* — Edit `README.md`, stage changes, and write a meaningful commit.
   - **Mission 5 (75 XP)**: *Push Changes* — Push local feature branch to simulated remote origin.
   - **Mission 6 (150 XP)**: *Open a Pull Request* — Propose branch changes with a diff comparison.
   - **Mission 7 (150 XP)**: *Review and Merge* — Inspect seeded PR #1, approve the peer review, and merge into `main`.
   - **Mission 8 (200 XP)**: *Resolve a Merge Conflict* — Merge conflicting branches, clean conflict markers in `index.html`, stage, and commit!

4. **Organizer Command Center**:
   - Session lifecycle controls: Start, Pause, Resume, End, and Publish Results.
   - High-resolution **Projector Mode QR Code** for auditorium screens.
   - Live real-time participant roster table with online status and completed missions.
   - Deep inspection modal: View any student's live files, branches, commits, PRs, and audit trail.
   - Top 3 Podium leaderboard with one-click **CSV Export**.

5. **Security & Fair Scoring**:
   - Production-grade Cloud Firestore security rules with zero-trust defaults.
   - Server-authoritative validation preventing client-side score modification.
   - Idempotent XP awarding eliminating score farming.

---

## 🚀 Quick Start (Local Run)

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suites (22 tests)
npm run test

# 3. Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

- **Student Home**: `http://localhost:5173/`
- **Join Session via QR/Link**: `http://localhost:5173/join/session-demo`
- **Student Arena**: `http://localhost:5173/arena/session-demo`
- **Leaderboard & Results**: `http://localhost:5173/results/session-demo`
- **Organizer Dashboard**: `http://localhost:5173/admin` (Passcode: `opensourcery2025`)

---

## 📦 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion, canvas-confetti, qrcode.react.
- **Backend**: Firebase Auth, Cloud Firestore, Cloud Functions, Firebase Security Rules.
- **Testing**: Vitest, React Testing Library, JSDOM.

---

## 🔒 Firebase Deployment

1. Copy `.env.example` to `.env` and fill in your Firebase project credentials.
2. Build frontend and functions:
   ```bash
   npm run build
   cd functions && npm run build && cd ..
   ```
3. Deploy Firestore rules and hosting:
   ```bash
   firebase deploy --only firestore:rules,hosting,functions
   ```

---

## 📜 License
MIT License © 2025 Open Sourcery Team. Built for educational empowerment.
