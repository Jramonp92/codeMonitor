import './AppHeader.css'; // Asegúrate de que esta línea esté presente
import { SettingsMenu } from './SettingsMenu';
import type { GitHubUser } from '../hooks/useGithubData';

interface AppHeaderProps {
  user: GitHubUser;
  onManageRepos: () => void;
  onManageAlerts: () => void;
  onLogout: () => void;
}

export const AppHeader = ({ user, onManageRepos, onManageAlerts, onLogout }: AppHeaderProps) => {
  return (
    <header className="app-header">
      <div className="app-header__user-info">
        <img src={user.avatar_url} alt="Avatar del usuario" className="app-header__avatar" />
        <span className="app-header__username">{user.login}</span>
      </div>
      
      <SettingsMenu
        onManageRepos={onManageRepos}
        onManageAlerts={onManageAlerts}
        onLogout={onLogout}
      />
    </header>
  );
};