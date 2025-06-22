import { useState, useEffect } from 'react';
import './App.css';
import { useGithubData } from './hooks/useGithubData';
import { Pagination } from './components/Pagination';
import { RepoManagerModal } from './components/RepoManagerModal';
import { AlertsManagerModal } from './components/AlertsManagerModal';
import { AppHeader } from './components/AppHeader';
import { ContentDisplay } from './components/ContentDisplay';
import { RepoToolbar } from './components/RepoToolbar';
import { AppShell } from './components/AppShell';
import { TabContainer } from './components/TabContainer';
import { SettingsView } from './components/SettingsView'; // Importa la nueva vista

function App() {
  const [activeView, setActiveView] = useState<'main' | 'settings'>('main');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  const {
    user,
    allRepos,
    managedRepos,
    addRepoToManagedList,
    removeRepoFromManagedList,
    selectedRepo,
    setSelectedRepo,
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
    commits,
    issues,
    pullRequests,
    actions,
    releases,
    currentPage,
    setCurrentPage,
    totalPages,
    handleRefresh,
    alertSettings,
    activeNotifications,
    alertFrequency,
    handleAlertSettingsChange,
    handleFrequencyChange,
  } = useGithubData();

  useEffect(() => {
    if (user !== undefined) {
      setTimeout(() => setIsAppLoading(false), 300);
    }
  }, [user]);

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

  return (
    <AppShell isLoading={isAppLoading} user={user} onLogin={handleLogin}>
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
        {activeView === 'main' ? (
          <>
            <AppHeader
              user={user!}
              onManageRepos={() => setIsRepoModalOpen(true)}
              onManageAlerts={() => setIsAlertsModalOpen(true)}
              onLogout={handleLogout}
              onOpenSettings={() => setActiveView('settings')}
            />

            <RepoToolbar
              managedRepos={managedRepos}
              selectedRepo={selectedRepo}
              user={user!}
              onSelectRepo={(repoFullName) => {
                handleTabChange('README');
                setSelectedRepo(repoFullName);
              }}
              onRefresh={handleRefresh}
              onOpenRepoManager={() => setIsRepoModalOpen(true)}
              onOpenAlertsManager={() => setIsAlertsModalOpen(true)}
              notifications={activeNotifications}
            />
            
            <TabContainer
                activeTab={activeTab}
                handleTabChange={handleTabChange}
                selectedRepo={selectedRepo}
                activeNotifications={activeNotifications}
                issueStateFilter={issueStateFilter}
                handleIssueFilterChange={handleIssueFilterChange}
                prStateFilter={prStateFilter}
                handlePrFilterChange={handlePrFilterChange}
                actionStatusFilter={actionStatusFilter}
                handleActionStatusChange={handleActionStatusChange}
            />

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
          </>
        ) : (
          <SettingsView onClose={() => setActiveView('main')} />
        )}
      </div>
    </AppShell>
  );
}

export default App;