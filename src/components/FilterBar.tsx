// --- Ruta: src/components/FilterBar.tsx ---
import React from 'react';

interface FilterBarProps {
  activeTab: string;
  filters: { label: string; value: string }[];
  currentFilter: string;
  onFilterChange: (value: any) => void;
  name: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ activeTab, filters, currentFilter, onFilterChange, name }) => {
  if (activeTab !== name) return null;
  
  return (
    <div className="filter-container">
      {filters.map(filter => (
        <label key={filter.value}>
          <input 
            type="radio" 
            name={`${name}State`}
            value={filter.value}
            checked={currentFilter === filter.value}
            onChange={(e) => onFilterChange(e.target.value)}
          />
          {filter.label}
        </label>
      ))}
    </div>
  );
};