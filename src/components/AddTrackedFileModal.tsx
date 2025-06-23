// src/components/AddTrackedFileModal.tsx

import { useState, useEffect } from 'react';
import type { Branch } from '../hooks/useGithubData';
import './AddTrackedFileModal.css';

interface AddTrackedFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  onAdd: (path: string, branch: string) => void;
}

export const AddTrackedFileModal = ({ isOpen, onClose, branches, onAdd }: AddTrackedFileModalProps) => {
  const [path, setPath] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // Setea la primera rama como seleccionada por defecto cuando el modal se abre
  useEffect(() => {
    if (isOpen && branches.length > 0) {
      setSelectedBranch(branches[0].name);
    }
  }, [isOpen, branches]);

  if (!isOpen) {
    return null;
  }

  const handleAdd = () => {
    if (path && selectedBranch) {
      onAdd(path, selectedBranch);
      setPath(''); // Limpiar el input
      onClose();
    }
  };

  return (
    <div className="modal-overlay-small">
      <div className="modal-content-small">
        <div className="modal-header-small">
          <h4>Añadir Archivo a Observar</h4>
          <button onClick={onClose} className="close-button-small">&times;</button>
        </div>
        <div className="modal-body-small">
          <div className="form-group">
            <label htmlFor="file-path-input">Ruta del Archivo:</label>
            <input
              id="file-path-input"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="ej: src/components/Button.tsx"
            />
          </div>
          <div className="form-group">
            <label htmlFor="branch-select-input">Rama:</label>
            <select
              id="branch-select-input"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {branches.map(branch => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleAdd} 
            disabled={!path || !selectedBranch} 
            className="add-button-small"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
};