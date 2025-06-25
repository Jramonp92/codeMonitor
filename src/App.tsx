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

// --- INICIO DE CAMBIOS (PASO 2) ---

// Definimos el tipo para el tema para asegurar que solo pueda ser 'light' o 'dark'.
type Theme = 'light' | 'dark';

// --- FIN DE CAMBIOS (PASO 2) ---

function App() {
  const [activeView, setActiveView] = useState<'main' | 'settings'>('main');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  // --- INICIO DE CAMBIOS (PASO 2) ---

  // 1. Añadimos un estado para el tema actual.
  const [theme, setTheme] = useState<Theme>('light');

  // 2. Usamos useEffect para cargar el tema guardado al iniciar la extensión.
  useEffect(() => {
    // Intentamos obtener el tema desde el almacenamiento local de Chrome.
    chrome.storage.local.get('theme', (result) => {
      if (result.theme) {
        // Si encontramos un tema guardado, lo establecemos en el estado.
        setTheme(result.theme);
      }
    });
  }, []);

  // 3. Este efecto se ejecuta cada vez que el tema cambia.
  useEffect(() => {
    const body = document.body;
    // Limpiamos las clases de tema anteriores para evitar conflictos.
    body.classList.remove('light', 'dark');
    // Añadimos la clase del tema actual al body del documento.
    // Esto activará las variables CSS que definimos en App.css.
    body.classList.add(theme);
  }, [theme]);

  // 4. Función para cambiar el tema y guardarlo en el almacenamiento.
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    chrome.storage.local.set({ theme: newTheme });
  };

  // --- FIN DE CAMBIOS (PASO 2) ---
  
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
        trackedFiles={trackedFiles}
        addTrackedFile={addTrackedFile}
        removeTrackedFile={removeTrackedFile}
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

            {selectedRepo && activeTab !== 'README' && activeTab !== 'Code' && !isContentLoading && (commits.length > 0 || issues.length > 0 || pullRequests.length > 0 || actions.length > 0 || releases.length > 0) && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </>
        ) : (
          <SettingsView
            onClose={() => setActiveView('main')}
            tabVisibility={tabVisibility}
            onTabVisibilityChange={handleTabVisibilityChange}
            // --- INICIO DE CAMBIOS (PASO 2) ---
            // 5. Pasamos el estado y la función de cambio a SettingsView.
            theme={theme}
            onThemeChange={handleThemeChange}
            // --- FIN DE CAMBIOS (PASO 2) ---
          />
        )}
      </div>
    </AppShell>
  );
}

export default App;