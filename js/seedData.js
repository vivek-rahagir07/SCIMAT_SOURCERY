/**
 * Open Sourcery Arena — Clean Template Repositories & Missions
 * Pure Vanilla JavaScript
 */

const INITIAL_FILES = {
  'README.md': `# Campus Open Source Portal 🎓⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io)

Welcome to the **University Campus Open Source Portal**! This repository serves as the official collaborative digital platform for students, clubs, technical chapters, and open-source contributors across the campus community.

---

## 📌 Project Overview

The Campus Portal provides a centralized, modern hub designed to bridge the gap between student developers and impactful collaborative software development.

### Key Capabilities:
- 🚀 **Interactive Club & Chapter Directory**: Real-time searchable index of technical chapters and coding clubs.
- 📅 **Campus Hackathons & Events Scheduler**: Live calendar with direct RSVP registration.
- 📚 **Resource Library**: Open-access curated study roadmaps, DSA guides, and project templates.
- 🤝 **Live Contributor Showcase**: Automated recognition for peer pull requests and open-source contributions.

---

## 🛠️ Architecture & Tech Stack

\`\`\`
├── index.html        # Semantic HTML5 architecture & responsive grid layouts
├── style.css         # Modern CSS3 with custom properties, flexbox/grid & animations
├── app.js            # Client-side state management, search filters & event handling
├── package.json      # Project dependencies, build scripts, and linting rules
├── .gitignore        # Standard web development artifact exclusion rules
└── README.md         # Comprehensive project documentation & contributor guide
\`\`\`

---

## 🚀 Quick Start Guide

Follow these steps to run the campus portal locally on your workstation:

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/open-sourcery/college-website.git
cd college-website
\`\`\`

### 2. Inspect Git status and current branch
\`\`\`bash
git status
git branch -a
\`\`\`

### 3. Launch in your browser
\`\`\`bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
\`\`\`

---

## 🤝 Contribution Workflow

We welcome all university students and developers to contribute! To propose a change:

1. **Pick an Issue**: Check out the open issues or raise a new one describing a bug or enhancement.
2. **Create a Feature Branch**:
   \`\`\`bash
   git checkout -b feature/your-feature-name
   \`\`\`
3. **Commit Your Code**:
   \`\`\`bash
   git add .
   git commit -m "feat(portal): add interactive event filter system"
   \`\`\`
4. **Push to Remote**:
   \`\`\`bash
   git push origin feature/your-feature-name
   \`\`\`
5. **Open a Pull Request**: Submit your PR targeting \`main\` with a clear description and screenshots.

---

## 📜 Code of Conduct & License

- Please adhere to the University Academic Integrity & Open Source Code of Conduct.
- Licensed under the **MIT License** © 2025 Open Sourcery & SCI-MAT Contributors.
`,

  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Official Campus Open Source Portal for Students and Developers" />
  <title>Campus Open Source Portal 🎓⚡</title>
  <link rel="stylesheet" href="style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
</head>
<body>
  <!-- Top Accessibility Navigation Banner -->
  <header class="navbar" id="top-navbar">
    <div class="nav-container">
      <a href="#" class="brand-brand">
        <span class="brand-icon">⚡</span>
        <div class="brand-text">
          <span class="brand-title">CAMPUS PORTAL</span>
          <span class="brand-sub">University Developer Hub</span>
        </div>
      </a>

      <!-- Search Input in Header -->
      <div class="nav-search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="global-search-input" placeholder="Search clubs, workshops, roadmaps..." autocomplete="off" />
      </div>

      <nav class="nav-links">
        <a href="#about" class="nav-link active">About</a>
        <a href="#events" class="nav-link">Workshops</a>
        <a href="#clubs" class="nav-link">Clubs</a>
        <a href="#contributors" class="nav-link">Contributors</a>
        <button id="theme-toggle-btn" class="theme-btn" title="Toggle Dark/Light Mode">🌙</button>
        <a href="#join" class="btn btn-primary nav-cta">Join Community</a>
      </nav>
    </div>
  </header>

  <main>
    <!-- Hero Showcase Section -->
    <section class="hero-section" id="about">
      <div class="hero-container">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          <span>Open Sourcery 2025 • Collaborative Arena</span>
        </div>
        <h1 class="hero-heading">
          Build Real Software.<br />
          <span>Contribute Together.</span>
        </h1>
        <p class="hero-lead">
          The official open-source repository for student software engineering, peer code reviews, Git branching practices, and campus technology initiatives.
        </p>

        <div class="hero-cta-group">
          <a href="#events" class="btn btn-primary btn-lg">Explore Workshops 🚀</a>
          <a href="#contributors" class="btn btn-outline btn-lg">View Contributors 🤝</a>
        </div>

        <!-- Campus Vital Statistics -->
        <div class="hero-stats-row">
          <div class="stat-card">
            <div class="stat-number" data-target="1250">0</div>
            <div class="stat-label">Active Student Devs</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" data-target="84">0</div>
            <div class="stat-label">Merged Pull Requests</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" data-target="18">0</div>
            <div class="stat-label">Technical Chapters</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" data-target="99">0</div>
            <div class="stat-label">% Open Source</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Events & Workshops Section -->
    <section class="events-section" id="events">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">Hands-on Learning</span>
          <h2 class="section-title">Upcoming Developer Workshops</h2>
          <p class="section-desc">Practical sessions designed to boost your industry workflows from day one.</p>
        </div>

        <!-- Workshop Filter Buttons -->
        <div class="filter-pill-bar">
          <button class="filter-pill active" data-filter="all">All Events</button>
          <button class="filter-pill" data-filter="git">Git & GitHub</button>
          <button class="filter-pill" data-filter="web">Web Development</button>
          <button class="filter-pill" data-filter="ai">AI & ML</button>
        </div>

        <div class="events-grid" id="events-grid">
          <!-- Event Card 1 -->
          <article class="event-card" data-category="git">
            <div class="event-card-header">
              <span class="event-tag tag-git">Git & GitHub</span>
              <span class="event-date">Nov 15, 2025</span>
            </div>
            <h3 class="event-title">Mastering Collaborative Git Workflows</h3>
            <p class="event-body">Learn branching strategies, 3-way merge resolution, rebasing, and opening production-ready PRs on GitHub.</p>
            <div class="event-footer">
              <span class="event-speaker">👤 Vivek Yadav (Lead)</span>
              <button class="btn btn-sm btn-primary rsvp-btn" data-event-id="1">RSVP Now</button>
            </div>
          </article>

          <!-- Event Card 2 -->
          <article class="event-card" data-category="web">
            <div class="event-card-header">
              <span class="event-tag tag-web">Web Dev</span>
              <span class="event-date">Nov 22, 2025</span>
            </div>
            <h3 class="event-title">Vanilla JavaScript Architecture & State Stores</h3>
            <p class="event-body">Deep-dive into component-free web development with BroadcastChannel real-time sync and localStorage persistence.</p>
            <div class="event-footer">
              <span class="event-speaker">👤 Dev Team</span>
              <button class="btn btn-sm btn-primary rsvp-btn" data-event-id="2">RSVP Now</button>
            </div>
          </article>

          <!-- Event Card 3 -->
          <article class="event-card" data-category="ai">
            <div class="event-card-header">
              <span class="event-tag tag-ai">AI & ML</span>
              <span class="event-date">Dec 01, 2025</span>
            </div>
            <h3 class="event-title">Building Autonomous Coding Assistants</h3>
            <p class="event-body">Learn how modern LLMs inspect git diffs, review code changes, and assist developers during sprint challenges.</p>
            <div class="event-footer">
              <span class="event-speaker">👤 SCI-MAT AI Chapter</span>
              <button class="btn btn-sm btn-primary rsvp-btn" data-event-id="3">RSVP Now</button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Campus Clubs Directory Section -->
    <section class="clubs-section" id="clubs">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">Student Community</span>
          <h2 class="section-title">Campus Technical Chapters</h2>
          <p class="section-desc">Connect with peer leaders, join hackathon teams, and build portfolio projects.</p>
        </div>

        <div class="clubs-grid">
          <div class="club-card">
            <div class="club-avatar">🚀</div>
            <h4 class="club-name">Open Sourcery Club</h4>
            <p class="club-desc">Dedicated to open source software, Git mastery, and contributing to global repositories.</p>
            <div class="club-stats"><span>150+ Members</span> • <span>Weekly Sprints</span></div>
          </div>
          <div class="club-card">
            <div class="club-avatar">⚡</div>
            <h4 class="club-name">SCI-MAT Technical Society</h4>
            <p class="club-desc">The premier university society advancing mathematics, computer science, and engineering.</p>
            <div class="club-stats"><span>320+ Members</span> • <span>Annual Hackathon</span></div>
          </div>
          <div class="club-card">
            <div class="club-avatar">🛡️</div>
            <h4 class="club-name">CyberSec & Systems Guild</h4>
            <p class="club-desc">Focused on ethical security, protocol design, network auditing, and competitive CTF competitions.</p>
            <div class="club-stats"><span>90+ Members</span> • <span>Monthly CTFs</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Newsletter & Community CTA Section -->
    <section class="newsletter-section" id="join">
      <div class="section-container newsletter-box">
        <h2>Stay Ahead With Campus Tech Bulletins</h2>
        <p>Get notified about upcoming hackathons, Git workshops, and open PR review sessions.</p>
        <form class="newsletter-form" id="newsletter-form">
          <input type="email" id="newsletter-email" required placeholder="Enter your university email (e.g. 25cse@bmu.edu.in)" />
          <button type="submit" class="btn btn-primary">Subscribe Free</button>
        </form>
        <div id="newsletter-msg" class="newsletter-msg"></div>
      </div>
    </section>
  </main>

  <!-- Modern Portal Footer -->
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-col-brand">
        <div class="brand-brand">
          <span class="brand-icon">⚡</span>
          <span class="brand-title">CAMPUS PORTAL</span>
        </div>
        <p class="footer-subtext">
          Open-source university platform maintained by student contributors and SCI-MAT.
        </p>
      </div>

      <div class="footer-links-group">
        <div class="footer-col">
          <h4>Platform</h4>
          <a href="#about">About Project</a>
          <a href="#events">Workshop Calendar</a>
          <a href="#clubs">Clubs Directory</a>
        </div>
        <div class="footer-col">
          <h4>Resources</h4>
          <a href="README.md">README Docs</a>
          <a href="#">Git Cheatsheet</a>
          <a href="#">Contributing Guide</a>
        </div>
        <div class="footer-col">
          <h4>Community</h4>
          <a href="#">GitHub Organization</a>
          <a href="#">Discord Server</a>
          <a href="#">Code of Conduct</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 Campus Portal. Open Source under MIT License. Built with HTML, CSS, JavaScript & Git.</p>
    </div>
  </footer>

  <script src="app.js"></script>
</body>
</html>
`,

  'style.css': `/**
 * Campus Open Source Portal Stylesheet
 * Responsive CSS3 Architecture with Modern Custom Properties
 */

:root {
  --primary: #0284c7;
  --primary-hover: #0369a1;
  --accent-cyan: #38bdf8;
  --accent-indigo: #6366f1;
  --accent-green: #22c55e;
  --accent-purple: #a855f7;
  --accent-orange: #f97316;

  --bg-body: #0b1120;
  --bg-surface: #131c31;
  --bg-surface-elevated: #1a2744;
  --bg-subtle: #080d19;

  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-dim: #64748b;

  --border-color: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(56, 189, 248, 0.5);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 14px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.6);
  --shadow-glow: 0 0 25px rgba(56, 189, 248, 0.25);
}

