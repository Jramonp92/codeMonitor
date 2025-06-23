// src/hooks/useGithubData.ts

import { useState, useEffect, useCallback } from 'react';
import type { AlertSettings, ActiveNotifications } from '../background/alarms';

export type TabKey = 'README' | 'Code' | 'Commits' | 'Issues' | 'PRs' | 'Actions' | 'Releases';
export type Tab = 'README' | 'Code' | 'Commits' | 'Issues' | 'PRs' | 'Actions'| 'Releases';

export interface DirectoryContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha: string;
}

export interface ViewedFile {
  path: string;
  content: string;
}

export interface TrackedFile {
  path: string;
  branch: string;
}

export type TabVisibility = Record<TabKey, boolean>;

export interface Branch { name: string; }
export type { IssueState, PRState, ActionStatus, IssueInfo, PullRequestInfo, ActionInfo, CommitInfo, ReleaseInfo, Repo };

type IssueState = 'open' | 'closed' | 'all';
type PRState = 'all' | 'open' | 'closed' | 'merged' | 'assigned_to_me';
type ActionStatus = 'all' | 'success' | 'failure' | 'in_progress' | 'queued' | 'waiting' | 'cancelled';

interface Repo { id: number; name: string; full_name: string; private: boolean; owner: { login: string; }; default_branch: string; }

