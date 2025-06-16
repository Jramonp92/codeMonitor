import { useState, useEffect, useRef } from 'react';
import type { Repo, ActiveNotifications } from '../hooks/useGithubData'; // <-- 1. Importar ActiveNotifications
import './SearchableRepoDropdown.css';

interface Props {
  repos: Repo[];
  selectedRepo: string;
  onSelect: (repoFullName: string) => void;
  disabled: boolean;
  notifications: ActiveNotifications; // <-- 2. Añadir la nueva propiedad
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
              // 3. Lógica para determinar si hay notificación
              const hasNotification = notifications && notifications[repo.full_name];
              return (
                <li key={repo.id} onClick={() => handleSelect(repo)}>
                  {repo.name}
                  {/* 4. Renderizar el punto rojo si hay notificación */}
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