/* Light Theme Variable Overrides */
[data-theme="light"] {
  --bg-body: #f8fafc;
  --bg-surface: #ffffff;
  --bg-surface-elevated: #f1f5f9;
  --bg-subtle: #e2e8f0;
  --text-main: #0f172a;
  --text-muted: #475569;
  --text-dim: #64748b;
  --border-color: rgba(0, 0, 0, 0.08);
  --border-focus: rgba(2, 132, 199, 0.5);
  --shadow-glow: 0 0 25px rgba(2, 132, 199, 0.15);
}

/* Reset and Global Base Layout */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  font-size: 16px;
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg-body);
  color: var(--text-main);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  transition: background-color 0.25s ease, color 0.25s ease;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
}

/* Reusable Container Utilities */
.section-container, .hero-container, .nav-container, .footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* Navbar */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(11, 17, 32, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  padding: 0.85rem 0;
  transition: all 0.25s ease;
}

.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.brand-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.brand-icon {
  font-size: 1.5rem;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid var(--accent-cyan);
  border-radius: var(--radius-sm);
  padding: 0.2rem 0.4rem;
}

.brand-title {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
  color: var(--text-main);
}

.brand-sub {
  display: block;
  font-size: 0.68rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-search-wrap {
  flex: 1;
  max-width: 320px;
  position: relative;
  display: flex;
  align-items: center;
}

.nav-search-wrap .search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-dim);
  pointer-events: none;
}

