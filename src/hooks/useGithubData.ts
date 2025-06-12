import { useState, useEffect } from 'react';

// Importamos los tipos que definimos en App.tsx
// En un proyecto más grande, estos tipos vivirían en su propio archivo (ej. types.ts)
import type { Tab, IssueState, PRState, ActionStatus, Repo, CommitInfo, IssueInfo, PullRequestInfo, ActionInfo } from '../App';

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

  // Efecto que pide datos cada vez que cambia una dependencia
  useEffect(() => {
    if (selectedRepo) {
      fetchDataForTab(activeTab);
    } else {
      // Limpia todo si no hay repo seleccionado
      setCommits([]); setIssues([]); setPullRequests([]); setActions([]);
    }
  }, [selectedRepo, activeTab, issueStateFilter, prStateFilter, actionStatusFilter]);

  const fetchDataForTab = (tab: Tab) => {
    setIsContentLoading(true);
    setCommits([]); setIssues([]); setPullRequests([]); setActions([]);

    let messageType: string = '';
    let payload: any = { repoFullName: selectedRepo };

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
        switch(tab) {
          case 'Commits': setCommits(response.commits || []); break;
          case 'Issues': 
            const onlyIssues = response.issues?.filter((item: IssueInfo) => !item.pull_request) || [];
            setIssues(onlyIssues);
            break;
          case 'PRs': 
            let prs = response.pullRequests || [];
            if (prStateFilter === 'draft') prs = prs.filter((pr: PullRequestInfo) => pr.draft);
            else if (prStateFilter === 'open') prs = prs.filter((pr: PullRequestInfo) => !pr.draft);
            else if (prStateFilter === 'merged') prs = prs.filter((pr: PullRequestInfo) => pr.merged_at !== null);
            else if (prStateFilter === 'closed') prs = prs.filter((pr: PullRequestInfo) => pr.merged_at === null);
            setPullRequests(prs);
            break;
          case 'Actions': setActions(response.actions || []); break;
        }
      } else {
        console.error(`Error al obtener ${tab}:`, response?.error);
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
    fetchDataForTab,
  };
}
