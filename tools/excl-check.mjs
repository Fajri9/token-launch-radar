import { readFileSync } from 'node:fs';
import { parseSnapshot, isRankable, isPreToken, buildBoard } from '../lib/model.ts';
const snap = parseSnapshot(readFileSync('../makefun-radar-kit/input/snapshot.json', 'utf8'));
const board = buildBoard(snap);
const on = new Set(board.map(r => r.slug));
const cands = snap.protocols.filter(p => p.tvl_usd >= snap.floor_usd && !on.has(p.slug) && isPreToken(p) && isRankable(p));
console.log('pass-all-checkable-but-not-on-board:', cands.length);
for (const p of cands.sort((a,b)=>b.tvl_usd-a.tvl_usd)) console.log(p.slug, '|', p.name, '|', p.category, '| TVL', Math.round(p.tvl_usd));