.nav-search-wrap input {
  width: 100%;
  padding: 0.45rem 0.75rem 0.45rem 2.2rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  color: var(--text-main);
  font-size: 0.82rem;
  outline: none;
  transition: all 0.2s ease;
}

.nav-search-wrap input:focus {
  border-color: var(--border-focus);
  background: var(--bg-surface-elevated);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.nav-link {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.2s ease;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent-cyan);
}

.theme-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.6rem;
  font-size: 0.95rem;
  color: var(--text-main);
  transition: all 0.2s ease;
}

.theme-btn:hover {
  background: var(--bg-surface-elevated);
  border-color: var(--accent-cyan);
}

/* Button System */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.55rem 1.15rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.88rem;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--primary-hover);
  box-shadow: var(--shadow-glow);
  transform: translateY(-1px);
}

.btn-outline {
  background: transparent;
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  background: var(--bg-surface-elevated);
  border-color: var(--text-muted);
}

.btn-lg {
  padding: 0.75rem 1.6rem;
  font-size: 1rem;
  border-radius: var(--radius-md);
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
}

/* Hero Section */
.hero-section {
  padding: 5rem 0 4rem;
  background: radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.12), transparent 70%);
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.85rem;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-cyan);
  margin-bottom: 1.5rem;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-green);
  box-shadow: 0 0 8px var(--accent-green);
}

