// src/components/AlertsManagerModal.tsx

import { useState, useEffect } from 'react';
import type { Repo, TrackedFile, Branch } from '../hooks/useGithubData';
import type { AlertSettings } from '../background/alarms';
import { AddTrackedFileModal } from './AddTrackedFileModal';
import './AlertsManagerModal.css';

// --- INICIO DE CAMBIOS (NUEVAS PROPS) ---
// La interfaz de Props ahora es mucho más simple.
// Recibe los datos iniciales y una única función onSave.
interface Props {
  isOpen: boolean;
  onClose: () => void;
  managedRepos: Repo[];
  alertSettings: AlertSettings;
  alertFrequency: number;
  trackedFiles: { [repoFullName: string]: TrackedFile[] };
  // La nueva función onSave que guardará todos los cambios a la vez.
  onSave: (data: {
    settings: AlertSettings;
    frequency: number;
    files: { [key: string]: TrackedFile[] };
  }) => void;
}
// --- FIN DE CAMBIOS ---

const alertTypes = [
  { id: 'issues', label: 'Nuevos Issues' },
  { id: 'newPRs', label: 'Nuevos PRs' },
  { id: 'assignedPRs', label: 'PRs Asignados a Mí' },
  { id: 'actions', label: 'Workflows de Actions' },
  { id: 'newReleases', label: 'Nuevos Releases' },
  { id: 'fileChanges', label: 'Cambios en Archivos' },
];

