// src/components/TabContainer.tsx

import { useState } from 'react';
import { useTranslation } from 'react-i18next'; // 1. Importar hook
import './TabContainer.css';
import { FilterBar } from './FilterBar';
import { BranchSelector } from './BranchSelector';
import { WorkflowFilterDropdown } from './WorkflowFilterDropdown';
import type { Tab, IssueState, PRState, ActionStatus, TabVisibility, TabKey, Branch, Workflow } from '../hooks/useGithubData';
import type { ActiveNotifications } from '../background/alarms';

interface TabContainerProps {
  activeTab: Tab;
  handleTabChange: (tab: Tab) => void;
  selectedRepo: string | null;
  activeNotifications: ActiveNotifications;
  issueStateFilter: IssueState;
  handleIssueFilterChange: (filter: IssueState) => void;
  prStateFilter: PRState;
  handlePrFilterChange: (filter: PRState) => void;
  actionStatusFilter: ActionStatus;
  handleActionStatusChange: (status: ActionStatus) => void;
  tabVisibility: TabVisibility;
  branches: Branch[];
  selectedBranch: string;
  areBranchesLoading: boolean;
  handleBranchChange: (branchName: string) => void;
  workflows: Workflow[];
  selectedWorkflowId: number | null;
  areWorkflowsLoading: boolean;
  handleWorkflowFilterChange: (workflowId: number | null) => void;
}

const NOTIFICATION_KEY_MAP: { [key in Tab]?: (keyof ActiveNotifications[string])[] } = {
  'Code': ['fileChanges'],
  'Issues': ['issues'],
  'PRs': ['newPRs', 'assignedPRs', 'prStatusChanges'],
  'Actions': ['actions'],
  'Releases': ['newReleases']
};

export const TabContainer = ({
  activeTab,
  handleTabChange,
  selectedRepo,
  activeNotifications,
  issueStateFilter,
  handleIssueFilterChange,
  prStateFilter,
  handlePrFilterChange,
  actionStatusFilter,
  handleActionStatusChange,
  tabVisibility,
  branches,
  selectedBranch,
  areBranchesLoading,
  handleBranchChange,
  workflows,
  selectedWorkflowId,
  areWorkflowsLoading,
  handleWorkflowFilterChange
}: TabContainerProps) => {
  
  const { t } = useTranslation(); // 2. Usar hook
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);

  // 3. Crear los arrays de pestañas y filtros usando la función de traducción t()
  const TABS: { id: Tab, translationKey: string }[] = [
    { id: 'README', translationKey: 'tabReadme' },
    { id: 'Code', translationKey: 'tabCode' },
    { id: 'Commits', translationKey: 'tabCommits' },
    { id: 'Issues', translationKey: 'tabIssues' },
    { id: 'PRs', translationKey: 'tabPullRequests' },
    { id: 'Actions', translationKey: 'tabActions' },
    { id: 'Releases', translationKey: 'tabReleases' },
  ];

  const issueFilters = [
    { label: t('filterAll'), value: 'all' },
    { label: t('filterOpen'), value: 'open' },
    { label: t('filterClosed'), value: 'closed' }
  ];

  const prFilters = [
    { label: t('filterAll'), value: 'all' },
    { label: t('filterOpen'), value: 'open' },
    { label: t('filterClosed'), value: 'closed' },
    { label: t('filterMerged'), value: 'merged' },
    { label: t('filterAssignedToMe'), value: 'assigned_to_me' }
  ];

  const actionFilters = [
    { label: t('filterAll'), value: 'all' },
    { label: t('filterSuccess'), value: 'success' },
    { label: t('filterFailure'), value: 'failure' },
    { label: t('filterInProgress'), value: 'in_progress' },
    { label: t('filterQueued'), value: 'queued' },
    { label: t('filterWaiting'), value: 'waiting' },
    { label: t('filterCancelled'), value: 'cancelled' }
  ];

  const toggleFiltersVisibility = () => {
    setIsFiltersCollapsed(prev => !prev);
  };
  
  if (!selectedRepo) {
    return null;
  }

  const showFilterArea = 
    activeTab === 'Commits' || 
    activeTab === 'Code' || 
    activeTab === 'Issues' || 
    activeTab === 'PRs' || 
    activeTab === 'Actions';

  // 4. Reemplazar todos los textos fijos
  return (
    <>
      <div className="tab-container">
        {TABS.filter(tab => tabVisibility[tab.id as TabKey]).map(tab => {
          const notificationKeysForTab = NOTIFICATION_KEY_MAP[tab.id];
          const hasNotification = notificationKeysForTab?.some(key => {
            const notificationsForRepo = activeNotifications[selectedRepo!];
            if (!notificationsForRepo) return false;
            const notificationsForCategory = notificationsForRepo[key];
            return Array.isArray(notificationsForCategory) && notificationsForCategory.length > 0;
          });

          return (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={activeTab === tab.id ? 'active' : ''}>
              {t(tab.translationKey)}
              {hasNotification && <span className="notification-dot"></span>}
            </button>
          );
        })}
      </div>

      {showFilterArea && (
        <div className="filter-area-container">
          <div className="filter-area-header">
            <span className="filter-area-title">{t('filtersTitle')}</span>
            <button onClick={toggleFiltersVisibility} className="filters-toggle-button">
              {isFiltersCollapsed ? t('expand') : t('collapse')}
            </button>
          </div>

          {!isFiltersCollapsed && (
            <div className="filter-area-content">
              {(activeTab === 'Commits' || activeTab === 'Code') && (
                <BranchSelector 
                  branches={branches}
                  selectedBranch={selectedBranch}
                  onBranchChange={handleBranchChange}
                  isLoading={areBranchesLoading}
                  activeNotifications={activeNotifications}
                  repoFullName={selectedRepo}
                />
              )}

              {activeTab === 'Issues' && <FilterBar name="Issues" filters={issueFilters} currentFilter={issueStateFilter} onFilterChange={handleIssueFilterChange} />}
              
              {activeTab === 'PRs' && <FilterBar name="PRs" filters={prFilters} currentFilter={prStateFilter} onFilterChange={handlePrFilterChange} />}
              
              {activeTab === 'Actions' && (
                <div className="actions-filter-container">
                  <WorkflowFilterDropdown 
                    workflows={workflows}
                    selectedWorkflowId={selectedWorkflowId}
                    onFilterChange={handleWorkflowFilterChange}
                    isLoading={areWorkflowsLoading}
                  />
                  <FilterBar 
                    name="Actions" 
                    filters={actionFilters} 
                    currentFilter={actionStatusFilter} 
                    onFilterChange={handleActionStatusChange} 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};