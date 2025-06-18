import { useState, useEffect } from 'react';
import './App.css'; 
import { useGithubData } from './hooks/useGithubData';
import { ItemStatus } from './components/ItemStatus'; 
import { FilterBar } from './components/FilterBar';
import { Pagination } from './components/Pagination';
import { SearchableRepoDropdown } from './components/SearchableRepoDropdown';
import { RepoManagerModal } from './components/RepoManagerModal';
import { AlertsManagerModal } from './components/AlertsManagerModal';

// --> CAMBIO: Se limpia la importación de tipos para que cada uno venga de su fuente original.
import type { Tab, IssueInfo, PullRequestInfo, ActionInfo, CommitInfo, ReleaseInfo } from './hooks/useGithubData';
import type { ActiveNotifications } from './background/alarms';

interface ContentDisplayProps {
  activeTab: Tab;
  isContentLoading: boolean;
  selectedRepo: string;
  readmeHtml: string;
  commits: CommitInfo[];
  issues: IssueInfo[];
  pullRequests: PullRequestInfo[];
  actions: ActionInfo[];
  releases: ReleaseInfo[];
  activeNotifications: ActiveNotifications;
}

function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  const {
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
  } = useGithubData();

  // --> CAMBIO: Se actualiza la clave de 'actionFailures' a 'actions'.
  const notificationKeyMap: { [key in Tab]?: (keyof ActiveNotifications[string])[] } = {
    'Issues': ['issues'],
    'PRs': ['newPRs', 'assignedPRs'],
    'Actions': ['actions'],
    'Releases': ['newReleases']
  };

  useEffect(() => {
    if (user) {
      setIsAppLoading(false);
    } else {
      setTimeout(() => setIsAppLoading(false), 500);
    }
  }, [user]);
  
  const handleRepoSelection = (repoFullName: string) => {
    handleTabChange('README');
    setSelectedRepo(repoFullName);
  };
  
  const handleLogin = () => {
    setIsAppLoading(true);
    chrome.runtime.sendMessage({ type: 'login' }, (response) => {
      if (response?.success) {
        window.location.reload();
      } else {
        console.error('Login failed:', response?.error);
        setIsAppLoading(false);
      }
    });
  };

  const handleLogout = () => {
    chrome.runtime.sendMessage({ type: 'logout' }, () => {
      window.location.reload();
    });
  };

  if (isAppLoading) {
    return <div className="app-container"><p>Cargando...</p></div>;
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
    <>
      <RepoManagerModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        allRepos={allRepos}
        managedRepos={managedRepos}
        onAdd={addRepoToManagedList}
        onRemove={removeRepoFromManagedList}
      />
      <AlertsManagerModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        managedRepos={managedRepos}
        alertSettings={alertSettings}
        onSettingsChange={handleAlertSettingsChange}
        alertFrequency={alertFrequency}
        onFrequencyChange={handleFrequencyChange}
      />

      <div className="app-container">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
          <img src={user.avatar_url} alt="User Avatar" width="40" style={{ borderRadius: '50%' }} />
          <p>¡Bienvenido, {user.login}!</p>
        </div>
        <div className="select-container">
          <SearchableRepoDropdown
              repos={managedRepos}
              selectedRepo={selectedRepo}
              onSelect={handleRepoSelection}
              disabled={!user || managedRepos.length === 0}
              notifications={activeNotifications}
          />
          <button onClick={() => setIsRepoModalOpen(true)} className="manage-button" title="Manage Repositories">
            ⚙️
          </button>
          <button onClick={() => setIsAlertsModalOpen(true)} className="manage-button" title="Manage Alerts">
            🔔
          </button>
          {selectedRepo && (
             <button onClick={handleRefresh} className="refresh-button" title="Refrescar datos">
                🔄
             </button>
          )}
        </div>
        
        {selectedRepo && (
          <>
            <div className="tab-container">
              {(['README', 'Commits', 'Issues', 'PRs', 'Actions', 'Releases'] as Tab[]).map(tab => {
                const notificationKeysForTab = notificationKeyMap[tab];
                const hasNotification = notificationKeysForTab?.some(key => {
                    const notificationsForRepo = activeNotifications[selectedRepo];
                    if (!notificationsForRepo) return false;
                    const notificationsForCategory = notificationsForRepo[key];
                    return Array.isArray(notificationsForCategory) && notificationsForCategory.length > 0;
                });

                return (
                  <button key={tab} onClick={() => handleTabChange(tab)} className={activeTab === tab ? 'active' : ''}>
                    {tab}
                    {hasNotification && <span className="notification-dot"></span>}
                  </button>
                )
              })}
            </div>
            {activeTab === 'Issues' && <FilterBar name="Issues" filters={[{label: 'All', value: 'all'}, {label: 'Open', value: 'open'}, {label: 'Closed', value: 'closed'}]} currentFilter={issueStateFilter} onFilterChange={handleIssueFilterChange} />}
            {activeTab === 'PRs' && <FilterBar name="PRs" filters={[{label: 'All', value: 'all'}, {label: 'Open', value: 'open'}, {label: 'Closed', value: 'closed'}, {label: 'Merged', value: 'merged'}, {label: 'Asignados a mi', value: 'assigned_to_me'}]} currentFilter={prStateFilter} onFilterChange={handlePrFilterChange} />}
            {activeTab === 'Actions' && <FilterBar name="Actions" filters={[{ label: 'All', value: 'all' }, { label: 'Success', value: 'success' }, { label: 'Failure', value: 'failure' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Queued', value: 'queued' }, { label: 'Waiting', value: 'waiting' }, { label: 'Cancelled', value: 'cancelled' }]} currentFilter={actionStatusFilter} onFilterChange={handleActionStatusChange} />}
          </>
        )}
        
        {/* --> CAMBIO: Se añade un div contenedor para el efecto de opacidad de stale-while-revalidate */}
        <div className={isContentLoading ? 'content-revalidating' : ''}>
            <ContentDisplay 
              activeTab={activeTab}
              isContentLoading={isContentLoading}
              selectedRepo={selectedRepo}
              readmeHtml={readmeHtml}
              commits={commits}
              issues={issues}
              pullRequests={pullRequests}
              actions={actions}
              releases={releases}
              activeNotifications={activeNotifications}
            />
        </div>
        
        {selectedRepo && activeTab !== 'README' && !isContentLoading && (commits.length > 0 || issues.length > 0 || pullRequests.length > 0 || actions.length > 0 || releases.length > 0) && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}

        <button onClick={handleLogout} style={{ marginTop: '1.5rem' }}>Cerrar Sesión</button>
      </div>
    </>
  );
}

const ContentDisplay = ({ 
  activeTab, 
  isContentLoading, 
  selectedRepo, 
  readmeHtml, 
  commits, 
  issues, 
  pullRequests, 
  actions, 
  releases,
  activeNotifications 
}: ContentDisplayProps) => {

  if (!selectedRepo) return null;

  // --> CAMBIO: Lógica de stale-while-revalidate para evitar el "blink".
  const hasExistingData = commits.length > 0 || issues.length > 0 || pullRequests.length > 0 || actions.length > 0 || releases.length > 0;

  // Solo muestra "Cargando..." a pantalla completa si es la primera carga de una pestaña sin datos.
  if (isContentLoading && !hasExistingData && activeTab !== 'README') {
      return <p className="loading-text">Cargando...</p>;
  }
  
  if (isContentLoading && activeTab === 'README') {
    return <p className="loading-text">Cargando...</p>;
  }
    
  if (activeTab === 'README') {
    if (readmeHtml) {
      return <div className="readme-content" dangerouslySetInnerHTML={{ __html: readmeHtml }} />;
    }
    return <p className="loading-text">No se encontró un archivo README para este repositorio.</p>;
  }
    
  const notificationsForRepo = activeNotifications[selectedRepo] || {};
  
  const renderItemList = (items: (IssueInfo | PullRequestInfo)[], notificationKeys: (keyof ActiveNotifications[string])[]) => (
    <ul className="item-list">
      {items.map((item) => {
        const isNew = notificationKeys.some(key => notificationsForRepo[key]?.includes(item.id));
        return (
          <li key={item.id}>
              <div className="item-title-container">
                  <a href={item.html_url} target="_blank" rel="noopener noreferrer">#{item.number} {item.title}</a>
                  {isNew && <span className="notification-dot"></span>}
                  <ItemStatus item={item} />
              </div>
              <div className="item-meta">
                  <span>Creado por <strong>{item.user.login}</strong></span>
                  
                  {/* --- INICIO DEL CAMBIO --- */}
                  {/* Verificamos si hay asignados para mostrar sus avatares */}
                  {item.assignees && item.assignees.length > 0 ? (
                      <div className="assignee-info">
                          <span>Asignado a:</span>
                          {item.assignees.map(assignee => (
                              <a key={assignee.login} href={assignee.html_url} target="_blank" rel="noopener noreferrer" title={assignee.login}>
                                  <img src={assignee.avatar_url} alt={`Avatar de ${assignee.login}`} className="assignee-avatar" />
                              </a>
                          ))}
                      </div>
                  ) : (
                      // Si no hay asignados, mostramos el nuevo texto
                      <div className="assignee-info">
                          <span>No asignado</span>
                      </div>
                  )}
                  {/* --- FIN DEL CAMBIO --- */}

              </div>
          </li>
        );
      })}
    </ul>
  );

  const getStatusIcon = (status: ActionInfo['status'], conclusion: ActionInfo['conclusion']) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success': return '✅'; case 'failure': return '❌';
        case 'cancelled': return '🚫'; default: return '⚪️';
      }
    }
    if (status === 'in_progress') return '⏳'; return '큐';
  };

  if (activeTab === 'Commits' && commits.length > 0) {
    return (<ul className="item-list">{commits.map((c: CommitInfo) => (<li key={c.sha}><a href={c.html_url} target="_blank" rel="noopener noreferrer">{c.commit.message.split('\n')[0]}</a><p className="item-meta"><strong>{c.commit.author.name}</strong></p></li>))}</ul>);
  }
  if (activeTab === 'Issues' && issues.length > 0) return renderItemList(issues, ['issues']);
  if (activeTab === 'PRs' && pullRequests.length > 0) return renderItemList(pullRequests, ['newPRs', 'assignedPRs']);
  
  if (activeTab === 'Actions' && actions.length > 0) {
    return (<ul className="item-list">{actions.map((action: ActionInfo) => {
        // --> CAMBIO: Se actualiza la clave de 'actionFailures' a 'actions'.
        const isNew = notificationsForRepo.actions?.includes(action.id);
        return (
          <li key={action.id}>
              <div className="item-title-container">
                  <a href={action.html_url} target="_blank" rel="noopener noreferrer">
                      {getStatusIcon(action.status, action.conclusion)} {action.name}
                  </a>
                  {isNew && <span className="notification-dot"></span>}
              </div>
              <div className="action-meta">
                  <span>Iniciado por <strong>{action.actor.login}</strong></span>
                  {action.pull_requests?.length > 0 && action.pull_requests[0] && (<a href={action.pull_requests[0].html_url} target="_blank" rel="noopener noreferrer" className="pr-link">(PR #{action.pull_requests[0].number})</a>)}
              </div>
          </li>
        );
    })}</ul>);
  }
  
  if (activeTab === 'Releases' && releases.length > 0) {
    return (
      <ul className="item-list">
        {releases.map((release: ReleaseInfo) => {
          const isNew = notificationsForRepo.newReleases?.includes(release.id);
          return (
            <li key={release.id}>
                <div className="item-title-container">
                    <a href={release.html_url} target="_blank" rel="noopener noreferrer">
                        {release.name || release.tag_name}
                    </a>
                    {isNew && <span className="notification-dot"></span>}
                </div>
              <div className="item-meta">
                <span>Publicado por <strong>{release.author.login}</strong></span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{new Date(release.published_at).toLocaleDateString()}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
    
  return <p className="loading-text">No se encontraron datos para esta pestaña.</p>;
}

export default App;