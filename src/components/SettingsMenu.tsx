import { useState, useEffect, useRef } from 'react';
import './SettingsMenu.css';

interface SettingsMenuProps {
  onManageRepos: () => void;
  onManageAlerts: () => void;
  onLogout: () => void;
}

export const SettingsMenu = ({ onManageRepos, onManageAlerts, onLogout }: SettingsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Efecto para cerrar el menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="settings-menu-container" ref={menuRef}>
      <button className="manage-button" onClick={() => setIsOpen(!isOpen)} title="Settings">
        ⚙️
      </button>

      {isOpen && (
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
            <button className="settings-menu-item" disabled>
              Settings (próximamente)
            </button>
          </li>
          <li>
            <button className="settings-menu-item logout" onClick={() => handleAction(onLogout)}>
              Cerrar Sesión
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};