export function AlertsManagerModal({
  isOpen,
  onClose,
  managedRepos,
  alertSettings,
  alertFrequency,
  trackedFiles,
  onSave, // Usamos la nueva prop onSave
}: Props) {
  // --- INICIO DE CAMBIOS (ESTADO LOCAL) ---
  // Estados locales para almacenar los cambios temporalmente
  const [localAlertSettings, setLocalAlertSettings] = useState<AlertSettings>({});
  const [localAlertFrequency, setLocalAlertFrequency] = useState(10);
  const [localTrackedFiles, setLocalTrackedFiles] = useState<{ [key: string]: TrackedFile[] }>({});

  // Este efecto se ejecuta cuando el modal se abre para inicializar el estado local
  useEffect(() => {
    if (isOpen) {
      // Usamos JSON.parse/stringify para crear una copia profunda y evitar mutaciones
      setLocalAlertSettings(JSON.parse(JSON.stringify(alertSettings)));
      setLocalAlertFrequency(alertFrequency);
      setLocalTrackedFiles(JSON.parse(JSON.stringify(trackedFiles)));
    }
  }, [isOpen, alertSettings, alertFrequency, trackedFiles]);
  // --- FIN DE CAMBIOS ---

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [repoForAddModal, setRepoForAddModal] = useState<Repo | null>(null);
  const [branchesForRepo, setBranchesForRepo] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  const handleOpenAddFileModal = async (repo: Repo) => {
    setIsLoadingBranches(true);
    setRepoForAddModal(repo);
    chrome.runtime.sendMessage({ type: 'getBranches', repoFullName: repo.full_name }, (response) => {
      if (response?.success) {
        setBranchesForRepo(response.data || []);
        setIsAddModalOpen(true);
      } else {
        console.error(`Error fetching branches for ${repo.full_name}:`, response?.error);
      }
      setIsLoadingBranches(false);
    });
  };

  const groupFilesByBranch = (files: TrackedFile[] = []) => {
    return files.reduce((acc, file) => {
      (acc[file.branch] = acc[file.branch] || []).push(file);
      return acc;
    }, {} as { [branch: string]: TrackedFile[] });
  };
  
  // --- INICIO DE CAMBIOS (MANEJADORES LOCALES) ---
  const handleLocalSettingsChange = (repoFullName: string, setting: keyof AlertSettings[string], value: boolean) => {
    setLocalAlertSettings(prev => {
      const newSettings = JSON.parse(JSON.stringify(prev));
      if (!newSettings[repoFullName]) {
        newSettings[repoFullName] = {};
      }
      (newSettings[repoFullName] as any)[setting] = value;
      return newSettings;
    });
  };

  const handleLocalAddTrackedFile = (repo: string, path: string, branch: string) => {
    setLocalTrackedFiles(prev => {
      const newFiles = JSON.parse(JSON.stringify(prev));
      const repoFiles = newFiles[repo] || [];
      if (!repoFiles.some((f: TrackedFile) => f.path === path && f.branch === branch)) {
        repoFiles.push({ path, branch });
        newFiles[repo] = repoFiles;
      }
      return newFiles;
    });
  };
  
  const handleLocalRemoveTrackedFile = (repo: string, path: string, branch: string) => {
    setLocalTrackedFiles(prev => {
      const newFiles = JSON.parse(JSON.stringify(prev));
      if (newFiles[repo]) {
        newFiles[repo] = newFiles[repo].filter((f: TrackedFile) => f.path !== path || f.branch !== branch);
        if (newFiles[repo].length === 0) {
          delete newFiles[repo];
        }
      }
      return newFiles;
    });
  };

  const handleSave = () => {
    onSave({
      settings: localAlertSettings,
      frequency: localAlertFrequency,
      files: localTrackedFiles,
    });
    onClose();
  };

  const handleCancel = () => {
    // Simplemente cierra el modal, los cambios locales se perderán
    onClose();
  };
  // --- FIN DE CAMBIOS ---

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content alerts-modal">
        {repoForAddModal && (
          <AddTrackedFileModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            branches={branchesForRepo}
            onAdd={(path, branch) => handleLocalAddTrackedFile(repoForAddModal.full_name, path, branch)}
          />
        )}

        <div className="modal-header">
          <h2>Gestionar Alertas</h2>
          <button onClick={handleCancel} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="frequency-settings">
            <label htmlFor="frequency-select">Revisar cada:</label>
            <select
              id="frequency-select"
              value={localAlertFrequency}
              onChange={(e) => setLocalAlertFrequency(parseInt(e.target.value, 10))}
            >
              <option value={10}>10 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
            </select>
          </div>

          <div className="alerts-table-container">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Repositorio</th>
                  {alertTypes.map(alert => (
                    <th key={alert.id}>{alert.label}</th>
                  ))}
                  <th>Archivos Observados</th>
                </tr>
              </thead>
              <tbody>
                {managedRepos.map(repo => {
                  const currentRepoTrackedFiles = localTrackedFiles[repo.full_name] || [];
                  const groupedFiles = groupFilesByBranch(currentRepoTrackedFiles);

                  return (
                    <tr key={repo.id}>
                      <td>{repo.name}</td>
                      {alertTypes.map(alert => (
                        <td key={alert.id}>
                          <input
                            type="checkbox"
                            checked={!!localAlertSettings[repo.full_name]?.[alert.id as keyof AlertSettings[string]]}
                            onChange={(e) => handleLocalSettingsChange(repo.full_name, alert.id as keyof AlertSettings[string], e.target.checked)}
                          />
                        </td>
                      ))}
                      <td className="tracked-files-cell">
                        {Object.keys(groupedFiles).map(branchName => (
                          <div key={branchName} className="branch-group">
                            <strong>{branchName}:</strong>
                            <ul>
                              {groupedFiles[branchName].map(file => (
                                <li key={file.path}>
                                  <span title={file.path}>{file.path}</span>
                                  <button onClick={() => handleLocalRemoveTrackedFile(repo.full_name, file.path, branchName)} className="remove-file-btn">
                                    &times;
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <button onClick={() => handleOpenAddFileModal(repo)} className="add-file-btn" disabled={isLoadingBranches}>
                          {isLoadingBranches ? 'Cargando...' : '+ Añadir archivo'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {managedRepos.length === 0 && (
            <p className="no-repos-message">Aún no tienes repositorios visibles.</p>
          )}
        </div>
        
        {/* --- INICIO DE CAMBIOS (BOTONES DE ACCIÓN) --- */}
        <div className="modal-footer">
            <button onClick={handleCancel} className="footer-button cancel-button">
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