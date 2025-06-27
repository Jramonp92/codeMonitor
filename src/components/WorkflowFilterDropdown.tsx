// src/components/WorkflowFilterDropdown.tsx

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // 1. Importar hook
import type { Workflow } from '../hooks/useGithubData';
import './WorkflowFilterDropdown.css'; 

interface WorkflowFilterDropdownProps {
  workflows: Workflow[];
  selectedWorkflowId: number | null;
  onFilterChange: (workflowId: number | null) => void;
  isLoading: boolean;
}

export const WorkflowFilterDropdown = ({ 
  workflows, 
  selectedWorkflowId, 
  onFilterChange,
  isLoading
}: WorkflowFilterDropdownProps) => {
  const { t } = useTranslation(); // 2. Usar hook
  const [isOpen, setIsOpen] = useState(false);

  // 3. Modificar useMemo para usar las claves de traducción
  const selectedWorkflowName = useMemo(() => {
    if (selectedWorkflowId === null) {
      return t('allWorkflows');
    }
    const selected = workflows.find(wf => wf.id === selectedWorkflowId);
    return selected?.name || t('selectWorkflowPlaceholder');
  }, [selectedWorkflowId, workflows, t]);

  if (isLoading) {
    return <div className="workflow-dropdown-container"><div className="loader"></div></div>;
  }
  
  if (workflows.length === 0) {
    return null;
  }

  const handleSelection = (id: number | null) => {
    onFilterChange(id);
    setIsOpen(false);
  };

  // 4. Reemplazar los textos fijos en el renderizado
  return (
    <div className="workflow-dropdown-container">
      <button className="dropdown-button" onClick={() => setIsOpen(!isOpen)}>
        {selectedWorkflowName}
        <span className={`arrow ${isOpen ? 'up' : 'down'}`}></span>
      </button>
      {isOpen && (
        <ul className="dropdown-list">
          <li onClick={() => handleSelection(null)}>
            {t('allWorkflows')}
          </li>
          {workflows.map(workflow => (
            <li 
              key={workflow.id} 
              onClick={() => handleSelection(workflow.id)}
              className={selectedWorkflowId === workflow.id ? 'selected' : ''}
            >
              {workflow.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};