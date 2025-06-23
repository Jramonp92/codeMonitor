// src/background/githubClient.ts
async function getAuthToken() {
    const result = await chrome.storage.local.get('token');
    if (!result.token) throw new Error('No authentication token found.');
    return result.token;
}

const GITHUB_API_URL = "https://api.github.com";
const ITEMS_PER_PAGE = 7;

const normalizePRData = (item: any) => ({
    ...item,
    merged_at: item.pull_request?.merged_at || null,
});

export async function fetchReadme(repoFullName: string) {
    const token = await getAuthToken();
    const response: Response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/readme`, {
        headers: { 
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.html+json',
        },
    });
    if (!response.ok) throw new Error(`Failed to fetch README for ${repoFullName}`);
    const readmeHtml: string = await response.text();
    return readmeHtml;
}

export async function fetchRepositories() {
    const token = await getAuthToken();
    const response: Response = await fetch(`${GITHUB_API_URL}/user/repos?per_page=100`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch repositories");
    const repos: any[] = await response.json();
    const simplifiedRepos = repos.map((repo: any) => ({
        id: repo.id,
        full_name: repo.full_name,
        name: repo.name,
        private: repo.private,
        owner: { login: repo.owner.login },
        default_branch: repo.default_branch,
    }));
    return simplifiedRepos;
}

export async function fetchRepoDetails(repoFullName: string) {
    const token = await getAuthToken();
    const response: Response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (!response.ok) throw new Error(`Failed to fetch repository details for ${repoFullName}`);
    const repo: any = await response.json();
    return {
        id: repo.id,
        full_name: repo.full_name,
        name: repo.name,
        private: repo.private,
        owner: { login: repo.owner.login },
        default_branch: repo.default_branch,
    };
}

// --- INICIO DE CORRECCIÓN DE TIPOS ---
export async function fetchBranches(repoFullName: string) {
    const token = await getAuthToken();
    let allBranches: any[] = [];
    let nextPageUrl: string | null = `${GITHUB_API_URL}/repos/${repoFullName}/branches?per_page=100`;

    while (nextPageUrl) {
        // Añadimos el tipo explícito 'Response'
        const response: Response = await fetch(nextPageUrl, {
            headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch branches. Status: ${response.status}`);
        }

        const pageBranches: any[] = await response.json();
        allBranches = [...allBranches, ...pageBranches];

        // Añadimos el tipo explícito 'string | null'
        const linkHeader: string | null = response.headers.get('Link');
        // Añadimos el tipo explícito para el resultado del 'match'
        const nextLinkMatch: RegExpMatchArray | null | undefined = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
        
        nextPageUrl = nextLinkMatch ? nextLinkMatch[1] : null;
    }
    
    return allBranches.map((branch: any) => ({ name: branch.name }));
}
// --- FIN DE CORRECCIÓN DE TIPOS ---

export async function fetchCommits(repoFullName: string, branchName: string, page: number = 1) {
    const token = await getAuthToken();
    const response: Response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/commits?sha=${branchName}&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch commits.`);
    const items: any[] = await response.json();
    const linkHeader: string | null = response.headers.get('Link');
    if (linkHeader) {
        const lastLinkMatch = linkHeader.match(/<.*?page=(\d+)>; rel="last"/);
        if (lastLinkMatch) return { items, totalPages: parseInt(lastLinkMatch[1], 10) };
        if (linkHeader.includes('rel="next"')) return { items, totalPages: page + 1 };
        return { items, totalPages: page };
    }
    return { items, totalPages: page };
}

export async function fetchIssues(repoFullName: string, state: 'open' | 'closed' | 'all' = 'all', page: number = 1) {
    const token = await getAuthToken();
    let query = `is:issue repo:${repoFullName}`;
    if (state !== 'all') {
        query += ` is:${state}`;
    }
    const response: Response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(query)}&sort=updated&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch issues.`);
    const data: any = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    return { items: data.items, totalPages: totalPages > 0 ? totalPages : 1 };
}

