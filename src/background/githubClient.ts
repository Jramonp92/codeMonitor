const GITHUB_API_URL = "https://api.github.com";

async function getAuthToken() {
    const result = await chrome.storage.local.get('token');
    if (!result.token) throw new Error('No authentication token found.');
    return result.token;
}


export async function fetchCommits(repoFullName: string, page: number = 1) {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/commits?per_page=5&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch commits.`);
    const items = await response.json();

    const linkHeader = response.headers.get('Link');

    if (linkHeader) {
        // Escenario 1: El mejor caso. Si existe 'rel="last"', lo usamos.
        const lastLinkMatch = linkHeader.match(/<.*?page=(\d+)>; rel="last"/);
        if (lastLinkMatch) {
            const totalPages = parseInt(lastLinkMatch[1], 10);
            return { items, totalPages };
        }

        // Escenario 2: No hay 'last', pero sí 'next'. Repositorio grande.
        if (linkHeader.includes('rel="next"')) {
            return { items, totalPages: page + 1 };
        }

        // Escenario 3: No hay 'next'. Hemos llegado a la última página.
        return { items, totalPages: page };
    }

    // Escenario 4: No hay encabezado 'Link'. Solo hay una página.
    return { items, totalPages: page };
}

export async function fetchRepositories() {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/user/repos?per_page=100`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch repositories");
    }

    const repos: any[] = await response.json();

    const simplifiedRepos = repos.map(repo => ({
        id: repo.id,
        full_name: repo.full_name,
        name: repo.name,
        private: repo.private,
        owner: {
            login: repo.owner.login,
        },
    }));

    try {

        await new Promise<void>((resolve, reject) => {
            chrome.storage.local.set({ userRepos: simplifiedRepos }, () => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve();
            });
        });
    } catch (error) {
        console.error("Error saving repositories in local:", error);
    }

    return simplifiedRepos;
}

export async function fetchIssues(repoFullName: string, state: 'open' | 'closed' | 'all' = 'all', page: number = 1) {
    const token = await getAuthToken();
    let query = `is:issue repo:${repoFullName}`;
    if (state !== 'all') {
        query += ` is:${state}`;
    }

    const response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(query)}&sort=updated&direction=desc&per_page=5&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch issues.`);
    const data = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / 5);
    return { items: data.items, totalPages: totalPages > 0 ? totalPages : 1 };
}



export async function fetchPullRequests(repoFullName: string, state: 'open' | 'closed' | 'all' = 'all', page: number = 1) {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/pulls?state=${state}&sort=created&direction=desc&per_page=5&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch pull requests.`);
    const items = await response.json();

    const linkHeader = response.headers.get('Link');
    
    if (linkHeader) {
        // Escenario 1: El mejor caso. Si existe 'rel="last"', lo usamos.
        const lastLinkMatch = linkHeader.match(/<.*?page=(\d+)>; rel="last"/);
        if (lastLinkMatch) {
            const totalPages = parseInt(lastLinkMatch[1], 10);
            return { items, totalPages };
        }

        // Escenario 2: No hay 'last', pero sí 'next'. Repositorio grande.
        if (linkHeader.includes('rel="next"')) {
            return { items, totalPages: page + 1 };
        }

        // Escenario 3: No hay 'next'. Hemos llegado a la última página.
        return { items, totalPages: page };
    }

    // Escenario 4: No hay encabezado 'Link'. Solo hay una página.
    return { items, totalPages: page };
}

export async function fetchMyAssignedPullRequests(repoFullName: string, page: number = 1) {
    const result = await chrome.storage.local.get(['token', 'user']);
    const token = result.token;
    const user = result.user;
    if (!token || !user || !user.login) throw new Error('Authentication token or user info not found.');
    const username = user.login;
    const query = `is:pr state:open repo:${repoFullName} assignee:${username}`;
    const response = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=created&direction=desc&per_page=5&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch assigned PRs.`);
    const data = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / 5);
    return { items: data.items, totalPages: totalPages > 0 ? totalPages : 1 };
}

export async function fetchActions(repoFullName: string, status?: string, page: number = 1) {
    const token = await getAuthToken();
    let url = `${GITHUB_API_URL}/repos/${repoFullName}/actions/runs?per_page=5&page=${page}`;
    if (status && status !== 'all') {
        url += `&status=${status}`;
    }
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch actions.`);
    const data = await response.json();
    
    // --- LÓGICA CORREGIDA ---
    // Usar data.total_count para un cálculo preciso, igual que en Issues.
    const totalPages = Math.ceil((data.total_count || 0) / 5);

    return {
        items: data.workflow_runs,
        totalPages: totalPages > 0 ? totalPages : 1
    };
}

export async function fetchReleases(repoFullName: string, page: number = 1) {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/releases?per_page=10&page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch releases.`);
    const items = await response.json();
  
    // Reutilizamos la lógica de paginación de los commits/PRs
    const linkHeader = response.headers.get('Link');
      
    if (linkHeader) {
        const lastLinkMatch = linkHeader.match(/<.*?page=(\d+)>; rel="last"/);
        if (lastLinkMatch) {
            return { items, totalPages: parseInt(lastLinkMatch[1], 10) };
        }
        if (linkHeader.includes('rel="next"')) {
            return { items, totalPages: page + 1 };
        }
        return { items, totalPages: page };
    }
  
    return { items, totalPages: page };
  }