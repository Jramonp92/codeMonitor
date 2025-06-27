// src/components/Pagination.tsx

import React from 'react';
import { useTranslation } from 'react-i18next'; // 1. Importar hook
import './Pagination.css';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    const { t } = useTranslation(); // 2. Usar hook
    
    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;
        const halfPages = Math.floor(maxPagesToShow / 2);

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= halfPages) {
                for (let i = 1; i <= maxPagesToShow - 1; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            } else if (currentPage > totalPages - halfPages) {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = totalPages - maxPagesToShow + 2; i <= totalPages; i++) {
                    pageNumbers.push(i);
                }
            } else {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    const pages = getPageNumbers();

    // 3. Reemplazar textos fijos
    return (
        <div className="pagination-container">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
                {t('paginationPrevious')}
            </button>
            <div className="pagination-pages">
                {pages.map((page, index) => 
                    page === '...' ? (
                        <span key={`ellipsis-${index}`}>...</span>
                    ) : (
                        <button 
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            className={currentPage === page ? 'active' : ''}
                        >
                            {page}
                        </button>
                    )
                )}
            </div>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
                {t('paginationNext')}
            </button>
        </div>
    );
}