export async function fetchPullRequests(repoFullName: string, state: 'open' | 'all' = 'all', page: number = 1) {
    const token = await getAuthToken();
    const response: Response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/pulls?state=${state}&sort=created&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch pull requests.`);
    const items: any[] = await response.json();
    const linkHeader: string | null = response.headers.get('Link');
    if (linkHeader) {
        const lastLinkMatch = linkHeader.match(/<.*?page=(\d+)>; rel="last"/);
        if (lastLinkMatch) return { items, totalPages: parseInt(lastLinkMatch[1], 10) };
        if (linkHeader.includes('rel="next"')) return { items, totalPages: page + 1 };
        return { items, totalPages: page };
    }
    return { items, totalPages: page };
}

export async function fetchMergedPullRequests(repoFullName: string, page: number = 1) {
    const token = await getAuthToken();
    const query = `is:pr is:merged repo:${repoFullName}`;
    const response: Response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(query)}&sort=updated&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch merged PRs.`);
    const data: any = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    const items = data.items.map(normalizePRData);
    return { items, totalPages: totalPages > 0 ? totalPages : 1 };
}

export async function fetchClosedUnmergedPullRequests(repoFullName: string, page: number = 1) {
    const token = await getAuthToken();
    const query = `is:pr is:closed is:unmerged repo:${repoFullName}`;
    const response: Response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(query)}&sort=updated&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch closed and unmerged PRs.`);
    const data: any = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    const items = data.items.map(normalizePRData);
    return { items, totalPages: totalPages > 0 ? totalPages : 1 };
}

export async function fetchMyAssignedPullRequests(repoFullName: string, page: number = 1) {
    const result = await chrome.storage.local.get(['token', 'user']);
    const token = result.token;
    const user = result.user;
    if (!token || !user || !user.login) throw new Error('Authentication token or user info not found.');
    const username = user.login;
    const query = `is:pr state:open repo:${repoFullName} assignee:${username}`;
    const response: Response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(query)}&sort=created&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch assigned PRs.`);
    const data: any = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    const items = data.items.map(normalizePRData);
    return { items, totalPages: totalPages > 0 ? totalPages : 1 };
}

export async function fetchActions(repoFullName: string, status?: string, page: number = 1) {
    const token = await getAuthToken();
    let url = `${GITHUB_API_URL}/repos/${repoFullName}/actions/runs?per_page=${ITEMS_PER_PAGE}&page=${page}`;
    if (status && status !== 'all') {
        url += `&status=${status}`;
    }
    const response: Response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch actions.`);
    const data: any = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    return {
        items: data.workflow_runs,
        totalPages: totalPages > 0 ? totalPages : 1
    };
}

export async function fetchReleases(repoFullName: string, page: number = 1) {
    const token = await getAuthToken();
    const response: Response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/releases?per_page=${ITEMS_PER_PAGE}&page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch releases.`);
    const items: any[] = await response.json();
    const linkHeader: string | null = response.headers.get('Link');
    if (linkHeader) {
        const lastLinkMatch = linkHeader.match(/<.*?page=(\d+)>; rel="last"/);
        if (lastLinkMatch) return { items, totalPages: parseInt(lastLinkMatch[1], 10) };
        if (linkHeader.includes('rel="next"')) return { items, totalPages: page + 1 };
        return { items, totalPages: page };
    }
    return { items, totalPages: page };
}


/**
 * Obtiene el contenido de un directorio en una rama específica.
 * @param repoFullName - El nombre completo del repositorio (ej: "owner/repo").
 * @param branchName - El nombre de la rama.
 * @param path - La ruta del directorio a explorar.
 * @returns Una promesa que se resuelve con el contenido del directorio.
 */
export async function fetchDirectoryContent(repoFullName: string, branchName: string, path: string) {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/contents/${path}?ref=${branchName}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (!response.ok) throw new Error(`Failed to fetch content for path: ${path}`);
    return response.json();
}

/**
 * Obtiene el contenido de un fichero específico.
 * @param repoFullName - El nombre completo del repositorio (ej: "owner/repo").
 * @param filePath - La ruta del archivo a obtener.
 * @param branchName - El nombre de la rama donde se encuentra el archivo.
 * @returns Una promesa que se resuelve con el contenido del archivo en formato de texto.
 */
export async function fetchFileContent(repoFullName: string, filePath: string, branchName:string) {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/contents/${filePath}?ref=${branchName}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            // Usamos el header 'Accept' para obtener el contenido en formato raw/texto.
            Accept: 'application/vnd.github.raw', 
            'X-GitHub-Api-Version': '2022-11-28'
        },
    });
    if (!response.ok) throw new Error(`Failed to fetch file: ${filePath}`);
    return response.text();
}
