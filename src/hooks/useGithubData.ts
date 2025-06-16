import { useState, useEffect, useCallback } from 'react';

// Interfaces
// 1. Add 'README' to the Tab type
export type Tab = 'README' | 'Commits' | 'Issues' | 'PRs' | 'Actions'| 'Releases';
export type IssueState = 'open' | 'closed' | 'all';
export type PRState = 'all' | 'open' | 'closed' | 'merged' | 'assigned_to_me';
export type ActionStatus = 'all' | 'success' | 'failure' | 'in_progress' | 'queued' | 'waiting' | 'cancelled';
export interface Repo { id: number; name: string; full_name: string; private: boolean; owner: { login: string; } }
export interface CommitInfo { sha: string; commit: { author: { name: string; date: string; }; message: string; }; html_url: string; }
export interface GitHubUser { login: string; avatar_url: string; html_url: string; }
export interface IssueInfo { id: number; title: string; html_url: string; number: number; user: GitHubUser; created_at: string; state: 'open' | 'closed'; assignees: GitHubUser[]; pull_request?: object; }
export interface PullRequestInfo extends IssueInfo { merged_at: string | null; }
export interface ActionInfo { id: number; name: string; status: 'queued' | 'in_progress' | 'completed' | 'waiting'; conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null; html_url: string; created_at: string; actor: { login: string; }; pull_requests: { html_url: string; number: number; }[]; }
export interface ReleaseInfo { id: number; name: string; tag_name: string; html_url: string; author: { login: string; }; published_at: string; }

export function useGithubData() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  
  const [managedRepos, setManagedRepos] = useState<Repo[]>([]);
  const [allRepos, setAllRepos] = useState<Repo[]>([]);
  
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  
  const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
  // 2. Set 'README' as the default active tab
  const [activeTab, setActiveTab] = useState<Tab>('README');
  
  const [issueStateFilter, setIssueStateFilter] = useState<IssueState>('all');
  const [prStateFilter, setPrStateFilter] = useState<PRState>('all');
  const [actionStatusFilter, setActionStatusFilter] = useState<ActionStatus>('all');

  // 3. Add state for the README content
  const [readmeHtml, setReadmeHtml] = useState<string>('');
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [issues, setIssues] = useState<IssueInfo[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestInfo[]>([]);
  const [actions, setActions] = useState<ActionInfo[]>([]);
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'checkAuthStatus' }, (response) => {
      if (response?.loggedIn && response.user) {
        const currentUser = response.user;
        setUser(currentUser);
        
        const userReposKey = `userRepos_${currentUser.login}`;

        chrome.storage.local.get(userReposKey, (result) => {
          if (result[userReposKey]) {
            setManagedRepos(result[userReposKey]);
          }
        });

        chrome.runtime.sendMessage({ type: 'getRepositories' }, (repoResponse) => {
          if (repoResponse?.success) {
            setAllRepos(repoResponse.repos);
            chrome.storage.local.get(userReposKey, (result) => {
              if (!result[userReposKey]) {
                setManagedRepos(repoResponse.repos);
                chrome.storage.local.set({ [userReposKey]: repoResponse.repos });
              }
            });
          }
        });
      }
    });
  }, []);

  const updateManagedRepos = useCallback((updatedRepos: Repo[]) => {
    if (user?.login) {
      const userReposKey = `userRepos_${user.login}`;
      setManagedRepos(updatedRepos);
      chrome.storage.local.set({ [userReposKey]: updatedRepos });
    }
  }, [user]);

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
  
  const fetchDataForTab = useCallback(() => {
    if (!selectedRepo) return;

    setIsContentLoading(true);
    // For README, page is not needed, so we handle it separately
    let message: any = { repoFullName: selectedRepo };
    if (activeTab !== 'README') {
      message.page = currentPage;
    }
    
    let messageType = '';

    switch(activeTab) {
      // 4. Add case for 'README'
      case 'README':
        messageType = 'getReadme';
        break;
      case 'Commits': 
        messageType = 'getCommits'; 
        break;
      case 'Issues': 
        messageType = 'getIssues';
        message.state = issueStateFilter;
        break;
      case 'PRs': 
        switch (prStateFilter) {
          case 'merged': messageType = 'getMergedPullRequests'; break;
          case 'closed': messageType = 'getClosedUnmergedPullRequests'; break;
          case 'assigned_to_me': messageType = 'getPullRequestsAssignedToMe'; break;
          default:
            messageType = 'getPullRequests';
            message.state = prStateFilter;
            break;
        }
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
            // 5. Handle the response for 'getReadme'
            if (activeTab === 'README') {
              setReadmeHtml(response.data || '');
            } else {
              const { items, totalPages: newTotalPages } = response.data;
              switch(activeTab) {
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
            }
        } else {
            console.error(`Error fetching ${activeTab}:`, response?.error);
            // On error, clear all content states
            setReadmeHtml('');
            setCommits([]); setIssues([]); setPullRequests([]); setActions([]); setReleases([]);
            setTotalPages(1); 
        }
        setIsContentLoading(false);
    });
  }, [selectedRepo, activeTab, currentPage, issueStateFilter, prStateFilter, actionStatusFilter]);

  useEffect(() => {
    fetchDataForTab();
  }, [fetchDataForTab]);

  const handleRefresh = () => {
    fetchDataForTab();
  };

  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    setCurrentPage(1);
  };

  const handleIssueFilterChange = (newFilter: IssueState) => {
    setIssueStateFilter(newFilter);
    setCurrentPage(1);
  };

  const handlePrFilterChange = (newFilter: PRState) => {
    setPrStateFilter(newFilter);
    setCurrentPage(1);
  };

  const handleActionStatusChange = (newStatus: ActionStatus) => {
    setActionStatusFilter(newStatus);
    setCurrentPage(1);
  };

  return {
    user,
    allRepos,
    managedRepos,
    addRepoToManagedList,
    removeRepoFromManagedList,
    selectedRepo, setSelectedRepo,
    isContentLoading,
    activeTab, 
    issueStateFilter,
    prStateFilter,
    actionStatusFilter,
    handleTabChange,
    handleIssueFilterChange,
    handlePrFilterChange,
    handleActionStatusChange,
    readmeHtml,
    commits, issues, pullRequests, actions, releases,
    currentPage, setCurrentPage,
    totalPages,
    handleRefresh,
  };
}
