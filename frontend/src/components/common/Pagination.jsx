import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

/**
 * Premium Reusable Pagination Component
 * Supports page size switching, page jumping, and responsive design.
 */
export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 5,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [5, 10, 20],
  itemName = 'assets',
}) => {
  if (totalItems === 0) return null;

  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis for large page counts
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-800 dark:text-slate-200 font-medium">
      {/* 1. Item Count & Page Size Selector */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-3">
        <span>
          Showing <strong className="font-extrabold text-slate-950 dark:text-white tabular-nums">{startItem}-{endItem}</strong> of{' '}
          <strong className="font-extrabold text-slate-950 dark:text-white tabular-nums">{totalItems}</strong> {itemName}
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <span className="hidden sm:inline">Per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500 cursor-pointer font-semibold shadow-xs"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page (Mobile/Desktop) */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="First page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-slate-700 hover:border-amber-400 transition-all cursor-pointer shadow-xs"
          >
            <FiChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            title="Previous page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-slate-700 hover:border-amber-400 transition-all cursor-pointer shadow-xs"
          >
            <FiChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Page Number Buttons */}
          <div className="flex items-center gap-1 px-1">
            {getPageNumbers().map((page, idx) => {
              if (page === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none">
                    ...
                  </span>
                );
              }

              const isActive = currentPage === page;
              return (
                <button
                  key={`page-${page}`}
                  onClick={() => onPageChange(page)}
                  className={`min-w-[28px] h-7 px-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-slate-700 hover:border-amber-400'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            title="Next page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-slate-700 hover:border-amber-400 transition-all cursor-pointer shadow-xs"
          >
            <FiChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Last page"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-slate-700 hover:border-amber-400 transition-all cursor-pointer shadow-xs"
          >
            <FiChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
