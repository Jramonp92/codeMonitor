// Función para obtener los repositorios del usuario autenticado
export async function fetchRepositories() {
    console.log('GitHub Client: Pidiendo repositorios...');
    
    const result = await chrome.storage.local.get('token');
    const token = result.token;
  
    if (!token) {
      throw new Error('No authentication token found.');
    }
  
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  
    if (!response.ok) {
      throw new Error('Failed to fetch repositories from GitHub API.');
    }
  
    return await response.json();
  }
  
  // Función para obtener los commits de un repositorio específico
  export async function fetchCommits(repoFullName: string) {
    console.log(`GitHub Client: Pidiendo commits para ${repoFullName}...`);
    
    const result = await chrome.storage.local.get('token');
    const token = result.token;
  
    if (!token) {
      throw new Error('No authentication token found.');
    }
  
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch commits for ${repoFullName}.`);
    }
  
    return await response.json();
  }
  
/**
 * Función de issues actualizada para aceptar un filtro de estado.
 * @param repoFullName - El nombre completo del repositorio.
 * @param state - El estado de los issues a buscar ('open', 'closed', 'all').
 */
export async function fetchIssues(repoFullName: string, state: 'open' | 'closed' | 'all' = 'all') {
    console.log(`GitHub Client: Pidiendo issues para ${repoFullName} con estado ${state}...`);
  
    const result = await chrome.storage.local.get('token');
    const token = result.token;
  
    if (!token) {
      throw new Error('No authentication token found.');
    }
  
    // Usamos el parámetro 'state' en la URL de la API
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/issues?state=${state}&sort=updated&per_page=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch issues for ${repoFullName}.`);
    }
  
    return await response.json();
  }
  
  /**
   * Nueva función para obtener los Pull Requests de un repositorio específico.
   * @param repoFullName - El nombre completo del repositorio (ej. 'owner/repo').
   */
  export async function fetchPullRequests(repoFullName: string) {
    console.log(`GitHub Client: Pidiendo PRs para ${repoFullName}...`);
  
    const result = await chrome.storage.local.get('token');
    const token = result.token;
  
    if (!token) {
      throw new Error('No authentication token found.');
    }
  
    // Usamos el endpoint de pulls, pidiendo los 5 más recientes
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=open&sort=updated&per_page=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch pull requests for ${repoFullName}.`);
    }
  
    const pullRequests = await response.json();
    console.log(`GitHub Client: Se encontraron ${pullRequests.length} PRs.`);
    return pullRequests;
  }

 /**
  * @param repoFullName - El nombre completo del repositorio (ej. 'owner/repo').
  */
 export async function fetchActions(repoFullName: string) {
   console.log(`GitHub Client: Pidiendo Actions para ${repoFullName}...`);
 
   const result = await chrome.storage.local.get('token');
   const token = result.token;
 
   if (!token) {
     throw new Error('No authentication token found.');
   }
 
   // Usamos el endpoint de actions/runs, pidiendo los 5 más recientes
   const response = await fetch(`https://api.github.com/repos/${repoFullName}/actions/runs?per_page=5`, {
     headers: {
       'Authorization': `Bearer ${token}`,
       'X-GitHub-Api-Version': '2022-11-28'
     }
   });
 
   if (!response.ok) {
     throw new Error(`Failed to fetch actions for ${repoFullName}.`);
   }
 
   const data = await response.json();
   console.log(`GitHub Client: Se encontraron ${data.workflow_runs.length} action runs.`);
   return data.workflow_runs; // Las actions vienen dentro de la propiedad workflow_runs
 }