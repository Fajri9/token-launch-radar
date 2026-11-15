# Token Radar

An entry for the make.fun bounty **"Build the best token launch radar"** (token-radar-01).

## What it does

`main.ts` (Node 22, standard library only) reads the sealed DefiLlama snapshot
(`/input/snapshot.json`), scores every pre-token protocol with the model in
`lib/model.ts`, and writes the ranked board and a static dashboard to `/output`:

- `board.json` — the ranked board (watchlist + early radar), each row with an
  implied launch value and a farm plan.
- `data.js` — the same board for the dashboard (single source of truth).
- `dashboard/` — the page: board, filters, sortable table, per-protocol detail
  drawer with the model's own inputs, and the methodology. No framework, no
  network; it renders from `data.js` alone.
- `screenshots/` — three screenshots: the board, one detail view, one filtered
  view.
- `dossier.json` — the entry summary, built with the vendored
  `vendor/makefun-board.ts` (from the competition kit).

## The model

```
implied = round( tvl_usd × category_multiple × growth × maturity )
```

- **category_multiple** — the median market-cap-to-TVL ratio of the category's
  live-token protocols in this snapshot, each ratio winsorised at 3.0x first,
  then shrunk toward the global median (k = 5) and clamped to [0.05, 1.5].
  A category with one live comp is capped at twice the global median.
  A category with no live comps takes the global median.
- **growth** — `1 + clamp(change_7d, -60, 120) / 100 × 0.5`.
- **maturity** — `0.6 + min(age_days, 1095) / 1095 × 0.4`, where age is the time
  since the protocol was first listed (365 days when unlisted).

No protocol name is special-cased. "No token" means the snapshot record
carries no market cap, CoinGecko id or symbol — a record, not proof. Protocols
that are bridges, liquid-staking/restaking, CEX products, versioned pools,
wrapped/staked names, names carrying a staked-token ticker (stHYPE, stETH),
or exchange-named are excluded from the launch ranking, per the competition's
own rule; live-token protocols are set aside with their market caps shown and
never mixed into the ranking.

## Changes in radar-3 (review of 2026-11-15)

Two fixes, both found by re-checking the board against the live DefiLlama
record and the competition's own exclusion rule. The model is still the same
shape — only these two rules changed, and the top 10 is unchanged.

1. **Winsorised comp ratios (model).** The category multiple is now the median
   of each live comp's mcap/TVL ratio capped at 3.0x, not the raw ratio.
   The uncapped median let one comp set a whole category: Prediction Market's
   multiple was 1.50 (clamped) because its only live comp, Rain, carries a
   $2.65B market cap on $6.6M TVL — a 400x ratio, a token whose value has
   decoupled from its protocol's TVL. With the cap its multiple is 0.705
   (Predict Fun's implied value falls from about $14.9M to $7.0M).
   Chain's multiple moves 0.709 → 0.705 for the same reason (astar-dapps-staking
   at 3.03x). Every other category's multiple is unchanged, and the global
   median is unchanged at 0.246x.
2. **Staked-token tickers excluded (data).** A name carrying a staked-token
   ticker (stHYPE, stETH, stSOL) now fails the board's rankability check.
   The whole-word rule missed this: "Restaking" contains "staking" but is not
   the word, and the ticker itself carries no whole word at all. The board
   had ranked **Valantis stHYPE Restaking** at rank 173 — a restaking vault
   for stHYPE, the liquid-staked HYPE token from Valantis (HYPE itself trades;
   DefiLlama's own page for the vault describes it as a vault for stHYPE
   "while maintaining exposure to staked HYPE"). It is exactly the kind of
   staked product of a token that already trades that the competition's rule
   excludes. The board drops from 178 to 177 rows.

