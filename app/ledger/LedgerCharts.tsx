'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import { Chart } from 'react-chartjs-2';
import { useThemeColors } from '@/hooks/useThemeColors';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  TreemapController,
  TreemapElement
);

/**
 * A type alias rather than an interface, deliberately: the treemap plugin
 * types `tree` as Record<string, unknown>[], and TypeScript only gives
 * implicit index signatures to type aliases. An interface with identical
 * fields fails to assign.
 */
export type Counted = {
  label: string;
  count: number;
};

/**
 * The plugin wraps each row as { _data: <your object> } and types it as
 * AnyObject, so narrow it here rather than annotating callback parameters —
 * annotating those would override Chart.js's own contextual typing.
 */
function datum(raw: unknown): Counted | undefined {
  const d = (raw as { _data?: unknown } | undefined)?._data;
  if (d && typeof d === 'object' && 'label' in d && 'count' in d) {
    return d as Counted;
  }
  return undefined;
}

// Labels are Gambetta now (Sligoil was dropped in M1). chars × 0.6em was
// Sligoil's exact fixed pitch; for Gambetta it's a safe overestimate, so
// labels wrap a little early. Revisit in the ledger restyle (M1 group 4).
const LABEL_SIZE = 11;
const MONO_ADVANCE = 0.6 * LABEL_SIZE;

// One fill strength for every bar chart, so no chart looks more
// important than another by accident.
const BAR_ALPHA = 0.65;

/** Greedy word wrap into lines of at most `max` characters. */
function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    if (!line) {
      line = word;
    } else if (line.length + 1 + word.length <= max) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  // Small tiles can't show four lines of text — cap it.
  return lines.slice(0, 3);
}

/**
 * The chart's numbers as a table, for screen readers. The canvas itself is
 * aria-hidden — it's pixels, so without this the figures don't exist for
 * anyone not looking at it.
 */
