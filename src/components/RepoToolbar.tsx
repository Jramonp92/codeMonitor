import './RepoToolbar.css';
import { SearchableRepoDropdown } from './SearchableRepoDropdown';
import type { Repo, GitHubUser } from '../hooks/useGithubData';
import type { ActiveNotifications } from '../background/alarms';

// --- INICIO DEL CAMBIO: Componente para el nuevo ícono SVG ---
const RefreshIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
// --- FIN DEL CAMBIO ---

interface RepoToolbarProps {
  managedRepos: Repo[];
  selectedRepo: string | null;
  user: GitHubUser | null;
  onSelectRepo: (repoFullName: string) => void;
  onRefresh: () => void;
  onOpenRepoManager: () => void;
  onOpenAlertsManager: () => void;
  notifications: ActiveNotifications;
}

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
        selectedRepo={selectedRepo || ''}
        onSelect={onSelectRepo}
        disabled={!user || managedRepos.length === 0}
        notifications={notifications}
      />

      {/* --- INICIO DEL CAMBIO: Usamos el nuevo componente de ícono --- */}
      {selectedRepo && (
         <button onClick={onRefresh} className="refresh-button" title="Refrescar datos">
            <RefreshIcon />
         </button>
      )}
      {/* --- FIN DEL CAMBIO --- */}
    </div>
  );
};