import { useState, useEffect, useRef } from 'react';
import './AppHeader.css';
import { SettingsMenu } from './SettingsMenu';
import type { GitHubUser } from '../hooks/useGithubData';

// Un componente simple para el ícono de la flecha
const ChevronDownIcon = () => (
  <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"></path>
  </svg>
);

interface AppHeaderProps {
  user: GitHubUser;
  onManageRepos: () => void;
  onManageAlerts: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  // --- INICIO DE CAMBIOS ---
  // 1. Añadimos la nueva prop para la función de limpiar notificaciones.
  onClearAllNotifications: () => void;
  // --- FIN DE CAMBIOS ---
}

export const AppHeader = ({ 
  user, 
  onManageRepos, 
  onManageAlerts, 
  onLogout, 
  onOpenSettings,
  // --- INICIO DE CAMBIOS ---
  // 2. Recibimos la nueva prop.
  onClearAllNotifications
  // --- FIN DE CAMBIOS ---
}: AppHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Efecto para cerrar el menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="app-header__title">
        Repo Observer
      </div>
      
      <div className="app-header__actions" ref={menuContainerRef}>
        <button className="app-header__user-trigger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <img src={user.avatar_url} alt="Avatar del usuario" className="app-header__avatar" />
          <span className="app-header__username">{user.login}</span>
          <ChevronDownIcon />
        </button>
        
        {isMenuOpen && (
          <SettingsMenu
            onManageRepos={onManageRepos}
            onManageAlerts={onManageAlerts}
            onLogout={onLogout}
            onClose={() => setIsMenuOpen(false)}
            onOpenSettings={onOpenSettings}
            onClearAllNotifications={onClearAllNotifications}
          />
        )}
      </div>
    </header>
  );
};