// src/components/AddTrackedFileModal.tsx

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // 1. Importar el hook
import type { Branch } from '../hooks/useGithubData';
import './AddTrackedFileModal.css';

interface AddTrackedFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  onAdd: (path: string, branch: string) => void;
}

export const AddTrackedFileModal = ({ isOpen, onClose, branches, onAdd }: AddTrackedFileModalProps) => {
  const { t } = useTranslation(); // 2. Usar el hook
  const [path, setPath] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

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
      setPath('');
      onClose();
    }
  };

  // 3. Reemplazar los textos con la función t()
  return (
    <div className="modal-overlay-small">
      <div className="modal-content-small">
        <div className="modal-header-small">
          <h4>{t('addFileToTrackTitle')}</h4>
          <button onClick={onClose} className="close-button-small">&times;</button>
        </div>
        <div className="modal-body-small">
          <div className="form-group">
            <label htmlFor="file-path-input">{t('filePathLabel')}</label>
            <input
              id="file-path-input"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={t('filePathPlaceholder')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="branch-select-input">{t('branchLabel')}</label>
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
            {t('addFileButton')}
          </button>
        </div>
      </div>
    </div>
  );
};