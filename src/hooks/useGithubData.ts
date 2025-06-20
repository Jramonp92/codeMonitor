import { useState, useEffect, useCallback } from 'react';
import type { AlertSettings, ActiveNotifications } from '../background/alarms';

// --- INICIO DE LA CORRECCIÓN ---
// Se añaden IssueState, PRState, y ActionStatus a la lista de tipos exportados.
export type { Tab, IssueState, PRState, ActionStatus, IssueInfo, PullRequestInfo, ActionInfo, CommitInfo, ReleaseInfo, Repo };
// --- FIN DE LA CORRECCIÓN ---

// Interfaces
type Tab = 'README' | 'Commits' | 'Issues' | 'PRs' | 'Actions'| 'Releases';
type IssueState = 'open' | 'closed' | 'all';
type PRState = 'all' | 'open' | 'closed' | 'merged' | 'assigned_to_me';
type ActionStatus = 'all' | 'success' | 'failure' | 'in_progress' | 'queued' | 'waiting' | 'cancelled';
interface Repo { id: number; name: string; full_name: string; private: boolean; owner: { login: string; } }
interface CommitInfo {
  sha: string;
  html_url: string;
  commit: {
    author: { name: string; date: string; };
    message: string;
  };

  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;

}
export interface GitHubUser { login: string; avatar_url: string; html_url: string; }

interface IssueInfo { 
  id: number; 
  title: string; 
  html_url: string; 
  number: number; 
  user: GitHubUser; 
  created_at: string; 
  closed_at: string | null;
  state: 'open' | 'closed'; 
  assignees: GitHubUser[]; 
  pull_request?: object; 
}

interface PullRequestInfo extends IssueInfo { 
  merged_at: string | null; 
}

interface ActionInfo { 
  id: number; 
  name: string; 
  status: 'queued' | 'in_progress' | 'completed' | 'waiting'; 
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null; 
  html_url: string; 
  created_at: string; 
  run_number: number;
  event: string;
  head_branch: string;
  actor: { 
    login: string;
    avatar_url: string;
  }; 
  pull_requests: { html_url: string; number: number; }[]; 
}

interface ReleaseInfo { 
  id: number; 
  name: string; 
  tag_name: string; 
  html_url: string; 
  author: { 
    login: string;
    avatar_url: string;
    html_url: string;
  }; 
  published_at: string; 
  prerelease: boolean;
}

const ALARM_NAME = 'github-check-alarm';

