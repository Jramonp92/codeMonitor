import React, { useState, useEffect } from 'react';
import './App.css'; 

// --- Interfaces ---
interface Repo { id: number; name: string; full_name: string; }
interface CommitInfo { sha: string; commit: { author: { name: string; date: string; }; message: string; }; html_url: string; }
interface IssueInfo { id: number; title: string; html_url: string; number: number; user: { login: string; }; created_at: string; }
interface PullRequestInfo extends IssueInfo {}
interface ActionInfo {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  html_url: string;
  created_at: string;
  actor: { login: string; };
}

type Tab = 'Commits' | 'Issues' | 'PRs' | 'Actions';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  
  const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('Commits');
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [issues, setIssues] = useState<IssueInfo[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestInfo[]>([]);
  const [actions, setActions] = useState<ActionInfo[]>([]);

  // Efectos para login y obtener repos
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'checkAuthStatus' }, (response) => {
      if (response?.loggedIn) setUser(response.user);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user) {
      chrome.runtime.sendMessage({ type: 'getRepositories' }, (response) => {
        if (response?.success) setRepos(response.repos);
      });
    }
  }, [user]);

  // Efecto que reacciona a los cambios de repositorio o de pestaña
  useEffect(() => {
    if (selectedRepo) {
      fetchDataForTab(activeTab);
    }
  }, [selectedRepo, activeTab]);

  const fetchDataForTab = (tab: Tab) => {
    setIsContentLoading(true);
    setCommits([]);
    setIssues([]);
    setPullRequests([]);
    setActions([]);

    let messageType;
    switch(tab) {
      case 'Commits': messageType = 'getCommits'; break;
      case 'Issues': messageType = 'getIssues'; break;
      case 'PRs': messageType = 'getPullRequests'; break;
      case 'Actions': messageType = 'getActions'; break;
    }

    chrome.runtime.sendMessage({ type: messageType, repoFullName: selectedRepo }, (response) => {
      if (response?.success) {
        switch(tab) {
          case 'Commits': setCommits(response.commits || []); break;
          case 'Issues': setIssues(response.issues || []); break;
          case 'PRs': setPullRequests(response.pullRequests || []); break;
          case 'Actions': setActions(response.actions || []); break;
        }
      } else {
        console.error(`Error al obtener ${tab}:`, response?.error);
      }
      setIsContentLoading(false);
    });
  };
  
  const handleRepoSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRepo(event.target.value);
  };
  
  const handleLogin = () => {
    setIsLoading(true);
    chrome.runtime.sendMessage({ type: 'login' }, (response) => {
      if (response && response.success) {
        setUser(response.user);
      } else {
        console.error('Login failed:', response?.error);
      }
      setIsLoading(false);
    });
  };

  const handleLogout = () => {
    setRepos([]);
    setSelectedRepo('');
    setCommits([]);
    setIssues([]);
    setPullRequests([]);
    setActions([]);
    setIsLoading(true);
    chrome.runtime.sendMessage({ type: 'logout' }, () => {
      setUser(null);
      setIsLoading(false);
    });
  };

  const getStatusIcon = (status: ActionInfo['status'], conclusion: ActionInfo['conclusion']) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success': return '✅';
        case 'failure': return '❌';
        case 'cancelled': return '🚫';
        default: return '⚪️';
      }
    }
    if (status === 'in_progress') return '⏳';
    return '🕒'; // queued
  };

  // --- Componentes de renderizado ---
  const renderTabs = () => (
    <div className="tab-container">
      <button onClick={() => setActiveTab('Commits')} className={activeTab === 'Commits' ? 'active' : ''}>Commits</button>
      <button onClick={() => setActiveTab('Issues')} className={activeTab === 'Issues' ? 'active' : ''}>Issues</button>
      <button onClick={() => setActiveTab('PRs')} className={activeTab === 'PRs' ? 'active' : ''}>PRs</button>
      <button onClick={() => setActiveTab('Actions')} className={activeTab === 'Actions' ? 'active' : ''}>Actions</button>
    </div>
  );

  const renderContentForTab = () => {
    if (isContentLoading) return <p className="loading-text">Cargando...</p>;
    
    if (activeTab === 'Commits' && commits.length > 0) {
      return (
        <ul className="item-list">
          {commits.map((commitInfo) => (
            <li key={commitInfo.sha}>
              <a href={commitInfo.html_url} target="_blank" rel="noopener noreferrer">
                {commitInfo.commit.message.split('\n')[0]}
              </a>
              <p><strong>{commitInfo.commit.author.name}</strong> el {new Date(commitInfo.commit.author.date).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      );
    }

    if (activeTab === 'Issues' && issues.length > 0) {
      return (
        <ul className="item-list">
          {issues.map((issue) => (
            <li key={issue.id}>
              <a href={issue.html_url} target="_blank" rel="noopener noreferrer">
                #{issue.number} {issue.title}
              </a>
              <p>Abierto por <strong>{issue.user.login}</strong> el {new Date(issue.created_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      );
    }
    
    if (activeTab === 'PRs' && pullRequests.length > 0) {
      return (
        <ul className="item-list">
          {pullRequests.map((pr) => (
            <li key={pr.id}>
              <a href={pr.html_url} target="_blank" rel="noopener noreferrer">
                #{pr.number} {pr.title}
              </a>
              <p>Abierto por <strong>{pr.user.login}</strong> el {new Date(pr.created_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      );
    }

    if (activeTab === 'Actions' && actions.length > 0) {
      return (
        <ul className="item-list">
          {actions.map((action) => (
            <li key={action.id}>
              <a href={action.html_url} target="_blank" rel="noopener noreferrer">
                {getStatusIcon(action.status, action.conclusion)} {action.name}
              </a>
              <p>Iniciado por <strong>{action.actor.login}</strong> el {new Date(action.created_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      );
    }
    if(selectedRepo) return <p className="loading-text">No se encontraron datos para esta pestaña.</p>;
    return null;
  };

  const renderLoggedInView = () => (
    <div>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
        <img src={user.avatar_url} alt="User Avatar" width="40" style={{ borderRadius: '50%' }} />
        <p>¡Bienvenido, {user.login}!</p>
      </div>
      <div className="select-container">
        <select id="repo-select" value={selectedRepo} onChange={handleRepoSelect}>
          <option value="">-- Selecciona un Repositorio --</option>
          {repos.map(repo => (
            <option key={repo.id} value={repo.full_name}>{repo.name}</option>
          ))}
        </select>
      </div>
      
      {selectedRepo && renderTabs()}

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