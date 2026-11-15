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
  live-token protocols in this snapshot, shrunk toward the global median
  (k = 5) and clamped to [0.05, 1.5]. A category with no live comps takes the
  global median.
- **growth** — `1 + clamp(change_7d, -60, 120) / 100 × 0.5`.
- **maturity** — `0.6 + min(age_days, 1095) / 1095 × 0.4`, where age is the time
  since the protocol was first listed (365 days when unlisted).

No protocol name is special-cased. "No token" means the snapshot record
carries no market cap, CoinGecko id or symbol — a record, not proof. Protocols
that are bridges, liquid-staking/restaking, CEX products, versioned pools,
wrapped/staked names or exchange-named are excluded from the launch ranking,
per the competition's own rule; live-token protocols are set aside with their
market caps shown and never mixed into the ranking.

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
