import React, { useState, useEffect } from 'react';
import './App.css'; 

// --- Interfaces ---
interface Repo { id: number; name: string; full_name: string; }
interface CommitInfo { sha: string; commit: { author: { name: string; date: string; }; message: string; }; html_url: string; }

interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

interface IssueInfo {
  id: number;
  title: string;
  html_url: string;
  number: number;
  user: GitHubUser;
  created_at: string;
  state: 'open' | 'closed'; 
  assignees: GitHubUser[];
  pull_request?: object;
}

interface PullRequestInfo extends IssueInfo {
  draft: boolean;
  merged_at: string | null;
}

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
type IssueState = 'open' | 'closed' | 'all';
type PRState = 'all' | 'open' | 'closed' | 'draft' | 'merged' | 'assigned_to_me';

// --- Componente de estado mejorado ---
const ItemStatus: React.FC<{ item: IssueInfo | PullRequestInfo }> = ({ item }) => {
  let backgroundColor = '';
  let text = '';

  // La propiedad 'draft' solo existe en los PRs, es una buena forma de diferenciarlos.
  const isPR = 'draft' in item;

  if (isPR) {
    const pr = item as PullRequestInfo;
    if (pr.merged_at) {
      backgroundColor = '#6f42c1'; // Morado para Merged
      text = 'Merged';
    } else if (pr.draft) {
      backgroundColor = '#6a737d'; // Gris para Draft
      text = 'Draft';
    } else if (pr.state === 'open') {
      backgroundColor = '#28a745'; // Verde para Open
      text = 'Open';
    } else { // Si está cerrado pero no 'merged'
      backgroundColor = '#d73a49'; // Rojo para Closed
      text = 'Closed';
    }
  } else {
    // Es un Issue normal
    backgroundColor = item.state === 'open' ? '#28a745' : '#d73a49';
    text = item.state;
  }

  const style = {
    display: 'inline-block',
    padding: '2px 8px',
    marginLeft: '8px',
    borderRadius: '12px',
    fontSize: '0.75em',
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'capitalize' as 'capitalize',
    backgroundColor,
  };

  return <span style={style}>{text}</span>;
};


