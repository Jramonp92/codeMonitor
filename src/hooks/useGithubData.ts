import { useState, useEffect, useCallback } from 'react';

// Interfaces
export type Tab = 'Commits' | 'Issues' | 'PRs' | 'Actions'| 'Releases';
export type IssueState = 'open' | 'closed' | 'all';
export type PRState = 'all' | 'open' | 'closed' | 'draft' | 'merged' | 'assigned_to_me';
export type ActionStatus = 'all' | 'success' | 'failure' | 'in_progress' | 'queued' | 'waiting' | 'cancelled';
export interface Repo { id: number; name: string; full_name: string; private: boolean; owner: { login: string; } }
export interface CommitInfo { sha: string; commit: { author: { name: string; date: string; }; message: string; }; html_url: string; }
export interface GitHubUser { login: string; avatar_url: string; html_url: string; }
export interface IssueInfo { id: number; title: string; html_url: string; number: number; user: GitHubUser; created_at: string; state: 'open' | 'closed'; assignees: GitHubUser[]; pull_request?: object; }
export interface PullRequestInfo extends IssueInfo { draft: boolean; merged_at: string | null; }
export interface ActionInfo { id: number; name: string; status: 'queued' | 'in_progress' | 'completed' | 'waiting'; conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null; html_url: string; created_at: string; actor: { login: string; }; pull_requests: { html_url: string; number: number; }[]; }
export interface ReleaseInfo { id: number; name: string; tag_name: string; html_url: string; author: { login: string; }; published_at: string; }

export function useGithubData() {
  const [user, setUser] = useState<any>(null);
  
  const [managedRepos, setManagedRepos] = useState<Repo[]>([]);
  const [allRepos, setAllRepos] = useState<Repo[]>([]);
  
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
  
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'checkAuthStatus' }, (response) => {
      if (response?.loggedIn) {
        setUser(response.user);
        
        chrome.storage.local.get('userRepos', (result) => {
          if (result.userRepos) {
            setManagedRepos(result.userRepos);
          }
        });

        chrome.runtime.sendMessage({ type: 'getRepositories' }, (repoResponse) => {
          if (repoResponse?.success) {
            setAllRepos(repoResponse.repos);
            chrome.storage.local.get('userRepos', (result) => {
              if (!result.userRepos) {
                setManagedRepos(repoResponse.repos);
              }
            });
          }
        });
      }
    });
  }, []);

  const updateManagedRepos = useCallback((updatedRepos: Repo[]) => {
    setManagedRepos(updatedRepos);
    chrome.storage.local.set({ userRepos: updatedRepos });
  }, []);

  const addRepoToManagedList = (repoToAdd: Repo) => {
    if (managedRepos.some(repo => repo.id === repoToAdd.id)) return;
    const newRepos = [...managedRepos, repoToAdd].sort((a, b) => a.name.localeCompare(b.name));
    updateManagedRepos(newRepos);
  };
  
  const removeRepoFromManagedList = (repoToRemove: Repo) => {
    const newRepos = managedRepos.filter(repo => repo.id !== repoToRemove.id);
    updateManagedRepos(newRepos);
    if (selectedRepo === repoToRemove.full_name) {
        setSelectedRepo('');
    }
  };
  
  useEffect(() => {
    if (!selectedRepo) return;

    const fetchDataForTab = (tab: Tab, page: number) => {
        setIsContentLoading(true);
        let message: any = { repoFullName: selectedRepo, page };
        let messageType = '';

        switch(tab) {
          case 'Commits': 
            messageType = 'getCommits'; 
            break;
          case 'Issues': 
            messageType = 'getIssues';
            message.state = issueStateFilter;
            break;
          case 'PRs': 
            messageType = 'getPullRequests';
            message.state = prStateFilter;
            break;
          case 'Actions': 
            messageType = 'getActions';
            message.status = actionStatusFilter;
            break;
          case 'Releases':
            messageType = 'getReleases';
            break;
        }

        if (!messageType) {
            setIsContentLoading(false);
            return;
        }
        
        message.type = messageType;

        chrome.runtime.sendMessage(message, (response) => {
            if (response?.success) {
                const { items, totalPages: newTotalPages } = response.data;
                switch(tab) {
                  case 'Commits': setCommits(items || []); break;
                  case 'Issues': 
                    const onlyIssues = items?.filter((item: IssueInfo) => !item.pull_request) || [];
                    setIssues(onlyIssues);
                    break;
                  case 'PRs': 
                    setPullRequests(items || []);
                    break;
                  case 'Actions': setActions(items || []); break;
                  case 'Releases': setReleases(items || []); break;
                }
                setTotalPages(newTotalPages || 1);
            } else {
                console.error(`Error fetching ${tab}:`, response?.error);
                // Limpiar datos en caso de error
                setCommits([]); setIssues([]); setPullRequests([]); setActions([]); setReleases([]);
                setTotalPages(1); 
            }
            setIsContentLoading(false);
        });
    };

    fetchDataForTab(activeTab, currentPage);
  }, [selectedRepo, activeTab, currentPage, issueStateFilter, prStateFilter, actionStatusFilter]);


  return {
    user,
    allRepos,
    managedRepos,
    addRepoToManagedList,
    removeRepoFromManagedList,
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