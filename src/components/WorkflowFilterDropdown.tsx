// src/components/WorkflowFilterDropdown.tsx

import { useState, useMemo } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);

  const selectedWorkflowName = useMemo(() => {
    if (selectedWorkflowId === null) {
      return 'All Workflows';
    }
    const selected = workflows.find(wf => wf.id === selectedWorkflowId);
    return selected?.name || 'Select a workflow';
  }, [selectedWorkflowId, workflows]);

  if (isLoading) {
    return <div className="workflow-dropdown-container"><div className="loader"></div></div>;
  }
  
  if (workflows.length === 0) {
    return null; // No mostrar el dropdown si no hay workflows
  }

  const handleSelection = (id: number | null) => {
    onFilterChange(id);
    setIsOpen(false);
  };

  return (
    <div className="workflow-dropdown-container">
      <button className="dropdown-button" onClick={() => setIsOpen(!isOpen)}>
        {selectedWorkflowName}
        <span className={`arrow ${isOpen ? 'up' : 'down'}`}></span>
      </button>
      {isOpen && (
        <ul className="dropdown-list">
          <li onClick={() => handleSelection(null)}>
            All Workflows
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