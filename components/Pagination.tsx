'use client';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
  windowSize?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  ariaLabel = 'Pagination',
  windowSize = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - windowSize && i <= currentPage + windowSize)) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== 'ellipsis') {
      pageNumbers.push('ellipsis');
    }
  }

  return (
    <nav className="pagination" aria-label={ariaLabel}>
      <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        Prev
      </button>
      {pageNumbers.map((n, i) =>
        n === 'ellipsis' ? (
          <span className="pagination-ellipsis" key={`e-${i}`}>&hellip;</span>
        ) : (
          <button
            type="button"
            key={n}
            className={n === currentPage ? 'active' : ''}
            aria-current={n === currentPage ? 'page' : undefined}
            onClick={() => onPageChange(n)}
          >
            {n}
          </button>
        )
      )}
      <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        Next
      </button>
    </nav>
  );
}
