import React, { useRef, useEffect, useRef as usePrevRef } from 'react';
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

  return (
    <div className={cn(styles.paginationComponent, isDarkMode && styles.dark)}>
      {/* Grid with controls */}
      <div className={styles.gridPaginationContainer}>
        <button
          className={cn(styles.sidePaginationBtn, styles.left)}
          onClick={goToPrevPage}
          disabled={currentPage === 0}
          aria-label="Previous Page"
        >
          <span className="arrow-left">&#9664;</span>
        </button>

        <div ref={gridRef} className={styles.examQuestionIndex}>
          {getCurrentPageIndices().map(index => {
            const status = itemStatus[index] || ''; // 'answered', 'doubt', 'incorrect', 'unanswered' or ''
            return (
              <button
                key={index}
                className={cn(
                  styles.examQuestionNumber,
                  activeItemIndex === index && styles.active,
                  status === 'answered' && styles.answered,
                  status === 'correct' && styles.correct,
                  status === 'doubt' && styles.doubt,
                  status === 'incorrect' && styles.incorrect,
                  status === 'unanswered' && styles.unanswered
                )}
                onClick={() => handleItemClick(index)}
                aria-label={`Go to item ${index + 1}`}
              >
                {index + 1}
              </button>
            );
          })}
          {/* Optionally add placeholders if less than itemsPerPage */}
          {getCurrentPageIndices().length < itemsPerPage &&
            Array.from({ length: itemsPerPage - getCurrentPageIndices().length }).map((_, i) => (
              <div key={`placeholder-${i}`} className={styles.paginationPlaceholder}></div>
          ))}
        </div>

        <button
          className={cn(styles.sidePaginationBtn, styles.right)}
          onClick={goToNextPage}
          disabled={currentPage === totalPages - 1}
          aria-label="Next Page"
        >
          <span className="arrow-right">&#9654;</span>
        </button>
      </div>

      {/* Page Indicator */}
      <div className={styles.pageIndicator}>
        Página {currentPage + 1} de {totalPages}
      </div>
    </div>
  );
};

export default Pagination; 