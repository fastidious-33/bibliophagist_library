'use client';

import BookCard from '@/components/BookCard';
import Pagination from '@/components/Pagination';
import { useUrlPage } from '@/hooks/useUrlPage';
import type { Book } from '@/lib/sanity';
import { PAGE_SIZE } from '@/lib/search/types';

/**
 * Every book in a genre, paged in the browser — the largest genres are
 * around a hundred books, small enough to send in full. Same pattern as
 * TSBC's ThemeBooksList: URL-driven paging (hooks/useUrlPage.ts), 24 a
 * page to match /catalog, title order, no sort.
 */
export default function GenreBooksList({ books, genreName }: { books: Book[]; genreName: string }) {
  const { page, setPage } = useUrlPage();

  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageBooks = books.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="catalog-strip">
        {pageBooks.map((book) => (
          <BookCard
            key={book._id}
            slug={book.slug}
            title={book.title}
            author={book.author}
            coverUrl={book.coverUrl}
            bookId={book.bookId}
            tags={book.tags}
          />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        ariaLabel={`${genreName} pages`}
      />
    </>
  );
}
