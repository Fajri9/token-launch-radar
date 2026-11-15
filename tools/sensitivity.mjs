// Sensitivity check: what the n>=3 minimum-comps rule would do to the CURRENT board.
// Not part of the entry: a measurement for the README, run by hand.
// Usage: node tools/sensitivity.mjs
import { readFileSync } from 'node:fs';
import { parseSnapshot, impliedValue, isRankable, categoryMultiples } from '../lib/model.ts';

const snap = parseSnapshot(readFileSync('../makefun-radar-kit/input/snapshot.json', 'utf8'));
const base = JSON.parse(readFileSync('out/board.json', 'utf8')).rows;
const baseRank = new Map(base.map((r) => [r.slug, r.rank]));
const baseTotal = base.reduce((n, r) => n + r.implied_value_usd, 0);

const mults = categoryMultiples(snap);
// n>=3 rule: categories with fewer than 3 live comps fall back to the global median.
const patched = new Map();
for (const [cat, m] of mults.byCategory) {
  patched.set(cat, m.live_count >= 3 ? m : { ...m, multiple: mults.global });
}
const modMults = { byCategory: patched, global: mults.global };

const index = new Map(snap.protocols.map((p) => [p.slug, p]));
const chosen = new Map();
for (const slug of snap.watchlist) {
  const p = index.get(slug);
  if (p !== undefined) chosen.set(slug, p);
}
const early = snap.protocols
  .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snap.floor_usd)
  .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1));
for (const p of early) chosen.set(p.slug, p);

const scored = [...chosen.values()].map((p) => ({ slug: p.slug, implied: impliedValue(p, snap.as_of, modMults).implied }));
scored.sort((a, b) => b.implied - a.implied || (a.slug < b.slug ? -1 : 1));
const newTotal = scored.reduce((n, r) => n + r.implied, 0);
let moved = 0;
scored.forEach((r, i) => { if (baseRank.get(r.slug) !== i + 1) moved++; });
console.log(`n>=3 on radar-4 board: ${scored.length} rows, ${moved} changed rank (of ${base.length}), total implied $${(newTotal / 1e9).toFixed(2)}B (was $${(baseTotal / 1e9).toFixed(2)}B)`);
console.log('top 5 under n>=3:', scored.slice(0, 5).map((r) => `${r.slug} $${(r.implied / 1e6).toFixed(1)}M`).join(', '));
