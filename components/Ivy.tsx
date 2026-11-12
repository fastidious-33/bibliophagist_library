/**
 * Ivy on the castle wall (CastleDoor.tsx). Painted, not drawn: a few
 * hundred leaves in the three forms common ivy (Hedera helix) really
 * takes: the five-lobed young leaf, a three-lobed one, and the rounded,
 * pointed mature leaf (more of those higher up, where old ivy flowers).
 * Each leaf has its own green (deeper and less saturated near the ground),
 * a light-to-shadow shading across it, a fine vein, and a faint shadow on
 * the stone. The stems wander a little rather than curving cleanly, are
 * woody and thick at the foot and thin toward the tips, and carry the
 * small aerial rootlets ivy climbs by.
 *
 * The pattern comes from a fixed seed, so it is irregular but the same on
 * every visit and identical on server and client. (Regrowing it per visit
 * is an option parked in .claude/backlog.md.)
 *
 * Canvas: 130×180, close to the castle wall's 13:17.6 shape (stretched
 * to fit). Archway spans x 19.5–110.5 from y 39 down; the door opening
 * x 28–102 from y 48 down; the carved name sits around y 14–26 in the
 * middle. Stems keep clear of the doors (a painted leaf on a door would not
 * swing with it) and of the name. At night the whole layer is dimmed
 * (globals.css, .castle-ivy).
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
  const [lx, ly] = pts[pts.length - 1];
  const last = out[out.length - 1];
  out.push({ x: lx, y: ly, dx: last?.dx ?? 0, dy: last?.dy ?? -1 });
  return out;
}

/* ---------- Leaves ---------- */

type Form = 'five' | 'three' | 'heart';

type Leaf = { x: number; y: number; rot: number; size: number; form: Form; fill: string };

/** Older leaves near the ground: bigger, deeper, duller green. Young ones
    higher up: smaller and fresher. Mature (heart) leaves mostly up top. */
