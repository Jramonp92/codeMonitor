import { useState, useEffect, useRef } from 'react';
import type { Branch } from '../hooks/useGithubData';
import './BranchSelector.css';

// --- INICIO DE CAMBIOS: SVG actualizado ---
const GitBranchIcon = () => (
  <svg
    height="16"
    width="16"
    viewBox="0 0 512 512"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Git Branch Icon</title>
    <path d="M416,160a64,64,0,1,0-96.27,55.24c-2.29,29.08-20.08,37-75,48.42-17.76,3.68-35.93,7.45-52.71,13.93V151.39a64,64,0,1,0-64,0V360.61a64,64,0,1,0,64.42.24c2.39-18,16-24.33,65.26-34.52,27.43-5.67,55.78-11.54,79.78-26.95,29-18.58,44.53-46.78,46.36-83.89A64,64,0,0,0,416,160ZM160,64a32,32,0,1,1-32,32A32,32,0,0,1,160,64Zm0,384a32,32,0,1,1,32-32A32,32,0,0,1,160,448ZM352,192a32,32,0,1,1,32-32A32,32,0,0,1,352,192Z" />
  </svg>
);
// --- FIN DE CAMBIOS: SVG actualizado ---

interface BranchSelectorProps {
  branches: Branch[];
  selectedBranch: string;
  onBranchChange: (branchName: string) => void;
  isLoading: boolean;
}

export const BranchSelector = ({ branches, selectedBranch, onBranchChange, isLoading }: BranchSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Efecto para cerrar el dropdown si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); // Limpia la búsqueda al cerrar
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSelect = (branchName: string) => {
    onBranchChange(branchName);
    setIsOpen(false);
    setSearchTerm(''); // Limpia la búsqueda después de seleccionar
  };
  
  const filteredBranches = branches.filter(branch => 
    branch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="branch-selector-container" ref={dropdownRef}>
      <div className="branch-selector-label">
        <GitBranchIcon />
        <span>Branch:</span>
      </div>
      
      <div className="searchable-input-container">
        <input
          type="text"
          className="branch-search-input"
          value={isOpen ? searchTerm : selectedBranch}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm(''); // Limpia el campo al enfocar para empezar a buscar
          }}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isLoading ? "Cargando ramas..." : "Buscar rama..."}
          disabled={isLoading || branches.length === 0}
        />
        {isOpen && (
          <ul className="branch-list">
            {filteredBranches.length > 0 ? (
              filteredBranches.map(branch => (
                <li key={branch.name} onClick={() => handleSelect(branch.name)}>
                  {branch.name}
                  {branch.name === selectedBranch && <span className="check-mark">✓</span>}
                </li>
              ))
            ) : (
              <li className="no-results">No se encontraron ramas</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};