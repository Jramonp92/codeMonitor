// src/components/FileViewer.tsx

// --- INICIO DE CAMBIOS ---
// 1. Importamos los tipos necesarios y los nuevos iconos
import type { ViewedFile } from '../hooks/useGithubData';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';
// --- FIN DE CAMBIOS ---
import './FileViewer.css';

const BackArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"></path>
    <path d="M12 19l-7-7 7-7"></path>
  </svg>
);

// --- INICIO DE CAMBIOS ---
// 2. Actualizamos las props para recibir todo lo necesario para el seguimiento
interface FileViewerProps {
  file: ViewedFile;
  onBack: () => void;
  repoFullName: string;
  selectedBranch: string;
  isTracked: (repo: string, path: string, branch: string) => boolean;
  addTrackedFile: (repo: string, path: string, branch: string) => void;
  removeTrackedFile: (repo: string, path: string, branch: string) => void;
}
// --- FIN DE CAMBIOS ---

export const FileViewer = ({ 
  file, 
  onBack,
  // --- INICIO DE CAMBIOS ---
  // 3. Desestructuramos las nuevas props
  repoFullName,
  selectedBranch,
  isTracked,
  addTrackedFile,
  removeTrackedFile,
  // --- FIN DE CAMBIOS ---
}: FileViewerProps) => {

  const lines = file.content.split('\n');

  // --- INICIO DE CAMBIOS ---
  // 4. Creamos el manejador para el botón de observar/dejar de observar
  const handleToggleTrack = () => {
    if (isTracked(repoFullName, file.path, selectedBranch)) {
      removeTrackedFile(repoFullName, file.path, selectedBranch);
    } else {
      addTrackedFile(repoFullName, file.path, selectedBranch);
    }
  };
  // --- FIN DE CAMBIOS ---

  return (
    <div className="file-viewer-container">
      <div className="file-viewer-header">
        <button onClick={onBack} className="back-button" aria-label="Volver">
          <BackArrowIcon />
        </button>
        <span className="file-path-display">{file.path}</span>
        {/* --- INICIO DE CAMBIOS --- */}
        {/* 5. Añadimos el botón de seguimiento al lado del nombre del archivo */}
        <button 
          className={`track-button ${isTracked(repoFullName, file.path, selectedBranch) ? 'tracked' : ''}`}
          onClick={handleToggleTrack}
          aria-label={isTracked(repoFullName, file.path, selectedBranch) ? 'Dejar de observar' : 'Observar archivo'}
        >
          {isTracked(repoFullName, file.path, selectedBranch) ? <VscEye /> : <VscEyeClosed />}
        </button>
        {/* --- FIN DE CAMBIOS --- */}
      </div>
      <div className="code-editor-look">
        {lines.map((line, index) => (
          <div key={index} className="code-line">
            <span className="line-number">{index + 1}</span>
            <span className="line-content">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
};