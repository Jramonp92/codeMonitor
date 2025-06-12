// fetchRepositories (sin cambios)
export async function fetchRepositories() {
    const result = await chrome.storage.local.get('token');
    const token = result.token;
    if (!token) throw new Error('No authentication token found.');
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error('Failed to fetch repositories from GitHub API.');
    return await response.json();
  }
  
  // fetchCommits (sin cambios)
  export async function fetchCommits(repoFullName: string) {
    const result = await chrome.storage.local.get('token');
    const token = result.token;
    if (!token) throw new Error('No authentication token found.');
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=5`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch commits for ${repoFullName}.`);
    return await response.json();
  }
  
  // fetchIssues (sin cambios)
  export async function fetchIssues(repoFullName: string, state: 'open' | 'closed' | 'all' = 'all') {
    const result = await chrome.storage.local.get('token');
    const token = result.token;
    if (!token) throw new Error('No authentication token found.');
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/issues?state=${state}&sort=updated&per_page=30`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch issues for ${repoFullName}.`);
    return await response.json();
  }
  
  // --- fetchPullRequests ACTUALIZADO ---
  export async function fetchPullRequests(repoFullName: string, state: 'open' | 'closed' | 'all' = 'all') {
    console.log(`GitHub Client: Pidiendo PRs para ${repoFullName} con estado ${state}...`);
    const result = await chrome.storage.local.get('token');
    const token = result.token;
    if (!token) throw new Error('No authentication token found.');
  
    // Se cambia sort=updated por sort=created y se añade direction=desc para asegurar el orden.
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=${state}&sort=created&direction=desc&per_page=30`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch pull requests for ${repoFullName}.`);
    }
    return await response.json();
  }
  
  // --- fetchMyAssignedPullRequests ACTUALIZADO ---
  export async function fetchMyAssignedPullRequests(repoFullName: string) {
    console.log(`GitHub Client: Buscando PRs asignados al usuario en ${repoFullName}...`);
  
    const result = await chrome.storage.local.get(['token', 'user']);
    const token = result.token;
    const user = result.user;
  
    if (!token || !user || !user.login) {
      throw new Error('Authentication token or user info not found.');
    }
  
    const username = user.login;
    const query = `is:pr state:open repo:${repoFullName} assignee:${username}`;
  
    // Se cambia sort=updated por sort=created y se añade direction=desc.
    const response = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=created&direction=desc&per_page=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch assigned pull requests for ${repoFullName}.`);
    }
    const data = await response.json();
    return data.items;
  }
  
  // fetchActions (sin cambios)
  export async function fetchActions(repoFullName: string) {
    const result = await chrome.storage.local.get('token');
    const token = result.token;
    if (!token) throw new Error('No authentication token found.');
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/actions/runs?per_page=5`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch actions for ${repoFullName}.`);
    const data = await response.json();
    return data.workflow_runs;
  }