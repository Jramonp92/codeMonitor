// src/components/ContentDisplay.tsx

import './ContentDisplay.css';
import { ItemStatus } from './ItemStatus';
import { FileBrowser } from './FileBrowser';
import { FileViewer } from './FileViewer';
import type { 
  Tab, 
  IssueInfo, 
  PullRequestInfo, 
  ActionInfo, 
  CommitInfo, 
  ReleaseInfo,
  DirectoryContentItem,
  ViewedFile,
  ReviewState
} from '../hooks/useGithubData';
import type { ActiveNotifications } from '../background/alarms';
import { VscCheck, VscError, VscCircleSlash, VscLoading, VscQuestion, VscVmRunning } from 'react-icons/vsc';

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
  directoryContent: DirectoryContentItem[];
  currentPath: string;
  viewedFile: ViewedFile | null;
  handlePathChange: (newPath: string) => void;
  handleFileSelect: (filePath: string) => void;
  setViewedFile: (file: ViewedFile | null) => void;
  repoFullName: string;
  selectedBranch: string;
  isTracked: (repo: string, path: string, branch: string) => boolean;
  addTrackedFile: (repo: string, path: string, branch: string) => void;
  removeTrackedFile: (repo: string, path: string, branch: string) => void;
}

const ApprovalStatusIndicator = ({ state }: { state?: ReviewState }) => {
  if (!state || state === 'PENDING') {
    return null;
  }

  const statusInfo = {
    APPROVED: { text: 'Aprobado', className: 'approved', icon: <VscCheck /> },
    CHANGES_REQUESTED: { text: 'Cambios solicitados', className: 'changes-requested', icon: <VscError /> },
  }[state];

  if (!statusInfo) return null;

  return (
    <div className={`approval-status ${statusInfo.className}`}>
      {statusInfo.icon}
      <span>{statusInfo.text}</span>
    </div>
  );
};

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
  activeNotifications,
  directoryContent,
  currentPath,
  viewedFile,
  handlePathChange,
  handleFileSelect,
  setViewedFile,
  repoFullName,
  selectedBranch,
  isTracked,
  addTrackedFile,
  removeTrackedFile,
}: ContentDisplayProps) => {

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
    const iconProps = { className: 'action-status-icon' }; 
    
    if (status === 'completed') {
      switch (conclusion) {
        case 'success':
          return <VscCheck {...iconProps} className={`${iconProps.className} status-success`} />;
        case 'failure':
          return <VscError {...iconProps} className={`${iconProps.className} status-failure`} />;
        case 'cancelled':
          return <VscCircleSlash {...iconProps} className={`${iconProps.className} status-cancelled`} />;
        default:
          return <VscQuestion {...iconProps} />;
      }
    }
    if (status === 'in_progress') return <VscVmRunning {...iconProps} className={`${iconProps.className} status-inprogress`} />;
    
    return <VscLoading {...iconProps} />;
  };

  const renderItemList = (items: (IssueInfo | PullRequestInfo)[], notificationKeys: (keyof ActiveNotifications[string])[]) => (
    <ul className="item-list">
      {items.map((item) => {
        const notificationsForRepo = activeNotifications[selectedRepo] || {};
        const isNew = notificationKeys.some(key => {
            const notifications = notificationsForRepo[key];
            return Array.isArray(notifications) && (notifications as number[]).includes(item.id);
        });
        
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

        const prItem = item as PullRequestInfo;

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
                  <div className="assignee-and-status-container">
                    <ApprovalStatusIndicator state={prItem.approvalState} />
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
              </div>
          </li>
        );
      })}
    </ul>
  );

  if (!selectedRepo) return null;

  const hasDataForOtherTabs = commits.length > 0 || issues.length > 0 || pullRequests.length > 0 || actions.length > 0 || releases.length > 0;
  
  if (isContentLoading && !hasDataForOtherTabs && activeTab !== 'README' && activeTab !== 'Code') {
    return (
      <div className="content-placeholder">
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (isContentLoading && (activeTab === 'README' || (activeTab === 'Code' && !viewedFile))) {
    return (
      <div className="content-placeholder">
        <div className="spinner"></div>
      </div>
    );
  }
    
  if (activeTab === 'README') {
    if (readmeHtml) {
      return <div className="readme-content" dangerouslySetInnerHTML={{ __html: readmeHtml }} />;
    }
    return <p className="loading-text">No se encontró un archivo README para este repositorio.</p>;
  }
  
  if (activeTab === 'Code') {
    if (viewedFile) {
      return (
        <FileViewer 
          file={viewedFile} 
          onBack={() => setViewedFile(null)}
          repoFullName={repoFullName}
          selectedBranch={selectedBranch}
          isTracked={isTracked}
          addTrackedFile={addTrackedFile}
          removeTrackedFile={removeTrackedFile}
        />
      );
    }
    return (
      <FileBrowser 
        content={directoryContent}
        currentPath={currentPath}
        onPathChange={handlePathChange}
        onFileSelect={handleFileSelect}
        repoFullName={repoFullName}
        selectedBranch={selectedBranch}
        isTracked={isTracked}
        addTrackedFile={addTrackedFile}
        removeTrackedFile={removeTrackedFile}
        activeNotifications={activeNotifications}
      />
    );
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