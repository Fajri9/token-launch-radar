# FLAGSHIP REDESIGN — PART A2: FRONTEND JS (of 3)

This is part 2 of 3. A first call already produced the new CSS. Answer ONLY the questions below (JS behaviour). Part 3 covers the backend/farm plans — do not cover those here.

# FLAGSHIP REDESIGN — PART A: FRONTEND (of 2)

This is part A of a two-part review. Answer ONLY the questions below; do not cover backend/model/farm plans (part B handles those). A second, separate call will cover the rest — do not duplicate it here.

# FLAGSHIP REDESIGN — token launch radar dashboard (make.fun bounty, $1,325 pool, 1st $1,000)

You are redesigning an entry that an AI judge will compare pairwise against ~3,200 other dashboards. The user wants a PROFESSIONAL analytics dashboard (Dune Analytics / DefiLlama / Nansen / Bloomberg-terminal standard), not a tidied table. Be adversarial about what looks amateur, and give EXACT patch text for every change — full replacement CSS/JS blocks I can apply verbatim, not vague advice.

## Current state (radar-4, gate 7/7, 177 rows, total implied $4.15B)
- Stack: static page, no framework, no network, no webfont. `dashboard/index.html` (448 B) loads `../data.js` (one `window.RADAR` object) + `app.js`. `main.ts` (Node 22, stdlib only) reads the sealed snapshot, scores with `lib/model.ts`, writes `board.json` + `data.js`, copies `dashboard/` + `screenshots/` into `out/`, writes `dossier.json`. Deterministic: same snapshot → same bytes.
- Model (radar-4, do NOT redesign): implied = TVL × category multiple × growth × maturity; category multiple = median mcap/TVL of live-token comps, ratios winsorised 3.0x, shrunk k=5 toward global median 0.246x, clamped [0.05, 1.5], single-comp categories capped at 2× global median (0.492x). Top 5: Steakhouse $1.07B, Gauntlet $637.2M, Veda $223.3M, USDD $186.0M, Nonce $148.2M.
- BANNED without strong new evidence: minimum-comps rule n≥3 (evaluated twice, rejected: reshuffles 173/177 rows, $4.15B → $2.95B). No model change unless you have evidence + before/after numbers. Data/ranking stay identical unless a change is evidence-backed.

## The dashboard now (what I see in the screenshots — you cannot see them, so read this carefully)

