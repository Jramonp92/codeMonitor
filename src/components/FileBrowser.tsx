// src/components/FileBrowser.tsx

// --- INICIO DE CAMBIOS ---
// 1. Importamos el tipo ActiveNotifications
import type { DirectoryContentItem } from '../hooks/useGithubData';
import type { ActiveNotifications } from '../background/alarms';
// --- FIN DE CAMBIOS ---
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
  // --- INICIO DE CAMBIOS ---
  // 2. Añadimos la nueva prop para recibir las notificaciones
  activeNotifications: ActiveNotifications;
  // --- FIN DE CAMBIOS ---
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
  // --- INICIO DE CAMBIOS ---
  // 3. Desestructuramos la nueva prop
  activeNotifications
  // --- FIN DE CAMBIOS ---
}: FileBrowserProps) => {
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

  return (
    <div className="file-browser-container">
      <div className="breadcrumbs">
        <span className="breadcrumb-item" onClick={() => onPathChange('')}>
          Raíz
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
            // --- INICIO DE CAMBIOS ---
            // 4. Lógica para determinar si el item (archivo o carpeta) tiene una notificación
            let hasNotification = false;
            const fileChanges = activeNotifications[repoFullName]?.fileChanges || [];

            if (item.type === 'file') {
              hasNotification = fileChanges.some(n => n.path === item.path && n.branch === selectedBranch);
            } else { // 'dir'
              hasNotification = fileChanges.some(n => n.branch === selectedBranch && n.path.startsWith(item.path + '/'));
            }
            // --- FIN DE CAMBIOS ---

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
                  {/* 5. Mostramos el punto rojo si hay notificación */}
                  {hasNotification && <span className="notification-dot item-dot"></span>}
                </div>
                
                {item.type === 'file' && (
                  <button 
                    className={`track-button ${isTracked(repoFullName, item.path, selectedBranch) ? 'tracked' : ''}`}
                    onClick={(e) => handleToggleTrack(e, item)}
                    aria-label={isTracked(repoFullName, item.path, selectedBranch) ? 'Dejar de observar' : 'Observar archivo'}
                  >
                    {isTracked(repoFullName, item.path, selectedBranch) ? <VscEye /> : <VscEyeClosed />}
                  </button>
                )}
              </li>
            )
          })
        ) : (
          !currentPath && <li className="empty-directory">Este directorio está vacío.</li>
        )}
      </ul>
    </div>
  );
};