// --- Ruta: src/components/FilterBar.tsx ---
import React from 'react';
import './FilterBar.css';

interface FilterBarProps {
  filters: { label: string; value: string }[];
  currentFilter: string;
  onFilterChange: (value: any) => void;
  name: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, currentFilter, onFilterChange, name }) => {
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