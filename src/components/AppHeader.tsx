// src/components/AppHeader.tsx

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next'; // 1. Importar hook
import './AppHeader.css';
import { SettingsMenu } from './SettingsMenu';
import type { GitHubUser } from '../hooks/useGithubData';

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
  onClearAllNotifications: () => void;
}

export const AppHeader = ({ 
  user, 
  onManageRepos, 
  onManageAlerts, 
  onLogout, 
  onOpenSettings,
  onClearAllNotifications
}: AppHeaderProps) => {
  const { t } = useTranslation(); // 2. Usar hook
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

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
        {t('appTitle')}
      </div>
      
      <div className="app-header__actions" ref={menuContainerRef}>
        <button className="app-header__user-trigger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <img src={user.avatar_url} alt={t('userAvatarAlt')} className="app-header__avatar" />
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