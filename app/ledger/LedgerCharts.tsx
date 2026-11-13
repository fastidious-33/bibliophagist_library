'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { Column, GenreRating, Ranked, Spread } from '@/lib/ledger';

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

const LABEL_SIZE = 11;

// One fill strength for every bar chart, so no chart looks more important
// than another by accident.
const BAR_ALPHA = 0.65;

/** Shared look: theme colours, label font, tooltip, reduced motion. */
function useChartStyle() {
  const c = useThemeColors();
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
  return { c, animation, grid, font, tooltip };
}

/** A chart box whose height grows with its number of rows (one per label). */
function rowsStyle(rows: number): CSSProperties {
  return { '--rows': rows } as CSSProperties;
}

/** A canvas is pixels: the wrapper speaks a one-line summary instead. */
function ChartBox({ summary, rows, children }: { summary: string; rows: number; children: ReactNode }) {
  return (
    <div className="ledger-chart ledger-chart--rows" style={rowsStyle(rows)} role="img" aria-label={summary}>
      {children}
    </div>
  );
}

export type NumberRow = { key: string; label: ReactNode; value: string };

/** The chart's figures as a table, folded behind "Show the numbers". */
export function Numbers({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: [string, string];
  rows: NumberRow[];
}) {
  return (
    <details className="ledger-numbers">
      <summary>Show the numbers</summary>
      <table className="ledger-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{head[0]}</th>
            <th scope="col">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Each genre's Goodreads average as a dot on a shared scale, highest first.
 * The axis starts near 3.5, not 0, so the differences can be seen; the
 * note above the chart says so.
 */
export function GenreRatingDots({ rows, axisMin, axisMax }: { rows: GenreRating[]; axisMin: number; axisMax: number }) {
  const { c, animation, grid, font, tooltip } = useChartStyle();
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  const summary =
    top && bottom
      ? `Goodreads average by genre: highest ${top.tag} at ${top.average.toFixed(2)}, lowest ${bottom.tag} at ${bottom.average.toFixed(2)}.`
      : 'Goodreads average by genre.';

  return (
    <>
      <ChartBox summary={summary} rows={rows.length}>
        <Chart
          type="line"
          data={{
            labels: rows.map((r) => r.tag),
            datasets: [
              {
                data: rows.map((r) => Number(r.average.toFixed(2))),
                showLine: false,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: c.stamp,
                pointBorderColor: c.stamp,
              },
            ],
          }}
          options={{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation,
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltip,
                callbacks: {
                  label: (item) => {
                    const r = rows[item.dataIndex];
                    return r ? `${r.average.toFixed(2)} · ${plural(r.rated, 'rated book')}` : '';
                  },
                },
              },
            },
            scales: {
              x: {
                min: axisMin,
                max: axisMax,
                ticks: { color: c.charcoal, font, stepSize: 0.1 },
                grid: { color: grid },
              },
              y: { ticks: { color: c.charcoal, font }, grid: { display: false } },
            },
          }}
        />
      </ChartBox>
      <Numbers
        caption="Goodreads average by genre"
        head={['Genre', 'Average (rated books)']}
        rows={rows.map((r) => ({
          key: r.tag,
          label: r.tag,
          value: `${r.average.toFixed(2)} (${r.rated})`,
        }))}
      />
    </>
  );
}

