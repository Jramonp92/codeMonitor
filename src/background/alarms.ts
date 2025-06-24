// src/background/alarms.ts

import {
  fetchIssues,
  fetchPullRequests,
  fetchActions,
  fetchReleases,
  fetchMyAssignedPullRequests,
  fetchLastCommitForFile,
  fetchPullRequestApprovalState,
  type ReviewState,
} from './githubClient';
import type { TrackedFile, PullRequestInfo } from '../hooks/useGithubData';

// --- TYPE DEFINITIONS ---
export interface AlertSettings {
  [repoFullName: string]: {
    issues?: boolean;
    newPRs?: boolean;
    assignedPRs?: boolean;
    actions?: boolean;
    newReleases?: boolean;
    fileChanges?: boolean;
  };
}

interface LastCheckedData {
  [repoFullName: string]: {
    issues?: number[];
    prs?: number[];
    assignedPRs?: number[];
    prStates?: { [prNumber: number]: ReviewState };
    actions?: { [runId: number]: string };
    releases?: number[];
    trackedFiles?: { [pathAndBranch: string]: string };
  };
}

export interface ActiveNotifications {
  [repoFullName: string]: {
    issues?: number[];
    newPRs?: number[];
    assignedPRs?: number[];
    actions?: number[];
    newReleases?: number[];
    fileChanges?: { path: string; branch: string; sha: string }[];
    prStatusChanges?: { id: number; number: number; title: string; state: ReviewState }[];
  };
}

const ALARM_NAME = 'github-check-alarm';

