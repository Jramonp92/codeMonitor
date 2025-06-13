async function getAuthToken() {
    const result = await chrome.storage.local.get('token');
    if (!result.token) throw new Error('No authentication token found.');
    return result.token;
}

const GITHUB_API_URL = "https://api.github.com";
const ITEMS_PER_PAGE = 7;

// Helper para normalizar los resultados de la API de búsqueda de issues/prs
const normalizePRData = (item: any) => ({
    ...item,
    merged_at: item.pull_request?.merged_at || null,
});

export async function fetchRepositories() {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/user/repos?per_page=100`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch repositories");
    const repos = await response.json();
    const simplifiedRepos = repos.map((repo: any) => ({
        id: repo.id,
        full_name: repo.full_name,
        name: repo.name,
        private: repo.private,
        owner: { login: repo.owner.login },
    }));
    try {
        await new Promise<void>((resolve, reject) => {
            chrome.storage.local.set({ userRepos: simplifiedRepos }, () => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve();
            });
        });
    } catch (error) {
        console.error("Error saving repositories in local:", error);
    }
    return simplifiedRepos;
}

export async function fetchRepoDetails(repoFullName: string) {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (!response.ok) throw new Error(`Failed to fetch repository details for ${repoFullName}`);
    const repo = await response.json();
    return {
        id: repo.id,
        full_name: repo.full_name,
        name: repo.name,
        private: repo.private,
        owner: { login: repo.owner.login },
    };
}

export async function fetchCommits(repoFullName: string, page: number = 1) {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/commits?per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch commits.`);
    const items = await response.json();
    const linkHeader = response.headers.get('Link');
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
    const response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(query)}&sort=updated&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch issues.`);
    const data = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    return { items: data.items, totalPages: totalPages > 0 ? totalPages : 1 };
}

export async function fetchPullRequests(repoFullName: string, state: 'open' | 'all' = 'all', page: number = 1) {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/pulls?state=${state}&sort=created&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch pull requests.`);
    const items = await response.json();
    const linkHeader = response.headers.get('Link');
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
    const response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(query)}&sort=updated&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch merged PRs.`);
    const data = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    // --- CAMBIO: Normalizar los datos ---
    const items = data.items.map(normalizePRData);
    return { items, totalPages: totalPages > 0 ? totalPages : 1 };
}

export async function fetchClosedUnmergedPullRequests(repoFullName: string, page: number = 1) {
    const token = await getAuthToken();
    const query = `is:pr is:closed is:unmerged repo:${repoFullName}`;
    const response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(query)}&sort=updated&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch closed and unmerged PRs.`);
    const data = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    // --- CAMBIO: Normalizar los datos ---
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
    const response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(query)}&sort=created&direction=desc&per_page=${ITEMS_PER_PAGE}&page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch assigned PRs.`);
    const data = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    // --- CAMBIO: Normalizar los datos ---
    const items = data.items.map(normalizePRData);
    return { items, totalPages: totalPages > 0 ? totalPages : 1 };
}

export async function fetchActions(repoFullName: string, status?: string, page: number = 1) {
    const token = await getAuthToken();
    let url = `${GITHUB_API_URL}/repos/${repoFullName}/actions/runs?per_page=${ITEMS_PER_PAGE}&page=${page}`;
    if (status && status !== 'all') {
        url += `&status=${status}`;
    }
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch actions.`);
    const data = await response.json();
    const totalPages = Math.ceil((data.total_count || 0) / ITEMS_PER_PAGE);
    return {
        items: data.workflow_runs,
        totalPages: totalPages > 0 ? totalPages : 1
    };
}

export async function fetchReleases(repoFullName: string, page: number = 1) {
    const token = await getAuthToken();
    const response = await fetch(`${GITHUB_API_URL}/repos/${repoFullName}/releases?per_page=${ITEMS_PER_PAGE}&page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`Failed to fetch releases.`);
    const items = await response.json();
    const linkHeader = response.headers.get('Link');
    if (linkHeader) {
        const lastLinkMatch = linkHeader.match(/<.*?page=(\d+)>; rel="last"/);
        if (lastLinkMatch) return { items, totalPages: parseInt(lastLinkMatch[1], 10) };
        if (linkHeader.includes('rel="next"')) return { items, totalPages: page + 1 };
        return { items, totalPages: page };
    }
    return { items, totalPages: page };
}