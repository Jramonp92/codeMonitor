import React, { useState, useEffect } from 'react';
import './App.css'; 
import { useGithubData } from './hooks/useGithubData';
import { StatusPill } from './components/StatusPill';
import { FilterBar } from './components/FilterBar';

// --- Interfaces (se mantienen aquí por ahora) ---
export interface Repo { id: number; name: string; full_name: string; }
export interface CommitInfo { sha: string; commit: { author: { name: string; date: string; }; message: string; }; html_url: string; }
export interface GitHubUser { login: string; avatar_url: string; html_url: string; }
export interface IssueInfo { id: number; title: string; html_url: string; number: number; user: GitHubUser; created_at: string; state: 'open' | 'closed'; assignees: GitHubUser[]; pull_request?: object; }
export interface PullRequestInfo extends IssueInfo { draft: boolean; merged_at: string | null; }
export interface ActionInfo { id: number; name: string; status: 'queued' | 'in_progress' | 'completed' | 'waiting'; conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null; html_url: string; created_at: string; actor: { login: string; }; pull_requests: { html_url: string; number: number; }[]; }

export type Tab = 'Commits' | 'Issues' | 'PRs' | 'Actions';
export type IssueState = 'open' | 'closed' | 'all';
export type PRState = 'all' | 'open' | 'closed' | 'draft' | 'merged' | 'assigned_to_me';
export type ActionStatus = 'all' | 'success' | 'failure' | 'in_progress' | 'queued' | 'waiting' | 'cancelled';


