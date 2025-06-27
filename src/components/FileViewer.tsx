// src/components/FileViewer.tsx

import { useTranslation } from 'react-i18next'; // 1. Importar hook
import type { ViewedFile } from '../hooks/useGithubData';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';
import './FileViewer.css';

const BackArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"></path>
    <path d="M12 19l-7-7 7-7"></path>
  </svg>
);

interface FileViewerProps {
  file: ViewedFile;
  onBack: () => void;
  repoFullName: string;
  selectedBranch: string;
  isTracked: (repo: string, path: string, branch: string) => boolean;
  addTrackedFile: (repo: string, path: string, branch: string) => void;
  removeTrackedFile: (repo: string, path: string, branch: string) => void;
}

export const FileViewer = ({ 
  file, 
  onBack,
  repoFullName,
  selectedBranch,
  isTracked,
  addTrackedFile,
  removeTrackedFile,
}: FileViewerProps) => {
  const { t } = useTranslation(); // 2. Usar hook
  const lines = file.content.split('\n');

  const handleToggleTrack = () => {
    if (isTracked(repoFullName, file.path, selectedBranch)) {
      removeTrackedFile(repoFullName, file.path, selectedBranch);
    } else {
      addTrackedFile(repoFullName, file.path, selectedBranch);
    }
  };

  // 3. Reemplazar textos fijos
  return (
    <div className="file-viewer-container">
      <div className="file-viewer-header">
        <button onClick={onBack} className="back-button" aria-label={t('ariaBack')}>
          <BackArrowIcon />
        </button>
        <span className="file-path-display">{file.path}</span>
        <button 
          className={`track-button ${isTracked(repoFullName, file.path, selectedBranch) ? 'tracked' : ''}`}
          onClick={handleToggleTrack}
          aria-label={isTracked(repoFullName, file.path, selectedBranch) ? t('untrackFile') : t('trackFile')}
        >
          {isTracked(repoFullName, file.path, selectedBranch) ? <VscEye /> : <VscEyeClosed />}
        </button>
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