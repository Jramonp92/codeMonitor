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
  fetchFileContent,
  fetchLastCommitForFile,
  fetchPullRequestReviewInfo,
  // --- INICIO DE CAMBIOS ---
  // 1. Importamos la nueva función que creamos en el paso anterior
  fetchWorkflows
  // --- FIN DE CAMBIOS ---
} from './githubClient';

initializeAlarms();

// El listener que se encarga de abrir el panel al hacer clic en el icono.
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

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

  // --- INICIO DE CAMBIOS ---
  // 2. Añadimos un nuevo manejador de mensajes para 'getWorkflows'
  if (message.type === 'getWorkflows') {
    (async () => {
      try {
        const { repoFullName } = message;
        if (!repoFullName) throw new Error('repoFullName is required for getWorkflows.');
        const workflows = await fetchWorkflows(repoFullName);
        sendResponse({ success: true, data: workflows });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  // --- FIN DE CAMBIOS ---

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
        // --- INICIO DE CAMBIOS ---
        // 3. Añadimos workflowId a los parámetros que recibimos y pasamos a la función
        const { repoFullName, status, workflowId, page } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const data = await fetchActions(repoFullName, status, workflowId, page);
        sendResponse({ success: true, data });
        // --- FIN DE CAMBIOS ---
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

  if (message.type === 'getLastCommitForFile') {
    (async () => {
      try {
        const { repoFullName, branch, path } = message;
        if (!repoFullName || !branch || !path) {
          throw new Error('repoFullName, branch, and path are required.');
        }
        const commit = await fetchLastCommitForFile(repoFullName, branch, path);
        sendResponse({ success: true, data: commit });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getPullRequestApprovalState') {
    (async () => {
      try {
        const { repoFullName, prNumber } = message;
        if (!repoFullName || !prNumber) {
          throw new Error('repoFullName and prNumber are required.');
        }
        const reviewInfo = await fetchPullRequestReviewInfo(repoFullName, prNumber);
        sendResponse({ success: true, data: reviewInfo });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
});