export function useGithubData() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  
  const [managedRepos, setManagedRepos] = useState<Repo[]>([]);
  const [allRepos, setAllRepos] = useState<Repo[]>([]);
  
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  
  const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('README');
  
  const [issueStateFilter, setIssueStateFilter] = useState<IssueState>('all');
  const [prStateFilter, setPrStateFilter] = useState<PRState>('all');
  const [actionStatusFilter, setActionStatusFilter] = useState<ActionStatus>('all');

  const [readmeHtml, setReadmeHtml] = useState<string>('');
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [issues, setIssues] = useState<IssueInfo[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestInfo[]>([]);
  const [actions, setActions] = useState<ActionInfo[]>([]);
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [alertSettings, setAlertSettings] = useState<AlertSettings>({});
  const [activeNotifications, setActiveNotifications] = useState<ActiveNotifications>({});
  const [alertFrequency, setAlertFrequency] = useState<number>(1);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'checkAuthStatus' }, (response) => {
      if (response?.loggedIn && response.user) {
        const currentUser = response.user;
        setUser(currentUser);
        
        const userReposKey = `userRepos_${currentUser.login}`;
        const alertsConfigKey = `alertsConfig_${currentUser.login}`;
        const notificationsKey = `notifications_${currentUser.login}`;
        const frequencyKey = 'alertFrequency';

        chrome.storage.local.get([userReposKey, alertsConfigKey, notificationsKey, frequencyKey], (result) => {
          if (result[userReposKey]) setManagedRepos(result[userReposKey]);
          if (result[alertsConfigKey]) setAlertSettings(result[alertsConfigKey]);
          if (result[notificationsKey]) setActiveNotifications(result[notificationsKey]);
          if (result[frequencyKey]) setAlertFrequency(result[frequencyKey]);
        });

        chrome.action.setBadgeText({ text: '' });

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

  useEffect(() => {
    if (!selectedRepo && managedRepos.length > 0) {
      setSelectedRepo(managedRepos[0].full_name);
    }
  }, [managedRepos, selectedRepo]);

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

  const handleAlertSettingsChange = (repoFullName: string, setting: keyof AlertSettings[string], value: boolean) => {
    if (!user) return;
    const newSettings = { ...alertSettings };
    if (!newSettings[repoFullName]) {
      newSettings[repoFullName] = {};
    }
    (newSettings[repoFullName] as any)[setting] = value;
    setAlertSettings(newSettings);
    chrome.storage.local.set({ [`alertsConfig_${user.login}`]: newSettings });
  };

  const handleFrequencyChange = (frequency: number) => {
    setAlertFrequency(frequency);
    chrome.storage.local.set({ alertFrequency: frequency });
    chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 1,
        periodInMinutes: frequency,
    });
  };

  const clearNotificationsForTab = useCallback((repo: string, tabKey: keyof ActiveNotifications[string] | (keyof ActiveNotifications[string])[]) => {
    const repoNotifications = activeNotifications[repo];
    if (!user || !repoNotifications) return;

    const keysToClear = Array.isArray(tabKey) ? tabKey : [tabKey];
    
    const needsClearing = keysToClear.some(key => {
        const category = repoNotifications[key];
        return Array.isArray(category) && category.length > 0;
    });

    if (!needsClearing) return;

    const newNotifications = { ...activeNotifications };
    const newRepoNotifications = { ...newNotifications[repo] };

    keysToClear.forEach(key => {
      delete newRepoNotifications[key];
    });

    if (Object.keys(newRepoNotifications).length === 0) {
      delete newNotifications[repo];
    } else {
      newNotifications[repo] = newRepoNotifications;
    }
    
    setActiveNotifications(newNotifications);
    
    chrome.storage.local.set({ [`notifications_${user.login}`]: newNotifications });

    let newTotalCount = 0;
    Object.values(newNotifications).forEach(repoNots => {
      if (repoNots) {
        Object.values(repoNots).forEach(notArray => {
          if (Array.isArray(notArray)) {
            newTotalCount += notArray.length;
          }
        });
      }
    });

    if (newTotalCount > 0) {
      chrome.action.setBadgeText({ text: `+${newTotalCount}` });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }

  }, [activeNotifications, user]);
  
  const fetchDataForTab = useCallback(() => {
    if (!selectedRepo) return;

    setIsContentLoading(true);
    let message: any = { repoFullName: selectedRepo };
    if (activeTab !== 'README') {
      message.page = currentPage;
    }
    
    let messageType = '';

    switch(activeTab) {
      case 'README': messageType = 'getReadme'; break;
      case 'Commits': messageType = 'getCommits'; break;
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

  const handleRefresh = useCallback(() => {
    fetchDataForTab();
  }, [fetchDataForTab]);

  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    setCurrentPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedRepo) {
        const notificationMap: { [key in Tab]?: (keyof ActiveNotifications[string])[] } = {
            'Issues': ['issues'],
            'PRs': ['newPRs', 'assignedPRs'],
            'Actions': ['actions'],
            'Releases': ['newReleases']
        };
        const keysToClear = notificationMap[activeTab];
        
        if (keysToClear) {
          clearNotificationsForTab(selectedRepo, keysToClear);
        }
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [activeTab, selectedRepo, clearNotificationsForTab]);

  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'local' || !user?.login) {
        return;
      }
      const notificationsKey = `notifications_${user.login}`;

      if (changes[notificationsKey]) {
        console.log('Actualizando estado global de notificaciones...');
        const newNotifications = changes[notificationsKey].newValue || {};
        setActiveNotifications(newNotifications);

        console.log('Refrescando contenido de la vista activa...');
        handleRefresh();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [user, handleRefresh]);


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
    alertSettings,
    activeNotifications,
    alertFrequency,
    handleAlertSettingsChange,
    handleFrequencyChange,
  };
}