import { login, logout } from './auth';
// Importamos la nueva función del cliente de GitHub
import { fetchRepositories, fetchCommits, fetchIssues, fetchPullRequests, fetchActions} from './githubClient';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // ... (login, logout, checkAuthStatus, getRepositories no cambian)
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

  if (message.type === 'getCommits') {
    (async () => {
      try {
        const { repoFullName } = message;
        if (!repoFullName) {
          throw new Error('repoFullName is required.');
        }
        const commits = await fetchCommits(repoFullName);
        sendResponse({ success: true, commits });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getIssues') {
    (async () => {
      try {
        const { repoFullName, state } = message;
        if (!repoFullName) {
          throw new Error('repoFullName is required.');
        }
        const issues = await fetchIssues(repoFullName, state);
        sendResponse({ success: true, issues });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getPullRequests') {
    (async () => {
      try {
        const { repoFullName } = message;
        if (!repoFullName) {
          throw new Error('repoFullName is required.');
        }
        const pullRequests = await fetchPullRequests(repoFullName);
        sendResponse({ success: true, pullRequests });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'getActions') {
    (async () => {
      try {
        const { repoFullName } = message;
        if (!repoFullName) {
          throw new Error('repoFullName is required.');
        }
        const actions = await fetchActions(repoFullName);
        sendResponse({ success: true, actions });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});