function App() {
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    user, setUser,
    repos, setRepos,
    selectedRepo, setSelectedRepo,
    isContentLoading,
    activeTab, setActiveTab,
    issueStateFilter, setIssueStateFilter,
    prStateFilter, setPrStateFilter,
    actionStatusFilter, setActionStatusFilter,
    commits, issues, pullRequests, actions,
    fetchDataForTab
  } = useGithubData();


  // Efecto para verificar la sesión al inicio
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'checkAuthStatus' }, (response) => {
      if (response?.loggedIn) setUser(response.user);
      setIsLoading(false);
    });
  }, []);

  // Efecto para obtener los repositorios cuando el usuario se loguea
  useEffect(() => {
    if (user) {
      chrome.runtime.sendMessage({ type: 'getRepositories' }, (response) => {
        if (response?.success) setRepos(response.repos);
      });
    }
  }, [user]);
  
  // --- Manejadores de eventos ---
  const handleRepoSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveTab('Commits');
    setSelectedRepo(event.target.value);
  };
  
  const handleLogin = () => {
    setIsLoading(true);
    chrome.runtime.sendMessage({ type: 'login' }, (response) => {
      if (response && response.success) setUser(response.user);
      else console.error('Login failed:', response?.error);
      setIsLoading(false);
    });
  };

  const handleLogout = () => {
    setRepos([]); setSelectedRepo('');
    setIsLoading(true);
    chrome.runtime.sendMessage({ type: 'logout' }, () => {
      setUser(null);
      setIsLoading(false);
    });
  };
  
  const handleRefresh = () => {
    if (selectedRepo) fetchDataForTab(activeTab);
  };

  // --- Componentes de renderizado ---

  const getStatusIcon = (status: ActionInfo['status'], conclusion: ActionInfo['conclusion']) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success': return '✅'; case 'failure': return '❌';
        case 'cancelled': return '🚫'; default: return '⚪️';
      }
    }
    if (status === 'in_progress') return '⏳';
    return '🕒';
  };
  
  const renderContentForTab = () => {
    if (isContentLoading) return <p className="loading-text">Cargando...</p>;
    
    const renderItemList = (items: (IssueInfo | PullRequestInfo)[]) => (
      <ul className="item-list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="item-title-container"><a href={item.html_url} target="_blank" rel="noopener noreferrer">#{item.number} {item.title}</a><StatusPill item={item} /></div>
            <div className="item-meta"><span>Creado por <strong>{item.user.login}</strong></span>{item.assignees.length > 0 && (<div className="assignee-info"><span>Asignado a:</span>{item.assignees.map(assignee => (<a key={assignee.login} href={assignee.html_url} target="_blank" rel="noopener noreferrer" title={assignee.login}><img src={assignee.avatar_url} alt={`Avatar de ${assignee.login}`} className="assignee-avatar" /></a>))}</div>)}</div>
          </li>
        ))}
      </ul>
    );

    if (activeTab === 'Commits' && commits.length > 0) return (<ul className="item-list">{commits.map((c) => (<li key={c.sha}><a href={c.html_url} target="_blank" rel="noopener noreferrer">{c.commit.message.split('\n')[0]}</a><p className="item-meta"><strong>{c.commit.author.name}</strong></p></li>))}</ul>);
    if (activeTab === 'Issues' && issues.length > 0) return renderItemList(issues);
    if (activeTab === 'PRs' && pullRequests.length > 0) return renderItemList(pullRequests);
    if (activeTab === 'Actions' && actions.length > 0) {
      return (<ul className="item-list">{actions.map((action) => (<li key={action.id}><a href={action.html_url} target="_blank" rel="noopener noreferrer">{getStatusIcon(action.status, action.conclusion)} {action.name}</a><div className="action-meta"><span>Iniciado por <strong>{action.actor.login}</strong></span>{action.pull_requests.length > 0 && (<a href={action.pull_requests[0].html_url} target="_blank" rel="noopener noreferrer" className="pr-link">(PR #{action.pull_requests[0].number})</a>)}</div></li>))}</ul>);
    }
    
    if(selectedRepo) return <p className="loading-text">No se encontraron datos para esta pestaña.</p>;
    return null;
  };

  const renderLoggedInView = () => (
    <div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><img src={user.avatar_url} alt="User Avatar" width="40" style={{ borderRadius: '50%' }} /><p>¡Bienvenido, {user.login}!</p></div>
      <div className="select-container">
        <select id="repo-select" value={selectedRepo} onChange={handleRepoSelect}><option value="">-- Selecciona un Repositorio --</option>{repos.map(repo => (<option key={repo.id} value={repo.full_name}>{repo.name}</option>))}</select>
        <button onClick={handleRefresh} className="refresh-button" title="Refrescar datos" disabled={!selectedRepo || isContentLoading}>🔄</button>
      </div>
      
      {selectedRepo && (
        <>
          <div className="tab-container">
            {(['Commits', 'Issues', 'PRs', 'Actions'] as Tab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'active' : ''}>{tab}</button>
            ))}
          </div>
          <FilterBar activeTab={activeTab.toString()} name="Issues" filters={[{label: 'All', value: 'all'}, {label: 'Open', value: 'open'}, {label: 'Closed', value: 'closed'}]} currentFilter={issueStateFilter} onFilterChange={setIssueStateFilter} />
          <FilterBar activeTab={activeTab.toString()} name="PRs" filters={[{label: 'All', value: 'all'}, {label: 'Open', value: 'open'}, {label: 'Closed', value: 'closed'}, {label: 'Draft', value: 'draft'}, {label: 'Merged', value: 'merged'}, {label: 'Asignados a mi', value: 'assigned_to_me'}]} currentFilter={prStateFilter} onFilterChange={setPrStateFilter} />
          <FilterBar activeTab={activeTab.toString()} name="Actions" filters={[{ label: 'All', value: 'all' }, { label: 'Success', value: 'success' }, { label: 'Failure', value: 'failure' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Queued', value: 'queued' }, { label: 'Waiting', value: 'waiting' }, { label: 'Cancelled', value: 'cancelled' }]} currentFilter={actionStatusFilter} onFilterChange={setActionStatusFilter} />
        </>
      )}

      <div className="content-area">{renderContentForTab()}</div>
      <button onClick={handleLogout} style={{ marginTop: '1.5rem' }}>Cerrar Sesión</button>
    </div>
  );

  return (
    <div className="app-container">
      <h1>Repo Observer</h1>
      {isLoading ? <p>Cargando...</p> : user ? renderLoggedInView() : <button onClick={handleLogin}>Iniciar Sesión con GitHub</button>}
    </div>
  );
}

export default App;