function ChartData({ caption, column, rows }: { caption: string; column: string; rows: Counted[] }) {
  return (
    <table className="visually-hidden">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{column}</th>
          <th scope="col">Books</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LedgerCharts({
  tags,
  authors,
  decades,
  ratings,
}: {
  tags: Counted[];
  authors: Counted[];
  decades: Counted[];
  ratings: Counted[];
}) {
  const c = useThemeColors();
  const router = useRouter();
  // `false` switches Chart.js animation off; `undefined` keeps its default.
  const animation = usePrefersReducedMotion() ? (false as const) : undefined;

  const grid = `rgba(${c.charcoalRgb}, 0.15)`;
  const font = { family: c.label, size: LABEL_SIZE };

  const tooltip = {
    backgroundColor: c.kraft,
    titleColor: c.ink,
    bodyColor: c.charcoal,
    borderColor: grid,
    borderWidth: 1,
    titleFont: font,
    bodyFont: font,
    displayColors: false,
  };

  const barDataset = {
    backgroundColor: `rgba(${c.stampRgb}, ${BAR_ALPHA})`,
    borderColor: c.stamp,
    borderWidth: 1,
    borderRadius: 2,
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    plugins: {
      legend: { display: false },
      tooltip,
    },
    scales: {
      x: { ticks: { color: c.charcoal, font }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { color: c.charcoal, font, precision: 0 },
        grid: { color: grid },
      },
    },
  } as const;

  const maxTag = Math.max(...tags.map((t) => t.count), 1);
  const tagAlpha = (count: number) => 0.35 + 0.55 * (count / maxTag);

  return (
    <>
      {tags.length > 0 && (
      <section className="ledger-block">
        <h2 className="subhead">Tags</h2>
        <p className="ledger-note">
          Each tile is a tag; its area is how many books carry it. Click one to
          open that tag in the catalog.
        </p>
        <ChartData caption="Books per tag" column="Tag" rows={tags} />
        <div className="ledger-chart ledger-chart--tall" aria-hidden="true">
          <Chart
            type="treemap"
            data={{
              datasets: [
                {
                  data: [],
                  tree: [...tags],
                  key: 'count',
                  labels: {
                    display: true,
                    // Dense tiles take paper-coloured text, pale ones ink.
                    // The same rule holds in both themes, because paper and
                    // ink swap lightness together.
                    color: (ctx) => {
                      const d = datum(ctx.raw);
                      return d && tagAlpha(d.count) > 0.6 ? c.paper : c.ink;
                    },
                    font,
                    // 'hidden' drops the label entirely when it can't fit,
                    // instead of slicing a word mid-character.
                    overflow: 'hidden',
                    formatter: (ctx) => {
                      const d = datum(ctx.raw);
                      if (!d) return '';
                      // ctx.raw carries the laid-out tile, so we can wrap to
                      // its actual width.
                      const width = (ctx.raw as { w?: number })?.w ?? 0;
                      const perLine = Math.max(4, Math.floor((width - 8) / MONO_ADVANCE));
                      return wrap(d.label, perLine);
                    },
                  },
                  spacing: 1,
                  borderWidth: 1,
                  borderColor: c.paper,
                  // Single hue, opacity by count — keeps the card-catalog
                  // palette instead of introducing a rainbow.
                  backgroundColor: (ctx) => {
                    const d = datum(ctx.raw);
                    if (!d) return 'transparent';
                    return `rgba(${c.stampRgb}, ${tagAlpha(d.count)})`;
                  },
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation,
              onClick: (_e, elements) => {
                const index = elements[0]?.index;
                if (index === undefined) return;
                const tag = tags[index]?.label;
                if (tag) router.push(`/catalog?tags=${encodeURIComponent(tag)}`);
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  ...tooltip,
                  callbacks: {
                    title: (items) => datum(items[0]?.raw)?.label ?? '',
                    label: (item) => {
                      const n = datum(item.raw)?.count ?? 0;
                      return `${n} ${n === 1 ? 'book' : 'books'}`;
                    },
                  },
                },
              },
            }}
          />
        </div>
        {/* The keyboard and screen-reader route to what a tile click does.
            Hidden until tabbed into, then shown as a plain list. */}
        <ul className="ledger-theme-links" aria-label="Open a tag in the catalog">
          {tags.map((t) => (
            <li key={t.label}>
              <Link href={`/catalog?tags=${encodeURIComponent(t.label)}`}>
                {t.label} ({t.count})
              </Link>
            </li>
          ))}
        </ul>
      </section>
      )}

      {authors.length > 0 && (
        <section className="ledger-block">
          <h2 className="subhead">Most-shelved authors</h2>
          <ChartData caption="Books per author" column="Author" rows={authors} />
          <div className="ledger-chart" aria-hidden="true">
            <Chart
              type="bar"
              data={{
                labels: authors.map((a) => a.label),
                datasets: [
                  {
                    ...barDataset,
                    data: authors.map((a) => a.count),
                  },
                ],
              }}
              options={{ ...barOptions, indexAxis: 'y' as const }}
            />
          </div>
        </section>
      )}

      <section className="ledger-block">
        <h2 className="subhead">By decade published</h2>
        <ChartData caption="Books per decade published" column="Decade" rows={decades} />
        <div className="ledger-chart" aria-hidden="true">
          <Chart
            type="bar"
            data={{
              labels: decades.map((d) => d.label),
              datasets: [
                {
                  ...barDataset,
                  data: decades.map((d) => d.count),
                },
              ],
            }}
            options={barOptions}
          />
        </div>
      </section>

      {ratings.length > 0 && (
        <section className="ledger-block">
          <h2 className="subhead">Ratings</h2>
          <p className="ledger-note">
            One reader&rsquo;s score at the time of recommending, not a group
            average — so it leans high by design.
          </p>
          <ChartData caption="Books per rating" column="Rating" rows={ratings} />
          <div className="ledger-chart ledger-chart--short" aria-hidden="true">
            <Chart
              type="bar"
              data={{
                labels: ratings.map((r) => r.label),
                datasets: [
                  {
                    ...barDataset,
                    data: ratings.map((r) => r.count),
                  },
                ],
              }}
              options={barOptions}
            />
          </div>
        </section>
      )}
    </>
  );
}
