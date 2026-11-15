// Local re-implementation of the token-radar-01 gate (7 checks), run against a main.ts output dir.
// Usage: node verify-gate.mjs [--out <dir>] [--input <snapshot.json|directory>]
// Exit 0 when every check passes, 1 otherwise. Reads the vendored buildDossier for check 7.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-board.ts';

function arg(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq === undefined ? fallback : eq.slice(name.length + 3);
}

const out = arg('out', 'out');
const inputArg = arg('input', process.env.HOME + '/workspace/makefun-radar-kit/input/snapshot.json');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
const snapshot = JSON.parse(readFileSync(inputFile, 'utf8'));
const snapSlugs = new Set(snapshot.protocols.map((p) => p.slug));
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
const bytes = (p) => statSync(p).size;

// 1. dashboard_files
{
  const dir = join(out, 'dashboard');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile()) : [];
  const total = files.reduce((n, f) => n + bytes(join(dir, f)), 0);
  const badName = files.filter((f) => !/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(f));
  const badUrl = [];
  for (const f of files) {
    const text = readFileSync(join(dir, f), 'utf8');
    if (/https?:\/\//.test(text)) badUrl.push(f);
  }
  check(
    '1 dashboard_files',
    files.includes('index.html') && files.some((f) => f.endsWith('.css')) && files.some((f) => f.endsWith('.js')) &&
      files.length <= 400 && total <= 4_194_304 && badName.length === 0 && badUrl.length === 0,
    `${files.length} files, ${(total / 1024).toFixed(1)} KiB${badName.length ? `; bad names: ${badName.join(', ')}` : ''}${badUrl.length ? `; http(s):// in: ${badUrl.join(', ')}` : ''}`,
  );
}

// 2 + 3 + 4 + 5. board.json
let rows = [];
{
  const board = JSON.parse(readFileSync(join(out, 'board.json'), 'utf8'));
  rows = board.rows ?? [];
  const badRow = rows.filter(
    (r) =>
      !snapSlugs.has(r.slug) || typeof r.name !== 'string' || r.name.trim() === '' ||
      !Number.isInteger(r.rank) || r.rank <= 0 ||
      !Number.isInteger(r.implied_value_usd) || r.implied_value_usd <= 0 || r.implied_value_usd > 1e14 ||
      !Array.isArray(r.farm_steps),
  );
  check(
    '2 board_file',
    rows.length >= 100 && rows.length <= 4000 && badRow.length === 0 &&
      !rows.every((r) => r.implied_value_usd === rows[0]?.implied_value_usd),
    `${rows.length} rows${badRow.length ? `; ${badRow.length} invalid` : ''}`,
  );
  const ranks = rows.map((r) => r.rank).sort((a, b) => a - b);
  const ranksOk = ranks.length > 0 && ranks.every((r, i) => r === i + 1);
  let mono = true;
  for (let i = 1; i < rows.length; i++) if (rows[i].implied_value_usd > rows[i - 1].implied_value_usd) mono = false;
  check('3 sorted_by_value', ranksOk && mono, ranksOk ? (mono ? 'ranks 1..N, implied non-increasing' : 'implied NOT non-increasing') : 'ranks are not exactly 1..N');
  const missing = snapshot.watchlist.filter((s) => !rows.some((r) => r.slug === s));
  check('4 coverage', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${snapshot.watchlist.length}/${snapshot.watchlist.length} watchlist slugs`);
  const badSteps = rows.filter(
    (r) =>
      r.farm_steps.length < 3 || r.farm_steps.length > 12 ||
      r.farm_steps.some((s) => typeof s !== 'string' || s.trim().length < 20 || s.trim().length > 600),
  );
  check('5 farm_steps', badSteps.length === 0, badSteps.length ? `${badSteps.length} rows with invalid steps` : 'every row 3–12 steps, 20–600 chars');
}

// 6. screenshots
{
  const dir = join(out, 'screenshots');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile()) : [];
  const problems = [];
  function pngSize(buf) {
    if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  function jpegSize(buf) {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      const len = buf.readUInt16BE(i + 2);
      i += 2 + len;
    }
    return null;
  }
  for (const f of files) {
    const p = join(dir, f);
    const size = bytes(p);
    if (size > 524_288) problems.push(`${f}: ${(size / 1024).toFixed(0)} KiB > 512 KiB`);
    const buf = readFileSync(p);
    const dim = pngSize(buf) ?? jpegSize(buf);
    if (!dim) { problems.push(`${f}: not a whole PNG/JPEG`); continue; }
    const long = Math.max(dim.w, dim.h);
    const short = Math.min(dim.w, dim.h);
    if (long > 1440 || short < 800) problems.push(`${f}: ${dim.w}x${dim.h} (long side ≤1440, short side ≥800)`);
  }
  check('6 screenshots', files.length >= 3 && files.length <= 4 && problems.length === 0, `${files.length} images${problems.length ? `; ${problems.join('; ')}` : ''}`);
}

// 7. dossier_matches
{
  const p = join(out, 'dossier.json');
  const written = existsSync(p) ? readFileSync(p) : null;
  const rebuilt = buildDossier(out, { text_max_bytes: 65_536, screenshots: { max: 4, max_bytes: 524_288 }, dashboard: { max_files: 400, max_bytes: 4_194_304 } });
  check(
    '7 dossier_matches',
    written !== null && written.equals(Buffer.from(rebuilt)) && written.length <= 1_572_864,
    written === null ? 'no dossier.json' : written.equals(Buffer.from(rebuilt)) ? `${(written.length / 1024).toFixed(1)} KiB, byte-identical to a rebuild` : 'dossier.json differs from a rebuild',
  );
}

const failed = results.filter((r) => !r.ok).length;
console.log(failed === 0 ? `GATE: all ${results.length} checks pass` : `GATE: ${failed} of ${results.length} checks FAIL`);
process.exit(failed === 0 ? 0 : 1);
