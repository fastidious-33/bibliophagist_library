import Link from 'next/link';
import type { Metadata } from 'next';
import Painting from '@/components/Painting';
import { getGenres, WING_LABEL, type Genre } from '@/lib/genres';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Genres',
  description: 'Every genre on the shelves, Fiction and Non-Fiction, with how many books each holds.',
};

function GenreList({ genres }: { genres: Genre[] }) {
  return (
    <ul className="genre-index">
      {genres.map((g) => (
        <li key={g.slug}>
          <Link href={`/catalog/genres/${g.slug}`}>{g.tag}</Link>
          <span className="genre-index-count">{g.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function GenresIndexPage() {
  const genres = await getGenres();
  const byName = [...genres].sort((a, b) => a.tag.localeCompare(b.tag));

  const groups = [
    { title: WING_LABEL.fiction, genres: byName.filter((g) => g.stamps.length === 1 && g.stamps[0] === 'fiction') },
    { title: WING_LABEL['non-fiction'], genres: byName.filter((g) => g.stamps.length === 1 && g.stamps[0] === 'non-fiction') },
    { title: 'Both sides of the library', genres: byName.filter((g) => g.stamps.length === 2) },
    { title: 'Other', genres: byName.filter((g) => g.stamps.length === 0) },
  ].filter((group) => group.genres.length > 0);

  return (
    <section className="section section--flush">
      <div className="section-heading">
        <h1>Genres</h1>
        <span className="section-count">{genres.length} genres</span>
      </div>

      <div className="genre-hero">
        <Painting slot="genresIndex" priority sizes="(max-width: 760px) 100vw, 420px" />
        <p className="prose prose-lg">
          Every tag on the shelves has a page of its own. Most genres live on one side of the
          library; a few &mdash; Indian Authors, Translated Works &mdash; wander across both.
        </p>
      </div>

      {groups.map((group) => (
        <div className="subsection" key={group.title}>
          <h2 className="subhead">{group.title}</h2>
          <GenreList genres={group.genres} />
        </div>
      ))}

      <div className="back-row">
        <Link href="/catalog" className="btn btn-secondary">
          &larr; Back to the catalog
        </Link>
      </div>
    </section>
  );
}
