/**
 * Open Sourcery Arena — Complete Git Simulator Engine
 * Pure Vanilla JavaScript
 */

function generateShortHash() {
  return Math.random().toString(16).substring(2, 9);
}

class GitSimulator {
  constructor(initialState) {
    this.state = JSON.parse(JSON.stringify(initialState));
    if (!this.state.activities) this.state.activities = [];
    if (!this.state.contributors) this.state.contributors = [];
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  setState(newState) {
    this.state = JSON.parse(JSON.stringify(newState));
    if (!this.state.activities) this.state.activities = [];
    if (!this.state.contributors) this.state.contributors = [];
  }

  createFile(path, content, author = 'Student') {
    const cleanPath = path.trim().replace(/^\/+/, '');
    if (!cleanPath) return { success: false, message: 'Invalid file path.' };

    this.state.files[cleanPath] = content;
    this.state.stagedFiles[cleanPath] = content;
    this.recordAction('CREATE_FILE', `Created ${cleanPath}`, author);
    return { success: true, message: `Created file '${cleanPath}' and staged it.` };
  }

  deleteFile(path, author = 'Student') {
    if (this.state.files[path] === undefined) {
      return { success: false, message: `File '${path}' does not exist.` };
    }
    delete this.state.files[path];
    this.state.stagedFiles[path] = '__DELETED__';
    this.recordAction('DELETE_FILE', `Deleted ${path}`, author);
    return { success: true, message: `Removed ${path} (staged for deletion).` };
  }

  editFile(path, newContent, author = 'Student') {
    this.state.files[path] = newContent;
    this.recordAction('EDIT_FILE', `Modified ${path} in working directory`, author);
    return { success: true, message: `Updated ${path}` };
  }

  stageFile(path, author = 'Student') {
    if (this.state.files[path] === undefined && this.state.stagedFiles[path] !== '__DELETED__') {
      return { success: false, message: `error: pathspec '${path}' did not match any file(s) known to git` };
    }
    this.state.stagedFiles[path] = this.state.files[path];
    this.recordAction('STAGE_FILE', `Staged ${path}`, author);
    return { success: true, message: `Staged ${path}` };
  }

  unstageFile(path, author = 'Student') {
    if (!this.state.stagedFiles[path]) {
      return { success: false, message: `Path '${path}' is not staged.` };
    }
    delete this.state.stagedFiles[path];
    this.recordAction('UNSTAGE_FILE', `Unstaged ${path}`, author);
    return { success: true, message: `Unstaged ${path}` };
  }

  stageAll(author = 'Student') {
    let count = 0;
    for (const [path, content] of Object.entries(this.state.files)) {
      this.state.stagedFiles[path] = content;
      count++;
    }
    this.recordAction('STAGE_ALL', `Staged all ${count} file(s)`, author);
    return { success: true, count };
  }

  commit(message, author = 'Student Developer') {
    const stagedKeys = Object.keys(this.state.stagedFiles);
    if (stagedKeys.length === 0) {
      return {
        success: false,
        message: 'On branch ' + this.state.currentBranch + '\nNo changes added to commit (use "git add" to stage)'
      };
    }

    if (!message || message.trim().length === 0) {
      return { success: false, message: 'Aborting commit due to empty commit message.' };
    }

    const currentHeadCommitId = this.state.branches[this.state.currentBranch] || null;
    const shortId = generateShortHash();

    const snapshot = { ...this.state.files };
    for (const [path, content] of Object.entries(this.state.stagedFiles)) {
      if (content === '__DELETED__') {
        delete snapshot[path];
      } else {
        snapshot[path] = content;
      }
    }

    const newCommit = {
      id: shortId,
      shortId: shortId,
      parentId: currentHeadCommitId,
      message: message.trim(),
      author: `${author} <${author.toLowerCase().replace(/\s+/g, '')}@opensourcery.dev>`,
      timestamp: Date.now(),
      branch: this.state.currentBranch,
      files: snapshot,
      diffSummary: {
        filesChanged: stagedKeys.length,
        insertions: stagedKeys.length * 3,
        deletions: stagedKeys.length * 1
      }
    };

    this.state.commits.unshift(newCommit);
    this.state.branches[this.state.currentBranch] = newCommit.id;
    this.state.stagedFiles = {};

    this.recordAction('COMMIT', `[${this.state.currentBranch} ${shortId}] ${message.trim()}`, author);
    return {
      success: true,
      commit: newCommit,
      message: `[${this.state.currentBranch} ${shortId}] ${message.trim()}\n ${stagedKeys.length} file(s) changed`
    };
  }

  createBranch(name, author = 'Student') {
    const sanitized = name.trim().replace(/\s+/g, '-');
    if (!sanitized) {
      return { success: false, message: 'fatal: empty branch name' };
    }

    if (this.state.branches[sanitized]) {
      return { success: false, message: `fatal: A branch named '${sanitized}' already exists.` };
    }

    const currentHead = this.state.branches[this.state.currentBranch];
    this.state.branches[sanitized] = currentHead;
    this.recordAction('CREATE_BRANCH', `Created branch '${sanitized}'`, author);
    return { success: true, message: `Created branch '${sanitized}'` };
  }

  deleteBranch(name, author = 'Student') {
    if (!name) {
      return { success: false, message: 'fatal: branch name required' };
    }
    if (name === 'main' || name === this.state.defaultBranch) {
      return { success: false, message: 'error: Cannot delete the default branch.' };
    }
    if (this.state.currentBranch === name) {
      return { success: false, message: `error: Cannot delete branch '${name}' checked out at current working directory` };
    }
    if (!this.state.branches[name]) {
      return { success: false, message: `error: branch '${name}' not found.` };
    }

    delete this.state.branches[name];
    if (this.state.remoteBranches && this.state.remoteBranches[name]) {
      delete this.state.remoteBranches[name];
    }
    this.recordAction('DELETE_BRANCH', `Deleted branch '${name}'`, author);
    return { success: true, message: `Deleted branch ${name} (was previously set).` };
  }

  switchBranch(name, author = 'Student') {
    if (!this.state.branches[name]) {
      return { success: false, message: `error: pathspec '${name}' did not match any file(s) known to git` };
    }

    if (this.state.currentBranch === name) {
      return { success: true, message: `Already on '${name}'` };
    }

    this.state.currentBranch = name;
    const targetHeadCommitId = this.state.branches[name];
    const targetCommit = this.state.commits.find(c => c.id === targetHeadCommitId);

    if (targetCommit && targetCommit.files) {
      this.state.files = { ...targetCommit.files };
      this.state.stagedFiles = {};
    }

    this.recordAction('SWITCH_BRANCH', `Switched to branch '${name}'`, author);
    return { success: true, message: `Switched to branch '${name}'` };
  }

  push(branch = this.state.currentBranch, author = 'Student') {
    const localCommitId = this.state.branches[branch];
    if (!localCommitId) {
      return { success: false, message: `fatal: branch '${branch}' not found.` };
    }

    this.state.remoteBranches[branch] = localCommitId;
    this.recordAction('PUSH', `Pushed branch '${branch}' to origin`, author);
    return {
      success: true,
      message: `To origin/${branch}\n * [new branch] ${branch} -> ${branch}`
    };
  }

  pull(branch = this.state.currentBranch, author = 'Student') {
    const remoteCommitId = this.state.remoteBranches[branch];
    if (!remoteCommitId) {
      return { success: false, message: `fatal: couldn't find remote ref origin/${branch}` };
    }

    this.state.branches[branch] = remoteCommitId;
    const commit = this.state.commits.find(c => c.id === remoteCommitId);
    if (commit && commit.files) {
      this.state.files = { ...commit.files };
    }

    this.recordAction('PULL', `Pulled latest changes from origin/${branch}`, author);
    return { success: true, message: `Already up to date on '${branch}'.` };
  }

  triggerBranchMerge(sourceBranch, targetBranch = this.state.currentBranch, author = 'Student Developer') {
    if (!this.state.branches[sourceBranch]) {
      return { success: false, message: `fatal: '${sourceBranch}' does not point to a valid commit` };
    }

    if (sourceBranch === targetBranch) {
      return { success: false, message: `fatal: cannot merge branch '${sourceBranch}' into itself` };
    }

    const isConflictCase =
      (sourceBranch === 'feature/welcome' && targetBranch === 'main') ||
      (sourceBranch === 'main' && targetBranch === 'feature/welcome');

    if (isConflictCase) {
      const baseContent = '    <h1>Welcome to BMU</h1>';
      const headContent = '    <h1>Hello Students</h1>';
      const conflictBlock = `<<<<<<< HEAD\n${baseContent}\n=======\n${headContent}\n>>>>>>> ${sourceBranch}`;

      const conflictedFile = (this.state.files['index.html'] || INITIAL_FILES['index.html']).replace(
        /<h1>.*?<\/h1>/,
        conflictBlock
      );

      this.state.files['index.html'] = conflictedFile;
      this.state.activeConflict = {
        filePath: 'index.html',
        baseContent,
        headContent,
        conflictContent: conflictBlock,
        isResolved: false,
        sourceBranch,
        targetBranch
      };

      this.recordAction('MERGE_CONFLICT', `Merge conflict in index.html during merge of ${sourceBranch}`, author);
      return {
        success: false,
        hasConflict: true,
        message: `Auto-merging index.html\nCONFLICT (content): Merge conflict in index.html\nAutomatic merge failed; fix conflicts and then commit the result.`
      };
    }

    const sourceCommitId = this.state.branches[sourceBranch];
    const sourceCommit = this.state.commits.find(c => c.id === sourceCommitId);
    if (sourceCommit && sourceCommit.files) {
      this.state.files = { ...this.state.files, ...sourceCommit.files };
    }

    const shortId = generateShortHash();
    const mergeCommit = {
      id: shortId,
      shortId: shortId,
      parentId: this.state.branches[targetBranch],
      message: `Merge branch '${sourceBranch}' into ${targetBranch}`,
      author: `${author} <${author.toLowerCase().replace(/\s+/g, '')}@opensourcery.dev>`,
      timestamp: Date.now(),
      branch: targetBranch,
      files: { ...this.state.files },
      diffSummary: { filesChanged: 2, insertions: 4, deletions: 1 }
    };

    this.state.commits.unshift(mergeCommit);
    this.state.branches[targetBranch] = mergeCommit.id;
    this.recordAction('MERGE', `Merged branch '${sourceBranch}' into ${targetBranch}`, author);
    return {
      success: true,
      hasConflict: false,
      message: `Merge made by the 'recursive' strategy.\nMerged branch '${sourceBranch}' into ${targetBranch}.`
    };
  }

  resolveConflict(resolvedContent, commitMessage = 'Merge branch feature/welcome into main (resolved conflicts)', author = 'Student Developer') {
    if (!this.state.activeConflict) {
      return { success: false, message: 'No active conflict to resolve.' };
    }

    const filePath = this.state.activeConflict.filePath;
    this.state.files[filePath] = resolvedContent;
    this.state.stagedFiles[filePath] = resolvedContent;
    this.state.activeConflict = null;

    const res = this.commit(commitMessage, author);
    this.recordAction('RESOLVE_CONFLICT', `Resolved conflict in ${filePath} and merged cleanly`, author);
    return {
      success: true,
      message: `Conflict resolved!\n${res.message}`
    };
  }

  createIssue(title, description, author = 'Student', labels = ['bug']) {
    // If author passed as array (swapped args), normalize
    let safeAuthor = typeof author === 'string' ? author.trim() : 'Student';
    let safeLabels = Array.isArray(labels) ? labels : (Array.isArray(author) ? author : ['bug']);

    const newNumber = (this.state.issues || []).length + 1;
    const newIssue = {
      id: `issue-${newNumber}`,
      number: newNumber,
      title: (title || '').trim(),
      description: (description || '').trim(),
      author: safeAuthor,
      labels: safeLabels,
      status: 'open',
      createdAt: Date.now(),
      comments: []
    };

    if (!this.state.issues) this.state.issues = [];
    this.state.issues.unshift(newIssue);
    this.recordAction('CREATE_ISSUE', `Opened Issue #${newNumber}: ${(title || '').trim()}`, safeAuthor);
    return { success: true, issue: newIssue };
  }

  toggleIssueStatus(issueId, author = 'Student') {
    const issue = (this.state.issues || []).find(i => i.id === issueId);
    if (!issue) return { success: false, message: 'Issue not found.' };

    issue.status = issue.status === 'open' ? 'closed' : 'open';
    const actionLabel = issue.status === 'closed' ? 'Closed' : 'Reopened';
    this.recordAction('UPDATE_ISSUE', `${actionLabel} Issue #${issue.number}: ${issue.title}`, author);
    return { success: true, status: issue.status, issue, message: `${actionLabel} Issue #${issue.number}` };
  }

  createPullRequest(title, description, author = 'Student', baseBranch = 'main', headBranch) {
    let safeAuthor = typeof author === 'string' ? author.trim() : 'Student';
    if (!headBranch || headBranch === baseBranch) {
      return { success: false, message: 'Cannot create Pull Request with identical base and compare branch.' };
    }

    const newNumber = (this.state.pullRequests || []).length + 1;
    const baseCommit = this.state.commits.find(c => c.id === this.state.branches[baseBranch]);
    const headCommit = this.state.commits.find(c => c.id === this.state.branches[headBranch]);

    const diffs = [];
    if (baseCommit && headCommit) {
      for (const [p, headText] of Object.entries(headCommit.files || {})) {
        const baseText = (baseCommit.files && baseCommit.files[p]) || '';
        if (headText !== baseText) {
          diffs.push({ path: p, oldContent: baseText, newContent: headText });
        }
      }
    }

    const newPR = {
      id: `pr-${newNumber}`,
      number: newNumber,
      title: title.trim(),
      description: description.trim(),
      author: author.trim(),
      baseBranch,
      headBranch,
      status: 'open',
      createdAt: Date.now(),
      reviews: [],
      comments: [
        {
          id: `pr-comm-${Date.now()}`,
          author: 'CI Automated Checker',
          content: 'Continuous Integration: All automated checks and linter tests passed!',
          timestamp: Date.now() + 1000
        }
      ],
      diffs: diffs.length > 0 ? diffs : [
        {
          path: 'README.md',
          oldContent: 'npm run run-fake-server',
          newContent: 'npm run dev'
        }
      ]
    };

    this.state.pullRequests.unshift(newPR);
    this.recordAction('CREATE_PR', `Opened PR #${newNumber} (${headBranch} → ${baseBranch}): ${title.trim()}`, author);
    return { success: true, pullRequest: newPR };
  }

  reviewPullRequest(prId, reviewer = 'Student Peer', status = 'APPROVED', body = 'Looks good to me!') {
    const pr = this.state.pullRequests.find(p => p.id === prId);
    if (!pr) return { success: false, message: 'Pull request not found.' };

    let safeReviewer = reviewer;
    let safeStatus = status;
    let safeBody = body;
    if (reviewer === 'APPROVED' || reviewer === 'CHANGES_REQUESTED') {
      safeStatus = reviewer;
      safeBody = status || 'Looks good to me!';
      safeReviewer = body || 'Student Peer';
    }

    const review = {
      id: `rev-${Date.now()}`,
      reviewer: safeReviewer,
      status: safeStatus,
      body: safeBody,
      timestamp: Date.now()
    };
    if (!pr.reviews) pr.reviews = [];
    pr.reviews.push(review);
    this.recordAction('REVIEW_PR', `Submitted review (${safeStatus}) on PR #${pr.number}`, safeReviewer);
    return { success: true, review };
  }

  togglePRStatus(prId, author = 'Student') {
    const pr = (this.state.pullRequests || []).find(p => p.id === prId);
    if (!pr) return { success: false, message: 'Pull request not found.' };
    if (pr.status === 'merged') {
      return { success: false, message: 'Cannot close/reopen a merged pull request.' };
    }

    pr.status = pr.status === 'open' ? 'closed' : 'open';
    const actionLabel = pr.status === 'closed' ? 'Closed' : 'Reopened';
    this.recordAction('UPDATE_PR', `${actionLabel} PR #${pr.number}: ${pr.title}`, author);
    return { success: true, status: pr.status, pullRequest: pr, message: `${actionLabel} PR #${pr.number}` };
  }

  addPRComment(prId, author = 'Student', content = '') {
    const pr = (this.state.pullRequests || []).find(p => p.id === prId);
    if (!pr) return { success: false, message: 'Pull request not found.' };
    if (!content || !content.trim()) return { success: false, message: 'Comment cannot be empty.' };

    if (!pr.comments) pr.comments = [];
    const comment = {
      id: `pr-comm-${Date.now()}`,
      author: author.trim(),
      content: content.trim(),
      timestamp: Date.now()
    };
    pr.comments.push(comment);
    this.recordAction('PR_COMMENT', `Commented on PR #${pr.number}`, author);
    return { success: true, comment };
  }

  mergePullRequest(prId, author = 'Student') {
    const pr = this.state.pullRequests.find(p => p.id === prId);
    if (!pr) return { success: false, message: 'Pull request not found.' };
    if (pr.status === 'merged') return { success: false, message: 'Pull request is already merged.' };

    pr.status = 'merged';
    pr.mergedAt = Date.now();

    const mergeRes = this.triggerBranchMerge(pr.headBranch, pr.baseBranch, author);
    this.recordAction('MERGE_PR', `Merged PR #${pr.number} into ${pr.baseBranch}`, author);
    return { success: true, message: `Pull Request #${pr.number} successfully merged into ${pr.baseBranch}!`, details: mergeRes };
  }

  executeCLI(cmdString, author = 'Student') {
    const trimmed = cmdString.trim();
    if (!trimmed) return '';

    if (trimmed === 'clear') {
      return '__CLEAR__';
    }

    if (trimmed === 'help') {
      return `Open Sourcery Simulated Git Shell
Supported Commands:
  git status                          - Show working tree & staging status
  git add <file> | git add .          - Stage modified files
  git commit -m "commit message"      - Commit staged changes
  git branch                          - List local branches
  git branch <name>                   - Create a new branch
  git switch <name>                   - Switch to branch
  git checkout -b <name>              - Create and switch to new branch
  git push origin <branch>            - Push branch to remote
  git pull origin <branch>            - Pull latest changes
  git merge <branch>                  - Merge branch into current HEAD
  git log | git log --oneline         - View commit history
  git diff                            - Show unstaged differences
  clear                               - Clear terminal
`;
    }

    if (!trimmed.startsWith('git ')) {
      return `bash: ${trimmed.split(' ')[0]}: command not found. Type "help" for a list of Git commands.`;
    }

    const parts = trimmed.substring(4).trim().split(/\s+/);
    const sub = parts[0];

    switch (sub) {
      case 'status': {
        let out = `On branch ${this.state.currentBranch}\n`;
        const remoteHead = this.state.remoteBranches[this.state.currentBranch];
        const localHead = this.state.branches[this.state.currentBranch];

        if (!remoteHead) {
          out += `Your branch is not tracked by remote. Use "git push origin ${this.state.currentBranch}" to publish.\n\n`;
        } else if (remoteHead !== localHead) {
          out += `Your branch is ahead of 'origin/${this.state.currentBranch}' by 1 commit.\n  (use "git push" to publish your local commits)\n\n`;
        } else {
          out += `Your branch is up to date with 'origin/${this.state.currentBranch}'.\n\n`;
        }

        const stagedKeys = Object.keys(this.state.stagedFiles);
        if (stagedKeys.length > 0) {
          out += `Changes to be committed:\n  (use "git restore --staged <file>..." to unstage)\n`;
          stagedKeys.forEach(k => {
            out += `\t[STAGED] modified:   ${k}\n`;
          });
          out += '\n';
        }

        const currentHeadCommit = this.state.commits.find(c => c.id === localHead);
        const modifiedUnstaged = [];
        if (currentHeadCommit && currentHeadCommit.files) {
          for (const [path, content] of Object.entries(this.state.files)) {
            if (currentHeadCommit.files[path] !== content && !this.state.stagedFiles[path]) {
              modifiedUnstaged.push(path);
            }
          }
        }

        if (modifiedUnstaged.length > 0) {
          out += `Changes not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n`;
          modifiedUnstaged.forEach(k => {
            out += `\t[MODIFIED] modified:   ${k}\n`;
          });
          out += '\n';
        }

        if (stagedKeys.length === 0 && modifiedUnstaged.length === 0) {
          out += 'nothing to commit, working tree clean\n';
        }
        return out;
      }

      case 'add': {
        const target = parts[1];
        if (!target) return 'Nothing specified, nothing added.\nMaybe you wanted to say "git add ."?';
        if (target === '.' || target === '-A') {
          const res = this.stageAll(author);
          return `Staged ${res.count} file(s).`;
        }
        const res = this.stageFile(target, author);
        return res.message;
      }

      case 'commit': {
        const mIndex = parts.indexOf('-m');
        if (mIndex === -1 || !parts[mIndex + 1]) {
          return 'error: switch `m\' requires a value\nUsage: git commit -m "commit message"';
        }
        const msg = parts.slice(mIndex + 1).join(' ').replace(/^["']|["']$/g, '');
        const res = this.commit(msg, author);
        return res.message;
      }

      case 'branch': {
        if (parts.length === 1 || parts[1] === '-a') {
          let out = '';
          for (const b of Object.keys(this.state.branches)) {
            if (b === this.state.currentBranch) {
              out += `* ${b}\n`;
            } else {
              out += `  ${b}\n`;
            }
          }
          if (parts[1] === '-a') {
            for (const rb of Object.keys(this.state.remoteBranches)) {
              out += `  remotes/origin/${rb}\n`;
            }
          }
          return out;
        }
        if (parts[1] === '-d' || parts[1] === '-D') {
          const targetBranch = parts[2];
          if (!targetBranch) return 'fatal: branch name required for delete';
          const delRes = this.deleteBranch(targetBranch, author);
          return delRes.message;
        }
        const branchName = parts[1];
        const res = this.createBranch(branchName, author);
        return res.message;
      }

      case 'switch':
      case 'checkout': {
        if (parts[1] === '-b' || parts[1] === '-c') {
          const newName = parts[2];
          if (!newName) return 'fatal: missing branch name';
          const createRes = this.createBranch(newName, author);
          if (!createRes.success) return createRes.message;
          this.switchBranch(newName, author);
          return `Switched to a new branch '${newName}'`;
        }
        const targetBranch = parts[1];
        if (!targetBranch) return 'fatal: missing branch name';
        const res = this.switchBranch(targetBranch, author);
        return res.message;
      }

      case 'push': {
        const targetBranch = parts[2] || this.state.currentBranch;
        const res = this.push(targetBranch, author);
        return res.message;
      }

      case 'pull': {
        const targetBranch = parts[2] || this.state.currentBranch;
        const res = this.pull(targetBranch, author);
        return res.message;
      }

      case 'merge': {
        const sourceBranch = parts[1];
        if (!sourceBranch) return 'fatal: No source branch specified to merge.';
        const res = this.triggerBranchMerge(sourceBranch, this.state.currentBranch, author);
        return res.message;
      }

      case 'log': {
        const oneline = parts.includes('--oneline');
        let out = '';
        this.state.commits.slice(0, 10).forEach(c => {
          if (oneline) {
            out += `${c.shortId} ${c.message}\n`;
          } else {
            out += `commit ${c.id}\nAuthor: ${c.author}\nDate:   ${new Date(c.timestamp).toISOString()}\n\n    ${c.message}\n\n`;
          }
        });
        return out;
      }

      case 'diff': {
        let out = '';
        for (const [path, content] of Object.entries(this.state.files)) {
          const staged = this.state.stagedFiles[path];
          if (staged && staged !== content) {
            out += `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1,5 +1,5 @@\n`;
            out += `-${staged.substring(0, 35)}...\n+${content.substring(0, 35)}...\n`;
          }
        }
        return out || 'No differences between working directory and staging index.';
      }

      default:
        return `git: '${sub}' is not a recognized git command. Type "help" for a list.`;
    }
  }

  getCommitsForBranch(branch = this.state.currentBranch) {
    const headCommitId = this.state.branches[branch];
    if (!headCommitId) return [];
    const list = [];
    let currentId = headCommitId;
    while (currentId) {
      const c = this.state.commits.find(x => x.id === currentId);
      if (!c) break;
      list.push(c);
      currentId = c.parentId;
    }
    return list;
  }

  recordAction(action, details, user = 'Student') {
    if (!this.state.activities) this.state.activities = [];
    if (!this.state.contributors) this.state.contributors = [];

    this.state.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
      user,
      avatar: user.charAt(0).toUpperCase(),
      action,
      details,
      timestamp: Date.now()
    });

    if (!this.state.contributors.includes(user)) {
      this.state.contributors.push(user);
    }
  }
}

if (typeof window !== 'undefined') {
  window.GitSimulator = GitSimulator;
}
if (typeof globalThis !== 'undefined') {
  globalThis.GitSimulator = GitSimulator;
}
