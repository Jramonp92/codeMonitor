// src/components/RepoManagerModal.tsx

import { useState, useEffect } from 'react';
import type { Repo } from '../hooks/useGithubData';
import './RepoManagerModal.css';

// --- INICIO DE CAMBIOS (NUEVAS PROPS) ---
interface Props {
  isOpen: boolean;
  onClose: () => void;
  allRepos: Repo[];
  managedRepos: Repo[];
  // Reemplazamos onAdd y onRemove con una única función onSave
  onSave: (updatedRepos: Repo[]) => void;
}
// --- FIN DE CAMBIOS ---

export function RepoManagerModal({ isOpen, onClose, allRepos, managedRepos, onSave }: Props) {
  // --- INICIO DE CAMBIOS (ESTADO LOCAL) ---
  // Estado local para los cambios temporales
  const [localManagedRepos, setLocalManagedRepos] = useState<Repo[]>([]);
  
  // Sincroniza el estado local cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setLocalManagedRepos([...managedRepos]);
    }
  }, [isOpen, managedRepos]);
  // --- FIN DE CAMBIOS ---

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

  // --- INICIO DE CAMBIOS (MANEJADORES LOCALES) ---
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
      if (externalRepoInput.includes('/')) {
        repoFullName = externalRepoInput;
      } else {
        setAddError('Formato inválido. Usa "owner/repo" o una URL completa de GitHub.');
        return;
      }
    }

    if (localManagedRepos.some(r => r.full_name.toLowerCase() === repoFullName.toLowerCase())) {
        setAddError('El repositorio ya está en tu lista visible.');
        return;
    }

    setAddError('');
    setIsAdding(true);

    chrome.runtime.sendMessage({ type: 'getRepoDetails', repoFullName }, (response) => {
      setIsAdding(false);
      if (response?.success) {
        handleLocalAdd(response.repo); // Modifica el estado local
        setExternalRepoInput('');
      } else {
        setAddError(response?.error || 'No se pudo encontrar el repositorio.');
      }
    });
  };

  const handleSave = () => {
    onSave(localManagedRepos);
    onClose();
  };
  // --- FIN DE CAMBIOS ---

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
                  {/* Llama al manejador local */}
                  <button onClick={() => handleLocalAdd(repo)} className="add-button">+</button>
                </li>
              ))}
            </ul>
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
              {/* Usa el estado local para renderizar */}
              {localManagedRepos.map(repo => (
                <li key={repo.id}>
                  <span>{repo.name}</span>
                  {/* Llama al manejador local */}
                  <button onClick={() => handleLocalRemove(repo)} className="remove-button">-</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* --- INICIO DE CAMBIOS (BOTONES DE ACCIÓN) --- */}
        <div className="modal-footer">
            <button onClick={onClose} className="footer-button cancel-button">
              Cancelar
            </button>
            <button onClick={handleSave} className="footer-button save-button">
              Guardar Cambios
            </button>
        </div>
        {/* --- FIN DE CAMBIOS --- */}
      </div>
    </div>
  );
}