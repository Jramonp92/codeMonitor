// Importamos el archivo CSS
import './ContentDisplay.css'; 

// Componentes que se usan dentro de ContentDisplay
import { ItemStatus } from './ItemStatus'; 

// Tipos que necesita este componente
import type { Tab, IssueInfo, PullRequestInfo, ActionInfo, CommitInfo, ReleaseInfo } from '../hooks/useGithubData';
import type { ActiveNotifications } from '../background/alarms';

// Definimos las props que recibirá el componente
export interface ContentDisplayProps {
  activeTab: Tab;
  isContentLoading: boolean;
  selectedRepo: string;
  readmeHtml: string;
  commits: CommitInfo[];
  issues: IssueInfo[];
  pullRequests: PullRequestInfo[];
  actions: ActionInfo[];
  releases: ReleaseInfo[];
  activeNotifications: ActiveNotifications;
}

// Exportamos el componente
export const ContentDisplay = ({ 
  activeTab, 
  isContentLoading, 
  selectedRepo, 
  readmeHtml, 
  commits, 
  issues, 
  pullRequests, 
  actions, 
  releases,
  activeNotifications 
}: ContentDisplayProps) => {

  // --- Helpers ---
  const formatCommitDate = (dateString: string) => {
    if (!dateString) return '';
    const commitDate = new Date(dateString);
    const today = new Date();
    if (commitDate.toDateString() === today.toDateString()) {
      return `Today ${commitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return commitDate.toLocaleDateString();
  };
  
  const getStatusIcon = (status: ActionInfo['status'], conclusion: ActionInfo['conclusion']) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success': return '✅'; case 'failure': return '❌';
        case 'cancelled': return '🚫'; default: return '⚪️';
      }
    }
    if (status === 'in_progress') return '⏳'; return '큐';
  };

  const renderItemList = (items: (IssueInfo | PullRequestInfo)[], notificationKeys: (keyof ActiveNotifications[string])[]) => (
    <ul className="item-list">
      {items.map((item) => {
        const notificationsForRepo = activeNotifications[selectedRepo] || {};
        const isNew = notificationKeys.some(key => notificationsForRepo[key]?.includes(item.id));
        
        let dateLabel = '';
        let dateValue = '';

        if ('merged_at' in item && item.merged_at) {
          dateLabel = 'Mergeado';
          dateValue = formatCommitDate(item.merged_at);
        } else if (item.closed_at) {
          dateLabel = 'Cerrado';
          dateValue = formatCommitDate(item.closed_at);
        } else {
          dateLabel = 'Abierto';
          dateValue = formatCommitDate(item.created_at);
        }

        return (
          <li key={item.id}>
              <div className="item-title-container">
                  <a href={item.html_url} target="_blank" rel="noopener noreferrer">#{item.number} {item.title}</a>
                  {isNew && <span className="notification-dot"></span>}
                  <ItemStatus item={item} />
              </div>
              <div className="item-meta">
                  <div className="item-meta-column">
                    <span>Creado por <strong>{item.user.login}</strong></span>
                    <span className="item-date">{dateLabel}: {dateValue}</span>
                  </div>
                  {item.assignees && item.assignees.length > 0 ? (
                      <div className="assignee-info">
                          <span>Asignado a:</span>
                          {item.assignees.map(assignee => (
                              <a key={assignee.login} href={assignee.html_url} target="_blank" rel="noopener noreferrer" title={assignee.login}>
                                  <img src={assignee.avatar_url} alt={`Avatar de ${assignee.login}`} className="assignee-avatar" />
                              </a>
                          ))}
                      </div>
                  ) : (
                      <div className="assignee-info">
                          <span>No asignado</span>
                      </div>
                  )}
              </div>
          </li>
        );
      })}
    </ul>
  );

  // --- Lógica de Renderizado ---
  if (!selectedRepo) return null;

  const hasExistingData = commits.length > 0 || issues.length > 0 || pullRequests.length > 0 || actions.length > 0 || releases.length > 0;

  // --- INICIO DE LA MEJORA ---
  // Reemplazamos los textos de carga por el spinner
  if (isContentLoading && !hasExistingData && activeTab !== 'README') {
    return (
      <div className="content-placeholder">
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (isContentLoading && activeTab === 'README') {
    return (
      <div className="content-placeholder">
        <div className="spinner"></div>
      </div>
    );
  }
  // --- FIN DE LA MEJORA ---
    
  if (activeTab === 'README') {
    if (readmeHtml) {
      return <div className="readme-content" dangerouslySetInnerHTML={{ __html: readmeHtml }} />;
    }
    return <p className="loading-text">No se encontró un archivo README para este repositorio.</p>;
  }
    
  const notificationsForRepo = activeNotifications[selectedRepo] || {};
  
  if (activeTab === 'Commits' && commits.length > 0) {
    return (
      <ul className="item-list">
        {commits.map((c) => (
          <li key={c.sha}>
            <div className="item-title-container item-title-container--with-margin">
              <a href={c.html_url} target="_blank" rel="noopener noreferrer">
                {c.commit.message.split('\n')[0]}
              </a>
            </div>
            <div className="item-meta">
              <div className="item-meta-column commit-meta-details">
                <a href={c.html_url} target="_blank" rel="noopener noreferrer" title="Ver commit en GitHub">
                  <code>{c.sha.substring(0, 7)}</code>
                </a>
                <span title={new Date(c.commit.author.date).toLocaleString()}>
                  {formatCommitDate(c.commit.author.date)}
                </span>
              </div>
              <div className="assignee-info">
                <span>Author:</span>
                {c.author ? (
                  <a href={c.author.html_url} target="_blank" rel="noopener noreferrer" title={c.author.login}>
                    <img src={c.author.avatar_url} alt={`Avatar de ${c.author.login}`} className="assignee-avatar" />
                  </a>
                ) : (
                  <strong className="commit-author-name">{c.commit.author.name}</strong>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  
  if (activeTab === 'Issues' && issues.length > 0) return renderItemList(issues, ['issues']);
  if (activeTab === 'PRs' && pullRequests.length > 0) return renderItemList(pullRequests, ['newPRs', 'assignedPRs']);
  
  if (activeTab === 'Actions' && actions.length > 0) {
    return (
      <ul className="item-list">
        {actions.map((action) => {
            const isNew = notificationsForRepo.actions?.includes(action.id);
            return (
              <li key={action.id}>
                  <div className="item-title-container">
                      <a href={action.html_url} target="_blank" rel="noopener noreferrer" title={action.name}>
                          {getStatusIcon(action.status, action.conclusion)} {action.name} #{action.run_number}
                      </a>
                      {isNew && <span className="notification-dot"></span>}
                  </div>
                  
                  <div className="item-meta">
                    <div className="item-meta-column">
                      <div className="action-details">
                        <span>Triggered by <strong>{action.event.replace(/_/g, ' ')}</strong> on branch <code>{action.head_branch}</code></span>
                        {action.pull_requests?.length > 0 && action.pull_requests[0] && (
                          <a href={action.pull_requests[0].html_url} target="_blank" rel="noopener noreferrer" className="pr-link action-pr-link">
                            (PR #{action.pull_requests[0].number})
                          </a>
                        )}
                      </div>
                      <span className="item-date">
                        {formatCommitDate(action.created_at)}
                      </span>
                    </div>

                    <div className="assignee-info">
                      <span>Iniciado por:</span>
                      <a href={`https://github.com/${action.actor.login}`} target="_blank" rel="noopener noreferrer" title={action.actor.login}>
                        <img 
                          src={action.actor.avatar_url} 
                          alt={`Avatar de ${action.actor.login}`} 
                          className="assignee-avatar"
                        />
                      </a>
                    </div>
                  </div>
              </li>
            );
        })}
      </ul>
    );
  }
  
  if (activeTab === 'Releases' && releases.length > 0) {
    return (
      <ul className="item-list">
        {releases.map((release, index) => {
          const isNew = notificationsForRepo.newReleases?.includes(release.id);
          return (
            <li key={release.id}>
              <div className="item-title-container">
                <a href={release.html_url} target="_blank" rel="noopener noreferrer">
                  {release.name || release.tag_name}
                </a>
                {isNew && <span className="notification-dot"></span>}
              </div>

              <div className="item-meta item-meta--align-start">
                <div className="item-meta-column">
                  <div className="release-tags">
                    {index === 0 && !release.prerelease && <span className="release-tag latest">Latest</span>}
                    {release.prerelease && <span className="release-tag prerelease">Pre-release</span>}
                  </div>
                  <span className="item-date">
                    Publicado el {new Date(release.published_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="assignee-info">
                  <span>Author:</span>
                  <a href={release.author.html_url} target="_blank" rel="noopener noreferrer" title={release.author.login}>
                    <img 
                      src={release.author.avatar_url}
                      alt={`Avatar de ${release.author.login}`}
                      className="assignee-avatar"
                    />
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
    
  return <p className="loading-text">No se encontraron datos para esta pestaña.</p>;
}