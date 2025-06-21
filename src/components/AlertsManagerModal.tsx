import type { Repo } from '../hooks/useGithubData';
import type { AlertSettings } from '../background/alarms';
import './AlertsManagerModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  managedRepos: Repo[];
  alertSettings: AlertSettings;
  onSettingsChange: (repoFullName: string, setting: keyof AlertSettings[string], value: boolean) => void;
  alertFrequency: number;
  onFrequencyChange: (frequency: number) => void;
}

// Define the available alert types and their display labels.
const alertTypes = [
  { id: 'issues', label: 'Nuevos Issues' },
  { id: 'newPRs', label: 'Nuevos PRs' },
  { id: 'assignedPRs', label: 'PRs Asignados a Mí' },
  { id: 'actions', label: 'Workflows de Actions' },
  { id: 'newReleases', label: 'Nuevos Releases' },
];

export function AlertsManagerModal({ 
  isOpen, 
  onClose, 
  managedRepos, 
  alertSettings, 
  onSettingsChange,
  alertFrequency,
  onFrequencyChange
}: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content alerts-modal">
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
                </tr>
              </thead>
              <tbody>
                {managedRepos.map(repo => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {managedRepos.length === 0 && (
            <p className="no-repos-message">Aún no tienes repositorios visibles. Añádelos desde el gestor de repositorios (⚙️) para configurar alertas.</p>
          )}
        </div>
      </div>
    </div>
  );
}