// src/components/FileBrowser.tsx

import { useTranslation } from 'react-i18next'; // 1. Importar hook
import type { DirectoryContentItem } from '../hooks/useGithubData';
import type { ActiveNotifications } from '../background/alarms';
import './FileBrowser.css';
import { VscFolder, VscFile, VscArrowUp, VscEye, VscEyeClosed } from 'react-icons/vsc';

interface FileBrowserProps {
  content: DirectoryContentItem[];
  currentPath: string;
  onPathChange: (newPath: string) => void;
  onFileSelect: (filePath: string) => void;
  repoFullName: string;
  selectedBranch: string;
  isTracked: (repo: string, path: string, branch: string) => boolean;
  addTrackedFile: (repo: string, path: string, branch: string) => void;
  removeTrackedFile: (repo: string, path: string, branch: string) => void;
  activeNotifications: ActiveNotifications;
}

export const FileBrowser = ({ 
  content, 
  currentPath, 
  onPathChange, 
  onFileSelect,
  repoFullName,
  selectedBranch,
  isTracked,
  addTrackedFile,
  removeTrackedFile,
  activeNotifications
}: FileBrowserProps) => {
  const { t } = useTranslation(); // 2. Usar hook
  const pathSegments = currentPath.split('/').filter(Boolean);

  const handleBreadcrumbClick = (index: number) => {
    const newPath = pathSegments.slice(0, index + 1).join('/');
    onPathChange(newPath);
  };
  
  const handleGoUp = () => {
    const parentPath = pathSegments.slice(0, -1).join('/');
    onPathChange(parentPath);
  };

  const handleToggleTrack = (event: React.MouseEvent, item: DirectoryContentItem) => {
    event.stopPropagation();
    if (isTracked(repoFullName, item.path, selectedBranch)) {
      removeTrackedFile(repoFullName, item.path, selectedBranch);
    } else {
      addTrackedFile(repoFullName, item.path, selectedBranch);
    }
  };

  const sortedContent = [...content].sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'dir' ? -1 : 1;
  });

  // 3. Reemplazar textos fijos
  return (
    <div className="file-browser-container">
      <div className="breadcrumbs">
        <span className="breadcrumb-item" onClick={() => onPathChange('')}>
          {t('rootBreadcrumb')}
        </span>
        {pathSegments.map((segment, index) => (
          <span key={index}>
            {' / '}
            <span className="breadcrumb-item" onClick={() => handleBreadcrumbClick(index)}>
              {segment}
            </span>
          </span>
        ))}
      </div>

      <ul className="file-list">
        {currentPath && (
          <li className="file-item" onClick={handleGoUp}>
            <span className="item-icon">
              <VscArrowUp />
            </span>
            <span className="item-name">..</span>
          </li>
        )}

        {sortedContent.length > 0 ? (
          sortedContent.map(item => {
            let hasNotification = false;
            const fileChanges = activeNotifications[repoFullName]?.fileChanges || [];

            if (item.type === 'file') {
              hasNotification = fileChanges.some(n => n.path === item.path && n.branch === selectedBranch);
            } else {
              hasNotification = fileChanges.some(n => n.branch === selectedBranch && n.path.startsWith(item.path + '/'));
            }

            return (
              <li 
                key={item.sha} 
                className="file-item" 
                onClick={() => item.type === 'dir' ? onPathChange(item.path) : onFileSelect(item.path)}
              >
                <div className="item-main-content">
                  <span className="item-icon">
                    {item.type === 'dir' ? <VscFolder /> : <VscFile />}
                  </span>
                  <span className="item-name">{item.name}</span>
                  {hasNotification && <span className="notification-dot item-dot"></span>}
                </div>
                
                {item.type === 'file' && (
                  <button 
                    className={`track-button ${isTracked(repoFullName, item.path, selectedBranch) ? 'tracked' : ''}`}
                    onClick={(e) => handleToggleTrack(e, item)}
                    aria-label={isTracked(repoFullName, item.path, selectedBranch) ? t('untrackFile') : t('trackFile')}
                  >
                    {isTracked(repoFullName, item.path, selectedBranch) ? <VscEye /> : <VscEyeClosed />}
                  </button>
                )}
              </li>
            )
          })
        ) : (
          !currentPath && <li className="empty-directory">{t('emptyDirectory')}</li>
        )}
      </ul>
    </div>
  );
};