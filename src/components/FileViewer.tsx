// src/components/FileViewer.tsx

import type { ViewedFile } from '../hooks/useGithubData';
import './FileViewer.css';

// --- INICIO DE CAMBIOS ---
// 1. Definimos el componente del ícono SVG que nos pasaste
const BackArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"></path>
    <path d="M12 19l-7-7 7-7"></path>
  </svg>
);
// --- FIN DE CAMBIOS ---

interface FileViewerProps {
  file: ViewedFile;
  onBack: () => void;
}

export const FileViewer = ({ file, onBack }: FileViewerProps) => {
  const lines = file.content.split('\n');

  return (
    <div className="file-viewer-container">
      <div className="file-viewer-header">
        {/* --- INICIO DE CAMBIOS --- */}
        {/* 2. Usamos el nuevo ícono dentro del botón */}
        <button onClick={onBack} className="back-button" aria-label="Volver">
          <BackArrowIcon />
        </button>
        {/* --- FIN DE CAMBIOS --- */}
        <span className="file-path-display">{file.path}</span>
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