### Layout (1440×900 board view)
Header: amber dot + "TOKEN RADAR" mono eyebrow left; right meta "Snapshot 2026-11-14 · DefiLlama protocol index · radar-4 model". H1 "40 watchlist protocols, ranked by implied value" + 3-line lede paragraph; right facts column (border-left): Watchlist covered 40/40, Pre-token rows scored 177, Total implied value $4.15B, Global category multiple 0.25x, Live-token protocols set aside 24. Then 5 Top-5 spotlight cards in a row (#1 Steakhouse $1.07B / Risk Curators · TVL $2.75B, etc.). Then a controls row: Search input, Category select, Chain select, "Watchlist only" checkbox, Token-status tabs (Pre-token amber-active / Live token), "177 rows shown" right-aligned. Then the table panel with caption "Pre-token protocols, strongest implied value first. Select a row for its model and farm plan." Columns: Rank, Protocol (name + "Category on Chain1, Chain2" + WATCHLIST pill), TVL, 7d, Age, Cat. mult., Implied value (amber bar + $ value), Token ("● no token"). Below the 177-row table: methodology panel "How implied value is computed" (formula code block, one dense paragraph, category-multiples table showing only the top 12 of ~31 categories, 3 amber-left-border notes, "Left out on purpose: 20 protocols" table). Footer with 3 small lines.

### Detail drawer (560px, right side, modal)
Eyebrow "RANK 1 OF 177 · WATCHLIST", big name, chains list (Steakhouse lists 10 chains, wraps 2 lines), Close button. "Implied value" equation: TVL / Category multiple / Seven-day growth / Age with no token / Growth multiplier / Maturity multiplier / Implied value (amber total). Small sub-line explaining the multiple. "Interaction checklist — unverified" with 6 numbered steps (bold action + mono "Cost: … Time: …" line, steps wrap 2–3 lines).

### Filtered view (Risk Curators, 33 rows): same layout, category select shows the filter, count says "33 rows shown".

### What I judge weak (challenge each — keep, fix, or argue otherwise)
1. **Search may be broken**: `controls()` rebuilds the search `<input>` inside `render()`, and the input handler calls `render()` on every keystroke — the input element is destroyed and recreated per keystroke, so focus is lost after the first character. CONFIRM from the code below and fix (e.g. re-render only the table body, or restore focus + caret). This is a functional bug, not polish.
2. **Implied-value bar is relative to `list[0]` after sorting** (`var max = list[0].implied_value_usd`): when the user sorts by TVL or 7d, the bar's max is whatever row lands first, so bar lengths stop meaning "share of the top value". Fix or justify.
3. **Number precision is inconsistent**: `fmtUsd` prints $1.07B (2 decimals) but $637.2M / $223.3M (1 decimal) and $988K (integer). A Bloomberg-style board uses one scale rule. Propose the rule + patch.
4. **No sticky table header** over 177 rows; no zebra striping; row hover only. At 820px the table scrolls horizontally and the Token column is cut off — the implied-value column (the point of the board) requires a right-scroll. Propose what to hide/compact below ~900px.
5. **Controls wrap awkwardly at 820px**: Search/Category/Chain on row 1, then "Token status" label + Watchlist checkbox + tabs on row 2, search placeholder truncated ("Search name, category or cha"). The 900px media query exists but the wrap still looks unfinished.
6. **Methodology is a wall of text**: one dense paragraph + 3 notes that all look identical (same amber left border) — the USDD/dTAO disclosure (the one a judge actually cares about) is visually indistinguishable from generic caveats. The 20-row exclusion table shows raw `parent#sentora` strings. The category-multiples table shows only 12 of ~31 categories with no way to see the rest. The formula is one long wrapping line.
7. **Detail drawer**: chain list can be 10 items long; the equation's sub-line is small grey text that wraps; farm steps are long sentences (2–3 lines each) with cost/time buried in a mono line. Make it scannable.
8. **Spotlight cards**: all 5 look identical except rank number; #1 ($1.07B) gets no more visual weight than #5 ($148.2M). The value hierarchy is flat.
9. **No KPI/stat strip**: the facts live in a small right column next to the lede. A pro dashboard puts the key numbers (total implied, rows, global multiple, top category concentration) in a strip the eye hits first.

## BACKEND (main.ts + lib/model.ts + app.js data logic)
- `main.ts` is a thin orchestrator (parse → buildRadar → boardIssue → write files → copy dashboard/screenshots → dossier). No formatting logic lives there except one `toLocaleString` log line. Confirm whether any formatting/duplication actually exists between main.ts and app.js, or state there is none and the split is already clean.
- Data shapes: `board.json` rows carry a NESTED `model: {category_multiple, category_live_count, …}` object; `data.js` rows carry the SAME fields FLATTENED (`category_multiple`, `category_live_count`, …) plus `watchlist`, and drop `gecko_id`/`symbol`. Is this dual shape justified, or should one canonical row shape be used everywhere? Propose the smallest change (if any) — remember `board.json`'s shape is what the gate checks (ranks, implied order, farm steps), so do not break it.
- Rendering perf: `render()` rebuilds the ENTIRE shell (header, lede, spotlight, controls, 177-row table, methodology) on every state change, including every search keystroke. For 177 rows this is small, but it is the cause of issue #1. Propose the minimal structural fix (e.g. render static chrome once, re-render only table + count + spotlight on filter change).
- Sorting/filtering: `rows()` filters then `sortedRows()` sorts a copy each render. Verify correctness (null handling for growth/age, tie-break by slug) and say whether anything needs to change for 177 rows.
- Farm plans: 6 template steps generated from category/TVL/age (`actionFor`/`weeklyFor` in model.ts). Spot-check these two for sense: CDP rows say "Supply $150 of USDC to USDD on Tron" — for a CDP you mint the stablecoin against collateral, you do not "supply USDC to USDD". Is that wording wrong enough to fix in the generator (never hand-edit board.json)? Check the other category actions for the same class of error and patch the generator if any are wrong.

### dashboard/app.js — key excerpts (verbatim; rest of file: header/lede/spotlight/liveTable/modelPanel builders, detail drawer, render — all as described above)
```js
var DATA = window.RADAR;
var state = { q: '', category: 'all', chain: 'all', watchlist: false, tab: 'pre-token', sort: 'implied', dir: -1, selected: null };
function fmtUsd(n) {
  if (n === null || n === undefined || !isFinite(n)) return 'n/a';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return usd.format(n);
}
function fmtPct(n) { if (n === null || n === undefined || !isFinite(n)) return 'n/a'; return (n > 0 ? '+' : '') + n.toFixed(2) + '%'; }
function fmtAge(days) { if (days === null || days === undefined) return 'unknown'; if (days >= 365) return (days / 365).toFixed(1) + 'y'; return Math.max(0, Math.round(days)) + 'd'; }
function fmtMult(n) { if (n === null || n === undefined || !isFinite(n)) return 'n/a'; return n.toFixed(2) + 'x'; }
function rows() {
  var q = state.q.trim().toLowerCase();
  return DATA.rows.filter(function (r) {
    if (state.category !== 'all' && r.category !== state.category) return false;
    if (state.chain !== 'all' && (!r.chains || r.chains.indexOf(state.chain) < 0)) return false;
    if (state.watchlist && !WATCHLIST[r.slug]) return false;
    if (!q) return true;
    var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
    return hay.indexOf(q) >= 0;
  });
}
function sortedRows(list) {
  var key = state.sort;
  return list.slice().sort(function (a, b) {
    var av, bv;
    if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
    else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
    else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
    else if (key === 'multiple') { av = a.category_multiple; bv = b.category_multiple; }
    else { av = a.implied_value_usd; bv = b.implied_value_usd; }
    if (av < bv) return -state.dir;
    if (av > bv) return state.dir;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}
// controls(): search input (type=search, placeholder 'Search name, category or chain') with
// 'input' listener -> state.q = value; writeHash(); render(). Category/chain <select>s,
// watchlist checkbox, Pre-token/Live-token tabs (aria-pressed), count span.
// boardTable(): var max = list[0].implied_value_usd || 1; bar width = implied/max*100%.
//   sortHeader(key,label): button toggles sort/dir, indicator ' v' / ' ^'.
//   Empty state: 'No protocol matches that filter' + Clear filters button.
// render(): app.textContent=''; builds shell: header() + lede() + (spotlight if pre-token) +
//   controls() + (boardTable or liveTable) + (modelPanel if pre-token) + footer; appends dialog;
//   if (state.selected) openDetail(state.selected).
// openDetail(slug): fills <dialog class=detail> with head (rank eyebrow, name, chains),
//   traded-context note for usdd/bittensor-dtao, 'Implied value' equation section,
//   'Interaction checklist — unverified' ol.steps (action bold + cost mono line).
// modelPanel(): h2 'How implied value is computed', formula div (one long line),
//   dense paragraph, category table slice(0,12) [Category | Live comps | Live median | Multiple used],
//   3 .note paragraphs (USDD/dTAO, comparable-scenario, 119-live-protocols),
//   h3 'Left out on purpose: 20 protocols at or above the $50M floor' + intro + 20-row table
//   [Protocol | Category | TVL | Parent on the live record] with raw 'parent#sentora' values.
// readHash/writeHash: #q= #p= #category= #chain= #w=1 #tab=live. Escape closes dialog.
```

## HARD CONSTRAINTS (violating one fails the gate — check your patches against these)
- NO external library, NO CDN, NO network call, NO webfont. Dashboard files must contain NO `http://` or `https://` string anywhere (the gate greps for it — this includes comments and example URLs). Keep the 3 files: index.html, app.css, app.js (the gate allows up to 400 files / 4 MiB, but 3 files is the shipped shape; do not add files without a reason).
- Screenshots: exactly 3 handed in, each ≤512 KiB, long side ≤1440, short side ≥800.
- Data/values/ranking stay identical unless a change is evidence-backed with before/after numbers. No silent model redesign. n≥3 rule stays rejected.
- Keep: dark theme (unless you argue a theme change is MORE professional, with reasons), hash deep-links (#p= #category= #q=), tabs, sorting, filters, detail drawer, methodology, 20-row exclusion table, USDD/dTAO disclosure, keyboard access (rows focusable, Escape closes drawer), prefers-reduced-motion.
- Keep the file structure the gate expects: dashboard/index.html + app.css + app.js; board.json shape unchanged (rows, ranks 1..N, implied non-increasing, farm steps 3–12 of 20–600 chars).

Q2 SEARCH/FOCUS BUG: confirm or refute issue #1 from the code above with the exact mechanism. If real, give the exact fix (minimal: split render into static chrome + dynamic table, or restore focus/caret — pick one and give complete code).
Q3 IMPLIED BAR + NUMBER FORMAT: verdict on issues #2 and #3 with exact patch text (bar basis + the one fmtUsd scale rule).
## Output format
- One section per question: VERDICT, evidence, exact patch text (complete files/functions, ready to apply).
- Then "ADDITIONAL FINDINGS" and "FINAL VERDICT" (ready to apply as-is / apply after listed edits / not ready + why).
- Keep it tight: no preamble, no summary of what I already told you. Concrete code over adjectives.