.hero-heading {
  font-size: 3.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin-bottom: 1.25rem;
}

.hero-heading span {
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-lead {
  font-size: 1.15rem;
  color: var(--text-muted);
  max-width: 680px;
  margin: 0 auto 2.25rem;
}

.hero-cta-group {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3.5rem;
  flex-wrap: wrap;
}

/* Stats Row */
.hero-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.25rem;
  max-width: 900px;
  margin: 0 auto;
}

.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.25rem 1rem;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-cyan);
}

.stat-number {
  font-size: 2rem;
  font-weight: 800;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
}

.stat-label {
  font-size: 0.78rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
}

/* Section Common Header */
.section-header {
  text-align: center;
  max-width: 640px;
  margin: 0 auto 2.5rem;
}

.section-tag {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent-cyan);
  display: block;
  margin-bottom: 0.5rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.65rem;
}

.section-desc {
  font-size: 0.95rem;
  color: var(--text-muted);
}

/* Events Section */
.events-section, .clubs-section {
  padding: 4.5rem 0;
  border-top: 1px solid var(--border-color);
}

.filter-pill-bar {
  display: flex;
  justify-content: center;
  gap: 0.65rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-pill {
  padding: 0.4rem 1rem;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.filter-pill.active, .filter-pill:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.events-grid, .clubs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.event-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.event-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.event-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.event-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.tag-git { background: rgba(249, 115, 22, 0.15); color: var(--accent-orange); }
.tag-web { background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); }
.tag-ai { background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); }

.event-date {
  font-size: 0.78rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

.event-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.65rem;
  color: var(--text-main);
}

.event-body {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 1.5rem;
  flex: 1;
}

.event-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.event-speaker {
  font-size: 0.78rem;
  color: var(--text-dim);
}

/* Clubs Cards */
.club-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.75rem 1.5rem;
  text-align: center;
  transition: all 0.2s ease;
}

.club-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent-cyan);
}

.club-avatar {
  font-size: 2.25rem;
  margin-bottom: 0.85rem;
}

