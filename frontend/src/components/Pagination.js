import React, { useRef, useEffect, useRef as usePrevRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css'; // Import CSS Module

// Helper function to combine class names conditionally (similar to clsx)
const cn = (...classes) => classes.filter(Boolean).join(' ');

const Pagination = ({
  totalItems,
  itemsPerPage = 25, // Default to 25 items per page
  currentPage, // Zero-based index
  onPageChange,
  onItemSelect,
  activeItemIndex, // Index of the currently selected item
  itemStatus = {}, // Object like { index: 'answered' | 'doubt' | 'incorrect' | 'unanswered', ... }
  isDarkMode, // For applying dark mode styles
}) => {
  const gridRef = useRef(null);
  const prevActiveIndexRef = useRef(activeItemIndex);
  const manualPageChangeRef = useRef(false);

  if (totalItems <= 0) {
    return null; // Don't render pagination if there are no items
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Track manual page changes
  useEffect(() => {
    // Reset manual flag after a short delay
    const timer = setTimeout(() => {
      manualPageChangeRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [currentPage]);

  // Auto-change page when activeItemIndex moves beyond current page boundaries
  useEffect(() => {
    if (activeItemIndex !== undefined && activeItemIndex !== null && !manualPageChangeRef.current) {
      const prevIndex = prevActiveIndexRef.current;
      const currentPageStart = currentPage * itemsPerPage;
      const currentPageEnd = currentPageStart + itemsPerPage - 1;
      
      // Only auto-change if:
      // 1. activeItemIndex is outside current page range
      // 2. This is sequential navigation (difference of 1 from previous index)
      // 3. Not a manual page change
      if ((activeItemIndex < currentPageStart || activeItemIndex > currentPageEnd) &&
          prevIndex !== undefined && Math.abs(activeItemIndex - prevIndex) === 1) {
        const targetPage = Math.floor(activeItemIndex / itemsPerPage);
        if (targetPage >= 0 && targetPage < totalPages && targetPage !== currentPage) {
          onPageChange(targetPage);
        }
      }
    }
    prevActiveIndexRef.current = activeItemIndex;
  }, [activeItemIndex, currentPage, itemsPerPage, totalPages, onPageChange]);

  const goToNextPage = () => {
    manualPageChangeRef.current = true; // Mark as manual page change
    if (currentPage < totalPages - 1) {
      onPageChange(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    manualPageChangeRef.current = true; // Mark as manual page change
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  const handleItemClick = (index) => {
    onItemSelect(index);
    // Check if the selected item is not on the current page and change page if needed
    const targetPage = Math.floor(index / itemsPerPage);
    if (targetPage !== currentPage && targetPage >= 0 && targetPage < totalPages) {
      onPageChange(targetPage);
    }
  };

  const getCurrentPageIndices = () => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    // Create an array of indices for the current page range
    return Array.from({ length: endIndex - startIndex }).map((_, i) => startIndex + i);
  };

  // Obtener los índices de las preguntas de la página actual
  const currentPageIndices = getCurrentPageIndices();
  
  // Calcular cuántas preguntas mostrar (máximo 15 según la imagen)
  const maxVisibleItems = 15;
  const showMoreIndicator = currentPageIndices.length > maxVisibleItems;
  
  // Determinar qué preguntas mostrar (centradas alrededor de la activa si es posible)
  const getVisibleIndices = () => {
    if (currentPageIndices.length <= maxVisibleItems) {
      return currentPageIndices;
    }
    
    // Si hay una pregunta activa, centrarla
    if (activeItemIndex !== undefined && activeItemIndex !== null) {
      const activeIndexInPage = currentPageIndices.indexOf(activeItemIndex);
      if (activeIndexInPage !== -1) {
        // Centrar alrededor de la pregunta activa
        const start = Math.max(0, activeIndexInPage - Math.floor(maxVisibleItems / 2));
        const end = Math.min(currentPageIndices.length, start + maxVisibleItems);
        const adjustedStart = Math.max(0, end - maxVisibleItems);
        return currentPageIndices.slice(adjustedStart, end);
      }
    }
    
    // Si no hay pregunta activa o no está en la página actual, mostrar las primeras
    return currentPageIndices.slice(0, maxVisibleItems);
  };

  const visibleIndices = getVisibleIndices();
  const remainingItems = currentPageIndices.length - visibleIndices.length;

  return (
    <div className={cn(styles.paginationComponent, isDarkMode && styles.dark)}>
      <div className={styles.paginationContainer}>
        {/* Botón Anterior */}
        <button
          className={cn(styles.navButton, styles.prevButton)}
          onClick={goToPrevPage}
          disabled={currentPage === 0}
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} />
          <span>Anterior</span>
        </button>

        {/* Números de pregunta */}
        <div ref={gridRef} className={styles.pagesContainer}>
          {visibleIndices.map(index => {
            const status = itemStatus[index] || '';
            return (
              <button
                key={index}
                className={cn(
                  styles.pageNumber,
                  activeItemIndex === index && styles.active,
                  status === 'answered' && styles.answered,
                  status === 'correct' && styles.correct,
                  status === 'doubt' && styles.doubt,
                  status === 'incorrect' && styles.incorrect,
                  status === 'unanswered' && styles.unanswered
                )}
                onClick={() => handleItemClick(index)}
                aria-label={`Ir a pregunta ${index + 1}`}
              >
                {index + 1}
              </button>
            );
          })}
          
          {/* Indicador de más preguntas */}
          {showMoreIndicator && remainingItems > 0 && (
            <span className={styles.moreIndicator}>+{remainingItems}</span>
          )}
        </div>

        {/* Botón Siguiente */}
        <button
          className={cn(styles.navButton, styles.nextButton)}
          onClick={goToNextPage}
          disabled={currentPage === totalPages - 1}
          aria-label="Página siguiente"
        >
          <span>Siguiente</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Pagination; 