import { useState } from 'react';
import type { Repo } from '../hooks/useGithubData';
import './RepoManagerModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allRepos: Repo[];
  managedRepos: Repo[];
  onAdd: (repo: Repo) => void;
  onRemove: (repo: Repo) => void;
}

export function RepoManagerModal({ isOpen, onClose, allRepos, managedRepos, onAdd, onRemove }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  // Estado para añadir repositorios externos
  const [externalRepoInput, setExternalRepoInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  if (!isOpen) {
    return null;
  }

  // IDs de los repositorios gestionados para una búsqueda rápida
  const managedRepoIds = new Set(managedRepos.map(r => r.id));

  // Filtra los repositorios disponibles: aquellos que aún no están gestionados y coinciden con la búsqueda
  const availableFiltered = allRepos
    .filter(repo => !managedRepoIds.has(repo.id))
    .filter(repo => repo.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Función para manejar la adición de repositorios externos
  const handleAddExternalRepo = () => {
    let repoFullName = '';
    try {
      // Intenta analizar como URL completa
      const url = new URL(externalRepoInput);
      if (url.hostname !== 'github.com') {
        setAddError('La URL debe ser de github.com');
        return;
      }
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length < 2) {
        setAddError('Formato de URL inválido. Usa: owner/repo');
        return;
      }
      repoFullName = `${pathParts[0]}/${pathParts[1]}`;
    } catch (e) {
      // Si no es una URL, asume el formato "owner/repo"
      if (externalRepoInput.includes('/')) {
        repoFullName = externalRepoInput;
      } else {
        setAddError('Formato inválido. Usa "owner/repo" o una URL completa de GitHub.');
        return;
      }
    }

    if (managedRepos.some(r => r.full_name.toLowerCase() === repoFullName.toLowerCase())) {
        setAddError('El repositorio ya está en tu lista visible.');
        return;
    }

    setAddError('');
    setIsAdding(true);

    chrome.runtime.sendMessage({ type: 'getRepoDetails', repoFullName }, (response) => {
      setIsAdding(false);
      if (response?.success) {
        onAdd(response.repo);
        setExternalRepoInput(''); // Limpiar input si tiene éxito
      } else {
        setAddError(response?.error || 'No se pudo encontrar el repositorio.');
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Gestionar Repositorios</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="repo-column">
            <h3>Repositorios Disponibles</h3>
            <input
              type="text"
              placeholder="Buscar en tus repositorios..."
              className="modal-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ul className="repo-list-modal">
              {availableFiltered.map(repo => (
                <li key={repo.id}>
                  <span>{repo.name}</span>
                  <button onClick={() => onAdd(repo)} className="add-button">+</button>
                </li>
              ))}
            </ul>
            {/* Formulario para añadir repositorios externos */}
            <div className="external-add-section">
              <h4>Añadir por URL o Nombre</h4>
              <div className="external-add-form">
                <input
                  type="text"
                  placeholder="ej: facebook/react"
                  className="modal-search-input"
                  value={externalRepoInput}
                  onChange={(e) => setExternalRepoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExternalRepo()}
                />
                <button onClick={handleAddExternalRepo} disabled={isAdding} className="add-external-button">
                  {isAdding ? '...' : 'Añadir'}
                </button>
              </div>
              {addError && <p className="error-message">{addError}</p>}
            </div>
          </div>
          <div className="repo-column">
            <h3>Repositorios Visibles</h3>
            <ul className="repo-list-modal">
              {managedRepos.map(repo => (
                <li key={repo.id}>
                  <span>{repo.name}</span>
                  <button onClick={() => onRemove(repo)} className="remove-button">-</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}