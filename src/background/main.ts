import { login, logout } from './auth';
// Importamos la nueva función del cliente de GitHub
import { 
  fetchRepositories, 
  fetchCommits, 
  fetchIssues, 
  fetchPullRequests, 
  fetchActions,
  fetchMyAssignedPullRequests 
} from './githubClient';

// Hacemos que la función del listener sea async para usar await dentro
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // --- Manejador para el login ---
  if (message.type === 'login') {
    (async () => {
      try {
        const user = await login();
        sendResponse({ success: true, user });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Indica que la respuesta será asíncrona
  }
  
  // --- Manejador para el logout ---
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

  // --- Manejador para verificar el estado de la autenticación ---
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
  
  // --- Manejador para obtener la lista de repositorios ---
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

  // --- Manejador para obtener los commits ---
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

  // --- Manejador para obtener los issues ---
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

  // --- MANEJADOR DE PULL REQUESTS ACTUALIZADO ---
  if (message.type === 'getPullRequests') {
    (async () => {
      try {
        const { repoFullName, state } = message;
        if (!repoFullName) {
          throw new Error('repoFullName is required.');
        }
        
        let pullRequests;
        if (state === 'assigned_to_me') {
          // Si el filtro es "asignados a mi", llama a la nueva función de búsqueda
          pullRequests = await fetchMyAssignedPullRequests(repoFullName);
        } else {
          // De lo contrario, usa la función original
          pullRequests = await fetchPullRequests(repoFullName, state);
        }

        sendResponse({ success: true, pullRequests });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // --- Manejador para obtener las Actions ---
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
