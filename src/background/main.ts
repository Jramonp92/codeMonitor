import { login, logout } from './auth';
import { 
  fetchRepositories, 
  fetchCommits, 
  fetchIssues, 
  fetchPullRequests, 
  fetchActions,
  fetchMyAssignedPullRequests
} from './githubClient';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // login, logout, checkAuthStatus, getRepositories (sin cambios)
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
    (async () => { try { await logout(); sendResponse({ success: true }); } catch (error: any) { sendResponse({ success: false, error: error.message }); } })();
    return true;
  }

  if (message.type === 'checkAuthStatus') {
    (async () => { try { const result = await chrome.storage.local.get(['user', 'token']); if (result.user && result.token) { sendResponse({ loggedIn: true, user: result.user }); } else { sendResponse({ loggedIn: false }); } } catch (error: any) { sendResponse({ loggedIn: false, error: error.message }); } })();
    return true;
  }
  
  if (message.type === 'getRepositories') {
    (async () => { try { const repos = await fetchRepositories(); sendResponse({ success: true, repos }); } catch (error: any) { sendResponse({ success: false, error: error.message }); } })();
    return true;
  }

  // --- MANEJADORES ACTUALIZADOS PARA DEVOLVER EL OBJETO COMPLETO DE DATOS ---

  if (message.type === 'getCommits') {
    (async () => {
      try {
        const { repoFullName, page } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const data = await fetchCommits(repoFullName, page); 
        sendResponse({ success: true, data }); // Devuelve el objeto completo
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
        
        let data;
        if (state === 'assigned_to_me') {
          data = await fetchMyAssignedPullRequests(repoFullName, page);
        } else {
          data = await fetchPullRequests(repoFullName, state, page);
        }
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
});