.club-name {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.club-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.club-stats {
  font-size: 0.78rem;
  color: var(--text-dim);
}

/* Newsletter Section */
.newsletter-section {
  padding: 4rem 0;
  border-top: 1px solid var(--border-color);
}

.newsletter-box {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(99, 102, 241, 0.15));
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: var(--radius-lg);
  padding: 3rem 2rem;
  text-align: center;
  max-width: 800px;
}

.newsletter-box h2 {
  font-size: 1.85rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.newsletter-box p {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 1.75rem;
}

.newsletter-form {
  display: flex;
  gap: 0.75rem;
  max-width: 500px;
  margin: 0 auto;
}

.newsletter-form input {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  outline: none;
}

.newsletter-form input:focus {
  border-color: var(--accent-cyan);
}

.newsletter-msg {
  margin-top: 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
}

/* Footer */
.footer {
  border-top: 1px solid var(--border-color);
  background: var(--bg-subtle);
  padding: 3.5rem 0 1.5rem;
}

.footer-container {
  display: flex;
  justify-content: space-between;
  gap: 3rem;
  flex-wrap: wrap;
  margin-bottom: 2.5rem;
}

.footer-col-brand {
  max-width: 340px;
}

.footer-subtext {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-top: 0.75rem;
  line-height: 1.5;
}

.footer-links-group {
  display: flex;
  gap: 3.5rem;
  flex-wrap: wrap;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.footer-col h4 {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-main);
  margin-bottom: 0.25rem;
}

.footer-col a {
  font-size: 0.82rem;
  color: var(--text-muted);
  transition: color 0.2s ease;
}

.footer-col a:hover {
  color: var(--accent-cyan);
}

.footer-bottom {
  text-align: center;
  font-size: 0.78rem;
  color: var(--text-dim);
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

/* Responsive Media Queries */
@media (max-width: 850px) {
  .hero-heading { font-size: 2.5rem; }
  .nav-search-wrap { display: none; }
  .nav-links { gap: 0.85rem; }
  .newsletter-form { flex-direction: column; }
}
`,

  'app.js': `/**
 * Campus Open Source Portal Client Application
 * Handles dynamic interactions, filters, statistics animation, and state
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initStatsCounter();
  initEventFilters();
  initGlobalSearch();
  initNewsletter();
});

// --- Theme Switcher (Dark / Light) ---
function initThemeToggle() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (!themeBtn) return;

  const currentTheme = localStorage.getItem('campus_portal_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeBtn.textContent = currentTheme === 'light' ? '☀️' : '🌙';

  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('campus_portal_theme', newTheme);
    themeBtn.textContent = newTheme === 'light' ? '☀️' : '🌙';
  });
}

// --- Live Numeric Statistics Counters ---
function initStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (!statNumbers.length) return;

  const animateCounters = () => {
    statNumbers.forEach(stat => {
      const target = parseInt(stat.getAttribute('data-target'), 10) || 0;
      let count = 0;
      const speed = Math.max(1, Math.floor(target / 40));

      const updateCount = () => {
        count += speed;
        if (count < target) {
          stat.textContent = count;
          requestAnimationFrame(updateCount);
        } else {
          stat.textContent = target;
        }
      };
      updateCount();
    });
  };

  // Run on initial page load
  animateCounters();
}

// --- Category Filter System for Workshops ---
function initEventFilters() {
  const filterPills = document.querySelectorAll('.filter-pill');
  const eventCards = document.querySelectorAll('.event-card');
  if (!filterPills.length || !eventCards.length) return;

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filterValue = pill.getAttribute('data-filter');

      eventCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterValue === 'all' || category === filterValue) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // RSVP buttons handler
  document.querySelectorAll('.rsvp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = e.target.closest('.event-card')?.querySelector('.event-title')?.textContent || 'Event';
      btn.textContent = '✓ Registered!';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
      btn.disabled = true;
      console.log(\`RSVP confirmed for: \${title}\`);
    });
  });
}

// --- Real-time Search Filter ---
function initGlobalSearch() {
  const searchInput = document.getElementById('global-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const eventCards = document.querySelectorAll('.event-card');
    const clubCards = document.querySelectorAll('.club-card');

    eventCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(query) ? 'flex' : 'none';
    });

    clubCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(query) ? 'block' : 'none';
    });
  });
}

// --- Campus Newsletter Subscription ---
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  const msgEl = document.getElementById('newsletter-msg');
  if (!form || !msgEl) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('newsletter-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) return;

    msgEl.textContent = \`🎉 Awesome! \${email} has been subscribed to weekly campus updates.\`;
    msgEl.style.color = '#38bdf8';
    form.reset();
  });
}
`,

  'package.json': `{
  "name": "campus-portal",
  "version": "1.0.0",
  "description": "Collaborative Student Web Portal & Open Source Developer Platform",
  "main": "app.js",
  "scripts": {
    "start": "python3 -m http.server 3000",
    "test": "echo \\"Running lint checks...\\" && exit 0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/open-sourcery/college-website.git"
  },
  "keywords": [
    "open-source",
    "git",
    "github",
    "workshop",
    "university",
    "javascript"
  ],
  "author": "Open Sourcery Community",
  "license": "MIT"
}
`,

  '.gitignore': `node_modules/
.env
.env.local
.DS_Store
dist/
build/
*.log
npm-debug.log*
.vscode/
.idea/
`
};

const DEFAULT_MISSIONS = [
  {
    id: 'mission-1',
    number: 1,
    title: 'Explore the Repository',
    description: 'Inspect the README.md file and check the project structure on the main branch.',
    difficulty: 'Beginner',
    xp: 50,
    hints: [
      'Click on the "Code" tab in your repository header.',
      'Click on "README.md" in the file list to view its contents.'
    ]
  },
  {
    id: 'mission-2',
    number: 2,
    title: 'Raise an Issue',
    description: 'Open a GitHub Issue to track a bug, feature proposal, or task for your team.',
    difficulty: 'Beginner',
    xp: 100,
    hints: [
      'Navigate to the "Issues" tab.',
      'Click the "+ New Issue" button and fill in a title and description.'
    ]
  },
  {
    id: 'mission-3',
    number: 3,
    title: 'Create a Feature Branch',
    description: 'Create an isolated feature branch (e.g. "feature/navbar" or "fix/styling") to work on changes safely.',
    difficulty: 'Beginner',
    xp: 75,
    hints: [
      'Use the branch dropdown selector or terminal command "git branch <name>".',
      'Switch to your new branch so upcoming commits are saved on it.'
    ]
  },
  {
    id: 'mission-4',
    number: 4,
    title: 'Make a Commit',
    description: 'Edit a file or add a new file, stage your changes, and make a Git commit with a descriptive message.',
    difficulty: 'Intermediate',
    xp: 100,
    hints: [
      'Click on any file to edit it, or click "+ Add File".',
      'Stage the file into the index, enter a commit message, and click "Commit changes".'
    ]
  },
  {
    id: 'mission-5',
    number: 5,
    title: 'Push Changes to Remote',
    description: 'Push your local branch commits to the remote origin repository so others can collaborate.',
    difficulty: 'Intermediate',
    xp: 75,
    hints: [
      'Click the "⬆ Push" button in the Code tab or run "git push origin <branch>" in the terminal.'
    ]
  },
  {
    id: 'mission-6',
    number: 6,
    title: 'Open a Pull Request',
    description: 'Propose your branch changes to the team by opening a Pull Request into main.',
    difficulty: 'Intermediate',
    xp: 150,
    hints: [
      'Go to the "Pull Requests" tab and click "+ New pull request".',
      'Compare your feature branch against main and submit the PR.'
    ]
  },
  {
    id: 'mission-7',
    number: 7,
    title: 'Review and Merge a PR',
    description: 'Inspect a pull request diff, submit an approval review, and merge it into main.',
    difficulty: 'Intermediate',
    xp: 150,
    hints: [
      'Open a pull request from the list.',
      'Review the diffs, click "Approve Changes", and click "Merge pull request".'
    ]
  },
  {
    id: 'mission-8',
    number: 8,
    title: 'Resolve a Merge Conflict',
    description: 'Merge a diverging branch into main, resolve conflict markers cleanly, and complete the merge commit.',
    difficulty: 'Advanced',
    xp: 200,
    hints: [
      'Initiate a merge between two branches with conflicting edits.',
      'Open the Conflict Resolver, clean up the markers, stage, and commit.'
    ]
  }
];

function createInitialRepository(creator = 'Vivek') {
  const timestamp = Date.now();
  const commitId = Math.random().toString(16).substring(2, 9);

  const initialCommit = {
    id: commitId,
    shortId: commitId,
    parentId: null,
    message: 'Initial commit: setup project template',
    author: `${creator} <${creator.toLowerCase().replace(/\s+/g, '')}@opensourcery.dev>`,
    timestamp,
    branch: 'main',
    files: { ...INITIAL_FILES },
    diffSummary: { filesChanged: Object.keys(INITIAL_FILES).length, insertions: 120, deletions: 0 }
  };

  return {
    id: 'repo-college-website',
    name: 'college-website',
    owner: 'open-sourcery',
    description: 'Collaborative open source project repository.',
    isPublic: true,
    stars: 0,
    forks: 0,
    watchers: 0,
    defaultBranch: 'main',
    currentBranch: 'main',
    files: { ...INITIAL_FILES },
    stagedFiles: {},
    branches: {
      'main': initialCommit.id
    },
    remoteBranches: {
      'main': initialCommit.id
    },
    commits: [initialCommit],
    issues: [],
    pullRequests: [],
    activeConflict: null,
    activities: [
      {
        id: `act-${timestamp}`,
        user: creator,
        avatar: creator.charAt(0).toUpperCase(),
        action: 'repo',
        details: `Initialized repository open-sourcery/college-website`,
        timestamp
      }
    ],
    contributors: [creator]
  };
}

function createNewBlankRepository(name, description = '', owner = 'open-sourcery', isPublic = true, initReadme = true, creator = 'Vivek') {
  const sanitizedName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const repoId = `repo-${sanitizedName}-${Date.now().toString(36)}`;
  const timestamp = Date.now();

  const files = {};
  if (initReadme) {
    files['README.md'] = `# ${sanitizedName}\n\n${description || 'Welcome to ' + sanitizedName + '!'}\n\n## Getting Started\nClone this repository and start collaborating with your team.\n\n\`\`\`bash\ngit clone https://github.com/${owner}/${sanitizedName}.git\n\`\`\`\n\n## License\nMIT License © ${new Date().getFullYear()} ${owner}\n`;
  }
  files['.gitignore'] = `node_modules/\n.env\n.DS_Store\ndist/\n`;

  const commitId = Math.random().toString(16).substring(2, 9);
  const initialCommit = {
    id: commitId,
    shortId: commitId,
    parentId: null,
    message: 'Initial commit',
    author: `${creator} <${creator.toLowerCase().replace(/\s+/g, '')}@opensourcery.dev>`,
    timestamp,
    branch: 'main',
    files: { ...files },
    diffSummary: { filesChanged: Object.keys(files).length, insertions: 15, deletions: 0 }
  };

  return {
    id: repoId,
    name: sanitizedName,
    owner,
    description: description.trim() || 'A new open source collaborative repository.',
    isPublic,
    stars: 0,
    forks: 0,
    watchers: 0,
    defaultBranch: 'main',
    currentBranch: 'main',
    files: { ...files },
    stagedFiles: {},
    branches: {
      'main': initialCommit.id
    },
    remoteBranches: {
      'main': initialCommit.id
    },
    commits: [initialCommit],
    issues: [],
    pullRequests: [],
    activeConflict: null,
    activities: [
      {
        id: `act-${timestamp}`,
        user: creator,
        avatar: creator.charAt(0).toUpperCase(),
        action: 'repo',
        details: `Created new repository ${owner}/${sanitizedName}`,
        timestamp
      }
    ],
    contributors: [creator]
  };
}

if (typeof window !== 'undefined') {
  window.INITIAL_FILES = INITIAL_FILES;
  window.DEFAULT_MISSIONS = DEFAULT_MISSIONS;
  window.createInitialRepository = createInitialRepository;
  window.createNewBlankRepository = createNewBlankRepository;
}
if (typeof globalThis !== 'undefined') {
  globalThis.INITIAL_FILES = INITIAL_FILES;
  globalThis.DEFAULT_MISSIONS = DEFAULT_MISSIONS;
  globalThis.createInitialRepository = createInitialRepository;
  globalThis.createNewBlankRepository = createNewBlankRepository;
}
