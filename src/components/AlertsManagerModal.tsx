// src/components/AlertsManagerModal.tsx

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // 1. Importar hook
import type { Repo, TrackedFile, Branch } from '../hooks/useGithubData';
import type { AlertSettings } from '../background/alarms';
import { AddTrackedFileModal } from './AddTrackedFileModal';
import './AlertsManagerModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  managedRepos: Repo[];
  alertSettings: AlertSettings;
  alertFrequency: number;
  trackedFiles: { [repoFullName: string]: TrackedFile[] };
  onSave: (data: {
    settings: AlertSettings;
    frequency: number;
    files: { [key: string]: TrackedFile[] };
  }) => void;
}

// 2. Definir los tipos de alerta y sus claves de traducción
const alertTypes = [
  { id: 'issues', translationKey: 'alertTypeIssues' },
  { id: 'newPRs', translationKey: 'alertTypeNewPRs' },
  { id: 'assignedPRs', translationKey: 'alertTypeAssignedPRs' },
  { id: 'actions', translationKey: 'alertTypeActions' },
  { id: 'newReleases', translationKey: 'alertTypeNewReleases' },
  { id: 'fileChanges', translationKey: 'alertTypeFileChanges' },
];

export function AlertsManagerModal({
  isOpen,
  onClose,
  managedRepos,
  alertSettings,
  alertFrequency,
  trackedFiles,
  onSave,
}: Props) {
  const { t } = useTranslation(); // 3. Usar hook
  const [localAlertSettings, setLocalAlertSettings] = useState<AlertSettings>({});
  const [localAlertFrequency, setLocalAlertFrequency] = useState(10);
  const [localTrackedFiles, setLocalTrackedFiles] = useState<{ [key: string]: TrackedFile[] }>({});

  useEffect(() => {
    if (isOpen) {
      setLocalAlertSettings(JSON.parse(JSON.stringify(alertSettings)));
      setLocalAlertFrequency(alertFrequency);
      setLocalTrackedFiles(JSON.parse(JSON.stringify(trackedFiles)));
    }
  }, [isOpen, alertSettings, alertFrequency, trackedFiles]);

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
  
  const handleLocalSettingsChange = (repoFullName: string, setting: keyof AlertSettings[string], value: boolean) => {
    setLocalAlertSettings(prev => {
      const newSettings = { ...prev };
      if (!newSettings[repoFullName]) {
        newSettings[repoFullName] = {};
      }
      (newSettings[repoFullName] as any)[setting] = value;
      return newSettings;
    });
  };

  const handleLocalAddTrackedFile = (repo: string, path: string, branch: string) => {
    setLocalTrackedFiles(prev => {
      const newFiles = { ...prev };
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
      const newFiles = { ...prev };
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
    onClose();
  };

  if (!isOpen) return null;

  // 4. Reemplazar todos los textos fijos
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
          <h2>{t('manageAlerts')}</h2>
          <button onClick={handleCancel} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <div className="frequency-settings">
            <label htmlFor="frequency-select">{t('checkEvery')}</label>
            <select
              id="frequency-select"
              value={localAlertFrequency}
              onChange={(e) => setLocalAlertFrequency(parseInt(e.target.value, 10))}
            >
              <option value={10}>{t('minutes', { count: 10 })}</option>
              <option value={30}>{t('minutes', { count: 30 })}</option>
              <option value={60}>{t('hour', { count: 1 })}</option>
              <option value={300}>{t('hours', { count: 5 })}</option>
              <option value={720}>{t('hours', { count: 12 })}</option>
              <option value={1440}>{t('hours', { count: 24 })}</option>
              <option value={10080}>{t('week', { count: 1 })}</option>
            </select>
          </div>

          <div className="alerts-table-container">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>{t('repository')}</th>
                  {alertTypes.map(alert => (
                    <th key={alert.id}>{t(alert.translationKey)}</th>
                  ))}
                  <th>{t('trackedFiles')}</th>
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
                          {isLoadingBranches ? t('loading') : t('addFile')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {managedRepos.length === 0 && (
            <p className="no-repos-message">{t('noVisibleRepos')}</p>
          )}
        </div>
        
        <div className="modal-footer">
            <button onClick={handleCancel} className="footer-button cancel-button">
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