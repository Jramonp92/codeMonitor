import { useState, useEffect } from 'react';
import './App.css'; 
import { useGithubData } from './hooks/useGithubData';
import { FilterBar } from './components/FilterBar';
import { Pagination } from './components/Pagination';
import { SearchableRepoDropdown } from './components/SearchableRepoDropdown';
import { RepoManagerModal } from './components/RepoManagerModal';
import { AlertsManagerModal } from './components/AlertsManagerModal';

// Se importan los nuevos componentes
import { AppHeader } from './components/AppHeader';
import { ContentDisplay } from './components/ContentDisplay';

// Se limpian los tipos que ya no se usan directamente en este archivo
import type { Tab } from './hooks/useGithubData';
import type { ActiveNotifications } from './background/alarms';


function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  const {
    user,
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
        allRepos={managedRepos} // Pasamos todos por si quiere añadir desde la lista
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
        
        {/* --- INICIO DEL CAMBIO --- */}
        <AppHeader 
          user={user}
          onManageRepos={() => setIsRepoModalOpen(true)}
          onManageAlerts={() => setIsAlertsModalOpen(true)}
          onLogout={handleLogout}
        />

        <div className="select-container">
          <SearchableRepoDropdown
              repos={managedRepos}
              selectedRepo={selectedRepo}
              onSelect={handleRepoSelection}
              disabled={!user || managedRepos.length === 0}
              notifications={activeNotifications}
          />
          {selectedRepo && (
             <button onClick={handleRefresh} className="refresh-button" title="Refrescar datos">
                🔄
             </button>
          )}
        </div>
        {/* --- FIN DEL CAMBIO --- */}
        
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

      </div>
    </>
  );
}

export default App;