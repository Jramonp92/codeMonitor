import './RepoToolbar.css';
import { SearchableRepoDropdown } from './SearchableRepoDropdown';
import type { Repo, GitHubUser } from '../hooks/useGithubData';
import type { ActiveNotifications } from '../background/alarms';

// --- INICIO DEL CAMBIO: Se añaden las props que faltaban ---
interface RepoToolbarProps {
  managedRepos: Repo[];
  selectedRepo: string;
  user: GitHubUser | null;
  onSelectRepo: (repoFullName: string) => void;
  onRefresh: () => void;
  onOpenRepoManager: () => void;
  onOpenAlertsManager: () => void;
  notifications: ActiveNotifications;
}
// --- FIN DEL CAMBIO ---

export const RepoToolbar = ({
  managedRepos,
  selectedRepo,
  user,
  onSelectRepo,
  onRefresh,
  notifications
}: RepoToolbarProps) => {
  return (
    <div className="repo-toolbar">
      <SearchableRepoDropdown
        repos={managedRepos}
        selectedRepo={selectedRepo}
        onSelect={onSelectRepo}
        disabled={!user || managedRepos.length === 0}
        notifications={notifications}
      />

      {selectedRepo && (
         <button onClick={onRefresh} className="refresh-button" title="Refrescar datos">
            🔄
         </button>
      )}
    </div>
  );
};