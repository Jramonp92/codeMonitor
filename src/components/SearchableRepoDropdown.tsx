// src/components/SearchableRepoDropdown.tsx

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next'; // 1. Importar hook
import type { Repo } from '../hooks/useGithubData';
import type { ActiveNotifications } from '../background/alarms';
import './SearchableRepoDropdown.css';

interface Props {
  repos: Repo[];
  selectedRepo: string;
  onSelect: (repoFullName: string) => void;
  disabled: boolean;
  notifications: ActiveNotifications;
}

export function SearchableRepoDropdown({ repos, selectedRepo, onSelect, disabled, notifications }: Props) {
  const { t } = useTranslation(); // 2. Usar hook
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
  
  // 3. Reemplazar textos fijos
  return (
    <div className="searchable-dropdown" ref={dropdownRef}>
      <input
        type="text"
        className="search-input"
        placeholder={selectedRepoName || t('selectRepositoryPlaceholder')}
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
              
              if (hasNotification) {
                console.log(`%c[DEBUG] Repo "${repo.name}" DEBE tener punto rojo. Razón:`, 'color: purple; font-weight: bold;', repoNotifications);
              } else {
                console.log(`%c[DEBUG] Repo "${repo.name}" NO DEBE tener punto rojo. Razón:`, 'color: purple; font-weight: bold;', repoNotifications);
              }

              return (
                <li key={repo.id} onClick={() => handleSelect(repo)}>
                  {repo.name}
                  {hasNotification && <span className="notification-dot repo-dot"></span>}
                </li>
              );
            })
          ) : (
            <li className="no-results">{t('noRepositoriesFound')}</li>
          )}
        </ul>
      )}
    </div>
  );
}