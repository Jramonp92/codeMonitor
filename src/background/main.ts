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
        if (!repoFullName) throw new Error('repoFullName is required.');
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
        if (!repoFullName) throw new Error('repoFullName is required.');
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
        const { repoFullName, state } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        
        let pullRequests;
        if (state === 'assigned_to_me') {
          pullRequests = await fetchMyAssignedPullRequests(repoFullName);
        } else {
          pullRequests = await fetchPullRequests(repoFullName, state);
        }
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
        const { repoFullName, status } = message;
        if (!repoFullName) throw new Error('repoFullName is required.');
        const actions = await fetchActions(repoFullName, status);
        sendResponse({ success: true, actions });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});