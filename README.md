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

Not changed, and noted for the later Astra review: a category's multiple still
rests on however many live comps it has — Risk Curators on one (Api3, 2.98x),
Derivatives on two, Onchain Capital Allocator on two — and the shrink (k = 5)
is the only guard against that thinness. A minimum-comps rule was considered
and rejected for this entry: as measured on the radar-2 board it would
reshuffle 175 of 178 rows and roughly halve the total implied value (about
$5.25B → about $2.95B), which is a model redesign, not a fix, and belongs to
a reviewer decision, not a silent change. The 20
protocols at or above the $50M floor that are pre-token but not on the
house's watchlist (Sentora Curator at $2.76B TVL, Cian Yield Layer, Mellow
Core, Polymarket International, …) are still not on the board: the live
DefiLlama record carries a parentProtocol for them (Sentora Curator →
parent#sentora), which is exactly the part of the house's exclusion rule the
snapshot cannot check — so the watchlist, not the snapshot, decides who is
in, and adding them would contradict the house's own exclusion.

## Run it (locally)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

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
