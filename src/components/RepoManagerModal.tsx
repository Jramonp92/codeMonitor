// src/components/RepoManagerModal.tsx

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // 1. Importar hook
import type { Repo } from '../hooks/useGithubData';
import './RepoManagerModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allRepos: Repo[];
  managedRepos: Repo[];
  onSave: (updatedRepos: Repo[]) => void;
}

export function RepoManagerModal({ isOpen, onClose, allRepos, managedRepos, onSave }: Props) {
  const { t } = useTranslation(); // 2. Usar hook
  const [localManagedRepos, setLocalManagedRepos] = useState<Repo[]>([]);
  
  useEffect(() => {
    if (isOpen) {
      setLocalManagedRepos([...managedRepos]);
    }
  }, [isOpen, managedRepos]);

  const [searchTerm, setSearchTerm] = useState('');
  const [externalRepoInput, setExternalRepoInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  if (!isOpen) {
    return null;
  }

  const localManagedRepoIds = new Set(localManagedRepos.map(r => r.id));

  const availableFiltered = allRepos
    .filter(repo => !localManagedRepoIds.has(repo.id))
    .filter(repo => repo.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleLocalAdd = (repo: Repo) => {
    setLocalManagedRepos(prev => [...prev, repo].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleLocalRemove = (repo: Repo) => {
    setLocalManagedRepos(prev => prev.filter(r => r.id !== repo.id));
  };
  
  const handleAddExternalRepo = () => {
    let repoFullName = '';
    try {
      const url = new URL(externalRepoInput);
      if (url.hostname !== 'github.com') {
        setAddError(t('errorUrlNotGithub'));
        return;
      }
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length < 2) {
        setAddError(t('errorInvalidUrlFormat'));
        return;
      }
      repoFullName = `${pathParts[0]}/${pathParts[1]}`;
    } catch (e) {
      if (externalRepoInput.includes('/')) {
        repoFullName = externalRepoInput;
      } else {
        setAddError(t('errorInvalidFormat'));
        return;
      }
    }

    if (localManagedRepos.some(r => r.full_name.toLowerCase() === repoFullName.toLowerCase())) {
        setAddError(t('errorRepoAlreadyVisible'));
        return;
    }

    setAddError('');
    setIsAdding(true);

    chrome.runtime.sendMessage({ type: 'getRepoDetails', repoFullName }, (response) => {
      setIsAdding(false);
      if (response?.success) {
        handleLocalAdd(response.repo);
        setExternalRepoInput('');
      } else {
        setAddError(response?.error || t('errorRepoNotFound'));
      }
    });
  };

  const handleSave = () => {
    onSave(localManagedRepos);
    onClose();
  };

  // 3. Reemplazar textos fijos
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{t('manageRepositories')}</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="repo-column">
            <h3>{t('availableRepositories')}</h3>
            <input
              type="text"
              placeholder={t('searchYourRepositories')}
              className="modal-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ul className="repo-list-modal">
              {availableFiltered.map(repo => (
                <li key={repo.id}>
                  <span>{repo.name}</span>
                  <button onClick={() => handleLocalAdd(repo)} className="add-button">+</button>
                </li>
              ))}
            </ul>
            <div className="external-add-section">
              <h4>{t('addByUrlOrName')}</h4>
              <div className="external-add-form">
                <input
                  type="text"
                  placeholder={t('addRepoPlaceholder')}
                  className="modal-search-input"
                  value={externalRepoInput}
                  onChange={(e) => setExternalRepoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExternalRepo()}
                />
                <button onClick={handleAddExternalRepo} disabled={isAdding} className="add-external-button">
                  {isAdding ? t('adding') : t('add')}
                </button>
              </div>
              {addError && <p className="error-message">{addError}</p>}
            </div>
          </div>
          <div className="repo-column">
            <h3>{t('visibleRepositories')}</h3>
            <ul className="repo-list-modal">
              {localManagedRepos.map(repo => (
                <li key={repo.id}>
                  <span>{repo.name}</span>
                  <button onClick={() => handleLocalRemove(repo)} className="remove-button">-</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="modal-footer">
            <button onClick={onClose} className="footer-button cancel-button">
              {t('cancel')}
            </button>
            <button onClick={handleSave} className="footer-button save-button">
              {t('saveChanges')}
            </button>
        </div>
      </div>
    </div>
  );
}