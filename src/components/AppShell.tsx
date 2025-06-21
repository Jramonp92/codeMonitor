import type { ReactNode } from 'react';
import type { GitHubUser } from '../hooks/useGithubData';

interface AppShellProps {
  isLoading: boolean;
  user: GitHubUser | null;
  onLogin: () => void;
  children: ReactNode;
}

export const AppShell = ({ isLoading, user, onLogin, children }: AppShellProps) => {
  if (isLoading) {
    return (
      <div className="app-container">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container">
        <h1>Repo Observer</h1>
        <button onClick={onLogin}>Iniciar Sesión con GitHub</button>
      </div>
    );
  }

  return <>{children}</>;
};