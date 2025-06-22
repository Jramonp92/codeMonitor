import './SettingsMenu.css';

// La interfaz ahora incluye la nueva función para limpiar notificaciones
interface SettingsMenuProps {
  onManageRepos: () => void;
  onManageAlerts: () => void;
  onLogout: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onClearAllNotifications: () => void;
}

export const SettingsMenu = ({ 
  onManageRepos, 
  onManageAlerts, 
  onLogout, 
  onClose, 
  onOpenSettings,
  onClearAllNotifications 
}: SettingsMenuProps) => {

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <ul className="settings-menu">
      <li>
        <button className="settings-menu-item" onClick={() => handleAction(onManageRepos)}>
          Configurar Repositorios
        </button>
      </li>
      <li>
        <button className="settings-menu-item" onClick={() => handleAction(onManageAlerts)}>
          Configurar Alertas
        </button>
      </li>
      <li>
        <button className="settings-menu-item clear-notifications" onClick={() => handleAction(onClearAllNotifications)}>
          Limpiar todas las notificaciones
        </button>
      </li>
      <li>
        <button className="settings-menu-item" onClick={() => handleAction(onOpenSettings)}>
          Settings
        </button>
      </li>
      <li>
        <button className="settings-menu-item logout" onClick={() => handleAction(onLogout)}>
          Cerrar Sesión
        </button>
      </li>
    </ul>
  );
};