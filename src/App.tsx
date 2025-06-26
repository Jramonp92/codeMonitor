// src/App.tsx

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
import { SettingsView } from './components/SettingsView';

type Theme = 'light' | 'dark';

function App() {
  const [activeView, setActiveView] = useState<'main' | 'settings'>('main');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    chrome.storage.local.get('theme', (result) => {
      if (result.theme) {
        setTheme(result.theme);
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemPrefersDark ? 'dark' : 'light');
      }
    });
  }, []);

  useEffect(() => {
    const body = document.body;
    body.classList.remove('light', 'dark');
    body.classList.add(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    chrome.storage.local.set({ theme: newTheme });
  };
  
  // --- INICIO DEL CAMBIO ---
  // Actualizamos la destructuración para que coincida con el hook corregido
  const {
    user,
    allRepos,
    managedRepos,
    updateManagedRepos, // <-- Se usa la nueva función de guardado
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
    handleSaveAlerts,
    tabVisibility,
    handleTabVisibilityChange,
    branches,
    selectedBranch,
    areBranchesLoading,
    handleBranchChange,
    clearAllNotifications,
    directoryContent,
    currentPath,
    viewedFile,
    handlePathChange,
    handleFileSelect,
    setViewedFile,
    trackedFiles,
    addTrackedFile,
    removeTrackedFile,
    isTracked,
    workflows,
    areWorkflowsLoading,
    selectedWorkflowId,
    handleWorkflowFilterChange,
  } = useGithubData();
  // --- FIN DEL CAMBIO ---

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
      {/* --- INICIO DEL CAMBIO --- */}
      {/* Se actualizan las props del RepoManagerModal */}
      <RepoManagerModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        allRepos={allRepos}
        managedRepos={managedRepos}
        onSave={updateManagedRepos}
      />
      {/* --- FIN DEL CAMBIO --- */}
      
      <AlertsManagerModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        managedRepos={managedRepos}
        alertSettings={alertSettings}
        alertFrequency={alertFrequency}
        trackedFiles={trackedFiles}
        onSave={handleSaveAlerts}
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
              onClearAllNotifications={clearAllNotifications}
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
              tabVisibility={tabVisibility}
              branches={branches}
              selectedBranch={selectedBranch}
              areBranchesLoading={areBranchesLoading}
              handleBranchChange={handleBranchChange}
              workflows={workflows}
              selectedWorkflowId={selectedWorkflowId}
              areWorkflowsLoading={areWorkflowsLoading}
              handleWorkflowFilterChange={handleWorkflowFilterChange}
            />
            <div className='Border'>
            <div className={isContentLoading ? 'content-revalidating' : ''}>
              <ContentDisplay
                activeTab={activeTab}
                isContentLoading={isContentLoading}
                selectedRepo={selectedRepo!}
                readmeHtml={readmeHtml}
                commits={commits}
                issues={issues}
                pullRequests={pullRequests}
                actions={actions}
                releases={releases}
                activeNotifications={activeNotifications}
                directoryContent={directoryContent}
                currentPath={currentPath}
                viewedFile={viewedFile}
                handlePathChange={handlePathChange}
                handleFileSelect={handleFileSelect}
                setViewedFile={setViewedFile}
                repoFullName={selectedRepo!}
                selectedBranch={selectedBranch}
                isTracked={isTracked}
                addTrackedFile={addTrackedFile}
                removeTrackedFile={removeTrackedFile}
              />
            </div>
            </div>
            {selectedRepo && activeTab !== 'README' && activeTab !== 'Code' && !isContentLoading && (commits.length > 0 || issues.length > 0 || pullRequests.length > 0 || actions.length > 0 || releases.length > 0) && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </>
        ) : (
          <SettingsView
            onClose={() => setActiveView('main')}
            tabVisibility={tabVisibility}
            onTabVisibilityChange={handleTabVisibilityChange}
            theme={theme}
            onThemeChange={handleThemeChange}
          />
        )}
      </div>
    </AppShell>
  );
}

export default App;