Not changed, and decided by the Astra review instead: a minimum-comps rule (n ≥ 3,
else the global median) was considered and rejected again: measured on the radar-4
board it would reshuffle 173 of 177 rows and cut the total implied value from about
$4.15B to about $2.95B (`node tools/sensitivity.mjs`) — a model redesign, not a fix.
The 20 protocols at or above the $50M floor that are pre-token but not on the
house's watchlist (Sentora Curator at $2.76B TVL, Cian Yield Layer, Mellow
Core, Polymarket International, …) are still not on the board: the live
DefiLlama record carries a parentProtocol for every one of them (Sentora
Curator → parent#sentora, and so on — the full list with parents is now
published in the dashboard's methodology), which is exactly the part of the
house's exclusion rule the snapshot cannot check — so the watchlist, not the
snapshot, decides who is in, and adding them would contradict the house's own
exclusion.

## Changes in radar-4 (Astra review of 2026-11-15)

GPT-6 Astra reviewed the entry (data + model + open items from the review
above) against the live DefiLlama record. One model change, the rest
disclosure. The top 10 is reshuffled by the cap; the board stays 177 rows.

1. **Singleton cap on category multiples (model).** A category with one live
   comp is now capped at twice the global median (0.492x in this snapshot).
   Astra's finding: seven of the top 10 rows were Risk Curators at 0.7008x,
   a multiple resting on a single live comp (Api3, ~2.7–3.0x) — about 59%
   of the board's total implied value through one comparable. The shrink
   (k = 5) alone left that concentration in place. Six categories drop to
   the cap: Risk Curators 0.7008 → 0.492, Chain, Collateral Management and
   Prediction Market 0.705 → 0.492, Decentralized AI 0.5484 → 0.492, NFT
   Marketplace 0.5386 → 0.492. Top rows fall: Steakhouse Financial
   $1.52B → $1.07B, Gauntlet $907.6M → $637.2M, Nonce Capital $211.1M →
   $148.2M, Hive Protocol $124.7M → $87.1M. Total implied value $5.24B →
   $4.15B. USDD rises to rank 4 and Upshift enters the top 10 at rank 9.
2. **USDD and Bittensor dTAO named (disclosure).** Both remain included:
   their sealed records carry no token metadata, and both sit on the house
   watchlist — but USDD already trades as a stablecoin and dTAO represents
   traded subnet tokens, so the methodology now says so in one line and
   each of the two detail views carries an "Existing traded asset context"
   note. Ranking untouched.
3. **Farm plans labelled honestly (disclosure).** The detail view's farm
   plan is now headed "Interaction checklist — unverified": the steps are
   generated from category, TVL and age, and no protocol-specific
   interaction route, points program or reward eligibility has been
   verified.
4. **Methodology hardened (disclosure).** The methodology now states that
   implied value is a comparable-based market-cap scenario (not launch FDV,
   launch probability or farming returns); that category multiples use 119
   live-token protocols while the Live tab shows the 24 largest by market
   cap; that the exclusion heuristics are conservative and may omit
   qualifying protocols; and it publishes the 20 excluded ≥floor protocols
   with their live-record parents (see above).

Checked by Astra and deliberately NOT changed, with reasons: the age and
growth clamps already exist in the code (`ageDays` clamps at 0, `impliedValue`
clamps age to [0, 1095] and growth to [-60, 120], missing growth defaults to
0) — the review's proposed guard is equivalent to what is there. The
"no symbol" sentinel is a non-issue for the sealed snapshot (its symbol
field is null for all 342 token-less records, never "-"). "Cross Chain
Bridge" was NOT added to the excluded categories: the house's own rule
(RULES.txt line 14) enumerates the excluded categories — Bridge, Canonical
Bridge, Liquid Staking, Liquid Restaking, Restaked BTC, CEX — and Cross
Chain Bridge is not among them, so excluding it would contradict the house.
No Cross Chain Bridge row is on the board in any case. The dTAO figure was
verified exactly: $376.0M TVL × 0.3123 × 0.9672 growth × 0.6205 maturity ≈
$70M. Derivatives (0.7934x on two comps) and Token Locker (0.6136x on two)
were flagged by Astra as thin but left alone: no patch is justified from
the aggregates alone, and the n ≥ 3 rule above was rejected as a redesign.

## Changes in radar-5 (Astra dashboard + farm-text update of 2026-11-15)

Dashboard and farm-text release; the scoring model is unchanged, so
`MODEL_VERSION` stays `radar-4`. Three Astra calls (prompts and replies in
`tools/astra-uiux-prompt-A1/A2/B.md`, `tools/astra-uiux-reply-A1/A2/B.md`):
A1 rewrote the CSS, A2 reviewed the JS, B reviewed the backend and the
farm plans. Data and ranking are byte-identical to radar-4: 177 rows, same
top 5 (Steakhouse $1.07B, Gauntlet $637M, Veda $223M, USDD $186M, Nonce
$148M), total implied $4.15B.

**Frontend.** A KPI strip above the board (Total implied value highlighted
in amber); the #1 protocol is a dominant spotlight card beside four
smaller Top-5 cards; the table has a sticky header inside a scroll
viewport with zebra rows and hover; the controls sit on a fixed grid with
clear active states; the detail drawer shows the model as boxed equation
rows ending in a highlighted implied-value total, and the farm plan as
numbered steps with cost chips; the methodology panel is a two-column grid
with a full-width amber DISCLOSURE note (USDD/dTAO), an info-blue method
note and a faint caveat note, plus the full category-multiples table and
the 20 excluded protocols with clean parent labels. The dark theme was
kept: Astra judged it professional as-is, and a light theme would not
have made the numbers easier to read.

**Backend.** Number formatting is now one rule everywhere: three
significant digits with unit promotion after rounding ($1.07B, $637M,
$223M, $988K, $12.3M). The implied-value bar is scaled to the largest
implied value in the filtered list, not to the first row after sorting.
Sorting puts missing values last in both directions. The search box no
longer loses focus while typing (it did: every keystroke rebuilt the
input, so only the first character landed); the fix preserves the caret,
text direction and horizontal scroll, including IME composition.
Deep-links now also apply when the hash changes without a reload (paste a
filtered link while the board is open, or use back/forward); the drawer
follows the `#p=` link too and closes on back. Farm steps are now
verify-first: step 2 says what to check and caps the budget ("deposit no
more than $150 …; otherwise skip"), eligibility (RWA, leverage) is
checked before the subtype step, and the weekly step is conditional
("If you opened a position, …"). All 177 rows' farm steps changed;
lengths 144–304 characters, inside the 20–600 gate bound.

**Checked and deliberately not changed.** No model patch: Astra found no
further evidence-backed scoring change, and the n ≥ 3 minimum-comps rule
stays rejected (third evaluation, no new evidence). The dual row shape
(nested `model` in board.json, flattened in data.js) and the full
`render()` are kept as the simpler correct structure. No new dashboard
file, no external library or CDN; the dashboard is still 3 files,
60.4 KiB, fully offline.

Verified: `node verify-gate.mjs --out out` 7/7; two full runs byte-
identical; a headless-browser functional test (9 checks: multi-character
search focus, bar scaling, missing-last sorting, hash deep-link and
hashchange, drawer content, number format) all pass. Screenshots retaken
at 1440×900 and visually checked, including an 820 px-wide view (KPI
strip reflows 3+2, spotlight stacks, Age and Category-multiple columns
hide, no horizontal overflow).

## Run it (locally)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../makefun-radar-kit/input/snapshot.json
```
(The kit's snapshot lives at `~/workspace/makefun-radar-kit/input/snapshot.json` on this machine. The grader mounts the sealed snapshot at the default `/input/snapshot.json` — that default is untouched.)

Deterministic: the same snapshot always writes the same bytes.

## Files

| Path | What it is |
| --- | --- |
| `main.ts` | Entrypoint: parse, score, write board + dashboard + dossier |
| `lib/model.ts` | Snapshot parsing, scoring model, farm plans, board checks |
| `vendor/makefun-board.ts` | Vendored make.fun dossier library (from the kit, unchanged) |
| `dashboard/` | `index.html`, `app.css`, `app.js` — the static page |
| `screenshots/` | Board, detail and filtered-view screenshots |
| `LICENSE` | MIT |