/** Horizontal bars, largest first; a bar click opens its catalog view. */
export function RankedBars({
  rows,
  caption,
  column,
  summary,
}: {
  rows: Ranked[];
  caption: string;
  column: string;
  summary: string;
}) {
  const { c, animation, grid, font, tooltip } = useChartStyle();
  const router = useRouter();

  return (
    <>
      <ChartBox summary={summary} rows={rows.length}>
        <Chart
          type="bar"
          data={{
            labels: rows.map((r) => r.label),
            datasets: [
              {
                data: rows.map((r) => r.count),
                ...barColours(c),
              },
            ],
          }}
          options={{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation,
            onClick: (_e, elements) => {
              const row = rows[elements[0]?.index ?? -1];
              if (row) router.push(row.href);
            },
            onHover: (e, elements) => {
              const target = e.native?.target as HTMLElement | undefined;
              if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltip,
                callbacks: { label: (item) => plural(Number(item.raw), 'book') },
              },
            },
            scales: {
              x: { beginAtZero: true, ticks: { color: c.charcoal, font, precision: 0 }, grid: { color: grid } },
              y: { ticks: { color: c.charcoal, font }, grid: { display: false } },
            },
          }}
        />
      </ChartBox>
      {/* The keyboard route to what a bar click does: every row links. */}
      <Numbers
        caption={caption}
        head={[column, 'Books']}
        rows={rows.map((r) => ({
          key: r.label,
          label: <Link href={r.href}>{r.label}</Link>,
          value: String(r.count),
        }))}
      />
    </>
  );
}

/** Upright columns in a fixed order (decades, page counts). Not clickable. */
export function ColumnBars({
  rows,
  caption,
  column,
  summary,
}: {
  rows: Column[];
  caption: string;
  column: string;
  summary: string;
}) {
  const { c, animation, grid, font, tooltip } = useChartStyle();

  return (
    <>
      <div className="ledger-chart" role="img" aria-label={summary}>
        <Chart
          type="bar"
          data={{
            labels: rows.map((r) => r.label),
            datasets: [{ data: rows.map((r) => r.count), ...barColours(c) }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation,
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltip,
                callbacks: { label: (item) => plural(Number(item.raw), 'book') },
              },
            },
            scales: {
              x: { ticks: { color: c.charcoal, font }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { color: c.charcoal, font, precision: 0 }, grid: { color: grid } },
            },
          }}
        />
      </div>
      <Numbers
        caption={caption}
        head={[column, 'Books']}
        rows={rows.map((r) => ({ key: r.label, label: r.label, value: String(r.count) }))}
      />
    </>
  );
}

/**
 * A spread per genre: a pale bar across its middle half, an ink dot at the
 * median, in the order given. `unit` names the values ("pages").
 */
export function RangeBars({
  rows,
  unit,
  caption,
  summary,
}: {
  rows: Spread[];
  unit: string;
  caption: string;
  summary: string;
}) {
  const { c, animation, grid, font, tooltip } = useChartStyle();

  // A bar layer (the middle half) and a dot layer (the median) in one chart,
  // so the types are spelled out for both.
  const data: ChartData<'bar' | 'line', (number | [number, number])[], string> = {
    labels: rows.map((r) => r.tag),
    datasets: [
      {
        type: 'bar',
        data: rows.map((r) => [r.q1, r.q3] as [number, number]),
        minBarLength: 3,
        ...barColours(c),
        backgroundColor: `rgba(${c.stampRgb}, 0.3)`,
      },
      {
        type: 'line',
        data: rows.map((r) => r.median),
        showLine: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: c.ink,
        pointBorderColor: c.ink,
      },
    ],
  };

  const options: ChartOptions<'bar' | 'line'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip,
        callbacks: {
          label: (item) => {
            const r = rows[item.dataIndex];
            if (!r) return '';
            return item.datasetIndex === 0
              ? `Middle half: ${r.q1}–${r.q3} ${unit}`
              : `Median: ${r.median} ${unit}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: c.charcoal, font, precision: 0 }, grid: { color: grid } },
      y: { ticks: { color: c.charcoal, font }, grid: { display: false } },
    },
  };

  return (
    <>
      <ChartBox summary={summary} rows={rows.length}>
        <Chart type="bar" data={data} options={options} />
      </ChartBox>
      <Numbers
        caption={caption}
        head={['Genre', `Median ${unit} (middle half)`]}
        rows={rows.map((r) => ({ key: r.tag, label: r.tag, value: `${r.median} (${r.q1}–${r.q3})` }))}
      />
    </>
  );
}

function barColours(c: ThemeColors) {
  return {
    backgroundColor: `rgba(${c.stampRgb}, ${BAR_ALPHA})`,
    borderColor: c.stamp,
    borderWidth: 1,
    borderRadius: 2,
  };
}
