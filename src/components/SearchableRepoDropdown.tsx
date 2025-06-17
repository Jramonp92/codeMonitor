import { useState, useEffect, useRef } from 'react';
import type { Repo } from '../hooks/useGithubData'; // Repo viene del hook.
import type { ActiveNotifications } from '../background/alarms'; // ActiveNotifications viene de las alarmas.
import './SearchableRepoDropdown.css';

interface Props {
  repos: Repo[];
  selectedRepo: string;
  onSelect: (repoFullName: string) => void;
  disabled: boolean;
  notifications: ActiveNotifications;
}

export function SearchableRepoDropdown({ repos, selectedRepo, onSelect, disabled, notifications }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedRepoName = repos.find(repo => repo.full_name === selectedRepo)?.name || '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (repo: Repo) => {
    onSelect(repo.full_name);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="searchable-dropdown" ref={dropdownRef}>
      <input
        type="text"
        className="search-input"
        placeholder={selectedRepoName || "Select a repository"}
        value={searchTerm || (!isOpen ? selectedRepoName : '')}
        onFocus={() => {
          setIsOpen(true);
          setSearchTerm('');
        }}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={disabled}
      />
      {isOpen && (
        <ul className="repo-list">
          {filteredRepos.length > 0 ? (
            filteredRepos.map(repo => {
              const repoNotifications = notifications && notifications[repo.full_name];
              const hasNotification = repoNotifications && Object.values(repoNotifications).some(arr => Array.isArray(arr) && arr.length > 0);
              
              // --- LOG DE DEBUG AÑADIDO ---
              // Este log se ejecutará por cada repositorio en la lista desplegable.
              if (hasNotification) {
                console.log(`%c[DEBUG] Repo "${repo.name}" DEBE tener punto rojo. Razón:`, 'color: purple; font-weight: bold;', repoNotifications);
              }

              return (
                <li key={repo.id} onClick={() => handleSelect(repo)}>
                  {repo.name}
                  {hasNotification && <span className="notification-dot repo-dot"></span>}
                </li>
              );
            })
          ) : (
            <li className="no-results">No repositories found</li>
          )}
        </ul>
      )}
    </div>
  );
}