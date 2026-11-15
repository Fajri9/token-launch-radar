# Review of the token launch radar entry — 2026-11-15

Reviewer: regular builder (not Astra). Astra review is still pending — the
Xingchi relay was rate-limited when last probed (2026-11-15 ~09:08) — and the
entry is **not submitted**. This file records what was checked, what was wrong,
what changed, and what is left for Astra.

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

## What is still worth Astra's review

1. **Thin comps.** A category's multiple still rests on however many live
   comps it has — Risk Curators on one (Api3, 2.98x), Derivatives on two,
   Onchain Capital Allocator on two — and the shrink (k = 5) is the only
   guard. A minimum-comps rule (e.g. n ≥ 3, else global median) was
   considered and rejected here: as measured on the radar-2 board it would
   reshuffle 175 of 178 rows and roughly halve the total implied value
   (about $5.25B → about $2.95B). That is a model redesign, not a fix;
   it needs a reviewer decision, not a silent change.
2. **The 20 excluded ≥floor protocols.** The entry trusts the house's
   watchlist over the snapshot for these (see above). If Astra thinks the
   board should carry them with a parent-protocol note instead, that is a
   scope decision for the user, not a data correction.
3. **"Records no token" language.** The dashboard and README already say
   "records no token", never "has no token", per RULES.txt line 15. Worth
   one more read by Astra against the brief's exact wording.
4. **USDD and Bittensor dTAO** are on the house's own watchlist, so including
   them is compliant — but a judge may still ask why a stablecoin (USDD)
   and a subnet token (dTAO) rank as launch candidates. A one-line note in
   the methodology could pre-empt that; left for Astra.