interface CommitInfo { sha: string; html_url: string; commit: { author: { name: string; date: string; }; message: string; }; author: { login: string; avatar_url: string; html_url: string; } | null; }
export interface GitHubUser { login: string; avatar_url: string; html_url: string; }
interface IssueInfo { id: number; title: string; html_url: string; number: number; user: GitHubUser; created_at: string; closed_at: string | null; state: 'open' | 'closed'; assignees: GitHubUser[]; pull_request?: object; }
interface PullRequestInfo extends IssueInfo { merged_at: string | null; }
interface ActionInfo { id: number; name: string; status: 'queued' | 'in_progress' | 'completed' | 'waiting'; conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null; html_url: string; created_at: string; run_number: number; event: string; head_branch: string; actor: { login: string; avatar_url: string; }; pull_requests: { html_url: string; number: number; }[]; }
interface ReleaseInfo { id: number; name: string; tag_name: string; html_url: string; author: { login: string; avatar_url: string; html_url: string; }; published_at: string; prerelease: boolean; }

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
  const [alertFrequency, setAlertFrequency] = useState<number>(10);
  
  const [tabVisibility, setTabVisibility] = useState<TabVisibility>({
    README: true,
    Code: true, 
    Commits: true,
    Issues: true,
    PRs: true,
    Actions: true,
    Releases: true,
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [areBranchesLoading, setAreBranchesLoading] = useState<boolean>(false);

  const [currentPath, setCurrentPath] = useState('');
  const [directoryContent, setDirectoryContent] = useState<DirectoryContentItem[]>([]);
  const [viewedFile, setViewedFile] = useState<ViewedFile | null>(null);
  
  const [trackedFiles, setTrackedFiles] = useState<{ [repoFullName: string]: TrackedFile[] }>({});

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'checkAuthStatus' }, (response) => {
      if (response?.loggedIn && response.user) {
        const currentUser = response.user;
        setUser(currentUser);
        
        const userReposKey = `userRepos_${currentUser.login}`;
        const alertsConfigKey = `alertsConfig_${currentUser.login}`;
        const notificationsKey = `notifications_${currentUser.login}`;
        const frequencyKey = 'alertFrequency';
        const trackedFilesKey = `trackedFiles_${currentUser.login}`;
        const storageKeys = [userReposKey, alertsConfigKey, notificationsKey, frequencyKey, 'tabVisibility', trackedFilesKey];

        chrome.storage.local.get(storageKeys, (result) => {
          if (result[userReposKey]) setManagedRepos(result[userReposKey]);
          if (result[alertsConfigKey]) setAlertSettings(result[alertsConfigKey]);
          if (result[notificationsKey]) setActiveNotifications(result[notificationsKey]);
          if (result[frequencyKey]) setAlertFrequency(result[frequencyKey]);
          if (result.tabVisibility) setTabVisibility(result.tabVisibility);
          if (result[trackedFilesKey]) setTrackedFiles(result[trackedFilesKey]);
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
  
  const fetchBranchesForRepo = useCallback(() => {
    if (selectedRepo) {
      setAreBranchesLoading(true);
      chrome.runtime.sendMessage({ type: 'getBranches', repoFullName: selectedRepo }, (response) => {
        if (response?.success) {
          setBranches(response.data || []);
        } else {
          console.error(`Error fetching branches for ${selectedRepo}:`, response?.error);
          setBranches([]);
        }
        setAreBranchesLoading(false);
      });
    } else {
      setBranches([]);
      setSelectedBranch('');
    }
  }, [selectedRepo]);


  useEffect(() => {
    if (selectedRepo) {
      const currentRepo = managedRepos.find(repo => repo.full_name === selectedRepo);
      if (currentRepo?.default_branch) {
        setSelectedBranch(currentRepo.default_branch);
      }
      setCurrentPath('');
      setViewedFile(null);
    }
  }, [selectedRepo, managedRepos]);
  
  useEffect(() => {
    fetchBranchesForRepo();
  }, [fetchBranchesForRepo]); 
  
  const handleTabVisibilityChange = useCallback((tab: TabKey, isVisible: boolean) => {
    const newVisibility = { ...tabVisibility, [tab]: isVisible };
    setTabVisibility(newVisibility);
    chrome.storage.local.set({ tabVisibility: newVisibility });

    if (!isVisible && activeTab === tab) {
      const tabOrder: TabKey[] = ['README', 'Code', 'Commits', 'Issues', 'PRs', 'Actions', 'Releases'];
      const fallbackTab = tabOrder.find(t => newVisibility[t]);
      
      if (fallbackTab) {
        setActiveTab(fallbackTab);
        setCurrentPage(1);
      }
    }
  }, [tabVisibility, activeTab]);

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
  
  const clearNotificationsForTab = useCallback((repo: string, tab: Tab) => {
    // --- INICIO DE CAMBIOS ---
    // 1. La limpieza de 'fileChanges' ya no se gestiona aquí para evitar el borrado prematuro.
    const notificationMap: { [key in Tab]?: (keyof ActiveNotifications[string])[] } = {
      'Issues': ['issues'],
      'PRs': ['newPRs', 'assignedPRs'],
      'Actions': ['actions'],
      'Releases': ['newReleases']
    };
    // --- FIN DE CAMBIOS ---
    const keysToClear = notificationMap[tab];
    
    if (!keysToClear || !user || !activeNotifications[repo]) return;

    const newNotifications = { ...activeNotifications };
    const newRepoNotifications = { ...newNotifications[repo] };
    let didClear = false;

    keysToClear.forEach(key => {
      if (newRepoNotifications[key] && newRepoNotifications[key]!.length > 0) {
        delete newRepoNotifications[key];
        didClear = true;
      }
    });

    if (!didClear) return;

    if (Object.keys(newRepoNotifications).length === 0) {
      delete newNotifications[repo];
    } else {
      newNotifications[repo] = newRepoNotifications;
    }
    
    setActiveNotifications(newNotifications);
    chrome.storage.local.set({ [`notifications_${user.login}`]: newNotifications });

    const newTotalCount = Object.values(newNotifications).flatMap(Object.values).flat().length;
    chrome.action.setBadgeText({ text: newTotalCount > 0 ? `+${newTotalCount}` : '' });
  }, [activeNotifications, user]);
  
  const handlePathChange = useCallback((newPath: string) => {
    setCurrentPath(newPath);
    setViewedFile(null);
  }, []);

  // --- INICIO DE CAMBIOS ---
  const clearSingleFileNotification = useCallback((repo: string, path: string, branch: string) => {
    if (!user || !activeNotifications[repo]?.fileChanges) return;

    const newNotifications = JSON.parse(JSON.stringify(activeNotifications));
    const repoFileChanges = newNotifications[repo].fileChanges || [];
    
    const initialCount = repoFileChanges.length;
    const updatedFileChanges = repoFileChanges.filter(
      (notif: any) => notif.path !== path || notif.branch !== branch
    );

    if (updatedFileChanges.length === initialCount) {
        return; // No se encontró ninguna notificación que limpiar
    }

    if (updatedFileChanges.length === 0) {
      delete newNotifications[repo].fileChanges;
    } else {
      newNotifications[repo].fileChanges = updatedFileChanges;
    }
    
    if (Object.keys(newNotifications[repo]).length === 0) {
      delete newNotifications[repo];
    }

    setActiveNotifications(newNotifications);
    chrome.storage.local.set({ [`notifications_${user.login}`]: newNotifications });

    let newTotalCount = 0;
    Object.values(newNotifications).forEach(repoNotifications => {
      if (repoNotifications) {
        Object.values(repoNotifications).forEach(notificationsArray => {
          if (Array.isArray(notificationsArray)) {
            newTotalCount += notificationsArray.length;
          }
        });
      }
    });

  }, [activeNotifications, user]);

  const handleFileSelect = useCallback((filePath: string) => {
    if (!selectedRepo || !selectedBranch) return;
    
    // 2. Limpiamos la notificación específica de este archivo al seleccionarlo.
    clearSingleFileNotification(selectedRepo, filePath, selectedBranch);
    
    setIsContentLoading(true);
    chrome.runtime.sendMessage({ type: 'getFileContent', repoFullName: selectedRepo, branch: selectedBranch, path: filePath }, (response) => {
      if (response.success) {
        setViewedFile({ path: filePath, content: response.data });
      } else {
        console.error(`Error fetching file ${filePath}:`, response.error);
        setViewedFile({ path: filePath, content: `Error: No se pudo cargar el archivo.` });
      }
      setIsContentLoading(false);
    });
  }, [selectedRepo, selectedBranch, clearSingleFileNotification]);
  // --- FIN DE CAMBIOS ---

  const fetchDataForTab = useCallback(() => {
    if (!selectedRepo || ((activeTab === 'Commits' || activeTab === 'Code') && !selectedBranch)) {
      return;
    }
    
    setIsContentLoading(true);
    let message: any = { repoFullName: selectedRepo };
    if (activeTab !== 'README' && activeTab !== 'Code') {
      message.page = currentPage;
    }
    
    let messageType = '';

    switch(activeTab) {
      case 'README': messageType = 'getReadme'; break;
      case 'Code':
        messageType = 'getDirectoryContent';
        message.branch = selectedBranch;
        message.path = currentPath;
        break;
      case 'Commits': 
        messageType = 'getCommits';
        message.branch = selectedBranch;
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
            if (activeTab === 'README') {
              setReadmeHtml(response.data || '');
            } else if (activeTab === 'Code') {
              setDirectoryContent(response.data || []);
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
            setDirectoryContent([]);
            setCommits([]); setIssues([]); setPullRequests([]); setActions([]); setReleases([]);
            setTotalPages(1); 
        }
        setIsContentLoading(false);
    });
  }, [selectedRepo, activeTab, currentPage, issueStateFilter, prStateFilter, actionStatusFilter, selectedBranch, currentPath]);

  useEffect(() => {
    fetchDataForTab();
  }, [fetchDataForTab]);

  const handleRefresh = useCallback(() => {
    if (activeTab === 'Code' && viewedFile) {
      handleFileSelect(viewedFile.path);
    } else {
      fetchDataForTab();
    }
    fetchBranchesForRepo();
  }, [activeTab, viewedFile, fetchDataForTab, fetchBranchesForRepo, handleFileSelect]);

  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    setCurrentPage(1);
    if (newTab !== 'Code') {
      setCurrentPath('');
      setViewedFile(null);
    }
  };

  const handleBranchChange = (newBranch: string) => {
    setSelectedBranch(newBranch);
    setCurrentPage(1);
    setCurrentPath('');
    setViewedFile(null);
  };

  useEffect(() => {
    // --- INICIO DE CAMBIOS ---
    // 4. Modificamos este useEffect para que no actúe en la pestaña 'Code'
    if (!selectedRepo || activeTab === 'Code') return;
    // --- FIN DE CAMBIOS ---

    const timer = setTimeout(() => {
      clearNotificationsForTab(selectedRepo, activeTab);
    }, 5000); 

    return () => {
      clearTimeout(timer);
    };
  }, [activeTab, selectedRepo, clearNotificationsForTab]);

  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'local' || !user?.login) return;
      const notificationsKey = `notifications_${user.login}`;
      if (changes[notificationsKey]) {
        setActiveNotifications(changes[notificationsKey].newValue || {});
        handleRefresh();
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
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

  const clearAllNotifications = useCallback(() => {
    if (!user) return;
    const notificationsKey = `notifications_${user.login}`;
    
    setActiveNotifications({});
    chrome.storage.local.set({ [notificationsKey]: {} });
    chrome.action.setBadgeText({ text: '' });
  }, [user]);

  const updateTrackedFiles = useCallback((newTrackedFiles: { [repoFullName: string]: TrackedFile[] }) => {
    if (!user?.login) return;
    setTrackedFiles(newTrackedFiles);
    chrome.storage.local.set({ [`trackedFiles_${user.login}`]: newTrackedFiles });
  }, [user]);

  const addTrackedFile = useCallback((repoFullName: string, path: string, branch: string) => {
    const newFile: TrackedFile = { path, branch };
    const repoFiles = trackedFiles[repoFullName] || [];
    
    if (repoFiles.some(f => f.path === path && f.branch === branch)) {
      return;
    }

    const newRepoFiles = [...repoFiles, newFile];
    const newTrackedFiles = { ...trackedFiles, [repoFullName]: newRepoFiles };
    updateTrackedFiles(newTrackedFiles);
  }, [trackedFiles, updateTrackedFiles]);

  const removeTrackedFile = useCallback((repoFullName: string, path: string, branch: string) => {
    const repoFiles = trackedFiles[repoFullName] || [];
    const newRepoFiles = repoFiles.filter(f => f.path !== path || f.branch !== branch);
    
    const newTrackedFiles = { ...trackedFiles, [repoFullName]: newRepoFiles };
    if (newRepoFiles.length === 0) {
      delete newTrackedFiles[repoFullName];
    }
    updateTrackedFiles(newTrackedFiles);
  }, [trackedFiles, updateTrackedFiles]);
  
  const isTracked = useCallback((repoFullName: string, path: string, branch: string) => {
    const repoFiles = trackedFiles[repoFullName] || [];
    return repoFiles.some(f => f.path === path && f.branch === branch);
  }, [trackedFiles]);

  return {
    user, allRepos, managedRepos, addRepoToManagedList, removeRepoFromManagedList,
    selectedRepo, setSelectedRepo, isContentLoading, activeTab, issueStateFilter,
    prStateFilter, actionStatusFilter, handleTabChange, handleIssueFilterChange,
    handlePrFilterChange, handleActionStatusChange, readmeHtml, commits, issues,
    pullRequests, actions, releases, currentPage, setCurrentPage, totalPages,
    handleRefresh, alertSettings, activeNotifications, alertFrequency,
    handleAlertSettingsChange, handleFrequencyChange,
    tabVisibility,
    handleTabVisibilityChange,
    branches,
    selectedBranch,
    areBranchesLoading,
    handleBranchChange,
    clearAllNotifications,
    currentPath,
    directoryContent,
    viewedFile,
    setViewedFile, 
    handlePathChange,
    handleFileSelect,
    trackedFiles,
    addTrackedFile,
    removeTrackedFile,
    isTracked,
  };
}