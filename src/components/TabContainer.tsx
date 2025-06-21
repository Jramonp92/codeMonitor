import './TabContainer.css';
import { FilterBar } from './FilterBar';
import type { Tab, IssueState, PRState, ActionStatus } from '../hooks/useGithubData';
import type { ActiveNotifications } from '../background/alarms';

// Definimos las props que el nuevo componente necesitará recibir de App.tsx
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
}

// Sacamos estas constantes de App.tsx para que vivan junto a su lógica
const TABS: Tab[] = ['README', 'Commits', 'Issues', 'PRs', 'Actions', 'Releases'];

const NOTIFICATION_KEY_MAP: { [key in Tab]?: (keyof ActiveNotifications[string])[] } = {
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
}: TabContainerProps) => {
  
  // Si no hay un repositorio seleccionado, no mostramos nada.
  if (!selectedRepo) {
    return null;
  }

  return (
    <>
      <div className="tab-container">
        {TABS.map(tab => {
          const notificationKeysForTab = NOTIFICATION_KEY_MAP[tab];
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
  );
};