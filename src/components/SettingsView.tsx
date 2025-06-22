import './SettingsView.css';
// --- INICIO DE CAMBIOS ---
// 1. Importamos los tipos que necesitamos desde el hook.
import type { TabVisibility, TabKey } from '../hooks/useGithubData';
// --- FIN DE CAMBIOS ---

// --- Iconos ---
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

// --- INICIO DE CAMBIOS ---
// 2. Actualizamos la interfaz de props.
interface SettingsViewProps {
  onClose: () => void;
  tabVisibility: TabVisibility;
  onTabVisibilityChange: (tab: TabKey, isVisible: boolean) => void;
}

// 3. Creamos una constante para mapear fácilmente las pestañas en la UI.
const configurableTabs: { id: TabKey, label: string }[] = [
    { id: 'README', label: 'README' },
    { id: 'Commits', label: 'Commits' },
    { id: 'Issues', label: 'Issues' },
    { id: 'PRs', label: 'Pull Requests' },
    { id: 'Actions', label: 'Actions' },
    { id: 'Releases', label: 'Releases' },
];
// --- FIN DE CAMBIOS ---

export const SettingsView = ({ onClose, tabVisibility, onTabVisibilityChange }: SettingsViewProps) => {
  return (
    <div className="settings-view-container">
      <header className="settings-header">
        <button onClick={onClose} className="back-button" aria-label="Volver">
          <BackArrowIcon />
        </button>
        <h2>Configuración</h2>
      </header>
      
      <div className="settings-body">
        <section className="settings-section">
          <h3><span role="img" aria-label="globo">🌍</span> Idioma</h3>
          <p>Selecciona el idioma de la interfaz.</p>
          <select className="settings-select" defaultValue="es">
            <option value="es">Español</option>
            <option value="en">Inglés (no funcional)</option>
          </select>
        </section>

        <section className="settings-section">
          <h3><span role="img" aria-label="paleta">🎨</span> Apariencia</h3>
          <p>Elige entre el tema claro u oscuro.</p>
          <div className="theme-toggle">
            <span>Claro</span>
            <label className="switch">
              <input type="checkbox" />
              <span className="slider round"></span>
            </label>
            <span>Oscuro (no funcional)</span>
          </div>
        </section>
        
        {/* --- INICIO DE CAMBIOS --- */}
        {/* 4. Añadimos la nueva sección para gestionar la visibilidad de las pestañas. */}
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
        {/* --- FIN DE CAMBIOS --- */}

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