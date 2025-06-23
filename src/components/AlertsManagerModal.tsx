// src/components/AlertsManagerModal.tsx

import { useState } from 'react';
// --- INICIO DE CAMBIOS ---
// 1. Importamos los nuevos tipos y el nuevo modal
import type { Repo, TrackedFile, Branch } from '../hooks/useGithubData';
import type { AlertSettings } from '../background/alarms';
import { AddTrackedFileModal } from './AddTrackedFileModal';
// --- FIN DE CAMBIOS ---
import './AlertsManagerModal.css';

// --- INICIO DE CAMBIOS ---
// 2. Actualizamos las props para recibir todo lo relacionado con el seguimiento de archivos
interface Props {
  isOpen: boolean;
  onClose: () => void;
  managedRepos: Repo[];
  alertSettings: AlertSettings;
  onSettingsChange: (repoFullName: string, setting: keyof AlertSettings[string], value: boolean) => void;
  alertFrequency: number;
  onFrequencyChange: (frequency: number) => void;
  trackedFiles: { [repoFullName: string]: TrackedFile[] };
  addTrackedFile: (repo: string, path: string, branch: string) => void;
  removeTrackedFile: (repo: string, path: string, branch: string) => void;
}
// --- FIN DE CAMBIOS ---

const alertTypes = [
  { id: 'issues', label: 'Nuevos Issues' },
  { id: 'newPRs', label: 'Nuevos PRs' },
  { id: 'assignedPRs', label: 'PRs Asignados a Mí' },
  { id: 'actions', label: 'Workflows de Actions' },
  { id: 'newReleases', label: 'Nuevos Releases' },
  // --- INICIO DE CAMBIOS ---
  // 3. Añadimos el nuevo tipo de alerta para cambios en archivos
  { id: 'fileChanges', label: 'Cambios en Archivos' },
  // --- FIN DE CAMBIOS ---
];

export function AlertsManagerModal({ 
  isOpen, 
  onClose, 
  managedRepos, 
  alertSettings, 
  onSettingsChange,
  alertFrequency,
  onFrequencyChange,
  // --- INICIO DE CAMBIOS ---
  // 4. Desestructuramos las nuevas props
  trackedFiles,
  addTrackedFile,
  removeTrackedFile
  // --- FIN DE CAMBIOS ---
}: Props) {
  // --- INICIO DE CAMBIOS ---
  // 5. Estado local para manejar el modal de añadir archivo
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [repoForAddModal, setRepoForAddModal] = useState<Repo | null>(null);
  const [branchesForRepo, setBranchesForRepo] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // 6. Función para abrir el modal de añadir archivo
  const handleOpenAddFileModal = async (repo: Repo) => {
    setIsLoadingBranches(true);
    setRepoForAddModal(repo);
    chrome.runtime.sendMessage({ type: 'getBranches', repoFullName: repo.full_name }, (response) => {
      if (response?.success) {
        setBranchesForRepo(response.data || []);
        setIsAddModalOpen(true);
      } else {
        console.error(`Error fetching branches for ${repo.full_name}:`, response?.error);
        // Aquí podrías mostrar un error al usuario
      }
      setIsLoadingBranches(false);
    });
  };

  // 7. Agrupamos los archivos por rama para una mejor visualización
  const groupFilesByBranch = (files: TrackedFile[] = []) => {
    return files.reduce((acc, file) => {
      (acc[file.branch] = acc[file.branch] || []).push(file);
      return acc;
    }, {} as { [branch: string]: TrackedFile[] });
  };
  // --- FIN DE CAMBIOS ---

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content alerts-modal">
        {/* --- INICIO DE CAMBIOS --- */}
        {/* 8. Renderizamos el modal para añadir archivos si está abierto */}
        {repoForAddModal && (
          <AddTrackedFileModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            branches={branchesForRepo}
            onAdd={(path, branch) => addTrackedFile(repoForAddModal.full_name, path, branch)}
          />
        )}
        {/* --- FIN DE CAMBIOS --- */}

        <div className="modal-header">
          <h2>Gestionar Alertas</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="frequency-settings">
            <label htmlFor="frequency-select">Revisar cada:</label>
            <select 
              id="frequency-select"
              value={alertFrequency} 
              onChange={(e) => onFrequencyChange(parseInt(e.target.value, 10))}
            >
              <option value="10">10 minutos</option>
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
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
                  {/* --- INICIO DE CAMBIOS --- */}
                  {/* 9. Añadimos la nueva cabecera de la tabla */}
                  <th>Archivos Observados</th>
                  {/* --- FIN DE CAMBIOS --- */}
                </tr>
              </thead>
              <tbody>
                {managedRepos.map(repo => {
                  // --- INICIO DE CAMBIOS ---
                  // 10. Obtenemos y agrupamos los archivos para el repo actual
                  const currentRepoTrackedFiles = trackedFiles[repo.full_name] || [];
                  const groupedFiles = groupFilesByBranch(currentRepoTrackedFiles);
                  // --- FIN DE CAMBIOS ---

                  return (
                    <tr key={repo.id}>
                      <td>{repo.name}</td>
                      {alertTypes.map(alert => (
                        <td key={alert.id}>
                          <input
                            type="checkbox"
                            checked={!!alertSettings[repo.full_name]?.[alert.id as keyof AlertSettings[string]]}
                            onChange={(e) => onSettingsChange(repo.full_name, alert.id as keyof AlertSettings[string], e.target.checked)}
                          />
                        </td>
                      ))}
                      {/* --- INICIO DE CAMBIOS --- */}
                      {/* 11. Renderizamos la nueva celda con la lista de archivos */}
                      <td className="tracked-files-cell">
                        {Object.keys(groupedFiles).map(branchName => (
                          <div key={branchName} className="branch-group">
                            <strong>{branchName}:</strong>
                            <ul>
                              {groupedFiles[branchName].map(file => (
                                <li key={file.path}>
                                  <span title={file.path}>{file.path}</span>
                                  <button onClick={() => removeTrackedFile(repo.full_name, file.path, branchName)} className="remove-file-btn">
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
                      {/* --- FIN DE CAMBIOS --- */}
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
      </div>
    </div>
  );
}