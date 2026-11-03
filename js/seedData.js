/**
 * Open Sourcery Arena — Clean Template Repositories & Missions
 * Pure Vanilla JavaScript
 */

const INITIAL_FILES = {
  'README.md': `# College Portal 🎓

Welcome to the **Student Web Portal**! This is an open-source collaborative web project.

## 🚀 Quick Start

To run this portal locally on your machine:

\`\`\`bash
# 1. Clone the repository
git clone https://github.com/open-sourcery/college-website.git

# 2. Open index.html in your browser
open index.html
\`\`\`

## 🤝 Contributing

1. Create a feature branch (\`git branch feature/your-name\`).
2. Make your edits and commit changes.
3. Push to remote and open a Pull Request.

## 📜 License

MIT License © 2025 Open Sourcery Team.
`,

  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Campus Portal</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="navbar">
    <div class="logo">Campus Portal ⚡</div>
    <nav>
      <a href="#about">About</a>
      <a href="#events">Events</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>

  <main class="hero">
    <h1>Welcome to Campus Portal</h1>
    <p>Build real projects, collaborate with team members, and practice Git & GitHub.</p>
    <a href="#events" class="btn">Explore Workshops</a>
  </main>

  <footer class="footer">
    <p>&copy; 2025 Open Sourcery Club. Built with Git & GitHub.</p>
  </footer>
</body>
</html>
`,

  'style.css': `/* Portal Styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  line-height: 1.6;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2rem;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
}

.navbar .logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #38bdf8;
}

.navbar nav a {
  color: #94a3b8;
  text-decoration: none;
  margin-left: 1.5rem;
  transition: color 0.2s ease;
}

.navbar nav a:hover {
  color: #38bdf8;
}

.hero {
  padding: 5rem 2rem;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 2.75rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero p {
  font-size: 1.2rem;
  color: #94a3b8;
  margin-bottom: 2rem;
}

.btn {
  display: inline-block;
  background: #0284c7;
  color: #ffffff;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
}

.footer {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.875rem;
}
`,

  '.gitignore': `node_modules/\n.env\n.DS_Store\ndist/\n`
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
