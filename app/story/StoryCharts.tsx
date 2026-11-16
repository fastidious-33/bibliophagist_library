'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  ArcElement,
  BarController,
  BarElement,
  BubbleController,
  CategoryScale,
  DoughnutController,
  Interaction,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ChartType,
  type InteractionItem,
  type InteractionModeFunction,
  type Plugin,
} from 'chart.js';
import { getRelativePosition } from 'chart.js/helpers';
import { Chart } from 'react-chartjs-2';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { SearchBook } from '@/lib/search/types';
import {
  WING_LABEL,
  genreBookPoints,
  oneIn,
  type Bubble,
  type CareerPoint,
  type Instalment,
  type MixRow,
  type OverlayRow,
  type Ranked,
  type Wheel,
  type WheelFamily,
  type WheelSlice,
  type Wing,
} from '@/lib/story';

ChartJS.register(
  ArcElement,
  BarController,
  BarElement,
  BubbleController,
  CategoryScale,
  DoughnutController,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
);

// The small drawing plugins below (bubble names, a reference line, dot
// values) take their colours and font through the chart options, so they
// follow the theme.
declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    bubbleLabels?: { color: string; strong: string; font: string } | false;
    refLine?: { value: number; label: string; color: string; font: string } | false;
    barValues?: { color: string; font: string } | false;
    familyBounds?: { color: string; width: number; ends: number[] } | false;
    centreClear?: { color: string; font: string } | false;
  }
  interface InteractionModeMap {
    barMargin: InteractionModeFunction;
  }
}

const LABEL_SIZE = 11;

/* ---------- Forgiving taps ----------
   A fingertip is far wider than a dot or a short bar, so every mark gets
   an invisible margin: a tap inside it counts, a tap in open space beyond
   every margin does nothing. Dots get theirs from Chart.js's own hit
   radius (DOT_HIT); bars from the barMargin mode below. Where margins
   overlap, the closer mark wins. */

/** Extra tap radius around a dot, in pixels. */
const DOT_HIT = 16;
/** Tap margin around a bar, in pixels. */
const BAR_HIT = 12;

/**
 * A bar counts as hit when the pointer is inside it or within BAR_HIT of
 * its edges. Returns the nearest bar's items (every dataset at that index,
 * so an overlay's two bars share one tooltip).
 */
Interaction.modes.barMargin = function (chart, e, _options, useFinalPosition) {
  const pos = getRelativePosition(e, chart);
  const horizontal = chart.options.indexAxis === 'y';
  const hits: (InteractionItem & { d: number })[] = [];
  for (const meta of chart.getSortedVisibleDatasetMetas()) {
    meta.data.forEach((element, index) => {
      const { x, y, base, width, height } = element.getProps(
        ['x', 'y', 'base', 'width', 'height'],
        useFinalPosition
      ) as { x: number; y: number; base: number; width: number; height: number };
      const [left, right, top, bottom] = horizontal
        ? [Math.min(x, base), Math.max(x, base), y - height / 2, y + height / 2]
        : [x - width / 2, x + width / 2, Math.min(y, base), Math.max(y, base)];
      const dx = Math.max(left - pos.x, 0, pos.x - right);
      const dy = Math.max(top - pos.y, 0, pos.y - bottom);
      const d = Math.hypot(dx, dy);
      if (d <= BAR_HIT) hits.push({ element, datasetIndex: meta.index, index, d });
    });
  }
  if (hits.length === 0) return [];
  hits.sort((a, b) => a.d - b.d);
  const nearest = hits[0].index;
  return hits.filter((h) => h.index === nearest).map(({ element, datasetIndex, index }) => ({ element, datasetIndex, index }));
};

/** For every bar chart: tooltips, hover and clicks all use the margin. */
const BAR_INTERACTION = { mode: 'barMargin' as const, intersect: true };

/**
 * A dashed horizontal line at a comparison value (say, the genre's
 * Goodreads average), labelled at its right end, so dots above and below
 * it read at a glance.
 */
const refLine: Plugin<'line'> = {
  id: 'refLine',
  afterDatasetsDraw(chart, _args, opts) {
    const o = opts as { value?: number; label?: string; color?: string; font?: string } | undefined;
    if (o?.value === undefined || !o.label || !o.color || !o.font) return;
    const { value, label, color, font } = o;
    const { ctx, chartArea } = chart;
    const y = chart.scales.y?.getPixelForValue(value);
    if (y === undefined || y < chartArea.top || y > chartArea.bottom) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = `italic ${LABEL_SIZE}px ${font}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, chartArea.right - 2, y - 3);
    ctx.restore();
  },
};

/** Writes each bar's value at its end ("398"), for the length zoom. */
const barValues: Plugin<'bar'> = {
  id: 'barValues',
  afterDatasetsDraw(chart, _args, opts) {
    const o = opts as { color?: string; font?: string } | undefined;
    if (!o?.color || !o.font) return;
    const { color, font } = o;
    const { ctx, chartArea } = chart;
    const values = chart.data.datasets[0]?.data as (number | null)[] | undefined;
    if (!values) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${LABEL_SIZE}px ${font}`;
    ctx.textBaseline = 'middle';
    chart.getDatasetMeta(0).data.forEach((el, i) => {
      const v = values[i];
      if (v === null || v === undefined) return;
      const { x, y } = el.getProps(['x', 'y'], true) as { x: number; y: number };
      const text = String(v);
      const right = x + 6 + ctx.measureText(text).width <= chartArea.right;
      ctx.textAlign = right ? 'left' : 'right';
      ctx.fillText(text, right ? x + 6 : x - 6, y);
    });
    ctx.restore();
  },
};

/**
 * A wider gap, in the paper colour, wherever one family's genres end and
 * the next family's begin: a line from the middle ring's inner edge to the
 * outer ring's outer edge, so each family reads as a group. `ends` are the
 * outer-ring slices that close a family.
 */
const familyBounds: Plugin<'doughnut'> = {
  id: 'familyBounds',
  afterDatasetsDraw(chart, _args, opts) {
    const o = opts as { color?: string; width?: number; ends?: number[] } | undefined;
    if (!o?.color || !o.width || !o.ends?.length) return;
    const { color, width, ends } = o;
    const outer = chart.getDatasetMeta(0).data;
    const middle = chart.getDatasetMeta(1).data[0];
    if (!middle) return;
    const { innerRadius: from } = middle.getProps(['innerRadius'], true) as { innerRadius: number };
    const { ctx } = chart;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const i of ends) {
      const el = outer[i];
      if (!el) continue;
      const { x, y, endAngle, outerRadius } = el.getProps(['x', 'y', 'endAngle', 'outerRadius'], true) as {
        x: number;
        y: number;
        endAngle: number;
        outerRadius: number;
      };
      const cos = Math.cos(endAngle);
      const sin = Math.sin(endAngle);
      ctx.beginPath();
      ctx.moveTo(x + cos * from, y + sin * from);
      ctx.lineTo(x + cos * outerRadius, y + sin * outerRadius);
      ctx.stroke();
    }
    ctx.restore();
  },
};

/** The wheel's empty centre: its middle point and radius (inside the inner ring). */
function wheelHole(chart: ChartJS<'doughnut'>): { x: number; y: number; r: number } | undefined {
  const inner = chart.getDatasetMeta(chart.data.datasets.length - 1).data[0];
  if (!inner) return undefined;
  const { x, y, innerRadius } = inner.getProps(['x', 'y', 'innerRadius'], true) as {
    x: number;
    y: number;
    innerRadius: number;
  };
  return { x, y, r: innerRadius };
}

/**
 * With something selected, a "×" and "clear" in the wheel's empty centre:
 * the biggest target on the wheel, for clearing a selection that sits on a
 * sliver too thin to tap again. Off (false) when nothing's selected.
 */
