// src/components/FileBrowser.tsx

import type { DirectoryContentItem } from '../hooks/useGithubData';
import './FileBrowser.css';
// --- INICIO DE CAMBIOS ---
// 1. Importamos los iconos que usaremos desde react-icons
import { VscFolder, VscFile, VscArrowUp } from 'react-icons/vsc';
// --- FIN DE CAMBIOS ---

interface FileBrowserProps {
  content: DirectoryContentItem[];
  currentPath: string;
  onPathChange: (newPath: string) => void;
  onFileSelect: (filePath: string) => void;
}

export const FileBrowser = ({ content, currentPath, onPathChange, onFileSelect }: FileBrowserProps) => {
  const pathSegments = currentPath.split('/').filter(Boolean);

  const handleBreadcrumbClick = (index: number) => {
    const newPath = pathSegments.slice(0, index + 1).join('/');
    onPathChange(newPath);
  };
  
  // --- INICIO DE CAMBIOS ---
  // 2. Lógica para manejar el clic en "subir un nivel"
  const handleGoUp = () => {
    const parentPath = pathSegments.slice(0, -1).join('/');
    onPathChange(parentPath);
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
        {/* --- INICIO DE CAMBIOS --- */}
        {/* 3. Si no estamos en la raíz, mostramos el botón para subir un nivel */}
        {currentPath && (
          <li className="file-item" onClick={handleGoUp}>
            <span className="item-icon">
              <VscArrowUp />
            </span>
            <span className="item-name">..</span>
          </li>
        )}
        {/* --- FIN DE CAMBIOS --- */}

        {sortedContent.length > 0 ? (
          sortedContent.map(item => (
            <li 
              key={item.sha} 
              className="file-item" 
              onClick={() => item.type === 'dir' ? onPathChange(item.path) : onFileSelect(item.path)}
            >
              {/* --- INICIO DE CAMBIOS --- */}
              {/* 4. Usamos los nuevos iconos de react-icons */}
              <span className="item-icon">
                {item.type === 'dir' ? <VscFolder /> : <VscFile />}
              </span>
              {/* --- FIN DE CAMBIOS --- */}
              <span className="item-name">{item.name}</span>
            </li>
          ))
        ) : (
          // 5. Si no hay contenido Y no estamos en la raíz, no mostramos el mensaje,
          //    porque ya se muestra el botón ".." para subir.
          !currentPath && <li className="empty-directory">Este directorio está vacío.</li>
        )}
      </ul>
    </div>
  );
};