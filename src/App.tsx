import { useState, useEffect } from 'react';
import './App.css';
import { useGithubData } from './hooks/useGithubData';
import { FilterBar } from './components/FilterBar';
import { Pagination } from './components/Pagination';
import { RepoManagerModal } from './components/RepoManagerModal';
import { AlertsManagerModal } from './components/AlertsManagerModal';
import { AppHeader } from './components/AppHeader';
import { ContentDisplay } from './components/ContentDisplay';
import { RepoToolbar } from './components/RepoToolbar';
import type { Tab } from './hooks/useGithubData';
import type { ActiveNotifications } from './background/alarms';
import { AppShell } from './components/AppShell';

function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  const {
    user,
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

  const notificationKeyMap: { [key in Tab]?: (keyof ActiveNotifications[string])[] } = {
    'Issues': ['issues'],
    'PRs': ['newPRs', 'assignedPRs'],
    'Actions': ['actions'],
    'Releases': ['newReleases'],
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

  return (
    <AppShell isLoading={isAppLoading} user={user} onLogin={handleLogin}>
      <RepoManagerModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        allRepos={managedRepos}
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
        <AppHeader
          user={user!}
          onManageRepos={() => setIsRepoModalOpen(true)}
          onManageAlerts={() => setIsAlertsModalOpen(true)}
          onLogout={handleLogout}
        />

        <RepoToolbar
          managedRepos={managedRepos}
          selectedRepo={selectedRepo}
          user={user!}
          onSelectRepo={handleRepoSelection}
          onRefresh={handleRefresh}
          onOpenRepoManager={() => setIsRepoModalOpen(true)}
          onOpenAlertsManager={() => setIsAlertsModalOpen(true)}
          notifications={activeNotifications}
        />

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
                );
              })}
            </div>
            {activeTab === 'Issues' && <FilterBar name="Issues" filters={[{ label: 'All', value: 'all' }, { label: 'Open', value: 'open' }, { label: 'Closed', value: 'closed' }]} currentFilter={issueStateFilter} onFilterChange={handleIssueFilterChange} />}
            {activeTab === 'PRs' && <FilterBar name="PRs" filters={[{ label: 'All', value: 'all' }, { label: 'Open', value: 'open' }, { label: 'Closed', value: 'closed' }, { label: 'Merged', value: 'merged' }, { label: 'Asignados a mi', value: 'assigned_to_me' }]} currentFilter={prStateFilter} onFilterChange={handlePrFilterChange} />}
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
    </AppShell>
  );
}

export default App;