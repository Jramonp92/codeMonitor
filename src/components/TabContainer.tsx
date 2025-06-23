// src/components/TabContainer.tsx

import './TabContainer.css';
import { FilterBar } from './FilterBar';
import { BranchSelector } from './BranchSelector';
import type { Tab, IssueState, PRState, ActionStatus, TabVisibility, TabKey, Branch } from '../hooks/useGithubData';
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
}

const TABS: Tab[] = ['README', 'Code', 'Commits', 'Issues', 'PRs', 'Actions', 'Releases'];

const NOTIFICATION_KEY_MAP: { [key in Tab]?: (keyof ActiveNotifications[string])[] } = {
  'Code': ['fileChanges'],
  'Issues': ['issues'],
  'PRs': ['newPRs', 'assignedPRs'],
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
  handleBranchChange
}: TabContainerProps) => {
  
  if (!selectedRepo) {
    return null;
  }

  return (
    <>
      <div className="tab-container">
        {TABS.filter(tab => tabVisibility[tab as TabKey]).map(tab => {
          const notificationKeysForTab = NOTIFICATION_KEY_MAP[tab];
          const hasNotification = notificationKeysForTab?.some(key => {
            const notificationsForRepo = activeNotifications[selectedRepo!];
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

      {(activeTab === 'Commits' || activeTab === 'Code') && (
        // --- INICIO DE CAMBIOS ---
        // 1. Pasamos las props de notificaciones y repositorio al selector de ramas
        <BranchSelector 
          branches={branches}
          selectedBranch={selectedBranch}
          onBranchChange={handleBranchChange}
          isLoading={areBranchesLoading}
          activeNotifications={activeNotifications}
          repoFullName={selectedRepo}
        />
        // --- FIN DE CAMBIOS ---
      )}

      {activeTab === 'Issues' && <FilterBar name="Issues" filters={[{ label: 'All', value: 'all' }, { label: 'Open', value: 'open' }, { label: 'Closed', value: 'closed' }]} currentFilter={issueStateFilter} onFilterChange={handleIssueFilterChange} />}
      {activeTab === 'PRs' && <FilterBar name="PRs" filters={[{ label: 'All', value: 'all' }, { label: 'Open', value: 'open' }, { label: 'Closed', value: 'closed' }, { label: 'Merged', value: 'merged' }, { label: 'Asignados a mi', value: 'assigned_to_me' }]} currentFilter={prStateFilter} onFilterChange={handlePrFilterChange} />}
      {activeTab === 'Actions' && <FilterBar name="Actions" filters={[{ label: 'All', value: 'all' }, { label: 'Success', value: 'success' }, { label: 'Failure', value: 'failure' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Queued', value: 'queued' }, { label: 'Waiting', value: 'waiting' }, { label: 'Cancelled', value: 'cancelled' }]} currentFilter={actionStatusFilter} onFilterChange={handleActionStatusChange} />}
    </>
  );
};