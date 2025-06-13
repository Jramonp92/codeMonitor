// src/components/SearchableRepoDropdown.tsx

import React, { useState, useEffect, useRef } from 'react';
import type { Repo } from '../hooks/useGithubData';
import './SearchableRepoDropdown.css';

interface Props {
  repos: Repo[];
  selectedRepo: string;
  onSelect: (repoFullName: string) => void;
  disabled: boolean;
}

export function SearchableRepoDropdown({ repos, selectedRepo, onSelect, disabled }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derivamos el nombre del repo seleccionado para mostrarlo en el input
  const selectedRepoName = repos.find(repo => repo.full_name === selectedRepo)?.name || '';

  // Filtramos los repositorios basados en el término de búsqueda
  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Efecto para cerrar el dropdown si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); // Limpiamos la búsqueda al cerrar
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (repo: Repo) => {
    onSelect(repo.full_name);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div className="searchable-dropdown" ref={dropdownRef}>
      <input
        type="text"
        className="search-input"
        placeholder={selectedRepoName ? selectedRepoName : 'Select a repository'}
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
      />
      {isOpen && (
        <ul className="repo-list">
          {filteredRepos.length > 0 ? (
            filteredRepos.map(repo => (
              <li key={repo.id} onClick={() => handleSelect(repo)}>
                {repo.name}
              </li>
            ))
          ) : (
            <li className="no-results">No repositories found</li>
          )}
        </ul>
      )}
    </div>
  );
}