async function checkForUpdates() {
  console.log('Alarm triggered: Checking for repository updates...');

  const { user } = await chrome.storage.local.get('user');
  if (!user || !user.login) {
    console.log('No user logged in. Skipping check.');
    return;
  }
  const username = user.login;

  const storageKeys = [
    `alertsConfig_${username}`,
    `lastCheckedData_${username}`,
    `notifications_${username}`,
    `trackedFiles_${username}`,
  ];

  const storageData = await chrome.storage.local.get(storageKeys);

  const alertSettings: AlertSettings = storageData[`alertsConfig_${username}`] || {};
  const lastData: LastCheckedData = storageData[`lastCheckedData_${username}`] || {};
  const currentNotifications: ActiveNotifications = storageData[`notifications_${username}`] || {};
  const trackedFilesByRepo: { [repo: string]: TrackedFile[] } = storageData[`trackedFiles_${username}`] || {};

  if (Object.keys(alertSettings).length === 0) {
    console.log('User has no alert settings configured. Skipping check.');
    return;
  }

  const newLastData: LastCheckedData = JSON.parse(JSON.stringify(lastData));

  for (const repo in alertSettings) {
    const settings = alertSettings[repo];
    if (!currentNotifications[repo]) currentNotifications[repo] = {};

    // Check for new issues
    if (settings.issues) {
      const { items: newIssues } = await fetchIssues(repo, 'open', 1);
      const newIssueIds = newIssues.map((issue: { id: any }) => issue.id);
      const lastIssueIds = lastData[repo]?.issues || [];
      const foundNotifications = newIssueIds.filter((id: number) => !lastIssueIds.includes(id));

      if (foundNotifications.length > 0) {
        currentNotifications[repo].issues = [...(currentNotifications[repo].issues || []), ...foundNotifications];
      }
      newLastData[repo] = { ...newLastData[repo], issues: newIssueIds };
    }

    // Check for new Pull Requests
    if (settings.newPRs) {
      const { items: newPRs } = await fetchPullRequests(repo, 'open', 1);
      const newPRIds = newPRs.map((pr: { id: any }) => pr.id);
      const lastPRIds = lastData[repo]?.prs || [];
      const foundNotifications = newPRIds.filter((id: number) => !lastPRIds.includes(id));

      if (foundNotifications.length > 0) {
        currentNotifications[repo].newPRs = [...(currentNotifications[repo].newPRs || []), ...foundNotifications];
      }
      newLastData[repo] = { ...newLastData[repo], prs: newPRIds };
    }
    
    // Bloque para comprobar cambios de estado en PRs existentes
    if (settings.newPRs || settings.assignedPRs) {
        const { items: openPRs } = await fetchPullRequests(repo, 'open', 1);
        const lastPRStates = lastData[repo]?.prStates || {};
        const newPRStates: { [prNumber: number]: ReviewState } = {};

        // CORRECCIÓN FINAL: Aseguramos el tipo de 'pr' a 'PullRequestInfo' en el bucle
        for (const pr of openPRs as PullRequestInfo[]) {
            const currentState = await fetchPullRequestApprovalState(repo, pr.number);
            newPRStates[pr.number] = currentState;
            const previousState = lastPRStates[pr.number];

            if (previousState === 'PENDING' && (currentState === 'APPROVED' || currentState === 'CHANGES_REQUESTED')) {
                if (!currentNotifications[repo].prStatusChanges) {
                    currentNotifications[repo].prStatusChanges = [];
                }
                if (!currentNotifications[repo].prStatusChanges!.some(n => n.id === pr.id && n.state === currentState)) {
                    currentNotifications[repo].prStatusChanges!.push({
                        id: pr.id,
                        number: pr.number,
                        title: pr.title,
                        state: currentState,
                    });
                }
            }
        }
        newLastData[repo] = { ...newLastData[repo], prStates: newPRStates };
    }

    // Check for PRs assigned to me
    if (settings.assignedPRs) {
      const { items: assignedPRs } = await fetchMyAssignedPullRequests(repo, 1);
      const newAssignedPRIds = assignedPRs.map((pr: { id: any }) => pr.id);
      const lastAssignedPRIds = lastData[repo]?.assignedPRs || [];
      const foundNotifications = newAssignedPRIds.filter((id: number) => !lastAssignedPRIds.includes(id));

      if (foundNotifications.length > 0) {
        currentNotifications[repo].assignedPRs = [...(currentNotifications[repo].assignedPRs || []), ...foundNotifications];
      }
      newLastData[repo] = { ...newLastData[repo], assignedPRs: newAssignedPRIds };
    }

    // Check for Actions status changes
    if (settings.actions) {
      const { items: actionRuns } = await fetchActions(repo, undefined, 1);
      const lastRunStates = lastData[repo]?.actions || {};
      const newRunStates: { [runId: number]: string } = {};

      if (actionRuns) {
        for (const run of actionRuns) {
          const currentState = run.status === 'completed' ? run.conclusion : run.status;
          newRunStates[run.id] = currentState;

          const previousState = lastRunStates[run.id];

          if (!previousState || previousState !== currentState) {
            if (!currentNotifications[repo].actions) currentNotifications[repo].actions = [];
            if (!currentNotifications[repo].actions!.includes(run.id)) {
              currentNotifications[repo].actions!.push(run.id);
            }
          }
        }
      }
      newLastData[repo] = { ...newLastData[repo], actions: newRunStates };
    }

    // Check for new releases
    if (settings.newReleases) {
      const { items: newReleases } = await fetchReleases(repo, 1);
      const newReleaseIds = newReleases.map((release: { id: any }) => release.id);
      const lastReleaseIds = lastData[repo]?.releases || [];
      const foundNotifications = newReleaseIds.filter((id: number) => !lastReleaseIds.includes(id));

      if (foundNotifications.length > 0) {
        currentNotifications[repo].newReleases = [...(currentNotifications[repo].newReleases || []), ...foundNotifications];
      }
      newLastData[repo] = { ...newLastData[repo], releases: newReleaseIds };
    }

    // Check de cambios en archivos
    if (settings.fileChanges) {
      const trackedFiles = trackedFilesByRepo[repo] || [];
      if (trackedFiles.length > 0) {
        if (!newLastData[repo]) newLastData[repo] = {};
        if (!newLastData[repo].trackedFiles) newLastData[repo].trackedFiles = {};

        for (const file of trackedFiles) {
          try {
            const lastCommit = await fetchLastCommitForFile(repo, file.branch, file.path);
            if (lastCommit && lastCommit.sha) {
              const compositeKey = `${file.path}_${file.branch}`;
              const lastKnownSha = lastData[repo]?.trackedFiles?.[compositeKey];

              if (!lastKnownSha || lastKnownSha !== lastCommit.sha) {
                if (!currentNotifications[repo].fileChanges) {
                  currentNotifications[repo].fileChanges = [];
                }
                if (!currentNotifications[repo].fileChanges!.some((n) => n.sha === lastCommit.sha)) {
                  currentNotifications[repo].fileChanges!.push({
                    path: file.path,
                    branch: file.branch,
                    sha: lastCommit.sha,
                  });
                }
              }
              newLastData[repo]!.trackedFiles![compositeKey] = lastCommit.sha;
            }
          } catch (error) {
            console.error(`Error checking file ${file.path} in ${repo}:`, error);
          }
        }
      }
    }
  }

  // Lógica de conteo de notificaciones y actualización del badge
  const totalNotificationCount = Object.values(currentNotifications).reduce((acc, repo) => 
    acc + Object.values(repo).reduce((repoAcc, notifs) => repoAcc + (Array.isArray(notifs) ? notifs.length : 0), 0), 0);

  await chrome.storage.local.set({
    [`lastCheckedData_${username}`]: newLastData,
    [`notifications_${username}`]: currentNotifications,
  });

  if (totalNotificationCount > 0) {
    chrome.action.setBadgeText({ text: `${totalNotificationCount}` });
    chrome.action.setBadgeBackgroundColor({ color: '#d93f3f' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }

  console.log(`Check complete. Found/updated ${totalNotificationCount} notifications.`);
}

export function initializeAlarms() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      console.log('Creating alarm for the first time.');
      chrome.storage.local.get('alertFrequency', (result) => {
        const periodInMinutes = result.alertFrequency || 10;
        chrome.alarms.create(ALARM_NAME, {
          delayInMinutes: 1,
          periodInMinutes: periodInMinutes,
        });
      });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkForUpdates();
  }
});