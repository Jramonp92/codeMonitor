import { useState, useEffect } from 'react';

// --- Tipos (Se exportan desde aquí para que otros archivos los usen) ---
export type Tab = 'Commits' | 'Issues' | 'PRs' | 'Actions';
export type IssueState = 'open' | 'closed' | 'all';
export type PRState = 'all' | 'open' | 'closed' | 'draft' | 'merged' | 'assigned_to_me';
export type ActionStatus = 'all' | 'success' | 'failure' | 'in_progress' | 'queued' | 'waiting' | 'cancelled';

export interface Repo { id: number; name: string; full_name: string; }
export interface CommitInfo { sha: string; commit: { author: { name: string; date: string; }; message: string; }; html_url: string; }
export interface GitHubUser { login: string; avatar_url: string; html_url: string; }
export interface IssueInfo { id: number; title: string; html_url: string; number: number; user: GitHubUser; created_at: string; state: 'open' | 'closed'; assignees: GitHubUser[]; pull_request?: object; }
export interface PullRequestInfo extends IssueInfo { draft: boolean; merged_at: string | null; }
export interface ActionInfo { id: number; name: string; status: 'queued' | 'in_progress' | 'completed' | 'waiting'; conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null; html_url: string; created_at: string; actor: { login: string; }; pull_requests: { html_url: string; number: number; }[]; }


export function useGithubData() {
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  
  const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('Commits');
  
  // Estados de los filtros
  const [issueStateFilter, setIssueStateFilter] = useState<IssueState>('all');
  const [prStateFilter, setPrStateFilter] = useState<PRState>('all');
  const [actionStatusFilter, setActionStatusFilter] = useState<ActionStatus>('all');

  // Estados de los datos de las pestañas
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [issues, setIssues] = useState<IssueInfo[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestInfo[]>([]);
  const [actions, setActions] = useState<ActionInfo[]>([]);

  // --- ESTADOS PARA PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Efecto que pide datos cada vez que cambia una dependencia
  useEffect(() => {
    if (selectedRepo) {
      fetchDataForTab(activeTab, currentPage);
    } else {
      setCommits([]); setIssues([]); setPullRequests([]); setActions([]);
    }
  }, [selectedRepo, activeTab, issueStateFilter, prStateFilter, actionStatusFilter, currentPage]);

  // Efecto que resetea la página a 1 cuando cambia la pestaña o los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRepo, activeTab, issueStateFilter, prStateFilter, actionStatusFilter]);


  const fetchDataForTab = (tab: Tab, page: number) => {
    setIsContentLoading(true);
    let messageType: string = '';
    let payload: any = { repoFullName: selectedRepo, page };

    switch(tab) {
      case 'Commits': messageType = 'getCommits'; break;
      case 'Issues': 
        messageType = 'getIssues';
        payload.state = issueStateFilter;
        break;
      case 'PRs': 
        messageType = 'getPullRequests';
        if (prStateFilter === 'draft' || prStateFilter === 'open') payload.state = 'open';
        else if (prStateFilter === 'merged' || prStateFilter === 'closed') payload.state = 'closed';
        else if (prStateFilter === 'assigned_to_me') payload.state = 'assigned_to_me';
        else payload.state = 'all'; 
        break;
      case 'Actions': 
        messageType = 'getActions';
        payload.status = actionStatusFilter;
        break;
    }

    chrome.runtime.sendMessage({ type: messageType, ...payload }, (response) => {
      if (response?.success) {
        const { items, totalPages: newTotalPages } = response.data;
        
        switch(tab) {
          case 'Commits': 
            setCommits(items || []); 
            break;
          case 'Issues': 
            // BUG FIX: La API de búsqueda devuelve PRs también, los filtramos
            const onlyIssues = items?.filter((item: IssueInfo) => !item.pull_request) || [];
            setIssues(onlyIssues);
            break;
          case 'PRs': 
            let prs = items || [];
            if (prStateFilter === 'draft') prs = prs.filter((pr: PullRequestInfo) => pr.draft);
            else if (prStateFilter === 'open') prs = prs.filter((pr: PullRequestInfo) => !pr.draft);
            else if (prStateFilter === 'merged') prs = prs.filter((pr: PullRequestInfo) => pr.merged_at !== null);
            else if (prStateFilter === 'closed') prs = prs.filter((pr: PullRequestInfo) => pr.merged_at === null);
            setPullRequests(prs);
            break;
          case 'Actions': 
            setActions(items || []); 
            break;
        }
        setTotalPages(newTotalPages || 1);
      } else {
        console.error(`Error al obtener ${tab}:`, response?.error);
        setTotalPages(1); 
      }
      setIsContentLoading(false);
    });
  };

  // El hook devuelve el estado y las funciones para que el componente las use
  return {
    user, setUser,
    repos, setRepos,
    selectedRepo, setSelectedRepo,
    isContentLoading,
    activeTab, setActiveTab,
    issueStateFilter, setIssueStateFilter,
    prStateFilter, setPrStateFilter,
    actionStatusFilter, setActionStatusFilter,
    commits, issues, pullRequests, actions,
    currentPage, setCurrentPage,
    totalPages
  };
}