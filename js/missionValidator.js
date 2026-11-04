/**
 * Open Sourcery Arena — Mission Validator
 * Pure Vanilla JavaScript
 */

function isAuthorMatch(rawAuthor, contributor) {
  if (!rawAuthor || !contributor) return false;
  const a = String(rawAuthor).trim().toLowerCase();
  const c = String(contributor).trim().toLowerCase();
  if (a === c) return true;
  if (a.startsWith(c + ' <') || a.startsWith(c + ' ') || a.startsWith(c + '(')) return true;
  const aClean = a.replace(/<.*?>/g, '').trim();
  if (aClean === c) return true;
  if (c.length >= 3 && (a.includes(c) || c.includes(aClean))) return true;
  return false;
}

class MissionValidator {
  static validateMission(missionId, state, interactionHistory = {}, currentContributor = '') {
    const activeContributor = currentContributor || (interactionHistory && interactionHistory.contributor) || '';

    switch (missionId) {
      case 'mission-1': {
        const hasViewed = Boolean(interactionHistory && interactionHistory.hasViewedReadme);
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
        const validIssue = issues.find(i => {
          if (!i.title || i.title.trim().length < 3) return false;
          if (!i.description || i.description.trim().length < 6) return false;
          if (activeContributor) {
            return isAuthorMatch(i.author, activeContributor);
          }
          const authorStr = (i.author || '').toLowerCase();
          return !authorStr.includes('system') && !authorStr.includes('bot');
        });

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
        const allBranches = Object.keys(state.branches || {});
        const activities = state.activities || [];
        const createdInActivities = activities.some(a =>
          a.action === 'CREATE_BRANCH' && (!activeContributor || isAuthorMatch(a.user, activeContributor))
        );
        const createdInHistory = (interactionHistory.createdBranches || []).some(b => b !== 'main' && b !== 'feature/welcome');

        const userBranches = allBranches.filter(b => {
          if (b === 'main' || b === 'feature/welcome') return false;
          if (!activeContributor) return true;
          const branchActivity = activities.find(a => a.action === 'CREATE_BRANCH' && a.details && a.details.includes(`'${b}'`));
          if (branchActivity && isAuthorMatch(branchActivity.user, activeContributor)) return true;
          const hasUserCommit = (state.commits || []).some(c => c.branch === b && isAuthorMatch(c.author, activeContributor));
          if (hasUserCommit) return true;
          if ((interactionHistory.createdBranches || []).includes(b)) return true;
          return false;
        });

        const isCompleted = userBranches.length > 0 || createdInActivities || createdInHistory;
        const branchName = userBranches[0] || (interactionHistory.createdBranches || [])[0] || (createdInActivities ? 'feature-branch' : null);

        return {
          missionId,
          isCompleted,
          message: isCompleted
            ? `Feature branch '${branchName}' created successfully!`
            : 'Create a new feature branch (e.g. "feature/navbar" or "fix/styling") using the branch dropdown or terminal.',
          evidence: {
            customBranches: userBranches,
            createdBranch: branchName
          }
        };
      }

      case 'mission-4': {
        const commits = state.commits || [];
        const validCommit = commits.find(c => {
          if (!c.parentId || !c.message || c.message.trim().length < 3) return false;
          const authorStr = (c.author || '').toLowerCase();
          // Pre-seeded commits (e.g. Alex Rivera or System) never count for participant
          if (authorStr.includes('alex rivera') || authorStr.includes('system')) {
            if (activeContributor && !isAuthorMatch('alex rivera', activeContributor)) {
              return false;
            }
          }
          if (activeContributor) {
            return isAuthorMatch(c.author, activeContributor);
          }
          return !authorStr.includes('alex rivera') && !authorStr.includes('system');
        });

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
        const activities = state.activities || [];
        const pushedInActivities = activities.some(a =>
          a.action === 'PUSH' && (!activeContributor || isAuthorMatch(a.user, activeContributor))
        );
        const pushedInHistory = (interactionHistory.pushedBranches || []).length > 0;

        const customBranches = Object.keys(state.branches || {}).filter(b => b !== 'main' && b !== 'feature/welcome');
        const pushedBranch = customBranches.find(b => {
          const isAtRemote = state.remoteBranches && state.remoteBranches[b] && state.remoteBranches[b] === state.branches[b];
          if (!isAtRemote) return false;
          if (!activeContributor) return true;
          const hasUserCommit = (state.commits || []).some(c => c.branch === b && isAuthorMatch(c.author, activeContributor));
          const pushAct = activities.find(a => a.action === 'PUSH' && a.details && a.details.includes(`'${b}'`));
          return hasUserCommit || (pushAct && isAuthorMatch(pushAct.user, activeContributor)) || (interactionHistory.pushedBranches || []).includes(b);
        });

        const isCompleted = Boolean(pushedBranch) || pushedInActivities || pushedInHistory;
        const branchLabel = pushedBranch || (interactionHistory.pushedBranches || [])[0] || (pushedInActivities ? 'feature-branch' : null);

        return {
          missionId,
          isCompleted,
          message: isCompleted
            ? `Branch '${branchLabel}' pushed to origin successfully!`
            : 'Push your feature branch to remote origin using the Push button or terminal command "git push origin <branch>".',
          evidence: {
            pushedBranch: branchLabel,
            remoteCommitId: branchLabel ? (state.remoteBranches && state.remoteBranches[branchLabel]) : null
          }
        };
      }

      case 'mission-6': {
        const prs = state.pullRequests || [];
        const userPR = prs.find(pr => {
          if (pr.baseBranch !== 'main') return false;
          if (activeContributor) {
            return isAuthorMatch(pr.author, activeContributor);
          }
          const a = (pr.author || '').toLowerCase();
          return !a.includes('alex rivera') && !a.includes('system');
        });

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
        const prs = state.pullRequests || [];
        const activities = state.activities || [];

        const mergedOrApprovedByUser = prs.find(pr => {
          if (pr.status !== 'merged') return false;
          if (!activeContributor) return true;
          const mergedByUser = pr.mergedBy && isAuthorMatch(pr.mergedBy, activeContributor);
          const reviewedByUser = pr.reviews && pr.reviews.some(r => isAuthorMatch(r.reviewer, activeContributor));
          return mergedByUser || reviewedByUser;
        });

        const userMergeActivity = activities.some(a =>
          (a.action === 'MERGE_PR' || a.action === 'REVIEW_PR') &&
          (!activeContributor || isAuthorMatch(a.user, activeContributor))
        );

        const isCompleted = Boolean(mergedOrApprovedByUser) || userMergeActivity;
        const targetPR = mergedOrApprovedByUser || prs.find(pr => pr.status === 'merged');

        return {
          missionId,
          isCompleted,
          message: isCompleted
            ? `PR #${targetPR?.number || ''} approved and merged cleanly into main!`
            : 'Review an open pull request, submit an approval review, and merge it into main.',
          evidence: {
            prNumber: targetPR?.number,
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

        const activities = state.activities || [];
        const conflictResolvedActivity = activities.some(a =>
          a.action === 'RESOLVE_CONFLICT' && (!activeContributor || isAuthorMatch(a.user, activeContributor))
        );

        const mergeCommit = (state.commits || []).find(
          c => c.branch === 'main' && (
            (c.message && c.message.toLowerCase().includes('merge')) ||
            (c.message && c.message.toLowerCase().includes('conflict'))
          ) && (
            !activeContributor || isAuthorMatch(c.author, activeContributor)
          )
        );

        const conflictResolved = !hasConflictMarkers && (Boolean(mergeCommit) || conflictResolvedActivity) && state.activeConflict === null;
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

  static validateAll(state, interactionHistory = {}, currentContributor = '') {
    const results = {};
    for (const mission of DEFAULT_MISSIONS) {
      results[mission.id] = this.validateMission(mission.id, state, interactionHistory, currentContributor);
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
