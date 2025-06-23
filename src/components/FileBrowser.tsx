// src/components/FileBrowser.tsx

import type { DirectoryContentItem } from '../hooks/useGithubData';
import './FileBrowser.css';
// --- INICIO DE CAMBIOS ---
// 1. Importamos los iconos necesarios
import { VscFolder, VscFile, VscArrowUp, VscEye, VscEyeClosed } from 'react-icons/vsc';
// --- FIN DE CAMBIOS ---

// --- INICIO DE CAMBIOS ---
// 2. Actualizamos las props para recibir las funciones y datos de seguimiento
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
}
// --- FIN DE CAMBIOS ---

export const FileBrowser = ({ 
  content, 
  currentPath, 
  onPathChange, 
  onFileSelect,
  // --- INICIO DE CAMBIOS ---
  // 3. Desestructuramos las nuevas props
  repoFullName,
  selectedBranch,
  isTracked,
  addTrackedFile,
  removeTrackedFile,
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

  // --- INICIO DE CAMBIOS ---
  // 4. Creamos el manejador para el botón de observar/dejar de observar
  const handleToggleTrack = (event: React.MouseEvent, item: DirectoryContentItem) => {
    event.stopPropagation(); // Evita que se abra el archivo al hacer clic en el ojo
    if (isTracked(repoFullName, item.path, selectedBranch)) {
      removeTrackedFile(repoFullName, item.path, selectedBranch);
    } else {
      addTrackedFile(repoFullName, item.path, selectedBranch);
    }
  };
  // --- FIN DE CAMBIOS ---

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
          sortedContent.map(item => (
            <li 
              key={item.sha} 
              className="file-item" 
              // 5. El onClick principal solo se activa si no es un botón de trackeo
              onClick={() => item.type === 'dir' ? onPathChange(item.path) : onFileSelect(item.path)}
            >
              <div className="item-main-content">
                <span className="item-icon">
                  {item.type === 'dir' ? <VscFolder /> : <VscFile />}
                </span>
                <span className="item-name">{item.name}</span>
              </div>
              
              {/* --- INICIO DE CAMBIOS --- */}
              {/* 6. Si es un archivo, mostramos el botón para observar */}
              {item.type === 'file' && (
                <button 
                  className={`track-button ${isTracked(repoFullName, item.path, selectedBranch) ? 'tracked' : ''}`}
                  onClick={(e) => handleToggleTrack(e, item)}
                  aria-label={isTracked(repoFullName, item.path, selectedBranch) ? 'Dejar de observar' : 'Observar archivo'}
                >
                  {isTracked(repoFullName, item.path, selectedBranch) ? <VscEye /> : <VscEyeClosed />}
                </button>
              )}
              {/* --- FIN DE CAMBIOS --- */}
            </li>
          ))
        ) : (
          !currentPath && <li className="empty-directory">Este directorio está vacío.</li>
        )}
      </ul>
    </div>
  );
};