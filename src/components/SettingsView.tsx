// src/components/SettingsView.tsx

import './SettingsView.css';
import type { TabVisibility, TabKey } from '../hooks/useGithubData';
// --- INICIO DE CAMBIOS ---
// 1. Importamos el hook que nos da acceso a las traducciones
import { useTranslation } from 'react-i18next';
// --- FIN DE CAMBIOS ---

// --- Iconos (Sin cambios) ---
const BackArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"></path>
    <path d="M12 19l-7-7 7-7"></path>
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);

const ShieldIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
);

type Theme = 'light' | 'dark';

interface SettingsViewProps {
  onClose: () => void;
  tabVisibility: TabVisibility;
  onTabVisibilityChange: (tab: TabKey, isVisible: boolean) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const configurableTabs: { id: TabKey, label: string }[] = [
    { id: 'README', label: 'README' },
    { id: 'Code', label: 'Code' },
    { id: 'Commits', label: 'Commits' },
    { id: 'Issues', label: 'Issues' },
    { id: 'PRs', label: 'Pull Requests' },
    { id: 'Actions', label: 'Actions' },
    { id: 'Releases', label: 'Releases' },
];

export const SettingsView = ({ onClose, tabVisibility, onTabVisibilityChange, theme, onThemeChange }: SettingsViewProps) => {
  
  // --- INICIO DE CAMBIOS ---
  // 2. Usamos el hook. 't' es la función para traducir, 'i18n' es la instancia de i18next.
  const { t, i18n } = useTranslation();

  const handleThemeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onThemeChange(e.target.checked ? 'dark' : 'light');
  };

  // 3. Creamos un manejador para el cambio de idioma.
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang); // Esta función cambia el idioma de toda la app.
  };
  // --- FIN DE CAMBIOS ---

  return (
    <div className="settings-view-container">
      <header className="settings-header">
        <button onClick={onClose} className="back-button" aria-label="Volver">
          <BackArrowIcon />
        </button>
        {/* Usamos la función t() con la clave del JSON */}
        <h2>{t('settingsTitle')}</h2>
      </header>
      
      <div className="settings-body">
        <section className="settings-section">
          <h3><span role="img" aria-label="globo">🌍</span> {t('language')}</h3>
          <p>{t('languageSelector')}</p>
          {/* --- INICIO DE CAMBIOS --- */}
          {/* 4. Conectamos el valor y el manejador al <select> */}
          <select 
            className="settings-select" 
            value={i18n.language} 
            onChange={handleLanguageChange}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
          {/* --- FIN DE CAMBIOS --- */}
        </section>

        <section className="settings-section">
          <h3><span role="img" aria-label="paleta">🎨</span> {t('appearance')}</h3>
          <p>{t('themeDescription')}</p>
          <div className="theme-toggle">
            {/* Traducimos los textos de los temas */}
            <span>{t('lightTheme')}</span>
            <label className="switch">
              <input 
                type="checkbox"
                checked={theme === 'dark'}
                onChange={handleThemeToggle}
              />
              <span className="slider round"></span>
            </label>
            <span>{t('darkTheme')}</span>
          </div>
        </section>
        
        <section className="settings-section">
          <h3><span role="img" aria-label="pestañas">📑</span> Pestañas Visibles</h3>
          <p>Elige qué pestañas mostrar en la vista principal.</p>
          <div className="toggle-list-container">
            {configurableTabs.map(tab => (
              <div key={tab.id} className="toggle-list-item">
                <span>{tab.label}</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={tabVisibility[tab.id]}
                    onChange={(e) => onTabVisibilityChange(tab.id, e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3><span role="img" aria-label="libro">📖</span> Legal</h3>
          <div className="settings-links-container">
            <a href="#" target="_blank" rel="noopener noreferrer" className="settings-link-item">
              <DocumentIcon />
              <span>Términos y Condiciones</span>
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="settings-link-item">
              <ShieldIcon />
              <span>Política de Privacidad</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};