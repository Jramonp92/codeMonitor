import { fetchIssues, fetchPullRequests, fetchActions, fetchReleases, fetchMyAssignedPullRequests } from './githubClient';

// --- TYPE DEFINITIONS ---
// Defines the structure for a user's alert settings.
export interface AlertSettings {
  [repoFullName: string]: {
    issues?: boolean;
    newPRs?: boolean;
    assignedPRs?: boolean;
    actions?: boolean;
    newReleases?: boolean;
  };
}

// Defines the structure for the data we last checked.
// We store arrays of IDs to compare against new data.
interface LastCheckedData {
  [repoFullName: string]: {
    issues?: number[];
    prs?: number[];
    assignedPRs?: number[];
    actions?: { [runId: number]: string };
    releases?: number[];
  };
}

// Defines the structure for storing active notifications.
export interface ActiveNotifications {
  [repoFullName: string]: {
    issues?: number[];
    newPRs?: number[];
    assignedPRs?: number[];
    actions?: number[];
    newReleases?: number[];
  };
}

const ALARM_NAME = 'github-check-alarm';

// --- CORE LOGIC FUNCTION ---
// This function runs every time the alarm fires.
async function checkForUpdates() {
  console.log('Alarm triggered: Checking for repository updates...');

  // 1. Get the current logged-in user.
  const { user } = await chrome.storage.local.get('user');
  if (!user || !user.login) {
    console.log('No user logged in. Skipping check.');
    return;
  }
  const username = user.login;

  // 2. Get the user's alert settings, last checked data, and active notifications.
  const storageKeys = [
    `alertsConfig_${username}`,
    `lastCheckedData_${username}`,
    `notifications_${username}`
  ];
  const storageData = await chrome.storage.local.get(storageKeys);
  
  // Explicitly type the data retrieved from storage to ensure type safety.
  const alertSettings: AlertSettings = storageData[`alertsConfig_${username}`] || {}; 
  const lastData: LastCheckedData = storageData[`lastCheckedData_${username}`] || {};
  const currentNotifications: ActiveNotifications = storageData[`notifications_${username}`] || {};

  if (Object.keys(alertSettings).length === 0) {
    console.log('User has no alert settings configured. Skipping check.');
    return;
  }
  
  const newLastData: LastCheckedData = {};
  let totalNewNotifications = 0;

  // 3. Iterate over each repository the user has configured alerts for.
  for (const repo in alertSettings) {
    const settings = alertSettings[repo];
    newLastData[repo] = { ...lastData[repo] }; // Carry over old data to not lose it
    if (!currentNotifications[repo]) currentNotifications[repo] = {};

    // --- Check for new issues ---
    if (settings.issues) {
        const { items: newIssues } = await fetchIssues(repo, 'open', 1);
        const newIssueIds = newIssues.map((issue: { id: any; }) => issue.id);
        const lastIssueIds = lastData[repo]?.issues || [];
        const foundNotifications = newIssueIds.filter((id: number) => !lastIssueIds.includes(id));
        
        if (foundNotifications.length > 0) {
            currentNotifications[repo].issues = [...(currentNotifications[repo].issues || []), ...foundNotifications];
        }
        newLastData[repo].issues = newIssueIds;
    }

    // --- Check for new Pull Requests ---
    if (settings.newPRs) {
        const { items: newPRs } = await fetchPullRequests(repo, 'open', 1);
        const newPRIds = newPRs.map((pr: { id: any; }) => pr.id);
        const lastPRIds = lastData[repo]?.prs || [];
        const foundNotifications = newPRIds.filter((id: number) => !lastPRIds.includes(id));

        if (foundNotifications.length > 0) {
            currentNotifications[repo].newPRs = [...(currentNotifications[repo].newPRs || []), ...foundNotifications];
        }
        newLastData[repo].prs = newPRIds;
    }

    // --- Check for PRs assigned to me ---
    if (settings.assignedPRs) {
        const { items: assignedPRs } = await fetchMyAssignedPullRequests(repo, 1);
        const newAssignedPRIds = assignedPRs.map((pr: { id: any; }) => pr.id);
        const lastAssignedPRIds = lastData[repo]?.assignedPRs || [];
        const foundNotifications = newAssignedPRIds.filter((id: number) => !lastAssignedPRIds.includes(id));

        if (foundNotifications.length > 0) {
            currentNotifications[repo].assignedPRs = [...(currentNotifications[repo].assignedPRs || []), ...foundNotifications];
        }
        newLastData[repo].assignedPRs = newAssignedPRIds;
    }
    
    // --- Check for Actions status changes ---
    if (settings.actions) {
        // 1. Llama a fetchActions sin un estado para obtener todas las ejecuciones recientes.
        const { items: actionRuns } = await fetchActions(repo, undefined, 1);
        
        // 2. Obtiene el mapa de ejecuciones de la última vez.
        const lastRunStates = lastData[repo]?.actions || {}; // { runId: status }
        const newRunStates: { [runId: number]: string } = {};

        if (actionRuns) {
            for (const run of actionRuns) {
                const currentState = run.status === 'completed' ? run.conclusion : run.status;
                newRunStates[run.id] = currentState;

                const previousState = lastRunStates[run.id];

                // 3. Comprueba si la ejecución es nueva o si su estado ha cambiado.
                if (!previousState || previousState !== currentState) {
                    if (!currentNotifications[repo].actions) {
                        currentNotifications[repo].actions = [];
                    }
                    // 4. Añade una notificación si no existe ya para esa ejecución.
                    if (!currentNotifications[repo].actions.includes(run.id)) {
                        currentNotifications[repo].actions.push(run.id);
                    }
                }
            }
        }
        // 5. Guarda el nuevo mapa de estados para la próxima comprobación.
        newLastData[repo].actions = newRunStates;
    }

    // --- Check for new releases ---
    if (settings.newReleases) {
        const { items: newReleases } = await fetchReleases(repo, 1);
        const newReleaseIds = newReleases.map((release: { id: any; }) => release.id);
        const lastReleaseIds = lastData[repo]?.releases || [];
        const foundNotifications = newReleaseIds.filter((id: number) => !lastReleaseIds.includes(id));
        
        if (foundNotifications.length > 0) {
            currentNotifications[repo].newReleases = [...(currentNotifications[repo].newReleases || []), ...foundNotifications];
        }
        newLastData[repo].releases = newReleaseIds;
    }
  }

  // 4. Calculate total notifications and update storage and badge.
  Object.values(currentNotifications).forEach(repoNotifications => {
    // This check handles the type error.
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

  // 5. Update the extension icon's badge.
  if (totalNewNotifications > 0) {
    chrome.action.setBadgeText({ text: `+${totalNewNotifications}` });
    chrome.action.setBadgeBackgroundColor({ color: '#d93f3f' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }

  console.log(`Check complete. Found ${totalNewNotifications} new notifications.`);
}

// --- ALARM INITIALIZATION ---
// This function sets up the alarm when the extension starts.
export function initializeAlarms() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      console.log('Creating alarm for the first time.');
      // Get user-defined period, defaulting to 10 minutes.
      chrome.storage.local.get('alertFrequency', (result) => {
        const periodInMinutes = result.alertFrequency || 10;
        chrome.alarms.create(ALARM_NAME, {
          delayInMinutes: 1, // Start after 1 minute
          periodInMinutes: periodInMinutes 
        });
      });
    }
  });
}

// Listener that calls our main function when the alarm fires.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkForUpdates();
  }
});