const centreClear: Plugin<'doughnut'> = {
  id: 'centreClear',
  afterDatasetsDraw(chart, _args, opts) {
    const o = opts as { color?: string; font?: string } | undefined;
    if (!o?.color || !o.font) return;
    const hole = wheelHole(chart);
    if (!hole || hole.r < 18) return;
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = o.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(Math.min(hole.r * 0.55, 30))}px ${o.font}`;
    ctx.fillText('×', hole.x, hole.y - hole.r * 0.12);
    ctx.font = `${LABEL_SIZE}px ${o.font}`;
    ctx.fillText('clear', hole.x, hole.y + hole.r * 0.32);
    ctx.restore();
  },
};

/** The comparison a drill-down's chart draws its dashed line at. */
export type Reference = { value: number; label: string };

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
    footerColor: c.charcoal,
    borderColor: grid,
    borderWidth: 1,
    titleFont: font,
    bodyFont: font,
    footerFont: font,
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
    <div className="story-chart story-chart--rows" style={rowsStyle(rows)} role="img" aria-label={summary}>
      {children}
    </div>
  );
}

// Every mounted fold, watched by one page-wide click listener (added with
// the first fold, removed with the last) rather than one listener per fold.
const folds = new Set<HTMLDetailsElement>();

function closeFoldsOnOutsideClick(e: MouseEvent) {
  for (const el of folds) {
    if (el.open && !el.contains(e.target as Node)) el.open = false;
  }
}

/**
 * A <details> fold that closes when you click or tap anywhere outside it,
 * so an open table never has to be hunted down to be put away. It listens
 * for a click, not a press: on a phone a press also starts a scroll, and
 * scrolling past shouldn't close it.
 */
export function Fold({
  className,
  summary,
  children,
}: {
  className?: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (folds.size === 0) document.addEventListener('click', closeFoldsOnOutsideClick);
    folds.add(el);
    return () => {
      folds.delete(el);
      if (folds.size === 0) document.removeEventListener('click', closeFoldsOnOutsideClick);
    };
  }, []);
  return (
    <details ref={ref} className={className}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

/** A table row: its first cell (a name or a link), then one or more figures. */
export type NumberRow = { key: string; label: ReactNode; value: string | string[] };

/** The chart's figures as a table, folded behind "Show the numbers". */
export function Numbers({ caption, head, rows }: { caption: string; head: string[]; rows: NumberRow[] }) {
  return (
    <Fold className="story-numbers" summary="Show the numbers">
      <table className="story-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {(Array.isArray(row.value) ? row.value : [row.value]).map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Fold>
  );
}

/**
 * A small highlighted line saying what a click or tap does here.
 * `pointerOnly`: hidden on touch screens, where the drill-down's own
 * "double-tap" line carries the tip instead (Breadcrumb's `tip`).
 */
export function Hint({ children, pointerOnly = false }: { children: ReactNode; pointerOnly?: boolean }) {
  return <p className={`story-hint${pointerOnly ? ' story-hint--pointer' : ''}`}>{children}</p>;
}

// The open drill-downs, oldest first. Esc closes only the newest, so a
// second panel left open beside it stays open.
const openDrills: object[] = [];

/**
 * The row on top of a drill-down: the way back to the chart it replaced,
 * then what's open ("← All authors · Agatha Christie"). Focus lands on the
 * back button when it appears, so keyboard and screen-reader users follow
 * the swap; the page doesn't scroll for it.
 *
 * Two more ways out: the Esc key, and on touch screens a double-tap
 * anywhere on the drill-down's frame (`.story-panel`), except on links,
 * buttons, form controls and the numbers table. There's deliberately no
 * outside-click closing, so drill-downs can sit open side by side, and no
 * desktop double-click (it would fight with selecting text).
 */
export function Breadcrumb({
  back,
  title,
  note,
  tip,
  onBack,
}: {
  back: string;
  title: string;
  note?: string;
  /** A touch-screen tip for this drill-down, folded into the double-tap line. */
  tip?: string;
  onBack: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // The latest onBack, without re-adding the listeners every render.
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const frame = ref.current?.closest('.story-panel');
    const me = {};
    openDrills.push(me);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openDrills[openDrills.length - 1] === me) onBackRef.current();
    };

    // A double-tap: two touch taps within 300ms and 30px of each other,
    // not on something that has its own tap.
    let last: { t: number; x: number; y: number } | null = null;
    const onTap = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if ((e.target as Element | null)?.closest('a, button, input, select, summary, table')) {
        last = null;
        return;
      }
      const now = e.timeStamp;
      if (last && now - last.t < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
        last = null;
        onBackRef.current();
        return;
      }
      last = { t: now, x: e.clientX, y: e.clientY };
    };

    document.addEventListener('keydown', onKey);
    frame?.addEventListener('pointerup', onTap as EventListener);
    return () => {
      const at = openDrills.indexOf(me);
      if (at !== -1) openDrills.splice(at, 1);
      document.removeEventListener('keydown', onKey);
      frame?.removeEventListener('pointerup', onTap as EventListener);
    };
  }, []);

  return (
    <>
      <div className="story-drill-head">
        <button ref={ref} type="button" className="story-back" onClick={onBack}>
          &larr; {back}
        </button>
        <p className="story-drill-title">
          {title} {note && <span>· {note}</span>}
        </p>
      </div>
      <p className="story-drill-hint">
        {tip ? `${tip} · double-tap here to go back.` : 'Or double-tap here to go back.'}
      </p>
    </>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/* ---------- The bubble chart ---------- */

type BubblePoint = { x: number; y: number; r: number; genre: string; on: boolean };

/**
 * Writes each genre's name beside its bubble. Chart.js has no labels of its
 * own, and a dozen same-coloured bubbles need names more than a legend.
 *
 * Names never overlap: each tries right, left, above and below its bubble
 * in turn and takes the first spot that's inside the chart and clear of
 * every name already placed; with no spot free, it's left off (the tooltip
 * and the table still name it). The selected genre goes first, so it's
 * never the one dropped; then the biggest bubbles.
 */
const bubbleLabels: Plugin<'bubble'> = {
  id: 'bubbleLabels',
  afterDatasetsDraw(chart, _args, opts) {
    const o = opts as { color?: string; strong?: string; font?: string } | undefined;
    // Off (false) in the drill-down, where a dot is a book, not a genre.
    if (!o?.font || !o.color || !o.strong) return;
    // Copied out so the narrowing to string survives into the callback.
    const { font, color, strong } = o;
    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    const points = chart.data.datasets[0]?.data as unknown as BubblePoint[] | undefined;
    if (!points) return;

    type Box = { l: number; t: number; r: number; b: number };
    const placed: Box[] = [];
    const clashes = (a: Box) => placed.some((b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t);
    const inside = (a: Box) =>
      a.l >= chartArea.left && a.r <= chartArea.right && a.t >= chartArea.top && a.b <= chartArea.bottom;
    const h = LABEL_SIZE + 2;
    const gap = 4;

    const order = points
      .map((p, i) => ({ p, i }))
      .sort((a, b) => Number(b.p.on) - Number(a.p.on) || b.p.r - a.p.r);

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    for (const { p, i } of order) {
      const el = meta.data[i];
      if (!el) continue;
      const { x, y } = el.getProps(['x', 'y'], true) as { x: number; y: number };
      ctx.font = `${p.on ? '600 ' : ''}${LABEL_SIZE}px ${font}`;
      const w = ctx.measureText(p.genre).width;
      // Right, left, above, below: each as the box the name would fill.
      const spots: Box[] = [
        { l: x + p.r + gap, t: y - h / 2, r: x + p.r + gap + w, b: y + h / 2 },
        { l: x - p.r - gap - w, t: y - h / 2, r: x - p.r - gap, b: y + h / 2 },
        { l: x - w / 2, t: y - p.r - gap - h, r: x + w / 2, b: y - p.r - gap },
        { l: x - w / 2, t: y + p.r + gap, r: x + w / 2, b: y + p.r + gap + h },
      ];
      const spot = spots.find((s) => inside(s) && !clashes(s));
      if (!spot) continue;
      placed.push(spot);
      ctx.fillStyle = p.on ? strong : color;
      ctx.fillText(p.genre, spot.l, (spot.t + spot.b) / 2);
    }
    ctx.restore();
  },
};

/**
 * The biggest genres by typical length (across) and Goodreads average
 * (up), sized by books. It never filters the story: a click opens the
 * genre's books as dots, and "All genres" comes back. A genre selected
 * elsewhere (the wheel, the bar) stays bold here and the rest fade.
 */
export function BubbleChart({
  rows,
  books,
  highlight = [],
}: {
  rows: Bubble[];
  books: SearchBook[];
  /** The selection's genres (one genre, or a family's): bold, the rest fade. */
  highlight?: string[];
}) {
  const [drilled, setDrilled] = useState<string | null>(null);
  return drilled ? (
    <GenreBooks genre={drilled} books={books} onBack={() => setDrilled(null)} />
  ) : (
    <GenreBubbles rows={rows} highlight={highlight} onOpen={setDrilled} />
  );
}

function GenreBubbles({
  rows,
  highlight,
  onOpen,
}: {
  rows: Bubble[];
  highlight: string[];
  onOpen: (genre: string) => void;
}) {
  // Any of the selection's genres on the chart: those stay bold, the rest fade.
  const selected = highlight.some((g) => rows.some((r) => r.genre === g));
  const { c, animation, grid, font, tooltip } = useChartStyle();
  const most = Math.max(1, ...rows.map((r) => r.books));
  // Up to ~38px across: big enough to compare, small enough that the
  // middle of the chart doesn't become one clump.
  const radius = (books: number) => 4 + Math.sqrt(books / most) * 15;

  // Room around the bubbles so the big ones aren't clipped at the edges.
  const xs = rows.map((r) => r.medianPages);
  const ys = rows.map((r) => r.average);
  const xMin = Math.max(0, Math.floor((Math.min(...xs) - 60) / 50) * 50);
  const xMax = Math.ceil((Math.max(...xs) + 60) / 50) * 50;
  const yMin = Math.floor((Math.min(...ys) - 0.08) * 10) / 10;
  const yMax = Math.ceil((Math.max(...ys) + 0.08) * 10) / 10;

  const longest = [...rows].sort((a, b) => b.medianPages - a.medianPages)[0];
  const best = [...rows].sort((a, b) => b.average - a.average)[0];
  const summary =
    longest && best
      ? `The ${rows.length} biggest genres by typical length and Goodreads average. Longest: ${longest.genre}, ${longest.medianPages} pages. Best rated: ${best.genre}, ${best.average.toFixed(2)}.`
      : 'Genres by typical length and Goodreads average.';

  const fill = (on: boolean) => `rgba(${c.stampRgb}, ${selected ? (on ? 0.85 : 0.12) : 0.45})`;
  const points: BubblePoint[] = rows.map((r) => ({
    x: r.medianPages,
    y: Number(r.average.toFixed(2)),
    r: radius(r.books),
    genre: r.genre,
    on: highlight.includes(r.genre),
  }));

  // Drawn in this order, so the biggest go down first and the small ones sit
  // on top, never hidden under a big one.
  points.sort((a, b) => b.r - a.r);
  const byPoint = points.map((p) => rows.find((r) => r.genre === p.genre)!);

  const data = {
    datasets: [
      {
        data: points,
        backgroundColor: points.map((p) => fill(p.on)),
        // A paper-coloured ring, so where bubbles overlap each edge shows
        // (the selected one keeps an ink ring).
        borderColor: points.map((p) => (p.on ? c.ink : c.paper)),
        borderWidth: 2,
        hoverBorderWidth: 2,
        // Bubbles are already big; a smaller ring than the dots get.
        hitRadius: 10,
      },
    ],
  } as unknown as ChartData<'bubble'>;

  const options: ChartOptions<'bubble'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    onClick: (_e, elements) => {
      const row = byPoint[elements[0]?.index ?? -1];
      if (row) onOpen(row.genre);
    },
    onHover: (e, elements) => {
      const target = e.native?.target as HTMLElement | undefined;
      if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
    },
    plugins: {
      legend: { display: false },
      bubbleLabels: { color: c.charcoal, strong: c.ink, font: c.label },
      tooltip: {
        ...tooltip,
        callbacks: {
          title: (items) => byPoint[items[0]?.dataIndex ?? -1]?.genre ?? '',
          label: (item) => {
            const r = byPoint[item.dataIndex];
            return r
              ? [
                  `${plural(r.books, 'book')}`,
                  `A typical one: ${r.medianPages} pages`,
                  `The crowd: ${r.average.toFixed(2)} (${plural(r.rated, 'rated book')})`,
                ]
              : '';
          },
        },
      },
    },
    scales: {
      x: {
        min: xMin,
        max: xMax,
        title: { display: true, text: 'A typical book (median pages)', color: c.charcoal, font },
        ticks: { color: c.charcoal, font, precision: 0 },
        grid: { color: grid },
      },
      y: {
        min: yMin,
        max: yMax,
        title: { display: true, text: 'Goodreads average', color: c.charcoal, font },
        ticks: { color: c.charcoal, font, stepSize: 0.1 },
        grid: { color: grid },
      },
    },
  };

  return (
    <>
      <Hint>Tap or click a bubble to see that genre&rsquo;s books.</Hint>
      <div className="story-chart story-bubbles" role="img" aria-label={summary}>
        <Chart type="bubble" data={data} options={options} plugins={[bubbleLabels]} />
      </div>
      {/* The keyboard route to what a bubble click does. */}
      <Numbers
        caption="The biggest genres: books, typical length and Goodreads average"
        head={['Genre', 'Books', 'Typical pages', 'Goodreads']}
        rows={rows.map((r) => ({
          key: r.genre,
          label: (
            <button type="button" className="story-table-pick" onClick={() => onOpen(r.genre)}>
              {r.genre}
            </button>
          ),
          value: [String(r.books), String(r.medianPages), r.average.toFixed(2)],
        }))}
      />
    </>
  );
}

/** One genre's books as dots: pages across, Goodreads average up. */
function GenreBooks({ genre, books, onBack }: { genre: string; books: SearchBook[]; onBack: () => void }) {
  const { c, animation, grid, font, tooltip } = useChartStyle();
  const { points, left } = genreBookPoints(books, genre);
  const xs = points.map((p) => p.pages);
  const ys = points.map((p) => p.rating);
  const xMin = Math.max(0, Math.floor((Math.min(...xs) - 30) / 50) * 50);
  const xMax = Math.ceil((Math.max(...xs) + 30) / 50) * 50;
  const yMin = Math.floor((Math.min(...ys) - 0.05) * 10) / 10;
  const yMax = Math.min(5, Math.ceil((Math.max(...ys) + 0.05) * 10) / 10);
  const byRating = [...points].sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title));
  const summary = `${genre}: ${plural(points.length, 'book')} by pages and Goodreads average.`;

  // How many books the tooltip found at the tapped spot (set by its filter,
  // which sees them all, and read by its title and footer).
  const found = { n: 0 };

  const data = {
    datasets: [
      {
        data: points.map((p) => ({ x: p.pages, y: p.rating, r: 5 })),
        // See-through, so books stacked on one spot build up darker and a
        // clump shows as one.
        backgroundColor: `rgba(${c.stampRgb}, 0.35)`,
        borderColor: `rgba(${c.stampRgb}, 0.8)`,
        borderWidth: 1,
        hoverBorderWidth: 2,
        hitRadius: DOT_HIT,
        // A 5.0 or the longest book sits on the edge; don't cut it in half.
        clip: false,
      },
    ],
  } as unknown as ChartData<'bubble'>;

  const options: ChartOptions<'bubble'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    // Every dot under the finger, not just one, so a tap on a clump lists
    // the books in it.
    interaction: { mode: 'point', intersect: true },
    plugins: {
      legend: { display: false },
      bubbleLabels: false,
      tooltip: {
        ...tooltip,
        // At most five named; the footer counts the rest.
        filter: (_item, index, all) => {
          found.n = all.length;
          return index < 5;
        },
        callbacks: {
          title: (items) =>
            found.n > 1 ? `${found.n} books here` : (points[items[0]?.dataIndex ?? -1]?.title ?? ''),
          label: (item) => {
            const p = points[item.dataIndex];
            if (!p) return '';
            return found.n > 1
              ? `${p.title} · ${p.pages} pages · ${p.rating.toFixed(2)}`
              : [p.author, `${p.pages} pages · ${p.rating.toFixed(2)}`].filter(Boolean);
          },
          footer: () => (found.n > 5 ? `+${found.n - 5} more` : ''),
        },
      },
    },
    scales: {
      x: {
        min: xMin,
        max: xMax,
        title: { display: true, text: 'Pages', color: c.charcoal, font },
        ticks: { color: c.charcoal, font, precision: 0 },
        grid: { color: grid },
      },
      y: {
        min: yMin,
        max: yMax,
        title: { display: true, text: 'Goodreads average', color: c.charcoal, font },
        ticks: { color: c.charcoal, font, stepSize: 0.1 },
        grid: { color: grid },
      },
    },
  };

  return (
    <div className="story-panel" role="region" aria-label={genre}>
      <Breadcrumb
        back="All genres"
        title={genre}
        note={plural(points.length, 'book')}
        tip="Tap a dot for the book"
        onBack={onBack}
      />
      <Hint pointerOnly>Hover over a dot to see the book; the table below links to each one.</Hint>
      {points.length > 0 ? (
        <div className="story-chart story-bubbles" role="img" aria-label={summary}>
          <Chart type="bubble" data={data} options={options} />
        </div>
      ) : (
        <p className="story-note">None of these books has both a page count and a Goodreads average yet.</p>
      )}
      {left > 0 && (
        <p className="story-footnote">
          {plural(left, 'book')} without a page count or a Goodreads average {left === 1 ? 'isn’t' : 'aren’t'} shown.
        </p>
      )}
      <Numbers
        caption={`${genre}: its books by pages and Goodreads average`}
        head={['Book', 'Pages', 'Goodreads']}
        rows={byRating.map((p) => ({
          key: p.slug,
          label: <Link href={`/catalog/${p.slug}`}>{p.title}</Link>,
          value: [String(p.pages), p.rating.toFixed(2)],
        }))}
      />
      <Link href={`/catalog?${new URLSearchParams({ tags: genre })}`} className="read-link">
        See them in the catalog &rarr;
      </Link>
    </div>
  );
}

/**
 * Horizontal bars, largest first. With `onPick`, a bar click (or its row
 * in the table) drills down; without, a click or tap only shows the
 * tooltip, and the table's rows link to each bar's `href`. `footnote` sits
 * between the chart and its table.
 */
export function RankedBars({
  rows,
  caption,
  column,
  summary,
  onPick,
  footnote,
}: {
  rows: Ranked[];
  caption: string;
  column: string;
  summary: string;
  onPick?: (row: Ranked) => void;
  footnote?: ReactNode;
}) {
  const { c, animation, grid, font, tooltip } = useChartStyle();

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
            interaction: BAR_INTERACTION,
            onClick: onPick
              ? (_e, elements) => {
                  const row = rows[elements[0]?.index ?? -1];
                  if (row) onPick(row);
                }
              : undefined,
            onHover: onPick
              ? (e, elements) => {
                  const target = e.native?.target as HTMLElement | undefined;
                  if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
                }
              : undefined,
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
      {footnote}
      {/* The keyboard route to what a bar click does. */}
      <Numbers
        caption={caption}
        head={[column, 'Books']}
        rows={rows.map((r) => ({
          key: r.label,
          label: onPick ? (
            <button type="button" className="story-table-pick" onClick={() => onPick(r)}>
              {r.label}
            </button>
          ) : (
            <Link href={r.href}>{r.label}</Link>
          ),
          value: String(r.count),
        }))}
      />
    </>
  );
}

/* ---------- Drill-down pieces ---------- */

export type LedgerColumn = { head: string; value: string; unit?: string; note?: string };

/**
 * A small ruled entry, the same look as chapter 2's, for the line that
 * opens every drill-down.
 */
export function MiniLedger({ columns }: { columns: LedgerColumn[] }) {
  return (
    <dl className="story-entry story-entry--mini" style={{ '--cols': columns.length } as CSSProperties}>
      {columns.map((col) => (
        <div key={col.head}>
          <dt>{col.head}</dt>
          <dd>
            {col.value}
            {col.unit && <small> {col.unit}</small>}
          </dd>
          {col.note && <dd className="story-entry-note">{col.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** A Goodreads-average scale fitted to the values (and the reference line). */
function ratingRange(values: number[], reference?: Reference) {
  const all = reference ? [...values, reference.value] : values;
  return {
    min: Math.floor((Math.min(...all) - 0.1) * 10) / 10,
    max: Math.min(5, Math.ceil((Math.max(...all) + 0.1) * 10) / 10),
  };
}

/**
 * A series' arc: each instalment's Goodreads average in published order
 * (Book 1, 2, 3…), joined by a line, so you can see whether it holds up.
 * Unrated instalments leave a gap. The dashed line is the comparison
 * average.
 */
export function SeriesArc({
  series,
  arc,
  reference,
  footnote,
}: {
  series: string;
  arc: Instalment[];
  reference?: Reference;
  footnote?: ReactNode;
}) {
  const { c, animation, grid, font, tooltip } = useChartStyle();
  const ratings = arc.map((i) => i.rating).filter((r): r is number => r !== undefined);
  const { min: yMin, max: yMax } = ratingRange(ratings, reference);
  const best = arc.reduce<Instalment | undefined>((b, i) => ((i.rating ?? 0) > (b?.rating ?? 0) ? i : b), undefined);
  const summary = `${series}: Goodreads average for each of ${arc.length} books in published order${best ? `; highest ${best.title} at ${best.rating?.toFixed(2)}` : ''}${reference ? `; ${reference.label} for comparison` : ''}.`;

  const data: ChartData<'line', (number | null)[], string> = {
    labels: arc.map((_i, n) => `Book ${n + 1}`),
    datasets: [
      {
        data: arc.map((i) => (i.rating !== undefined ? Number(i.rating.toFixed(2)) : null)),
        borderColor: c.stamp,
        borderWidth: 2,
        backgroundColor: c.stamp,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHitRadius: DOT_HIT,
        spanGaps: false,
        tension: 0,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    plugins: {
      legend: { display: false },
      refLine: reference ? { ...reference, color: c.ledger, font: c.label } : false,
      tooltip: {
        ...tooltip,
        callbacks: {
          title: (items) => arc[items[0]?.dataIndex ?? -1]?.title ?? '',
          label: (item) => {
            const i = arc[item.dataIndex];
            if (!i) return '';
            return [
              i.rating !== undefined ? `Goodreads ${i.rating.toFixed(2)}` : 'No Goodreads average',
              [i.year !== undefined ? `first published ${i.year}` : '', i.pages !== undefined ? `${i.pages} pages` : '']
                .filter(Boolean)
                .join(' · '),
            ].filter(Boolean);
          },
        },
      },
    },
    scales: {
      // Book 1, 2, 3…: upright, skipping labels if they'd crowd.
      x: { ticks: { color: c.charcoal, font, maxRotation: 0, autoSkip: true }, grid: { display: false } },
      y: {
        min: yMin,
        max: yMax,
        title: { display: true, text: 'Goodreads average', color: c.charcoal, font },
        ticks: { color: c.charcoal, font, stepSize: 0.1 },
        grid: { color: grid },
      },
    },
  };

  return (
    <>
      <div className="story-chart story-arc" role="img" aria-label={summary}>
        <Chart type="line" data={data} options={options} plugins={[refLine]} />
      </div>
      {footnote}
      <Numbers
        caption={`${series}: each book's Goodreads average, in published order`}
        head={['Book', 'First published', 'Goodreads']}
        rows={arc.map((i, n) => ({
          key: i.slug,
          label: (
            <>
              {n + 1}. <Link href={`/catalog/${i.slug}`}>{i.title}</Link>
            </>
          ),
          value: [i.year !== undefined ? String(i.year) : '–', i.rating !== undefined ? i.rating.toFixed(2) : '–'],
        }))}
      />
    </>
  );
}