function leafAt(x: number, y: number, outward: number, rand: () => number): Leaf {
  const age = y / H; // 1 at the ground
  const rot = outward * 0.6 + (rand() - 0.5) * 60;
  const size = (2.0 + age * 1.8) * (0.7 + rand() * 0.6);
  const pick = rand();
  const heartChance = age < 0.45 ? 0.35 : 0.1;
  const form: Form = pick < heartChance ? 'heart' : pick < heartChance + 0.3 ? 'three' : 'five';
  const hue = 92 + rand() * 26;
  const sat = 26 + rand() * 20;
  const light = 34 - age * 12 + (rand() - 0.5) * 8;
  return {
    x: r2(x),
    y: r2(y),
    rot: Math.round(rot),
    size: r2(size),
    form,
    fill: `hsl(${Math.round(hue)} ${Math.round(sat)}% ${Math.round(light)}%)`,
  };
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

/* ---------- Stems ---------- */

type Segment = { d: string; width: number };
type Rootlet = { x1: number; y1: number; x2: number; y2: number };

/** Each stem wanders a little off its line, and is drawn in short
    pieces that thin from the foot to the tip. Rootlets sprout along it. */
function growStems() {
  const rand = seeded(57);
  const segments: Segment[] = [];
  const rootlets: Rootlet[] = [];

  for (const runner of RUNNERS) {
    const points = sample(runner.pts, 1.6).map((s) => {
      const wobble = (rand() - 0.5) * 0.9;
      return { x: s.x - s.dy * wobble, y: s.y + s.dx * wobble, dx: s.dx, dy: s.dy };
    });

    // Short overlapping pieces, each a little thinner than the last.
    const PIECE = 6;
    for (let i = 0; i < points.length - 1; i += PIECE - 1) {
      const piece = points.slice(i, i + PIECE);
      if (piece.length < 2) break;
      const t = i / Math.max(1, points.length - 1);
      let d = `M${r2(piece[0].x)} ${r2(piece[0].y)}`;
      for (let j = 1; j < piece.length - 1; j++) {
        const a = piece[j];
        const b = piece[j + 1];
        d += ` Q${r2(a.x)} ${r2(a.y)} ${r2((a.x + b.x) / 2)} ${r2((a.y + b.y) / 2)}`;
      }
      const end = piece[piece.length - 1];
      d += ` L${r2(end.x)} ${r2(end.y)}`;
      segments.push({ d, width: r2(runner.width * 0.6 * (1 - t * 0.6)) });
    }

    // Aerial rootlets: short hairs gripping the stone, either side.
    for (const p of points) {
      if (rand() > 0.55) continue;
      const side = rand() < 0.5 ? -1 : 1;
      const len = 0.5 + rand() * 0.8;
      const ax = -p.dy * side;
      const ay = p.dx * side;
      rootlets.push({
        x1: r2(p.x),
        y1: r2(p.y),
        x2: r2(p.x + ax * len + (rand() - 0.5) * 0.4),
        y2: r2(p.y + ay * len + 0.3),
      });
    }
  }
  return { segments, rootlets };
}

const LEAVES = growLeaves();
const STEMS = growStems();

export default function Ivy() {
  return (
    <svg
      className="castle-ivy"
      viewBox={`0 0 ${W} ${H}`}
      // Stretch to the wall (13 : 17.6, a touch wider than the 130×180
      // canvas) so the strands stay on the arch; ~2%, invisible on leaves.
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Base at 0,0, tip at 0,-1. Each form: the blade and its veins. */}
        <g id="ivy-five">
          <path d="M0 0 Q-0.2 0.12 -0.45 0.05 Q-0.62 -0.15 -0.55 -0.45 Q-0.35 -0.42 -0.22 -0.42 Q-0.12 -0.75 0 -1 Q0.12 -0.75 0.22 -0.42 Q0.35 -0.42 0.55 -0.45 Q0.62 -0.15 0.45 0.05 Q0.2 0.12 0 0 Z" />
          <path className="castle-ivy-vein" d="M0 -0.04 L0 -0.86 M0 -0.08 L-0.44 -0.4 M0 -0.08 L0.44 -0.4" />
        </g>
        <g id="ivy-three">
          <path d="M0 0 Q-0.24 0.1 -0.4 -0.04 Q-0.6 -0.26 -0.46 -0.5 Q-0.32 -0.5 -0.17 -0.54 Q-0.1 -0.82 0 -1 Q0.1 -0.82 0.17 -0.54 Q0.32 -0.5 0.46 -0.5 Q0.6 -0.26 0.4 -0.04 Q0.24 0.1 0 0 Z" />
          <path className="castle-ivy-vein" d="M0 -0.04 L0 -0.88 M0 -0.1 L-0.38 -0.44 M0 -0.1 L0.38 -0.44" />
        </g>
        <g id="ivy-heart">
          <path d="M0 0 C-0.34 0.06 -0.5 -0.28 -0.42 -0.55 C-0.32 -0.84 -0.1 -0.95 0 -1 C0.1 -0.95 0.32 -0.84 0.42 -0.55 C0.5 -0.28 0.34 0.06 0 0 Z" />
          <path className="castle-ivy-vein" d="M0 -0.04 L0 -0.9 M0 -0.3 L-0.26 -0.55 M0 -0.3 L0.26 -0.55" />
        </g>
        {/* Light across each leaf: a faint sheen on one side, shadow on
            the other. It turns with the leaf, so the light varies. */}
        <linearGradient id="ivy-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        {/* Each leaf casts a faint shadow on the stone, down and right. */}
        <filter id="ivy-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0.45" dy="0.6" stdDeviation="0.35" floodOpacity="0.35" />
        </filter>
      </defs>

      <g className="castle-ivy-stems">
        {STEMS.segments.map((s) => (
          <g key={s.d}>
            <path className="castle-ivy-stem" d={s.d} strokeWidth={s.width} />
            <path className="castle-ivy-stem-sheen" d={s.d} strokeWidth={r2(s.width * 0.4)} />
          </g>
        ))}
        {STEMS.rootlets.map((r, i) => (
          <line key={i} className="castle-ivy-rootlet" x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>

      <g filter="url(#ivy-shadow)">
        {LEAVES.map((leaf, i) => {
          const transform = `translate(${leaf.x} ${leaf.y}) rotate(${leaf.rot}) scale(${leaf.size})`;
          return (
            <g key={i}>
              <use href={`#ivy-${leaf.form}`} fill={leaf.fill} transform={transform} />
              <use href={`#ivy-${leaf.form}`} fill="url(#ivy-shade)" transform={transform} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
