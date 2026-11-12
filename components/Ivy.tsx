/**
 * Ivy on the castle wall (CastleDoor.tsx). Painted, not drawn: a few
 * hundred real ivy-shaped leaves (five pointed lobes, a vein each) along
 * stems that climb from clumps at the foot of the wall, thickest and
 * darkest at the base, thinning to small young leaves at the tips, with
 * bare stone between. One strand hugs the arch.
 *
 * The pattern comes from a fixed seed, so it is irregular but the same on
 * every visit and identical on server and client. (Regrowing it per visit
 * is an option parked in .claude/backlog.md.)
 *
 * Canvas: 130×180, the castle wall's own 13:18 shape. Archway spans
 * x 19.5–110.5 from y 39 down; the door opening x 28–102 from y 48 down;
 * the carved name sits around y 18–30 in the middle. Stems keep clear of
 * the doors (a painted leaf on a door would not swing with it) and of the
 * name. Colours are CSS variables (globals.css, .castle-ivy), so the ivy
 * turns to deep moss at night.
 */

const W = 130;
const H = 180;

type Pt = [number, number];
type Runner = { pts: Pt[]; width: number };

// Hand-placed stems: three clumps (left corner, left jamb, right side),
// branches, and one strand along the left of the arch.
const RUNNERS: Runner[] = [
  // Left corner, climbing the wall and reaching over the arch.
  { pts: [[6, 180], [9, 160], [5, 140], [10, 118], [8, 96], [14, 76], [12, 58], [22, 46], [31, 38], [40, 33]], width: 1.1 },
  { pts: [[3, 180], [2, 166], [4, 151]], width: 0.9 },
  { pts: [[8, 96], [5, 86], [9, 76]], width: 0.6 },
  { pts: [[12, 58], [15, 48], [19, 38], [24, 30]], width: 0.55 },
  // Left jamb, then along the arch.
  { pts: [[13, 180], [16, 165], [14, 148], [19, 130], [17, 112], [22, 100]], width: 0.9 },
  { pts: [[22, 100], [22.5, 88], [24.5, 76], [28.5, 67.5], [34, 60], [40.5, 54], [47, 49.5]], width: 0.6 },
  { pts: [[34, 60], [32.5, 66], [31.5, 72]], width: 0.4 },
  // Right side, smaller.
  { pts: [[118, 180], [115, 164], [120, 146], [116, 128], [121, 112], [118, 98], [113, 86], [111, 77]], width: 0.9 },
  { pts: [[125, 180], [128, 168], [126, 154], [128, 142]], width: 0.7 },
];

// Extra leaves bunched at the foot of each clump.
const CLUMPS: Pt[] = [
  [5, 176],
  [13, 176],
  [119, 176],
  [126, 176],
];

/** Small deterministic PRNG (same sequence every render). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

type Leaf = { x: number; y: number; rot: number; size: number; tone: number };

/** Points every `step` units along a polyline, with the direction there. */
function sample(pts: Pt[], step: number) {
  const out: { x: number; y: number; dx: number; dy: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / len;
    const dy = (y2 - y1) / len;
    for (let d = 0; d < len; d += step) out.push({ x: x1 + dx * d, y: y1 + dy * d, dx, dy });
  }
  return out;
}

/** Older leaves near the ground are bigger and darker (tone 1); young
    ones higher up smaller and lighter (tone 4). */
function leafAt(x: number, y: number, outward: number, rand: () => number): Leaf {
  const age = y / H;
  // Point the leaf away from its stem, leaning upward toward the light.
  const rot = outward * 0.6 + (rand() - 0.5) * 50;
  const size = (2.0 + age * 1.8) * (0.8 + rand() * 0.4);
  const tone = Math.min(4, 1 + Math.floor((1 - age) * 2.6 + rand() * 1.4));
  return { x: r2(x), y: r2(y), rot: Math.round(rot), size: r2(size), tone };
}

function growLeaves(): Leaf[] {
  const rand = seeded(23);
  const leaves: Leaf[] = [];

  for (const runner of RUNNERS) {
    for (const s of sample(runner.pts, 2.2)) {
      // Gaps: not every node carries leaves.
      if (rand() < 0.22) continue;
      const count = rand() < 0.45 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const side = k === 0 ? (rand() < 0.5 ? -1 : 1) : -1;
        // Perpendicular to the stem, on one side or the other.
        const nx = -s.dy * side;
        const ny = s.dx * side;
        const offset = 1 + rand() * 2.2;
        const outward = (Math.atan2(ny, nx) * 180) / Math.PI + 90;
        leaves.push(leafAt(s.x + nx * offset, s.y + ny * offset, outward, rand));
      }
    }
  }

  for (const [cx, cy] of CLUMPS) {
    for (let i = 0; i < 12; i++) {
      const x = cx + (rand() - 0.5) * 12;
      const y = cy - rand() * 16;
      leaves.push(leafAt(x, y, (rand() - 0.5) * 120, rand));
    }
  }

  // Shuffle so overlaps fall naturally rather than stem by stem.
  for (let i = leaves.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [leaves[i], leaves[j]] = [leaves[j], leaves[i]];
  }
  return leaves;
}

/** A stem as a smooth curve through its points. */
function stemPath(pts: Pt[]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${x} ${y} ${r2((x + nx) / 2)} ${r2((y + ny) / 2)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

const LEAVES = growLeaves();

export default function Ivy() {
  return (
    <svg
      className="castle-ivy"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Hedera helix: a heart-shaped base, two small basal lobes, two
            side lobes and a long pointed tip. Base at 0,0, tip at 0,-1. */}
        <g id="ivy-leaf">
          <path d="M0 0 Q-0.2 0.12 -0.45 0.05 Q-0.62 -0.15 -0.55 -0.45 Q-0.35 -0.42 -0.22 -0.42 Q-0.12 -0.75 0 -1 Q0.12 -0.75 0.22 -0.42 Q0.35 -0.42 0.55 -0.45 Q0.62 -0.15 0.45 0.05 Q0.2 0.12 0 0 Z" />
          <path
            className="castle-ivy-vein"
            d="M0 -0.04 L0 -0.86 M0 -0.08 L-0.44 -0.4 M0 -0.08 L0.44 -0.4"
          />
        </g>
        {/* Each leaf casts a faint shadow on the stone, down and right. */}
        <filter id="ivy-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0.45" dy="0.6" stdDeviation="0.35" floodOpacity="0.35" />
        </filter>
      </defs>

      <g className="castle-ivy-stems">
        {RUNNERS.map((runner) => (
          // Real ivy stems are thin and mostly hidden by the leaves.
          <path key={runner.pts.join()} d={stemPath(runner.pts)} strokeWidth={runner.width * 0.5} />
        ))}
      </g>

      <g filter="url(#ivy-shadow)">
        {LEAVES.map((leaf, i) => (
          <use
            key={i}
            href="#ivy-leaf"
            className={`castle-ivy-tone-${leaf.tone}`}
            transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.rot}) scale(${leaf.size})`}
          />
        ))}
      </g>
    </svg>
  );
}