/**
 * An author's career: each of their books as a dot, placed by the year it
 * first came out (across) and its Goodreads average (up). Dots only: a
 * line through books from the same year would zig-zag like a trend that
 * isn't there. The dashed line is the comparison average.
 */
export function CareerArc({
  author,
  points,
  reference,
  footnote,
}: {
  author: string;
  points: CareerPoint[];
  reference?: Reference;
  footnote?: ReactNode;
}) {
  const { c, animation, grid, font, tooltip } = useChartStyle();
  const years = points.map((p) => p.year);
  const xMin = Math.floor((Math.min(...years) - 2) / 5) * 5;
  const xMax = Math.ceil((Math.max(...years) + 2) / 5) * 5;
  const { min: yMin, max: yMax } = ratingRange(
    points.map((p) => p.rating),
    reference
  );
  const best = [...points].sort((a, b) => b.rating - a.rating)[0];
  const summary = `${author}: ${plural(points.length, 'book')} by year first published and Goodreads average${best ? `; highest ${best.title} (${best.year}) at ${best.rating.toFixed(2)}` : ''}${reference ? `; ${reference.label} for comparison` : ''}.`;

  const data: ChartData<'line', { x: number; y: number }[]> = {
    datasets: [
      {
        data: points.map((p) => ({ x: p.year, y: Number(p.rating.toFixed(2)) })),
        showLine: false,
        backgroundColor: `rgba(${c.stampRgb}, 0.75)`,
        borderColor: c.stamp,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointHitRadius: DOT_HIT,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    plugins: {
      legend: { display: false },
      refLine: reference ? { ...reference, color: c.ledger, font: c.label } : false,
      tooltip: {
        ...tooltip,
        callbacks: {
          title: (items) => points[items[0]?.dataIndex ?? -1]?.title ?? '',
          label: (item) => {
            const p = points[item.dataIndex];
            if (!p) return '';
            return [`Goodreads ${p.rating.toFixed(2)}`, `first published ${p.year}${p.pages ? ` · ${p.pages} pages` : ''}`];
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: xMin,
        max: xMax,
        title: { display: true, text: 'First published', color: c.charcoal, font },
        // Years, not quantities: no thousands separator.
        ticks: { color: c.charcoal, font, precision: 0, callback: (v) => String(v) },
        grid: { display: false },
      },
      y: {
        min: yMin,
        max: yMax,
        title: { display: true, text: 'Goodreads average', color: c.charcoal, font },
        ticks: { color: c.charcoal, font, stepSize: 0.1 },
        grid: { color: grid },
      },
    },
  };

  return (
    <>
      <div className="story-chart story-arc" role="img" aria-label={summary}>
        <Chart type="line" data={data} options={options} plugins={[refLine]} />
      </div>
      {footnote}
      <Numbers
        caption={`${author}: each book's year and Goodreads average`}
        head={['Book', 'First published', 'Goodreads']}
        rows={points.map((p) => ({
          key: p.slug,
          label: <Link href={`/catalog/${p.slug}`}>{p.title}</Link>,
          value: [String(p.year), p.rating.toFixed(2)],
        }))}
      />
    </>
  );
}

/**
 * A bar's top genres: each one's share there (front) over its share of
 * everything shown (the faded bar behind), so you can see what the bar
 * leans towards. `here` and `overall` name the two ("The 1990s", "the
 * shelf").
 */
export function GenreMix({
  rows,
  here,
  overall,
  footnote,
}: {
  rows: MixRow[];
  here: string;
  overall: string;
  footnote?: ReactNode;
}) {
  const { c, animation, grid, font, tooltip } = useChartStyle();
  const behind = `rgba(${c.charcoalRgb}, 0.16)`;
  const top = rows[0];
  const summary = top
    ? `${here}'s top genres against ${overall}: ${top.tag} is ${oneIn(top.hereShare)} here and ${oneIn(top.overallShare)} overall.`
    : `${here}'s genres.`;

  const data: ChartData<'bar', number[], string> = {
    labels: rows.map((r) => r.tag),
    datasets: [
      {
        label: here,
        data: rows.map((r) => r.hereShare * 100),
        ...barColours(c),
        grouped: false,
        order: 0,
        barPercentage: 0.55,
      },
      {
        label: overall,
        data: rows.map((r) => r.overallShare * 100),
        backgroundColor: behind,
        borderWidth: 0,
        borderRadius: 2,
        grouped: false,
        order: 1,
        barPercentage: 0.95,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation,
    interaction: BAR_INTERACTION,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip,
        callbacks: {
          label: (item) => {
            const r = rows[item.dataIndex];
            if (!r) return '';
            return item.datasetIndex === 0
              ? `${here}: ${plural(r.here, 'book')}, ${oneIn(r.hereShare)}`
              : `${overall}: ${oneIn(r.overallShare)}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: c.charcoal, font, precision: 0, callback: (v) => `${v}%` },
        grid: { color: grid },
      },
      y: { ticks: { color: c.charcoal, font }, grid: { display: false } },
    },
  };

  return (
    <>
      <p className="story-legend">
        <span style={swatchStyle(`rgba(${c.stampRgb}, ${BAR_ALPHA})`)}>
          <span className="story-swatch" aria-hidden="true" />
          {here}
        </span>
        <span style={swatchStyle(behind)}>
          <span className="story-swatch" aria-hidden="true" />
          {overall}
        </span>
        <span className="story-legend-note">share of books in each</span>
      </p>
      <ChartBox summary={summary} rows={rows.length}>
        <Chart type="bar" data={data} options={options} />
      </ChartBox>
      {footnote}
      <Numbers
        caption={`${here}'s top genres against ${overall}`}
        head={['Genre', here, overall]}
        rows={rows.map((r) => ({
          key: r.tag,
          label: r.tag,
          value: [`${r.here} (${Math.round(r.hereShare * 100)}%)`, `${Math.round(r.overallShare * 100)}%`],
        }))}
      />
    </>
  );
}

/**
 * A length bar zoomed in: its longest books as bars, longest at the top,
 * each labelled with its page count. Inside one 100-page band the books
 * differ by a few pages, so the scale starts just below the shortest of
 * them (on a round number) instead of at zero; the footnote says where, as
 * a cut-off bar overstates differences.
 */
export function LongestBars({
  books,
  band,
}: {
  books: { title: string; slug: string; author: string; pages: number }[];
  band: string;
}) {
  const { c, animation, grid, font, tooltip } = useChartStyle();
  const pages = books.map((b) => b.pages);
  const lo = Math.min(...pages);
  const hi = Math.max(...pages);
  // The shortest bar keeps a visible length: at least 5 pages, or the
  // spread of the ten, whichever is more.
  const xMin = Math.max(0, Math.floor((lo - Math.max(5, hi - lo)) / 5) * 5);
  const xMax = hi + Math.max(3, Math.ceil((hi - xMin) * 0.12)); // room for the labels
  const summary = `The ${books.length} longest books of ${band}: from ${books[0]?.title} at ${hi} pages to ${books[books.length - 1]?.title} at ${lo}.`;

  const data: ChartData<'bar', number[], string> = {
    labels: books.map((b) => b.title),
    datasets: [{ data: pages, ...barColours(c) }],
  };

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation,
    interaction: BAR_INTERACTION,
    plugins: {
      legend: { display: false },
      barValues: { color: c.charcoal, font: c.label },
      tooltip: {
        ...tooltip,
        callbacks: {
          title: (items) => books[items[0]?.dataIndex ?? -1]?.title ?? '',
          label: (item) => {
            const b = books[item.dataIndex];
            return b ? [b.author, `${b.pages} pages`].filter(Boolean) : '';
          },
        },
      },
    },
    scales: {
      x: {
        min: xMin,
        max: xMax,
        title: { display: true, text: 'Pages', color: c.charcoal, font },
        ticks: { color: c.charcoal, font, precision: 0 },
        grid: { color: grid },
      },
      y: { ticks: { color: c.charcoal, font }, grid: { display: false } },
    },
  };

  return (
    <>
      <ChartBox summary={summary} rows={books.length}>
        <Chart type="bar" data={data} options={options} plugins={[barValues]} />
      </ChartBox>
      <p className="story-footnote">
        {xMin > 0
          ? `The scale starts at ${xMin} pages, not zero, so the few pages between these books show; each bar is labelled with its page count.`
          : 'Each bar is labelled with its page count.'}
      </p>
      <Numbers
        caption={`The longest books of ${band}`}
        head={['Book', 'Pages']}
        rows={books.map((b) => ({
          key: b.slug,
          label: <Link href={`/catalog/${b.slug}`}>{b.title}</Link>,
          value: String(b.pages),
        }))}
      />
    </>
  );
}

const share = (n: number, total: number) => (total ? (n / total) * 100 : 0);
const pct = (n: number, total: number) => `${Math.round(share(n, total))}%`;

/**
 * Upright columns in a fixed order (decades, page counts). With a
 * selection, its bars stand inside the whole shelf's, which fade; both are
 * shown as shares of their own totals so the shapes compare (a genre's 40
 * books would be invisible against the shelf's 600 otherwise). With
 * `onPick`, a bar click (or its table row) drills into it.
 */
export function OverlayColumns({
  rows,
  chosenLabel,
  caption,
  column,
  summary,
  onPick,
}: {
  rows: OverlayRow[];
  /** The selection's name, when there is one. */
  chosenLabel?: string;
  caption: string;
  column: string;
  summary: string;
  onPick?: (label: string) => void;
}) {
  const { c, animation, grid, font, tooltip } = useChartStyle();
  const overlaid = Boolean(chosenLabel) && rows.some((r) => r.chosen !== undefined);
  const allTotal = rows.reduce((s, r) => s + r.all, 0);
  const chosenTotal = rows.reduce((s, r) => s + (r.chosen ?? 0), 0);
  const shelfFill = `rgba(${c.charcoalRgb}, 0.16)`;

  const data: ChartData<'bar', number[], string> = overlaid
    ? {
        labels: rows.map((r) => r.label),
        datasets: [
          {
            label: chosenLabel,
            data: rows.map((r) => share(r.chosen ?? 0, chosenTotal)),
            ...barColours(c),
            grouped: false,
            order: 0,
            barPercentage: 0.55,
          },
          {
            label: 'Whole shelf',
            data: rows.map((r) => share(r.all, allTotal)),
            backgroundColor: shelfFill,
            borderWidth: 0,
            borderRadius: 2,
            grouped: false,
            order: 1,
            barPercentage: 0.95,
          },
        ],
      }
    : {
        labels: rows.map((r) => r.label),
        datasets: [{ data: rows.map((r) => r.all), ...barColours(c) }],
      };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    interaction: BAR_INTERACTION,
    onClick: onPick
      ? (_e, elements) => {
          const row = rows[elements[0]?.index ?? -1];
          // An empty bar has nothing to open.
          if (row && (overlaid ? (row.chosen ?? 0) : row.all) > 0) onPick(row.label);
        }
      : undefined,
    onHover: onPick
      ? (e, elements) => {
          const target = e.native?.target as HTMLElement | undefined;
          if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
        }
      : undefined,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltip,
        callbacks: {
          label: (item) => {
            const r = rows[item.dataIndex];
            if (!r) return '';
            if (!overlaid) return plural(r.all, 'book');
            return item.datasetIndex === 0
              ? `${chosenLabel}: ${plural(r.chosen ?? 0, 'book')} (${pct(r.chosen ?? 0, chosenTotal)})`
              : `Whole shelf: ${plural(r.all, 'book')} (${pct(r.all, allTotal)})`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: c.charcoal, font }, grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          color: c.charcoal,
          font,
          precision: 0,
          callback: (v) => (overlaid ? `${v}%` : String(v)),
        },
        grid: { color: grid },
      },
    },
  };

  return (
    <>
      {overlaid && (
        <p className="story-legend">
          <span style={swatchStyle(`rgba(${c.stampRgb}, ${BAR_ALPHA})`)}>
            <span className="story-swatch" aria-hidden="true" />
            {chosenLabel}
          </span>
          <span style={swatchStyle(shelfFill)}>
            <span className="story-swatch" aria-hidden="true" />
            Whole shelf
          </span>
          <span className="story-legend-note">as shares of each</span>
        </p>
      )}
      <div className="story-chart" role="img" aria-label={summary}>
        <Chart type="bar" data={data} options={options} />
      </div>
      <Numbers
        caption={caption}
        head={[column, overlaid ? `${chosenLabel} · whole shelf` : 'Books']}
        rows={rows.map((r) => ({
          key: r.label,
          label:
            onPick && (overlaid ? (r.chosen ?? 0) : r.all) > 0 ? (
              <button type="button" className="story-table-pick" onClick={() => onPick(r.label)}>
                {r.label}
              </button>
            ) : (
              r.label
            ),
          value: overlaid
            ? `${r.chosen ?? 0} (${pct(r.chosen ?? 0, chosenTotal)}) · ${r.all} (${pct(r.all, allTotal)})`
            : String(r.all),
        }))}
      />
    </>
  );
}

/* ---------- The wheel ---------- */

/** '#2e3a5c' → '46, 58, 92', for rgba(); anything else falls back. */
function hexToRgb(hex: string, fallback: string): string {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.replace(/./g, (ch) => ch + ch) : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return fallback;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** A colour handed to CSS as --swatch, for the key's little squares. */
function swatchStyle(colour: string): CSSProperties {
  return { '--swatch': colour } as CSSProperties;
}

/**
 * A colour at fraction t (0–1) along a list of hex stops, blended between
 * the two nearest ("rgb" triplet for rgba()).
 */
function alongShades(stops: string[], t: number, fallback: string): string {
  if (stops.length === 0) return fallback;
  if (stops.length === 1) return hexToRgb(stops[0], fallback);
  const at = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const lo = Math.floor(at);
  const hi = Math.min(lo + 1, stops.length - 1);
  const mix = at - lo;
  const a = hexToRgb(stops[lo], fallback).split(',').map(Number);
  const b = hexToRgb(stops[hi], fallback).split(',').map(Number);
  return a.map((v, i) => Math.round(v + (b[i] - v) * mix)).join(', ');
}

/** An "r, g, b" triplet blended toward another by `amount` (0–1). */
function blend(rgb: string, toward: string, amount: number): string {
  const a = rgb.split(',').map(Number);
  const b = toward.split(',').map(Number);
  return a.map((v, i) => Math.round(v + ((b[i] ?? v) - v) * amount)).join(', ');
}

/**
 * The inner ring: one colour per wing (oxblood for Fiction, the ledger ink
 * for Non-fiction). The middle ring: each wing's families running from the
 * darkest shade of that wing's ink to the lightest, biggest first
 * (--wheel-fiction and --wheel-non-fiction in globals.css). The outer ring:
 * each family's genres in that family's colour, stepping lighter down the
 * family (toward the paper by day, the ink at night). Other, and the "+N more" folds, are grey or
 * pale. With a family or genre selected, it and its genres stay bold and
 * everything else fades.
 */
function wheelColours(c: ThemeColors, wheel: Wheel, selectedGenre?: string, selectedFamily?: string) {
  const rgb: Record<Wing, string> = {
    fiction: c.stampRgb,
    'non-fiction': hexToRgb(c.ledger, c.charcoalRgb),
  };
  const shades: Record<Wing, string[]> = { fiction: c.wheelFiction, 'non-fiction': c.wheelNonFiction };
  const paper = hexToRgb(c.paper, '255, 255, 255');
  // The genres step *lighter* down a family in both themes: toward the
  // cream paper by day, toward the ivory ink at night (blending toward the
  // dark paper would sink them into the page).
  const [pr, pg, pb] = paper.split(',').map(Number);
  const darkPage = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb < 128;
  const lighter = darkPage ? hexToRgb(c.ink, paper) : paper;
  const picking = Boolean(selectedGenre || selectedFamily);
  const fade = (on: boolean, alpha: number) => (picking && !on ? alpha * 0.25 : alpha);

  // Other (genres not yet in a family): a solid mid grey, halfway between
  // the text and the page, so it reads as "unsorted" in either theme
  // rather than vanishing into a dark page.
  const unsorted = blend(c.charcoalRgb, paper, 0.5);
  const familyRgb = new Map<string, string>();
  const families = wheel.families.map((f) => {
    const key = `${f.wing}|${f.family}`;
    if (!f.selectable) {
      familyRgb.set(key, unsorted);
      return `rgba(${unsorted}, ${fade(false, 1)})`;
    }
    const mine = wheel.families.filter((x) => x.wing === f.wing && x.selectable);
    const t = mine.length > 1 ? mine.indexOf(f) / (mine.length - 1) : 0;
    const triplet = alongShades(shades[f.wing], t, rgb[f.wing]);
    familyRgb.set(key, triplet);
    return `rgba(${triplet}, ${fade(f.family === selectedFamily, 1)})`;
  });

  const slices = wheel.slices.map((s) => {
    const key = `${s.wing}|${s.family}`;
    const base = familyRgb.get(key) ?? unsorted;
    const mine = wheel.slices.filter((x) => x.wing === s.wing && x.family === s.family);
    // Genres step lighter down the family; a fold is palest.
    const lighten = s.genre ? Math.min(0.15 + 0.12 * mine.indexOf(s), 0.55) : 0.65;
    const on = selectedFamily ? s.family === selectedFamily : Boolean(s.genre) && s.genre === selectedGenre;
    return `rgba(${blend(base, lighter, lighten)}, ${fade(on, 1)})`;
  });

  const wings = wheel.wings.map((w) => `rgba(${rgb[w.wing]}, ${fade(false, 0.95)})`);
  return { slices, families, wings };
}

/**
 * The wheel: the two wings inside, their families in the middle, the
 * families' genres outside, each book counted once in each ring (under its
 * most specific subject genre and that genre's family). Click a wing to
 * open it into the whole wheel (again to close); click a family or a genre
 * to select it (again to clear). The key beside it does the same from the
 * keyboard.
 */
export function WheelChart({
  wheel,
  zoom,
  selected,
  selectedFamily,
  onWing,
  onFamily,
  onGenre,
  onClear,
}: {
  wheel: Wheel;
  zoom: Wing | null;
  /** The selected genre, if any: its slice stays bold, the rest fade. */
  selected?: string;
  /** The selected family, if any: it and its genres stay bold, the rest fade. */
  selectedFamily?: string;
  onWing: (wing: Wing) => void;
  onFamily: (family: string) => void;
  onGenre: (genre: string) => void;
  /** Given while something is selected: a tap in the empty centre clears it. */
  onClear?: () => void;
}) {
  const { c, animation, tooltip } = useChartStyle();
  // Phones only: the full key folds behind "All genres", with a one-line
  // key of the wings and Other always shown (CSS hides both, and ignores the
  // fold, wherever the full key sits beside the wheel).
  const [keyOpen, setKeyOpen] = useState(false);
  const keyId = useId();
  const keyWrap = useRef<HTMLDivElement>(null);
  // An open key is a fold, like "Show the numbers": a click or tap outside
  // it closes it (a click, not a press, so scrolling doesn't), and so does
  // Esc. Picking from it closes it too (pickWing / pickGenre below).
  useEffect(() => {
    if (!keyOpen) return;
    const onClick = (e: MouseEvent) => {
      if (keyWrap.current && !keyWrap.current.contains(e.target as Node)) setKeyOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setKeyOpen(false);
    };
    // Wait a tick, so the click that opened it doesn't close it.
    const timer = window.setTimeout(() => document.addEventListener('click', onClick), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [keyOpen]);
  const pickWing = (wing: Wing) => {
    setKeyOpen(false);
    onWing(wing);
  };
  const pickGenre = (genre: string) => {
    setKeyOpen(false);
    onGenre(genre);
  };
  const pickFamily = (family: string) => {
    setKeyOpen(false);
    onFamily(family);
  };
  // The key lists families, each with its genres folded away; ▸ unfolds
  // one. The selection's family (a selected family, or a selected genre's)
  // is unfolded on its own.
  const [unfolded, setUnfolded] = useState<Set<string>>(() => new Set());
  const familyKey = (wing: Wing, family: string) => `${wing}|${family}`;
  const toggleFamily = (key: string) =>
    setUnfolded((open) => {
      const next = new Set(open);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const isUnfolded = (f: WheelFamily) =>
    unfolded.has(familyKey(f.wing, f.family)) ||
    f.family === selectedFamily ||
    (Boolean(selected) &&
      wheel.slices.some((s) => s.wing === f.wing && s.family === f.family && s.genre === selected));
  const colours = wheelColours(c, wheel, selected, selectedFamily);
  // The phone key's "Other": the grey of unplaced genres, if there are any.
  const otherAt = wheel.families.findIndex((f) => !f.selectable);
  const otherColour = otherAt === -1 ? undefined : colours.families[otherAt];
  const total = wheel.wings.reduce((s, w) => s + w.books, 0);
  const biggest = wheel.families.filter((f) => f.selectable).sort((a, b) => b.main - a.main)[0];
  const summary = zoom
    ? `${WING_LABEL[zoom]} opened out: ${total} books across its families and genres${biggest ? `, the largest family ${biggest.family} with ${biggest.main}` : ''}.`
    : `${total} books by wing, family and genre: ${wheel.wings.map((w) => `${WING_LABEL[w.wing]} ${w.books}`).join(', ')}${biggest ? `; the largest family is ${biggest.family} with ${biggest.main}` : ''}.`;

  const sliceTip = (s: WheelSlice) =>
    s.genre
      ? `${s.main} mainly here · ${s.tagged} tagged`
      : `${s.folded} smaller genres · ${s.main} ${s.main === 1 ? 'book' : 'books'}`;
  const familyTip = (f: WheelFamily) =>
    f.selectable
      ? [`${f.main} mainly here`, `${f.tagged} tagged with its genres`]
      : `${f.main} ${f.main === 1 ? 'book' : 'books'} in genres not yet in a family`;

  // Outer ring first (Chart.js draws the first dataset outermost).
  const RING = { genres: 0, families: 1, wings: 2 } as const;
  // The outer-ring slices that close a family (the next one starts another,
  // and the last closes the circle), for the wider gaps between families.
  const familyEnds = wheel.slices.flatMap((s, i) => {
    const next = wheel.slices[i + 1];
    return !next || next.family !== s.family || next.wing !== s.wing ? [i] : [];
  });
  const data: ChartData<'doughnut', number[], string> = {
    labels: wheel.slices.map((s) => s.label),
    datasets: [
      {
        data: wheel.slices.map((s) => s.main),
        backgroundColor: colours.slices,
        borderColor: c.paper,
        borderWidth: 2,
        hoverOffset: 4,
        weight: 1.3,
      },
      {
        data: wheel.families.map((f) => f.main),
        backgroundColor: colours.families,
        borderColor: c.paper,
        borderWidth: 2,
        hoverOffset: 3,
        weight: 1.1,
      },
      {
        data: wheel.wings.map((w) => w.books),
        backgroundColor: colours.wings,
        borderColor: c.paper,
        borderWidth: 2,
        hoverOffset: 2,
        weight: 0.8,
      },
    ],
  };

  // Whether a pointer event fell in the wheel's empty centre.
  const inHole = (e: { x: number | null; y: number | null }, chart: ChartJS) => {
    const hole = wheelHole(chart as ChartJS<'doughnut'>);
    if (!hole || e.x === null || e.y === null) return false;
    return Math.hypot(e.x - hole.x, e.y - hole.y) < hole.r;
  };

  const clickable = (datasetIndex: number, index: number) =>
    datasetIndex === RING.wings ||
    (datasetIndex === RING.families && Boolean(wheel.families[index]?.selectable)) ||
    (datasetIndex === RING.genres && Boolean(wheel.slices[index]?.genre));

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    cutout: '24%',
    onClick: (e, elements, chart) => {
      const el = elements[0];
      if (!el) {
        // A tap in the empty centre clears the selection.
        if (onClear && inHole(e, chart)) onClear();
        return;
      }
      if (el.datasetIndex === RING.wings) {
        const w = wheel.wings[el.index];
        if (w) onWing(w.wing);
      } else if (el.datasetIndex === RING.families) {
        const f = wheel.families[el.index];
        if (f?.selectable) onFamily(f.family);
      } else {
        const s = wheel.slices[el.index];
        if (s?.genre) onGenre(s.genre);
      }
    },
    onHover: (e, elements, chart) => {
      const target = e.native?.target as HTMLElement | undefined;
      if (!target) return;
      const el = elements[0];
      const pointer = el ? clickable(el.datasetIndex, el.index) : Boolean(onClear) && inHole(e, chart);
      target.style.cursor = pointer ? 'pointer' : 'default';
    },
    plugins: {
      legend: { display: false },
      familyBounds: { color: c.paper, width: 4, ends: familyEnds },
      centreClear: onClear ? { color: c.stamp, font: c.label } : false,
      tooltip: {
        ...tooltip,
        callbacks: {
          title: (items) => {
            const item = items[0];
            if (!item) return '';
            if (item.datasetIndex === RING.wings) return WING_LABEL[wheel.wings[item.dataIndex]?.wing ?? 'fiction'];
            if (item.datasetIndex === RING.families) return wheel.families[item.dataIndex]?.family ?? '';
            return wheel.slices[item.dataIndex]?.label ?? '';
          },
          label: (item) => {
            if (item.datasetIndex === RING.wings) {
              const w = wheel.wings[item.dataIndex];
              return w ? `${w.books} books with a genre` : '';
            }
            if (item.datasetIndex === RING.families) {
              const f = wheel.families[item.dataIndex];
              return f ? familyTip(f) : '';
            }
            const s = wheel.slices[item.dataIndex];
            return s ? sliceTip(s) : '';
          },
        },
      },
    },
  };

  return (
    <div className="story-wheel">
      <div className="story-wheel-chart" role="img" aria-label={summary}>
        <Chart type="doughnut" data={data} options={options} plugins={[familyBounds, centreClear]} />
      </div>

      {/* The key: names every slice, and is the keyboard route to the clicks. */}
      <div className="story-key-wrap" ref={keyWrap}>
        {/* Phones only: the wings and Other on one line, always shown. */}
        <ul className="story-mini-key">
          {wheel.wings.map((w, i) => (
            <li key={w.wing}>
              <button
                type="button"
                aria-pressed={zoom === w.wing}
                style={swatchStyle(colours.wings[i])}
                onClick={() => pickWing(w.wing)}
              >
                <span className="story-swatch" aria-hidden="true" />
                {WING_LABEL[w.wing]}
                <span className="story-key-count">{w.books}</span>
              </button>
            </li>
          ))}
          {otherColour && (
            <li>
              <span className="story-mini-other" style={swatchStyle(otherColour)}>
                <span className="story-swatch" aria-hidden="true" />
                Other
              </span>
            </li>
          )}
        </ul>
        <button
          type="button"
          className="story-key-toggle"
          aria-expanded={keyOpen}
          aria-controls={keyId}
          onClick={() => setKeyOpen((open) => !open)}
        >
          All genres <span aria-hidden="true">{keyOpen ? '▴' : '▾'}</span>
        </button>
        <div
          id={keyId}
          className={`story-key${keyOpen ? ' is-open' : ''}${selected || selectedFamily ? ' is-faded' : ''}`}
        >
          {zoom && (
            <button type="button" className="story-key-back" onClick={() => onWing(zoom)}>
              &larr; Both wings
            </button>
          )}
          {wheel.wings.map((w, i) => (
            <div key={w.wing} className="story-key-wing">
              <button
                type="button"
                className="story-key-head"
                aria-pressed={zoom === w.wing}
                style={swatchStyle(colours.wings[i])}
                onClick={() => pickWing(w.wing)}
              >
                <span className="story-swatch" aria-hidden="true" />
                {WING_LABEL[w.wing]}
                <span className="story-key-count">{w.books}</span>
              </button>
              {/* Wing › family › genres, as the rings run outward. Each
                  family's genres fold away behind its ▸. */}
              <ul>
                {wheel.families.map((f, k) => {
                  if (f.wing !== w.wing) return null;
                  const key = familyKey(f.wing, f.family);
                  const open = isUnfolded(f);
                  const genresId = `${keyId}-${k}`;
                  return (
                    <li key={f.family} className="story-key-family">
                      <div className="story-key-family-row">
                        {f.selectable ? (
                          <button
                            type="button"
                            aria-pressed={f.family === selectedFamily}
                            style={swatchStyle(colours.families[k])}
                            onClick={() => pickFamily(f.family)}
                          >
                            <span className="story-swatch" aria-hidden="true" />
                            {f.family}
                            <span className="story-key-count">{f.main}</span>
                          </button>
                        ) : (
                          <span className="story-key-other" style={swatchStyle(colours.families[k])}>
                            <span className="story-swatch" aria-hidden="true" />
                            {f.family}
                            <span className="story-key-count">{f.main}</span>
                          </span>
                        )}
                        <button
                          type="button"
                          className="story-key-fold"
                          aria-expanded={open}
                          aria-controls={genresId}
                          aria-label={`${open ? 'Hide' : 'Show'} ${f.family}’s genres`}
                          onClick={() => toggleFamily(key)}
                        >
                          <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                        </button>
                      </div>
                      <ul id={genresId} hidden={!open}>
                        {wheel.slices.map((s, j) =>
                          s.wing !== w.wing || s.family !== f.family ? null : (
                            <li key={s.label}>
                              {s.genre ? (
                                <button
                                  type="button"
                                  // A selected family's genres stay bold with it.
                                  className={f.family === selectedFamily ? 'is-lit' : undefined}
                                  aria-pressed={s.genre === selected}
                                  style={swatchStyle(colours.slices[j])}
                                  onClick={() => pickGenre(s.genre!)}
                                >
                                  <span className="story-swatch" aria-hidden="true" />
                                  {s.label}
                                  <span className="story-key-count">{s.main}</span>
                                </button>
                              ) : (
                                <span className="story-key-other" style={swatchStyle(colours.slices[j])}>
                                  <span className="story-swatch" aria-hidden="true" />
                                  {s.label}
                                  <span className="story-key-count">{s.main}</span>
                                </span>
                              )}
                            </li>
                          )
                        )}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="story-wheel-numbers">
        <Numbers
          caption="Books per genre, by wing and family"
          head={['Genre', 'Family', 'Wing', 'Mainly here', 'Tagged']}
          rows={wheel.rows.map((r) => ({
            key: `${r.wing}-${r.family}-${r.genre}`,
            label: r.genre,
            value: [r.family, WING_LABEL[r.wing], String(r.main), String(r.tagged)],
          }))}
        />
      </div>
    </div>
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
