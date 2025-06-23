// src/background/alarms.ts

// --- INICIO DE CAMBIOS ---
// 1. Importamos todas las funciones necesarias, incluida la nueva
import { 
  fetchIssues, 
  fetchPullRequests, 
  fetchActions, 
  fetchReleases, 
  fetchMyAssignedPullRequests, 
  fetchLastCommitForFile 
} from './githubClient';
import type { TrackedFile } from '../hooks/useGithubData';
// --- FIN DE CAMBIOS ---

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
    fileChanges?: { path: string, branch: string, sha: string }[];
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
    `trackedFiles_${username}`
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
  let totalNewNotifications = 0;

  for (const repo in alertSettings) {
    const settings = alertSettings[repo];
    if (!currentNotifications[repo]) currentNotifications[repo] = {};

    // --- INICIO DE CÓDIGO RESTAURADO ---
    // Check for new issues
    if (settings.issues) {
        const { items: newIssues } = await fetchIssues(repo, 'open', 1);
        const newIssueIds = newIssues.map((issue: { id: any; }) => issue.id);
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
        const newPRIds = newPRs.map((pr: { id: any; }) => pr.id);
        const lastPRIds = lastData[repo]?.prs || [];
        const foundNotifications = newPRIds.filter((id: number) => !lastPRIds.includes(id));

        if (foundNotifications.length > 0) {
            currentNotifications[repo].newPRs = [...(currentNotifications[repo].newPRs || []), ...foundNotifications];
        }
        newLastData[repo] = { ...newLastData[repo], prs: newPRIds };
    }

    // Check for PRs assigned to me
    if (settings.assignedPRs) {
        const { items: assignedPRs } = await fetchMyAssignedPullRequests(repo, 1);
        const newAssignedPRIds = assignedPRs.map((pr: { id: any; }) => pr.id);
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
        const newReleaseIds = newReleases.map((release: { id: any; }) => release.id);
        const lastReleaseIds = lastData[repo]?.releases || [];
        const foundNotifications = newReleaseIds.filter((id: number) => !lastReleaseIds.includes(id));
        
        if (foundNotifications.length > 0) {
            currentNotifications[repo].newReleases = [...(currentNotifications[repo].newReleases || []), ...foundNotifications];
        }
        newLastData[repo] = { ...newLastData[repo], releases: newReleaseIds };
    }
    // --- FIN DE CÓDIGO RESTAURADO ---
    
    // Nueva sección para comprobar cambios en archivos
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
                            if (!currentNotifications[repo].fileChanges!.some(n => n.sha === lastCommit.sha)) {
                                currentNotifications[repo].fileChanges!.push({
                                    path: file.path,
                                    branch: file.branch,
                                    sha: lastCommit.sha
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

  Object.values(currentNotifications).forEach(repoNotifications => {
    if (repoNotifications) {
      Object.values(repoNotifications).forEach(notificationsArray => {
        if (Array.isArray(notificationsArray)) {
          totalNewNotifications += notificationsArray.length;
        }
      });
    }
  });

  await chrome.storage.local.set({
    [`lastCheckedData_${username}`]: newLastData,
    [`notifications_${username}`]: currentNotifications
  });

  if (totalNewNotifications > 0) {
    chrome.action.setBadgeText({ text: `+${totalNewNotifications}` });
    chrome.action.setBadgeBackgroundColor({ color: '#d93f3f' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }

  console.log(`Check complete. Found ${totalNewNotifications} new notifications.`);
}

export function initializeAlarms() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      console.log('Creating alarm for the first time.');
      chrome.storage.local.get('alertFrequency', (result) => {
        const periodInMinutes = result.alertFrequency || 10;
        chrome.alarms.create(ALARM_NAME, {
          delayInMinutes: 1,
          periodInMinutes: periodInMinutes 
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