import './SettingsMenu.css';

// La interfaz ahora incluye una función 'onClose' y 'onOpenSettings'
interface SettingsMenuProps {
  onManageRepos: () => void;
  onManageAlerts: () => void;
  onLogout: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const SettingsMenu = ({ onManageRepos, onManageAlerts, onLogout, onClose, onOpenSettings }: SettingsMenuProps) => {

  // Esta función auxiliar ejecuta la acción y luego invoca el cierre del menú
  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  // El componente ahora es solo la lista de opciones (el panel del menú)
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