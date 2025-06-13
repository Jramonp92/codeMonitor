// src/hooks/useGithubData.ts - VERSIÓN ACTUALIZADA

import { useState, useEffect } from 'react';

// --- Tipos (Se exportan desde aquí para que otros archivos los usen) ---
export type Tab = 'Commits' | 'Issues' | 'PRs' | 'Actions'| 'Releases';
export type IssueState = 'open' | 'closed' | 'all';
export type PRState = 'all' | 'open' | 'closed' | 'draft' | 'merged' | 'assigned_to_me';
export type ActionStatus = 'all' | 'success' | 'failure' | 'in_progress' | 'queued' | 'waiting' | 'cancelled';

export interface Repo { id: number; name: string; full_name: string; }
export interface CommitInfo { sha: string; commit: { author: { name: string; date: string; }; message: string; }; html_url: string; }
export interface GitHubUser { login: string; avatar_url: string; html_url: string; }
export interface IssueInfo { id: number; title: string; html_url: string; number: number; user: GitHubUser; created_at: string; state: 'open' | 'closed'; assignees: GitHubUser[]; pull_request?: object; }
export interface PullRequestInfo extends IssueInfo { draft: boolean; merged_at: string | null; }
export interface ActionInfo { id: number; name: string; status: 'queued' | 'in_progress' | 'completed' | 'waiting'; conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null; html_url: string; created_at: string; actor: { login: string; }; pull_requests: { html_url: string; number: number; }[]; }
export interface ReleaseInfo { 
    id: number; 
    name: string; 
    tag_name: string; 
    html_url: string; 
    author: { login: string; }; 
    published_at: string; 
}

export function useGithubData() {
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  
  const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('Commits');
  
  const [issueStateFilter, setIssueStateFilter] = useState<IssueState>('all');
  const [prStateFilter, setPrStateFilter] = useState<PRState>('all');
  const [actionStatusFilter, setActionStatusFilter] = useState<ActionStatus>('all');

  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [issues, setIssues] = useState<IssueInfo[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestInfo[]>([]);
  const [actions, setActions] = useState<ActionInfo[]>([]);
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // --- LÓGICA DE CARGA INICIAL MODIFICADA ---
  // Este useEffect se ejecuta una vez para autenticar y cargar la lista de repos.
  useEffect(() => {
    // 1. Comprueba si el usuario está autenticado.
    chrome.runtime.sendMessage({ type: 'checkAuthStatus' }, (response) => {
      if (response?.loggedIn) {
        setUser(response.user);
        
        // 2. Intenta cargar los repositorios desde el almacenamiento local.
        chrome.storage.local.get('userRepos', (result) => {
          if (result.userRepos && result.userRepos.length > 0) {
            console.log("Repositorios cargados desde el almacenamiento local.");
            setRepos(result.userRepos);
          } else {
            // 3. Si no hay repos en local, los pide a la API.
            console.log("No se encontraron repos en local, pidiendo a la API.");
            chrome.runtime.sendMessage({ type: 'getRepositories' }, (repoResponse) => {
              if (repoResponse?.success) {
                setRepos(repoResponse.repos);
              } else {
                console.error("Error al obtener repositorios:", repoResponse?.error);
              }
            });
          }
        });
      }
    });
  }, []); // El array vacío [] asegura que se ejecute solo una vez.

  // Este useEffect se encarga de buscar los datos de la pestaña activa cuando cambia una dependencia.
  useEffect(() => {
    if (selectedRepo) {
      fetchDataForTab(activeTab, currentPage);
    } else {
        // Limpia los datos si no hay un repositorio seleccionado
        setCommits([]); setIssues([]); setPullRequests([]); setActions([]); setReleases([]);
    }
  }, [selectedRepo, activeTab, issueStateFilter, prStateFilter, actionStatusFilter, currentPage]); 

  // Este efecto resetea la página a 1 cuando cambia un filtro.
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
      case 'Releases':
        messageType = 'getReleases';
        break;
    }

    if (!messageType) {
      setIsContentLoading(false);
      return;
    }

    chrome.runtime.sendMessage({ type: messageType, ...payload }, (response) => {
      if (response?.success) {
        const { items, totalPages: newTotalPages } = response.data;
        
        switch(tab) {
          case 'Commits': setCommits(items || []); break;
          case 'Issues': 
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
          case 'Actions': setActions(items || []); break;
          case 'Releases': setReleases(items || []); break;
        }
        setTotalPages(newTotalPages || 1);
      } else {
        console.error(`Error al obtener ${tab}:`, response?.error);
        setTotalPages(1); 
      }
      setIsContentLoading(false);
    });
  };

  return {
    user, setUser,
    repos, setRepos,
    selectedRepo, setSelectedRepo,
    isContentLoading,
    activeTab, setActiveTab,
    issueStateFilter, setIssueStateFilter,
    prStateFilter, setPrStateFilter,
    actionStatusFilter, setActionStatusFilter,
    commits, issues, pullRequests, actions, releases,
    currentPage, setCurrentPage,
    totalPages
  };
}