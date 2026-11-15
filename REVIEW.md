# Review of the token launch radar entry — 2026-11-15

Reviewer: regular builder (not Astra) for the radar-3 pass below; GPT-6 Astra
reviewed the entry afterwards (section "Astra review" at the end) and the
entry is now **radar-4**. The entry is **not submitted**. This file records
what was checked, what was wrong, what changed, and what is left.

## What was checked

1. **Data truth.** Spot-checked the top rows against the live DefiLlama record
   (https://api.llama.fi/protocols, crawled 2026-11-15 01:17 UTC) and public
   sources. Steakhouse Financial, Gauntlet, Veda, Nonce Capital, USDD and the
   rest of the top 10 are pre-token on the record (no market cap, no CoinGecko
   id, no symbol) and are not wrapped/staked products of a token that trades.
   No top-10 row needed re-ranking.
2. **The 20 pre-token protocols ≥ $50M floor that are not on the board**
   (Sentora Curator $2.76B TVL, Cian Yield Layer, Mellow Core, Polymarket
   International, …). Checked against the live record: they carry a
   `parentProtocol` (Sentora Curator → `parent#sentora`), which is exactly the
   part of the house's exclusion rule the snapshot cannot check. The house's
   watchlist is the floor; adding them would contradict the house's own
   exclusion. **Not added — correct as built.**
3. **Model.** Recomputed every category multiple from the snapshot. Two
   problems found (below). Everything else checked out: global median 0.246x,
   Risk Curators 0.7008 from Api3 (2.975x — DefiLlama's own description calls
   Api3 "a risk curator and first-party oracle provider", so the category is
   the house's own taxonomy, not a snapshot error), Derivatives 0.7934,
   Onchain Capital Allocator 0.1793.
4. **Dashboard.** Rendered offline from `file://` with Chromium 160 headless.
   Board, detail dialog (`#p=steakhouse-financial`), and filtered view
   (`#category=Risk%20Curators`) all work; all three screenshots were retaken
   and visually checked — no visual defects.
5. **Deliverables.** `vendor/makefun-board.ts` byte-identical to the kit
   starter (0 lines changed). `main.ts` Node 22 stdlib-only, deterministic.
   LICENSE MIT present. Git tree clean apart from the review's own changes.

## Bugs found — both fixed in radar-3

### 1. One comp's 400x ratio set a whole category's multiple (model)

Prediction Market's multiple was **1.50** (clamped) because its only live
comp, Rain, carries a $2.65B market cap on $6.6M TVL — a 400.204x ratio.
A token whose value has decoupled from its protocol's TVL is not a launch
comp. Chain had the same shape at a smaller scale (astar-dapps-staking
3.026x → multiple 0.709).

**Fix:** each live comp's mcap/TVL ratio is winsorised at 3.0x before the
category median (`ratio_cap: 3` in `lib/model.ts`). Prediction Market's
multiple is now **0.705** (Predict Fun's implied value $14.9M → $7.0M),
Chain's is **0.705**. Every other multiple and the global median (0.246x)
are unchanged. Top 10 unchanged. Total implied value $5.25B → $5.24B.

### 2. Valantis stHYPE Restaking was ranked although it is a staked product (data)

The radar-2 board ranked **Valantis stHYPE Restaking** at rank 173. It is a
restaking vault for stHYPE, the liquid-staked HYPE token from Valantis —
DefiLlama's own page for the vault describes it as a vault for stHYPE
"while maintaining exposure to staked HYPE", and HYPE itself trades
(CoinGecko rank ~11). It is exactly the staked product of a token that
already trades that the competition's rule excludes.

Why the rule missed it: category is "Restaking", which is not in the excluded
list, and the name contains no whole word "staked"/"staking" — "Restaking"
contains "staking" but is not the word, and the ticker stHYPE carries no
whole word at all.

**Fix:** a staked-token ticker in a name (`/\bst[A-Z][A-Za-z0-9]+\b/` — stHYPE,
stETH, stSOL) now fails `isRankable` in `lib/model.ts`. The board drops from
178 to 177 rows. No other row is affected (the pattern matches nothing else
on the board).

## Results after the changes (radar-3)

- Board: **177 rows** (40 watchlist + 137 early), 24 live set aside.
  Top 5 unchanged: Steakhouse Financial $1.52B, Gauntlet $907.6M,
  Veda $223.3M, Nonce Capital $211.1M, USDD $186.0M.
- `node verify-gate.mjs --out out`: **7/7 PASS** (dashboard files, board file,
  sorted by value, 40/40 watchlist coverage, farm steps, screenshots,
  dossier byte-identical to a rebuild).
- Determinism: two full runs of `main.ts` into separate directories are
  byte-identical (`diff -r` clean), and `out/` matches them.
- Screenshots retaken with Chromium 160 (`--headless=new --timeout=25000`,
  1440×900) and visually verified: board shows "177 rows", "$5.24B",
  "radar-3 model"; detail shows "Rank 1 of 177" and "Model radar-3";
  filtered shows "Risk Curators", "33 rows shown".

## Astra review — 2026-11-15 (GPT-6 Astra via the Xingchi relay)

The relay had rate-limited earlier in the day (429, then 400, ~08:23–09:08);
it recovered and answered this review in one call
(`tools/astra-review.py`, prompt `tools/astra-review-prompt.md`, full reply
in `/tmp/astra-review-1.txt`; `reasoning_effort=high`; usage 6,448 prompt /
4,281 completion tokens). The review was run as a subagent task with the
model's source, this file, the README and live DefiLlama cross-checks in
context. Astra's verdicts, in the order asked:

**Q1 — thin comps: CHANGE.** The shrink (k = 5) was not enough. Seven of
the top 10 rows were Risk Curators at 0.7008x — one live comp (Api3) setting
59.1% of the board's total implied value ($3.096B of $5.24B). Astra's fix:
cap a single-comp multiple at **2× the global median** (0.4920x here).
Applied in `lib/model.ts` (`singleton_cap: 2`, capped in
`categoryMultiples` for n == 1, model version radar-4). Six categories drop
to the cap: Risk Curators 0.7008 → 0.492, Chain / Collateral Management /
Prediction Market 0.705 → 0.492, Decentralized AI 0.5484 → 0.492, NFT
Marketplace 0.5386 → 0.492. Top rows fall exactly as Astra predicted:
Steakhouse $1.52B → $1.07B, Gauntlet $907.6M → $637.2M, Nonce $211.1M →
$148.2M, Hive $124.7M → $87.1M; total $5.24B → $4.15B (Astra's estimate
was "no more than ~$4.28B" — the actual is lower because the other capped
n == 1 categories fall too). USDD rises to rank 4, Upshift enters the top
10 at rank 9. The cap is now stated on the dashboard methodology and in
the README.

**Q2 — USDD and dTAO: CHANGE (disclosure, not ranking).** Both stay
included — sealed records carry no token metadata and both sit on the house
watchlist — but the methodology now says in one line that USDD already
trades as a stablecoin and dTAO represents traded subnet tokens, and each
of the two detail views carries an "Existing traded asset context" note.
Verified in screenshots (USDD detail view, temp shot).

**Q3 — winsorisation + clamp: KEEP.** Astra re-verified the Rain math:
(400.2 + 5×0.246)/6 = 66.905 → clamp 1.5; the 3.0x winsorisation and the
[0.05, 1.5] clamp stay. Derivatives (0.7934x, n = 2) and Token Locker
(0.6136x, n = 2) were flagged as evidence weaknesses with no patch — the
aggregates alone do not justify one.

**Q4 — arithmetic and proposed guards: VERIFIED, three items NOT applied.**
Category multiples re-verified (Risk Curators 0.7007833, Derivatives
0.7934, Chain 0.705). Astra's proposed age/growth patch is redundant: the
code already clamps (`ageDays` uses `Math.max(0,…)`, `impliedValue`
clamps age to [0, 1095] and growth to [-60, 120], missing growth defaults
to 0) — not applied. The "-" symbol sentinel is a non-issue for the sealed
snapshot (its symbol field is null for all 342 token-less records, never
"-"). "Cross Chain Bridge" was NOT added to the excluded categories: the
house's own rule (RULES.txt line 14) enumerates Bridge, Canonical Bridge,
Liquid Staking, Liquid Restaking, Restaked BTC, CEX — Cross Chain Bridge
is deliberately not among them, and zero Cross Chain Bridge rows are on
the board, so it would be a no-op that contradicts the house.

**Q5 — submit-readiness: submit after the patches.** Astra also asked for:
the farm heading relabelled ("Interaction checklist — unverified", with a
disclosure that no protocol-specific route or points program was verified)
— done; the exclusion reason and source published per omitted candidate —
done, as a 20-row table in the dashboard methodology (see below); and the
"launch worth" label reframed as a "Comparable-based market-cap scenario"
with a disclaimer that it does not estimate FDV, probability or returns —
done. Astra found no evidence to name a likely top-10 row among the
~3,200 submissions, and no evidence either way on whether other entries
will catch the USDD/dTAO point.

### Independent verification of Astra's claims (subagent, same day)

- **Live cross-checks re-run** (api.llama.fi/protocols, 2026-11-15): top 10
  all pre-token on the live record; USDD + dTAO also record no token live
  but trade in reality (stablecoin / subnet tokens); Api3 live ratio 2.68x
  (snapshot 2.97x); Rain ~400x (snapshot 400.2x).
- **The 20 excluded ≥floor protocols, nailed down.** They are exactly the
  protocols that pass every checkable part of `isRankable` while being
  pre-token, ≥floor and off the watchlist (`tools/excl-check.mjs` reproduces
  them: 20, no more, no fewer). All 20 carry a `parentProtocol` on the live
  record (Sentora Curator → parent#sentora, Polymarket International →
  parent#polymarket, CIAN → parent#cian-protocol, Mellow Core →
  parent#mellow-protocol, and so on — the full list with parents is now
  published in the dashboard methodology). The wider pre-token ≥floor set
  is 92, but the other 72 fail a checkable rule (CEX, Bridge, Liquid
  Staking, versioned names, wrapped/staked words).
- **dTAO figure verified exactly** from the snapshot row: $376.0M TVL ×
  0.3123 × 0.9672 growth × 0.6205 maturity ≈ $70M (board: $70.5M after
  rounding through the multiple).
- **119 vs 24:** category multiples use 119 live-token protocols across
  the full snapshot; the Live tab shows the 24 largest by market cap.
  Stated on the dashboard.
- **n ≥ 3 sensitivity re-run on the radar-4 board**
  (`tools/sensitivity.mjs`): 173 of 177 rows would change rank, total
  implied $4.15B → $2.95B. Still a redesign, still rejected — the
  singleton cap is the proportionate guard.

### Results after the changes (radar-4)

- Board: **177 rows** (40 watchlist + 137 early), 24 live set aside.
  Top 5: Steakhouse Financial $1.07B, Gauntlet $637.2M, Veda $223.3M,
  USDD $186.0M, Nonce Capital $148.2M. Total implied value **$4.15B**.
- `node verify-gate.mjs --out out`: **7/7 PASS** (dashboard files 36.8 KiB,
  board file, sorted by value, 40/40 watchlist coverage, farm steps,
  screenshots, dossier byte-identical to a rebuild).
- Determinism: two full runs of `main.ts` into separate directories are
  byte-identical (`diff -r` clean), and `out/` matches them; a final
  rebuild after the screenshot retake also passes 7/7 with
  `out/screenshots/` byte-identical to `screenshots/`.
- Screenshots retaken with Chromium 160 (`--headless=new --timeout=25000`,
  `--no-sandbox` as root, 1440×900) and visually verified: board shows
  "177 rows", "$4.15B", "radar-4 model"; detail shows "Rank 1 of 177" and
  "Model radar-4" plus the "Interaction checklist — unverified" heading;
  filtered shows "Risk Curators", "33 rows shown". The methodology panel
  (tall temp shot) and the USDD detail note were visually verified too.

## What is still worth a decision (not a review)

1. **Submit.** Astra's verdict is submit after the patches, and the patches
   are in. Submitting still needs the user's explicit approval plus the
   transcript bundle (made by the top-level agent after the subagents
   finish). Deadline 14 Dec 2026 18:00 WITA; 10 submissions total, 5/day.
2. **The n ≥ 3 rule stays rejected** — measured twice (radar-2: 175/178,
   radar-4: 173/177), both times a redesign, not a fix.
3. **"Records no token" language** was not flagged by Astra; the dashboard
   and README already say "records no token", never "has no token", per
   RULES.txt line 15.
