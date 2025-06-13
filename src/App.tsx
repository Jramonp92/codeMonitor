import { useState, useEffect } from 'react'; // <-- CAMBIO 1: 'React' eliminado
import './App.css'; 
import { useGithubData } from './hooks/useGithubData';
// Asumiendo que estos componentes existen y están correctamente importados
import { ItemStatus } from './components/ItemStatus'; 
import { FilterBar } from './components/FilterBar';
import { Pagination } from './components/Pagination';
import { SearchableRepoDropdown } from './components/SearchableRepoDropdown';
import type { Tab, IssueInfo, PullRequestInfo, ActionInfo, CommitInfo, ReleaseInfo } from './hooks/useGithubData'; // <-- CAMBIO 2: 'Repo' eliminado

// --- Componente Principal de la App ---

function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  
  const {
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
    totalPages,
  } = useGithubData();


  // Efecto para verificar la sesión al inicio
  useEffect(() => {
    if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'checkAuthStatus' }, (response) => {
          if (response?.loggedIn) setUser(response.user);
          setIsAppLoading(false);
        });
    } else {
        // Mock para desarrollo fuera de la extensión
        // setUser({ login: 'test-user', avatar_url: 'https://placehold.co/40x40' });
        setIsAppLoading(false);
    }
  }, []);

  // Efecto para obtener los repositorios cuando el usuario se loguea
  useEffect(() => {
    // Usamos el hook useGithubData que ya tiene esta lógica de carga local/remota
    // por lo que no es necesario duplicarla aquí.
    if (user && repos.length === 0) { // Solo busca si no hay repos cargados
        if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'getRepositories' }, (response) => {
                if (response?.success) setRepos(response.repos);
            });
        }
    }
  }, [user, repos.length, setRepos]);
  
  // --- Manejadores de eventos ---

  const handleRepoSelection = (repoFullName: string) => {
    setActiveTab('Commits'); // Resetea la pestaña al seleccionar nuevo repo
    setCurrentPage(1);    // Resetea la página también
    setSelectedRepo(repoFullName);
  };
  
  const handleLogin = () => {
    setIsAppLoading(true);
    if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'login' }, (response) => {
          if (response && response.success) {
            // Recargar la ventana para que el hook useGithubData se reinicie
            window.location.reload();
          }
          else {
            console.error('Login failed:', response?.error);
            setIsAppLoading(false);
          }
        });
    }
  };

  const handleLogout = () => {
    if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'logout' }, () => {
          // Recargar la ventana para limpiar todo el estado
          window.location.reload();
        });
    } else {
        setUser(null);
        setRepos([]);
        setSelectedRepo('');
    }
  };
  
  // --- Renderizado de la UI ---
  if (isAppLoading) {
    return (
      <div className="app-container">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container">
        <h1>Repo Observer</h1>
        <button onClick={handleLogin}>Iniciar Sesión con GitHub</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
        <img src={user.avatar_url} alt="User Avatar" width="40" style={{ borderRadius: '50%' }} />
        <p>¡Bienvenido, {user.login}!</p>
      </div>
      <div className="select-container">
        <SearchableRepoDropdown
            repos={repos}
            selectedRepo={selectedRepo}
            onSelect={handleRepoSelection}
            disabled={!user || repos.length === 0}
        />
        <button onClick={() => setCurrentPage(1)} className="refresh-button" title="Refrescar datos" disabled={!selectedRepo || isContentLoading}>
          🔄
        </button>
      </div>
      
      {selectedRepo && (
        <>
          <div className="tab-container">
            {(['Commits', 'Issues', 'PRs', 'Actions', 'Releases'] as Tab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'active' : ''}>{tab}</button>
            ))}
          </div>
          {activeTab === 'Issues' && <FilterBar name="Issues" filters={[{label: 'All', value: 'all'}, {label: 'Open', value: 'open'}, {label: 'Closed', value: 'closed'}]} currentFilter={issueStateFilter} onFilterChange={setIssueStateFilter} />}
          {activeTab === 'PRs' && <FilterBar name="PRs" filters={[{label: 'All', value: 'all'}, {label: 'Open', value: 'open'}, {label: 'Closed', value: 'closed'}, {label: 'Draft', value: 'draft'}, {label: 'Merged', value: 'merged'}, {label: 'Asignados a mi', value: 'assigned_to_me'}]} currentFilter={prStateFilter} onFilterChange={setPrStateFilter} />}
          {activeTab === 'Actions' && <FilterBar name="Actions" filters={[{ label: 'All', value: 'all' }, { label: 'Success', value: 'success' }, { label: 'Failure', value: 'failure' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Queued', value: 'queued' }, { label: 'Waiting', value: 'waiting' }, { label: 'Cancelled', value: 'cancelled' }]} currentFilter={actionStatusFilter} onFilterChange={setActionStatusFilter} />}
        </>
      )}

      <ContentDisplay 
        activeTab={activeTab}
        isContentLoading={isContentLoading}
        selectedRepo={selectedRepo}
        commits={commits}
        issues={issues}
        pullRequests={pullRequests}
        actions={actions}
        releases={releases}
      />
      
      {selectedRepo && !isContentLoading && (commits.length > 0 || issues.length > 0 || pullRequests.length > 0 || actions.length > 0 || releases.length > 0) && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      <button onClick={handleLogout} style={{ marginTop: '1.5rem' }}>Cerrar Sesión</button>
    </div>
  );
}

// El componente ContentDisplay se mantiene igual
const ContentDisplay = ({ activeTab, isContentLoading, selectedRepo, commits, issues, pullRequests, actions, releases } : any) => {
  if (isContentLoading) return <p className="loading-text">Cargando...</p>;
    
  const renderItemList = (items: (IssueInfo | PullRequestInfo)[]) => (
    <ul className="item-list">
      {items.map((item) => (
        <li key={item.id}>
            <div className="item-title-container">
                <a href={item.html_url} target="_blank" rel="noopener noreferrer">#{item.number} {item.title}</a>
                <ItemStatus item={item} />
            </div>
            <div className="item-meta">
                <span>Creado por <strong>{item.user.login}</strong></span>
                {item.assignees && item.assignees.length > 0 && (
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

  const getStatusIcon = (status: ActionInfo['status'], conclusion: ActionInfo['conclusion']) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success': return '✅'; case 'failure': return '❌';
        case 'cancelled': return '🚫'; default: return '⚪️';
      }
    }
    if (status === 'in_progress') return '⏳'; return '🕒';
  };

  if (activeTab === 'Commits' && commits.length > 0) {
    return (<ul className="item-list">{commits.map((c: CommitInfo) => (<li key={c.sha}><a href={c.html_url} target="_blank" rel="noopener noreferrer">{c.commit.message.split('\n')[0]}</a><p className="item-meta"><strong>{c.commit.author.name}</strong></p></li>))}</ul>);
  }
  if (activeTab === 'Issues' && issues.length > 0) return renderItemList(issues);
  if (activeTab === 'PRs' && pullRequests.length > 0) return renderItemList(pullRequests);
  if (activeTab === 'Actions' && actions.length > 0) {
    return (<ul className="item-list">{actions.map((action: ActionInfo) => (<li key={action.id}><a href={action.html_url} target="_blank" rel="noopener noreferrer">{getStatusIcon(action.status, action.conclusion)} {action.name}</a><div className="action-meta"><span>Iniciado por <strong>{action.actor.login}</strong></span>{action.pull_requests.length > 0 && (<a href={action.pull_requests[0].html_url} target="_blank" rel="noopener noreferrer" className="pr-link">(PR #{action.pull_requests[0].number})</a>)}</div></li>))}</ul>);
  }
  
  if (activeTab === 'Releases' && releases.length > 0) {
    return (
      <ul className="item-list">
        {releases.map((release: ReleaseInfo) => (
          <li key={release.id}>
            <a href={release.html_url} target="_blank" rel="noopener noreferrer">
              {release.name || release.tag_name}
            </a>
            <div className="item-meta">
              <span>
                Publicado por <strong>{release.author.login}</strong>
              </span>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {new Date(release.published_at).toLocaleDateString()}
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  }
    
  if(selectedRepo) return <p className="loading-text">No se encontraron datos para esta pestaña.</p>;
  return null;
}

export default App;