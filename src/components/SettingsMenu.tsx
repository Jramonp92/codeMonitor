// src/components/SettingsMenu.tsx

import { useTranslation } from 'react-i18next'; // 1. Importar hook
import './SettingsMenu.css';

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
  const { t } = useTranslation(); // 2. Usar hook

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  // 3. Reemplazar textos fijos
  return (
    <ul className="settings-menu">
      <li>
        <button className="settings-menu-item" onClick={() => handleAction(onManageRepos)}>
          {t('configureRepositories')}
        </button>
      </li>
      <li>
        <button className="settings-menu-item" onClick={() => handleAction(onManageAlerts)}>
          {t('configureAlerts')}
        </button>
      </li>
      <li>
        <button className="settings-menu-item clear-notifications" onClick={() => handleAction(onClearAllNotifications)}>
          {t('clearAllNotifications')}
        </button>
      </li>
      <li>
        <button className="settings-menu-item" onClick={() => handleAction(onOpenSettings)}>
          {t('settings')}
        </button>
      </li>
      <li>
        <button className="settings-menu-item logout" onClick={() => handleAction(onLogout)}>
          {t('logout')}
        </button>
      </li>
    </ul>
  );
};