function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  
  const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('Commits');
  const [issueStateFilter, setIssueStateFilter] = useState<IssueState>('all');
  const [prStateFilter, setPrStateFilter] = useState<PRState>('all');

  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [issues, setIssues] = useState<IssueInfo[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestInfo[]>([]);
  const [actions, setActions] = useState<ActionInfo[]>([]);

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

  // Efecto que pide datos (ahora también escucha cambios en prStateFilter)
  useEffect(() => {
    if (selectedRepo) {
      fetchDataForTab(activeTab);
    } else {
      setCommits([]); setIssues([]); setPullRequests([]); setActions([]);
    }
  }, [selectedRepo, activeTab, issueStateFilter, prStateFilter]);

  // Función central para pedir datos al background script (actualizada para PRs)
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
        if (prStateFilter === 'draft' || prStateFilter === 'open') {
          payload.state = 'open';
        } else if (prStateFilter === 'merged' || prStateFilter === 'closed') {
          payload.state = 'closed';
        } else if (prStateFilter === 'assigned_to_me') {
          payload.state = 'assigned_to_me';
        } else {
          payload.state = 'all'; 
        }
        break;
      case 'Actions': messageType = 'getActions'; break;
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
            if (prStateFilter === 'draft') {
              prs = prs.filter((pr: PullRequestInfo) => pr.draft);
            } else if (prStateFilter === 'open') {
              prs = prs.filter((pr: PullRequestInfo) => !pr.draft);
            } else if (prStateFilter === 'merged') {
              prs = prs.filter((pr: PullRequestInfo) => pr.merged_at !== null);
            } else if (prStateFilter === 'closed') {
              prs = prs.filter((pr: PullRequestInfo) => pr.merged_at === null);
            }
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
    setRepos([]); setSelectedRepo(''); setCommits([]);
    setIssues([]); setPullRequests([]); setActions([]);
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
    return '�';
  };

  const renderTabs = () => (
    <div className="tab-container">
      <button onClick={() => setActiveTab('Commits')} className={activeTab === 'Commits' ? 'active' : ''}>Commits</button>
      <button onClick={() => setActiveTab('Issues')} className={activeTab === 'Issues' ? 'active' : ''}>Issues</button>
      <button onClick={() => setActiveTab('PRs')} className={activeTab === 'PRs' ? 'active' : ''}>PRs</button>
      <button onClick={() => setActiveTab('Actions')} className={activeTab === 'Actions' ? 'active' : ''}>Actions</button>
    </div>
  );
  
  const renderIssueFilters = () => {
    if (activeTab !== 'Issues') return null;
    return (
      <div className="filter-container">
        {(['all', 'open', 'closed'] as IssueState[]).map(state => (
          <label key={state}>
            <input type="radio" name="issueState" value={state} checked={issueStateFilter === state} onChange={(e) => setIssueStateFilter(e.target.value as IssueState)} />
            {state.charAt(0).toUpperCase() + state.slice(1)}
          </label>
        ))}
      </div>
    );
  };

  const renderPrFilters = () => {
    if (activeTab !== 'PRs') return null;
    return (
      <div className="filter-container">
        {(['all', 'open', 'closed', 'draft', 'merged', 'assigned_to_me'] as PRState[]).map(state => (
          <label key={state}>
            <input 
              type="radio" 
              name="prState" 
              value={state}
              checked={prStateFilter === state}
              onChange={(e) => setPrStateFilter(e.target.value as PRState)}
            />
            {state === 'assigned_to_me' ? 'Asignados a mi' : state.charAt(0).toUpperCase() + state.slice(1)}
          </label>
        ))}
      </div>
    );
  }

  // Renderiza el contenido de la pestaña activa
  const renderContentForTab = () => {
    if (isContentLoading) return <p className="loading-text">Cargando...</p>;
    
    const renderItemList = (items: (IssueInfo | PullRequestInfo)[]) => (
      <ul className="item-list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="item-title-container">
              <a href={item.html_url} target="_blank" rel="noopener noreferrer">
                #{item.number} {item.title}
              </a>
              <ItemStatus item={item} />
            </div>
            <div className="item-meta">
              <span>Creado por <strong>{item.user.login}</strong></span>
              {item.assignees.length > 0 && (
                <div className="assignee-info">
                  <span>Asignado a:</span>
                  {item.assignees.map(assignee => (
                    <a key={assignee.login} href={assignee.html_url} target="_blank" rel="noopener noreferrer" title={assignee.login}>
                      <img src={assignee.avatar_url} alt={`Avatar de ${assignee.login}`} className="assignee-avatar" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    );

    if (activeTab === 'Commits') {
      if (commits.length > 0) return (
        <ul className="item-list">
          {commits.map((c) => (<li key={c.sha}><a href={c.html_url} target="_blank" rel="noopener noreferrer">{c.commit.message.split('\n')[0]}</a><p className="item-meta"><strong>{c.commit.author.name}</strong></p></li>))}
        </ul>
      );
    }
    if (activeTab === 'Issues' && issues.length > 0) return renderItemList(issues);
    if (activeTab === 'PRs' && pullRequests.length > 0) return renderItemList(pullRequests);
    if (activeTab === 'Actions' && actions.length > 0) {
      return (
        <ul className="item-list">
          {actions.map((action) => (<li key={action.id}><a href={action.html_url} target="_blank" rel="noopener noreferrer">{getStatusIcon(action.status, action.conclusion)} {action.name}</a><p className="item-meta">Iniciado por <strong>{action.actor.login}</strong></p></li>))}
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
      {selectedRepo && renderIssueFilters()} 
      {selectedRepo && renderPrFilters()}

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