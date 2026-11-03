/**
 * Open Sourcery Arena — Mission Validator
 * Pure Vanilla JavaScript
 */

class MissionValidator {
  static validateMission(missionId, state, interactionHistory = {}) {
    switch (missionId) {
      case 'mission-1': {
        const hasViewed = Boolean(interactionHistory.hasViewedReadme);
        return {
          missionId,
          isCompleted: hasViewed,
          message: hasViewed
            ? 'README.md inspected on main branch! You located the project overview.'
            : 'Click on the "Code" tab, make sure you are on branch "main", and click "README.md" to view it.',
          evidence: {
            hasViewedReadme: hasViewed,
            branch: state.currentBranch
          }
        };
      }

      case 'mission-2': {
        const issues = state.issues || [];
        const validIssue = issues.find(i => 
          i.title && i.title.trim().length >= 3 && 
          i.description && i.description.trim().length >= 6
        );

        const isCompleted = Boolean(validIssue);
        return {
          missionId,
          isCompleted,
          message: isCompleted
            ? `Issue #${validIssue?.number} ("${validIssue?.title}") created successfully!`
            : 'Go to the "Issues" tab, click "New Issue", and write a descriptive bug or feature report.',
          evidence: validIssue ? {
            issueId: validIssue.id,
            issueNumber: validIssue.number,
            issueTitle: validIssue.title
          } : {}
        };
      }

      case 'mission-3': {
        const customBranches = Object.keys(state.branches || {}).filter(b => b !== 'main');
        const isCompleted = customBranches.length > 0;
        const branchName = customBranches[0];

        return {
          missionId,
          isCompleted,
          message: isCompleted
            ? `Feature branch '${branchName}' created successfully!`
            : 'Create a new feature branch (e.g. "feature/navbar" or "fix/styling") using the branch dropdown or terminal.',
          evidence: {
            customBranches,
            createdBranch: branchName
          }
        };
      }

      case 'mission-4': {
        const commits = state.commits || [];
        const validCommit = commits.find(c => c.parentId !== null && c.message && c.message.trim().length >= 3);

        const isCompleted = Boolean(validCommit);
        return {
          missionId,
          isCompleted,
          message: isCompleted
            ? `Commit "${validCommit?.message}" created on branch '${validCommit?.branch}'!`
            : 'Edit or add a file, stage it, and commit with a meaningful commit message.',
          evidence: validCommit ? {
            commitId: validCommit.id,
            commitMessage: validCommit.message,
            branch: validCommit.branch
          } : {}
        };
      }

      case 'mission-5': {
        const customBranches = Object.keys(state.branches || {}).filter(b => b !== 'main');
        const pushedBranch = customBranches.find(
          b => state.remoteBranches && state.remoteBranches[b] && state.remoteBranches[b] === state.branches[b]
        );

        const isCompleted = Boolean(pushedBranch);
        return {
          missionId,
          isCompleted,
          message: isCompleted
            ? `Branch '${pushedBranch}' pushed to origin successfully!`
            : 'Push your feature branch to remote origin using the Push button or terminal command "git push origin <branch>".',
          evidence: {
            pushedBranch,
            remoteCommitId: pushedBranch ? state.remoteBranches[pushedBranch] : null
          }
        };
      }

      case 'mission-6': {
        const userPR = (state.pullRequests || []).find(pr => pr.baseBranch === 'main');

        const isCompleted = Boolean(userPR);
        return {
          missionId,
          isCompleted,
          message: isCompleted
            ? `Pull Request #${userPR?.number} ("${userPR?.title}") created successfully!`
            : 'Open a Pull Request from your feature branch into "main" in the Pull Requests tab.',
          evidence: userPR ? {
            prId: userPR.id,
            prNumber: userPR.number,
            prTitle: userPR.title,
            prHead: userPR.headBranch,
            prBase: userPR.baseBranch
          } : {}
        };
      }

      case 'mission-7': {
        const mergedApprovedPR = (state.pullRequests || []).find(
          pr => pr.status === 'merged' && pr.reviews && pr.reviews.some(r => r.status === 'APPROVED')
        ) || (state.pullRequests || []).find(pr => pr.status === 'merged');

        const isCompleted = Boolean(mergedApprovedPR);
        return {
          missionId,
          isCompleted,
          message: isCompleted
            ? `PR #${mergedApprovedPR?.number} approved and merged cleanly into main!`
            : 'Review an open pull request, submit an approval review, and merge it into main.',
          evidence: {
            prNumber: mergedApprovedPR?.number,
            isMerged: isCompleted
          }
        };
      }

      case 'mission-8': {
        const indexHtml = (state.files && state.files['index.html']) || '';
        const hasConflictMarkers =
          indexHtml.includes('<<<<<<<') ||
          indexHtml.includes('=======') ||
          indexHtml.includes('>>>>>>>');

        const mergeCommit = (state.commits || []).find(
          c => c.branch === 'main' && (
            (c.message && c.message.toLowerCase().includes('merge')) ||
            (c.message && c.message.toLowerCase().includes('conflict'))
          )
        );

        const conflictResolved = !hasConflictMarkers && Boolean(mergeCommit) && state.activeConflict === null;
        return {
          missionId,
          isCompleted: conflictResolved,
          message: conflictResolved
            ? 'Branch merged cleanly into main with all conflicts resolved!'
            : hasConflictMarkers
            ? 'Conflict markers still present in file! Resolve the conflict and commit the result.'
            : 'Merge a feature branch into main, resolve any conflicts cleanly, and commit.',
          evidence: {
            conflictResolved,
            hasConflictMarkers,
            mergeCommitId: mergeCommit?.id
          }
        };
      }

      default:
        return {
          missionId,
          isCompleted: false,
          message: 'Unknown mission',
          evidence: {}
        };
    }
  }

  static validateAll(state, interactionHistory = {}) {
    const results = {};
    for (const mission of DEFAULT_MISSIONS) {
      results[mission.id] = this.validateMission(mission.id, state, interactionHistory);
    }
    return results;
  }
}

if (typeof window !== 'undefined') {
  window.MissionValidator = MissionValidator;
}
if (typeof globalThis !== 'undefined') {
  globalThis.MissionValidator = MissionValidator;
}
