// src/background/main.ts

import { login, logout } from './auth';
import { initializeAlarms } from './alarms';
import { 
  fetchReadme,
  fetchRepositories, 
  fetchRepoDetails,
  fetchBranches, 
  fetchCommits, 
  fetchIssues, 
  fetchPullRequests,
  fetchMergedPullRequests,
  fetchClosedUnmergedPullRequests,
  fetchMyAssignedPullRequests,
  fetchActions,
  fetchReleases,
  fetchDirectoryContent,
  fetchFileContent
} from './githubClient';

initializeAlarms();

// --- INICIO DE CORRECCIÓN ---
// El listener para abrir el panel lateral al hacer clic en el icono
// debe estar en el nivel superior, no dentro del listener de mensajes.
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
// --- FIN DE CORRECCIÓN ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.type === 'login') {
    (async () => {
      try {
        const user = await login();
        sendResponse({ success: true, user });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; 
  }
  
  if (message.type === 'logout') {
    (async () => { 
      try { 
        await logout(); 
        sendResponse({ success: true }); 
      } catch (error: any) { 
        sendResponse({ success: false, error: error.message }); 
      } 
    })();
    return true;
  }

  if (message.type === 'checkAuthStatus') {
    (async () => { 
      try { 
        const result = await chrome.storage.local.get(['user', 'token']); 
        if (result.user && result.token) { 
          sendResponse({ loggedIn: true, user: result.user }); 
        } else { 
          sendResponse({ loggedIn: false }); 
        } 
      } catch (error: any) { 
        sendResponse({ loggedIn: false, error: error.message }); 
      } 
    })();
    return true;
  }

  if (message.type === 'getReadme') {
    (async () => {
      try {
        const { repoFullName } = message;
        if (!repoFullName) throw new Error('repoFullName is required for getReadme.');
        const readmeHtml = await fetchReadme(repoFullName);
        sendResponse({ success: true, data: readmeHtml });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (message.type === 'getRepositories') {
    (async () => { 
      try { 
        const repos = await fetchRepositories(); 
        sendResponse({ success: true, repos }); 
      } catch (error: any) { 
        sendResponse({ success: false, error: error.message }); 
      } 
    })();
    return true;
  }

  if (message.type === 'getRepoDetails') {
    (async () => {
      try {
        const { repoFullName } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const repo = await fetchRepoDetails(repoFullName);
        sendResponse({ success: true, repo });
      } catch (error: any) {
        sendResponse({ success: false, error: "Repository not found or access denied." });
      }
    })();
    return true;
  }

  if (message.type === 'getBranches') {
    (async () => {
      try {
        const { repoFullName } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const branches = await fetchBranches(repoFullName); 
        sendResponse({ success: true, data: branches });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getCommits') {
    (async () => {
      try {
        const { repoFullName, branch, page } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        if (!branch) throw new Error('branch is required.');
        const data = await fetchCommits(repoFullName, branch, page); 
        sendResponse({ success: true, data });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getIssues') {
    (async () => {
      try {
        const { repoFullName, state, page } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const data = await fetchIssues(repoFullName, state, page);
        sendResponse({ success: true, data });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getPullRequests') {
    (async () => {
      try {
        const { repoFullName, state, page } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const data = await fetchPullRequests(repoFullName, state, page);
        sendResponse({ success: true, data });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (message.type === 'getMergedPullRequests') {
    (async () => {
      try {
        const { repoFullName, page } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const data = await fetchMergedPullRequests(repoFullName, page);
        sendResponse({ success: true, data });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (message.type === 'getClosedUnmergedPullRequests') {
    (async () => {
      try {
        const { repoFullName, page } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const data = await fetchClosedUnmergedPullRequests(repoFullName, page);
        sendResponse({ success: true, data });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getPullRequestsAssignedToMe') {
      (async () => {
          try {
              const { repoFullName, page } = message;
              if (!repoFullName) throw new Error('repoFullName is required.');
              const data = await fetchMyAssignedPullRequests(repoFullName, page);
              sendResponse({ success: true, data });
          } catch (error: any) {
              sendResponse({ success: false, error: error.message });
          }
      })();
      return true;
  }

  if (message.type === 'getActions') {
    (async () => {
      try {
        const { repoFullName, status, page } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const data = await fetchActions(repoFullName, status, page);
        sendResponse({ success: true, data });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getReleases') {
    (async () => {
      try {
        const { repoFullName, page } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const data = await fetchReleases(repoFullName, page);
        sendResponse({ success: true, data });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getDirectoryContent') {
    (async () => {
      try {
        const { repoFullName, branch, path } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        if (!branch) throw new Error('branch is required.');
        const content = await fetchDirectoryContent(repoFullName, branch, path || '');
        sendResponse({ success: true, data: content });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getFileContent') {
    (async () => {
      try {
        const { repoFullName, branch, path } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        if (!branch) throw new Error('branch is required.');
        if (!path) throw new Error('path is required for getFileContent.');
        const content = await fetchFileContent(repoFullName, path, branch);
        sendResponse({ success: true, data: content });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});