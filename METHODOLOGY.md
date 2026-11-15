# Methodology — Token Launch Radar (model radar-4)

An entry for the make.fun bounty **"Build the best token launch radar"**
(token-radar-01). This document states exactly how the board is built, so a
judge can reproduce every number from the sealed snapshot alone. It is
written against the entry as it stands at commit `47235aa` (radar-5
dashboard, scoring model radar-4). Every figure below comes from
`lib/model.ts`, `main.ts`, `out/board.json` or `out/data.js` of this
repository; where a figure could not be verified from the code or the data,
that is stated instead of guessed.

## 1. Model overview

Each protocol on the board gets one number, its **implied value**: a
comparable-based market-cap scenario for the protocol *if* it launched a
token at the valuation the live market already gives comparable protocols.
The formula, exactly as implemented in `impliedValue()` (`lib/model.ts`):

```
implied = max(1, round( tvl_usd × category_multiple × growth_multiplier × maturity_multiplier ))
```

| Factor | Meaning | Source |
| --- | --- | --- |
| `tvl_usd` | The protocol's total value locked in the snapshot | Snapshot record |
| `category_multiple` | Median market-cap/TVL of the category's live-token protocols, shrunk toward the global median, clamped, winsorised, singleton-capped (§5) | Computed from the snapshot at run time |
| `growth_multiplier` | `1 + clamp(change_7d, −60, 120) / 100 × 0.5` | Snapshot `change_7d` |
| `maturity_multiplier` | `0.6 + min(age_days, 1095) / 1095 × 0.4` (age unknown: 365 days) | Snapshot `listed_at` vs `as_of` |

The board is the protocols sorted by implied value, highest first, ties
broken by slug ascending, ranks 1..177. No protocol name is ever
special-cased: the same function scores every row, and the category table is
computed from the snapshot at run time, never written in by hand. The
model's constants (`MODEL` in `lib/model.ts`):

| Constant | Value | Meaning |
| --- | --- | --- |
| `growth_weight` | 0.5 | Only half of the 7-day change moves the value |
| `growth_floor` / `growth_cap` | −60 / 120 | 7-day change is clamped to [−60%, +120%] |
| `maturity_floor` / `maturity_range` | 0.6 / 0.4 | Maturity multiplier runs 0.6 (new) → 1.0 (3+ years) |
| `maturity_days` | 1095 | Age is capped at 3 years |
| `unknown_age_days` | 365 | Age assumed when `listed_at` is missing |
| `shrink_k` | 5 | Shrinkage weight toward the global median |
| `multiple_min` / `multiple_max` | 0.05 / 1.5 | Clamp on every category multiple |
| `ratio_cap` | 3.0 | Winsorisation cap on a live comp's mcap/TVL ratio |
| `singleton_cap` | 2 | Single-comp categories capped at 2× the global median |

Board totals for this snapshot: **177 rows** (40 watchlist + 137 early
radar), **24 live-token protocols set aside**, total implied value
**$4,147,062,682 ≈ $4.15B**. Top 10: Steakhouse Financial $1.07B,
Gauntlet $637M, Veda $223M, USDD $186M, Nonce Capital $148M, RockawayX
$97M, Hive Protocol $87M, Hyperithm $85M, Upshift $80M, K3 Capital $78M.

## 2. Inputs and data provenance

The only input is the sealed snapshot the grader mounts at
`/input/snapshot.json` (locally:
`~/workspace/makefun-radar-kit/input/snapshot.json`):

| Field | Value in this snapshot |
| --- | --- |
| `as_of` | 2026-11-14 |
| `source` | DefiLlama `https://api.llama.fi/protocols`, fetched 2026-11-14T01:18:33.201Z |
| `floor_usd` | $50,000,000 (the watchlist floor) |
| `protocols` | 758 records |
| `watchlist` | 40 slugs, all present in the snapshot |
| Token-less records | 342 (no market cap, no CoinGecko id, no symbol) |

Each protocol record carries exactly ten fields: `slug`, `name`,
`category`, `chains`, `tvl_usd`, `change_7d`, `mcap_usd`, `listed_at`,
`gecko_id`, `symbol`. `parseSnapshot()` refuses anything else: it throws
unless the document is a JSON object with a `YYYY-MM-DD` `as_of`, a string
`source`, a positive integer `floor_usd`, a protocols array and a watchlist
of strings, and unless every protocol has a string slug and name and a
finite TVL. Missing `change_7d` becomes `null` (treated as 0% growth);
missing `listed_at` becomes `null` (treated as 365 days old).

The repository's own history is anchored to the competition: its first
commit is the make.fun anchor `ebaed3b6c37864cefbe7dcae5441648a66a9ab16`
(drand round 33966582), created after the bounty opened. The entry is
published at `https://github.com/Fajri9/token-launch-radar`.

## 3. What counts as pre-token, and how the board is built

**Pre-token** (`isPreToken`) means the record carries no token at all:
`mcap_usd` is null **and** `gecko_id` is null **and** `symbol` is null.
The dashboard and this document always say a protocol "records no token",
never that it "has no token": a record can miss a token that exists (see
§9). A protocol is **rankable** (`isRankable`) when it is pre-token and
passes every checkable part of the competition's own exclusion rule (§6).

Board construction (`buildBoard`):

1. **The watchlist is the floor, never a ceiling.** Every slug on the
   house watchlist is included (all 40 are present in the snapshot).
   A watchlist row is never replaced by an early-radar row.
2. **The early radar.** Every other pre-token protocol *below* the
   $50M floor that passes the exclusion rule is added — all 137 of them,
   the list being short enough to carry whole. Pre-token protocols at or
   above the floor that are *not* on the watchlist are **not** added: the
   live record carries a `parentProtocol` for every one of them (§6), which
   is the one part of the house rule the snapshot cannot check, so the
   watchlist, not the snapshot, decides who is in.
3. **Scoring and ranking.** Every chosen protocol is scored with
   `impliedValue()`; the board is sorted by implied value descending,
   ties by slug ascending, ranks 1..177.

Live-token protocols are **not** ranked. The 24 largest by market cap are
shown separately in the dashboard's Live token view with the market's own
values (market cap, mcap/TVL ratio), never mixed into the ranking. The
category multiples, by contrast, use **119** live-token protocols across
the full snapshot (§5) — the Live tab shows only the top 24.

## 4. Category multiples

A dollar of TVL is not worth the same in every category: the live market
already prices that. Each category's multiple is therefore derived from
that category's live-token protocols (`categoryMultiples()`), in four
steps, all computed from the snapshot at run time:

1. **Comps.** A live protocol counts as a comp when it has a positive
   market cap and TVL, carries a CoinGecko id or a symbol, and is not a
   CEX. CEX protocols are excluded — an exchange is not a market for
   launch multiples.
2. **Winsorise.** Each comp's mcap/TVL ratio is capped at `ratio_cap`
   (3.0x) *before* the median. A ratio above the cap is a token whose
   value has decoupled from its protocol's TVL, not a launch comp. The
   case that forced this rule (radar-3): Rain, Prediction Market's only
   live comp, carries a $2.65B market cap on $6.6M TVL — a 400.204x
   ratio — which had set the whole category's multiple to 1.50 (clamped).
   Winsorised, Prediction Market's multiple is 0.705 before the
   singleton cap (§5, step 4). Chain moved 0.709 → 0.705 the same way
   (astar-dapps-staking at 3.026x).
3. **Median, then shrink.** The category multiple is the median of the
   winsorised ratios, shrunk toward the global median with weight
   `shrink_k` = 5:

   ```
   multiple = clamp( (n × median + 5 × global_median) / (n + 5), 0.05, 1.5 )
   ```

   The **global median** is the median of all 119 live comps' winsorised
   ratios: **0.246x** in this snapshot. A category with no live comps,
   and a protocol with no category, take the global median.
4. **Singleton cap (radar-4).** A category with exactly one live comp
   (`n` = 1) is further capped at `singleton_cap` × global median =
   2 × 0.246 = **0.492x**. The shrink alone was not enough: Risk
   Curators sat at 0.7008x on Api3 alone, and seven of the top 10 rows
   were Risk Curators — about 59% of the board's total implied value
   through one comparable. Six categories fall to the cap (marked `*`
   below): Risk Curators 0.7008 → 0.492, Chain / Collateral Management /
   Prediction Market 0.705 → 0.492, Decentralized AI 0.5484 → 0.492,
   NFT Marketplace 0.5386 → 0.492. The cap cut the board total from
   $5.24B to $4.15B; USDD rose to rank 4 and Upshift entered the top 10
   at rank 9.

The full category table for this snapshot (from `out/data.js`;
`n` = live comps, median = winsorised median, multiple = final value
after shrink, clamp and singleton cap):

| Category | n | Live median | Multiple |
| --- | ---: | ---: | ---: |
| Lending | 15 | 0.1324 | 0.1608 |
| Dexs | 11 | 0.3424 | 0.3123 |
| Liquid Staking | 9 | 0.0406 | 0.1139 |
| RWA | 9 | 0.2748 | 0.2645 |
| Yield | 9 | 0.1914 | 0.2109 |
| Canonical Bridge | 8 | 0.7464 | 0.5539 |
| Basis Trading | 7 | 0.6544 | 0.4842 |
| Bridge | 6 | 0.5567 | 0.4155 |
| Cross Chain Bridge | 4 | 1.2205 | 0.6791 |
| Yield Aggregator | 4 | 0.1510 | 0.2038 |
| CDP | 3 | 0.1687 | 0.2170 |
| Indexes | 3 | 0.1477 | 0.2091 |
| Privacy | 3 | 0.9691 | 0.5172 |
| AI Agents | 2 | 0.6047 | 0.3485 |
| Derivatives | 2 | 2.1619 | 0.7934 |
| Liquid Restaking | 2 | 0.1828 | 0.2279 |
| Onchain Capital Allocator | 2 | 0.0125 | 0.1793 |
| Payments | 2 | 0.1813 | 0.2275 |
| Restaking | 2 | 0.0246 | 0.1827 |
| Staking Pool | 2 | 0.0018 | 0.1762 |
| Token Locker | 2 | 1.5326 | 0.6136 |
| Chain * | 1 | 3.0000 | 0.4920 |
| Collateral Management * | 1 | 3.0000 | 0.4920 |
| DOR | 1 | 0.0898 | 0.2200 |
| Decentralized AI * | 1 | 2.0604 | 0.4920 |
| Dual-Token Stablecoin | 1 | 0.0316 | 0.2103 |
| Launchpad | 1 | 0.1306 | 0.2268 |
| Leveraged Farming | 1 | 0.1725 | 0.2337 |
| Liquidity Manager | 1 | 0.0150 | 0.2075 |
| NFT Marketplace * | 1 | 2.0017 | 0.4920 |
| Options | 1 | 1.5145 | 0.4574 |
| Prediction Market * | 1 | 3.0000 | 0.4920 |
| Risk Curators * | 1 | 2.9747 | 0.4920 |

`*` = capped by the singleton cap. Two thin categories were flagged in
review and deliberately left alone: Derivatives (0.7934x on two comps)
and Token Locker (0.6136x on two comps) — the aggregates alone do not
justify a patch. A minimum-comps rule (n ≥ 3, else the global median)
was considered and rejected three times, most recently measured on the
radar-4 board: it would reshuffle 173 of 177 rows and cut the total
implied value from $4.15B to $2.95B — a model redesign, not a fix.

## 5. The growth and maturity factors

**Growth** rewards recent momentum and punishes recent decline, but only
half-strength and inside a clamp, so a one-week spike cannot dominate a
ranking:

```
growth_pct        = clamp(change_7d, −60, 120)   (missing change_7d → 0)
growth_multiplier = 1 + (growth_pct / 100) × 0.5
```

So a +120% week gives at most 1.60x, a −60% week at worst 0.70x, and a
flat week gives 1.00x. Steakhouse's −2.1935% week gives
1 + (−0.021935 × 0.5) = 0.9890325; Gauntlet's +5.645% week gives
1 + (0.05645 × 0.5) = 1.028225.

**Maturity** rewards survival, from 0.6 for a brand-new protocol to 1.0
at three years, linear in between:

```
maturity_multiplier = 0.6 + min(age_days, 1095) / 1095 × 0.4
```

`age_days` is whole days from `listed_at` to `as_of`, clamped at zero;
when `listed_at` is missing the protocol is assumed 365 days old
(0.7333x). A protocol listed 543 days before the snapshot (Steakhouse,
Gauntlet) gets 0.6 + (543/1095) × 0.4 = 0.798356…; a 56-day-old
protocol (Bittensor dTAO) gets 0.6205; a 611-day-old one (USDD) gets
0.8232.

**Rounding.** The board stores each multiplier rounded to four decimals
for display (`round4`), but the implied value is computed at full
precision. Recomputing from the displayed (rounded) multipliers
reproduces the board's implied values to within 0.01%: Steakhouse
recomputes to $1,069,899,391 vs the board's $1,069,875,806 (+$23,585,
+0.0022%); Gauntlet to $637,211,572 vs $637,192,079 (+$19,493, +0.0031%).
The final implied value is `max(1, round(...))` — never below $1, always
a whole number of dollars.

## 6. Exclusion rules

`isRankable()` is the competition's own exclusion rule, as far as the
snapshot allows checking it. A protocol fails if **any** of these holds:

| # | Rule (code) | What it excludes |
| --- | --- | --- |
| 1 | Not pre-token (`isPreToken`) | Any record carrying a market cap, a CoinGecko id or a symbol |
| 2 | Category in the excluded set | Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked BTC, CEX |
| 3 | Versioned name (`VERSIONED`) | A name ending in a release marker — `V2`, `v3`, `1.5` — a pool of another protocol |
| 4 | Whole word wrapped / staked / staking (`WRAPPED_WORD`) | A wrapped or staked product of another token |
| 5 | Staked-token ticker (`STAKED_TICKER`, `/\bst[A-Z][A-Za-z0-9]+\b/`) | A liquid-staked product named for its ticker — stHYPE, stETH, stSOL |
| 6 | Exchange-named (`EXCHANGE_NAMES`) | A name starting with Binance, Coinbase, Bybit, Kraken, Bitget, OKX, Bitfinex or Gemini |

Rule 5 was added in radar-3: the radar-2 board ranked **Valantis stHYPE
Restaking** at rank 173 — a restaking vault for stHYPE, the liquid-staked
HYPE token from Valantis (HYPE itself trades, CoinGecko rank ~11;
DefiLlama's own vault page describes it as a vault for stHYPE "while
maintaining exposure to staked HYPE"). The whole-word rule missed it:
"Restaking" contains "staking" but is not the word, and the ticker
itself carries no whole word at all. The board dropped from 178 to 177
rows; no other row matched the pattern.

Two deliberate non-exclusions: **"Cross Chain Bridge"** is *not* in the
excluded categories — the house rule (RULES.txt line 14) enumerates
Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked
BTC and CEX, and Cross Chain Bridge is not among them; no Cross Chain
Bridge row is on the board in any case. And the **parent-protocol** part
of the house rule cannot be checked from the snapshot at all — the
snapshot carries no `parentProtocol` field — so it is enforced by the
watchlist instead (§3, step 2).

### The 20 excluded protocols at or above the floor

Of the 92 pre-token protocols at or above the $50M floor that are not on
the watchlist, 72 fail a checkable rule above. The remaining **20 pass
every check the snapshot allows** — and every one of them carries a
`parentProtocol` on the live DefiLlama record (read 2026-11-15), which is
exactly the uncheckable part of the rule. They are excluded, and the
watchlist decides who is in:

| Protocol | Category | TVL | Parent on the live record |
| --- | --- | ---: | --- |
| Sentora Curator | Risk Curators | $2.76B | Sentora |
| Polymarket International | Prediction Market | $320.2M | Polymarket |
| CIAN Yield Layer | Yield Aggregator | $280.3M | Cian Protocol |
| Defi Saver Asset Management | CDP Manager | $276.4M | Defi Saver |
| Mellow Core | Onchain Capital Allocator | $232.6M | Mellow Protocol |
| BitFi Basis | Basis Trading | $214.9M | BitFi |
| Figure Markets Prime | Lending | $190.5M | Figure Markets |
| Theo Network thUSD | RWA | $138.6M | Theo |
| Figure Markets Exchange | OTC Marketplace | $131.3M | Figure Markets |
| Extended Perps | Derivatives | $96.4M | Extended |
| Avant avUSD | Onchain Capital Allocator | $94.6M | Avant Protocol |
| Stellar DeFi Hub | Farm | $83.2M | Sentora |
| Loopscale Lending | Lending | $71.0M | Loopscale |
| IPOR Fusion | Onchain Capital Allocator | $68.3M | IPOR |
| Circle Gateway | Cross Chain Bridge | $65.3M | Circle |
| Arcus Perps | Derivatives | $60.2M | Arcus |
| USDCx | Stablecoin Wrapper | $56.6M | Circle |
| Solv Strategies | Onchain Capital Allocator | $56.6M | Solv Protocol |
| AZverse Perps | Derivatives | $52.0M | AZverse |
| Nado Spot | Dexs | $51.1M | Nado |

The largest of them, Sentora Curator at $2.76B TVL, would have outranked
every row on the board had it been included — which is why this table is
published rather than the decision buried: the exclusion is a scope
decision that follows the house rule, not a data error, and it is the
single most consequential judgement call in the entry.

## 7. Farm plans — a verify-first interaction checklist

Every board row carries a six-step farm plan (`farmSteps()`), generated
from the protocol's own record (category, chains, TVL, age) — never from
a hand-written list of names. The plans are headed **"Interaction
checklist — unverified"** in the dashboard: no protocol-specific
interaction route, points program or reward eligibility has been
verified, and the steps say so.

**The verify-first rule (radar-5).** The old generator presented
category guesses as executable instructions — "Supply USDC to USDD" for
a CDP is mechanically wrong (a CDP mints against collateral), a "main
pool" is not established by a category, and a curator need not run its
own deposit app. Every step 2 now says what to **verify first** and to
**skip when the route is not documented**; the budget is a **cap**
("deposit no more than $X"), never an order; and eligibility
restrictions are checked **before** the product subtype (RWA eligibility
and leverage rules take priority over lending, CDP, curator and other
branches).

**The six steps, and how their parameters are derived:**

| Step | Content | Cost / time |
| --- | --- | --- |
| 1 | Fresh wallet, seed phrase kept offline | Under $3 gas, 5 min |
| 2 | The category's action, verify-first (§7, below) | Capital + ~$4–8 gas, 15 min |
| 3 | One qualifying action each week — **only if a position was opened** ("If you opened a position, …") | ~$2 gas/week, 10 min/week |
| 4 | Hold at least the qualifying window | Capital stays in position |
| 5 | Claim only from the protocol's own published points/rewards link; never pay to claim | Free to check, 10 min |
| 6 | Log wallet, dates and every transaction | Free, 5 min |

**Capital** (`capitalFor`, from the protocol's own TVL): TVL ≥ $5B →
$250; ≥ $1B → $150; ≥ $100M → $100; below that → $50. Steakhouse
($2.75B TVL) and Gauntlet ($1.58B) both get $150. **Hold window**
(`holdDaysFor`, from age): age unknown → 30 days; under 180 days → 60
days; under 365 days → 45 days; 365 days or older → 30 days. Steakhouse
and Gauntlet (543 days) both hold 30 days. Step text is kept inside the
gate's 20–600 characters (`stepText` truncates at 600 and pads below 20);
actual lengths run 144–304 characters.

**Step 2 by category** (`actionFor`): RWA → check eligibility,
minimum investment and redemption terms first; Leveraged → review
collateral, liquidation and withdrawal rules, unleveraged route only;
Curator/Allocator → find a vault *explicitly managed by* the protocol
and verify host, asset, fees and withdrawal terms; CDP → verify public
collateralised minting exists; Lending → check supported markets and
supply without borrowing; Collateral → identify the documented workflow,
commit nothing until verified; DEX → verify an accessible pool, its
assets, fees and liquidity risks; Yield → verify the vault's strategy,
asset, fees and exit; Bridge → verify source/destination, asset and
return route; Staking/Restaking → verify accepted assets, slashing and
exit; Perpetuals/Derivatives → check collateral, margin and withdrawal,
no leveraged position required; Prediction → review market rules and cap
total loss at the budget; Stablecoin → verify acquisition and redemption,
no public minting assumed; Insurance → check cover, exclusions and
claims; Chain/L1/L2/Rollup → verify network identity and funding route,
one documented interaction; anything else → identify the documented
workflow, reserve the budget as a maximum, deposit nothing until access,
asset support and withdrawal terms are verified.

Steakhouse's actual step 2 (Risk Curators, Base, $150): *"Find a vault
explicitly managed by Steakhouse Financial on Base and verify its host,
deposit asset, fees and withdrawal terms. If accessible, deposit no more
than $150 through that verified vault; otherwise skip."*

## 8. Worked examples

All inputs are the board's own rows (`out/board.json`); the arithmetic
below was recomputed from those inputs and matches the board exactly.

### 8.1 Steakhouse Financial — rank 1

| Input | Value |
| --- | --- |
| TVL | $2,753,981,495 |
| Category | Risk Curators |
| 7-day change | −2.1935% |
| Listed | 2025-05-20 → age 543 days at `as_of` 2026-11-14 |
| Chains | Base, Ethereum, Robinhood Chain, Arbitrum, Solana, Monad, Arc, Katana, Polygon, Unichain, Corn (first listed: Base) |
| Token status | Pre-token (no market cap, no CoinGecko id, no symbol) |

**Category multiple.** Risk Curators has one live comp, Api3, whose
mcap/TVL ratio is 2.9747 (below the 3.0 winsorisation cap, so
unwinsorised). Median = 2.9747. Shrunk:
(1 × 2.9747 + 5 × 0.246) / 6 = 4.2047 / 6 = **0.7008**. Singleton cap:
2 × 0.246 = **0.492**. Clamp [0.05, 1.5] not binding. Multiple = **0.492**.

**Base.** 2,753,981,495 × 0.492 = **$1,354,958,895.54**.

**Growth.** −2.1935% is inside [−60, 120], so
1 + (−2.1935 / 100) × 0.5 = 1 − 0.0109675 = **0.9890325** (stored as
0.989).

**Maturity.** 0.6 + (543 / 1095) × 0.4 = 0.6 + 0.198356… =
**0.798356…** (stored as 0.7984).

**Implied value.**
round(1,354,958,895.54 × 0.9890325 × 0.7983561644) =
**$1,069,875,806** — the board's value, exact.

### 8.2 Gauntlet — rank 2

| Input | Value |
| --- | --- |
| TVL | $1,577,685,462 |
| Category | Risk Curators (same multiple, 0.492) |
| 7-day change | +5.645% |
| Listed | 2025-05-20 → age 543 days |
| Chains | Base, Binance, Ethereum, Arbitrum, Stable, Morph, Solana, Hyperliquid L1, Polygon, Optimism, Unichain, Katana, Arc, Tempo (first listed: Base) |
| Token status | Pre-token |

**Base.** 1,577,685,462 × 0.492 = **$776,221,247.30**.

**Growth.** 1 + (5.645 / 100) × 0.5 = 1 + 0.028225 = **1.028225**
(stored as 1.0282).

**Maturity.** Same age as Steakhouse: **0.798356…** (stored as 0.7984).

**Implied value.**
round(776,221,247.30 × 1.028225 × 0.7983561644) =
**$637,192,079** — the board's value, exact.

The two rows show the model working as intended: Gauntlet has 57% of
Steakhouse's TVL, the same multiple and maturity, and a better week
(+5.645% vs −2.1935%), so it lands at 60% of Steakhouse's implied value
— the ranking follows the inputs, not the names.

## 9. Disclosures and limitations

**USDD (rank 4, $185,953,971).** USDD stays on the board: its sealed
record carries no token metadata, and it sits on the house watchlist.
But USDD already trades as a stablecoin in reality. Its row is computed
like any other — CDP category, multiple 0.217 (n = 3, median 0.1687),
TVL $1,055,793,606, change −2.8062% → growth 0.986, age 611 days →
maturity 0.8232 — and its detail view carries an "Existing traded asset
context" note saying so. A judge who treats "already trading" as
disqualifying would remove it; the entry does not hide the fact.

**Bittensor dTAO (rank 11, $70,472,497).** Same treatment: sealed
record carries no token metadata, house watchlist member, but dTAO
represents traded subnet tokens. Dexs multiple 0.3123 (n = 11, median
0.3424), TVL $376,026,255, change −6.5592% → growth 0.9672, age 56
days → maturity 0.6205. Verified exactly from the row:
$376.0M × 0.3123 × 0.9672 × 0.6205 ≈ $70.5M.

**Record vs reality.** "Pre-token" is a property of the *record*, not
of the world. The snapshot is one DefiLlama fetch (2026-11-14); a
protocol can have launched, renamed, merged or been re-categorised
since, and the snapshot carries no parent-protocol field, so a
sub-protocol of a tokenised parent can only be caught by the watchlist
and the live-record check in §6. The 20-row table in §6 is the honest
account of that gap.

**What this model does NOT estimate.** The implied value is a
comparable-based market-cap scenario: it applies live-token mcap/TVL
ratios to candidate TVL. It does **not** estimate launch FDV (a launch
can price far above or below the comparable median), launch
**probability** (nothing here says whether or when a token appears),
farming **returns** (the farm plans are interaction checklists, not
yield forecasts), or a **recommendation** (ranking is not advice; the
budgets in the farm plans are caps of $50–$250, and every step says to
skip when the route is unverified).

**Thin comps.** Six categories rest on a single live comp and are held
at the 0.492 singleton cap (§4); Derivatives (0.7934x, n = 2) and Token
Locker (0.6136x, n = 2) rest on two. Those multiples are the least
certain numbers on the board, and the cap is the guard against them —
not a claim that they are precise.

## 10. Reproducibility

The entry is deterministic: the same snapshot always writes the same
bytes, so the grader's two runs agree. To rebuild locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../makefun-radar-kit/input/snapshot.json
```

(The kit's snapshot lives at `~/workspace/makefun-radar-kit/input/
snapshot.json` on this machine. The grader mounts the sealed snapshot
at the default `/input/snapshot.json` — that default is untouched.)
`main.ts` (Node 22, standard library only) parses the snapshot, scores
the board, refuses a board that fails `boardIssue()` (watchlist
coverage, contiguous ranks 1..n, non-increasing implied values, not all
rows equal, 3–12 farm steps per row each 20–600 characters, positive
whole-dollar implied values), writes `board.json` and `data.js`, copies
`dashboard/` and `screenshots/` to the output, and writes
`dossier.json` last with the vendored `vendor/makefun-board.ts` (from
the competition kit, unchanged); the scorer rebuilds the dossier from
the output and compares bytes.

**Verification.** `node verify-gate.mjs --out out` checks seven things
and passes 7/7 on the committed entry: dashboard files present (3
files, 60.4 KiB), board file (177 rows), sorted by value (ranks 1..177,
implied non-increasing), coverage (40/40 watchlist slugs), farm steps
(every row 3–12 steps, 20–600 characters), screenshots (3 images),
dossier matches (byte-identical to a rebuild). Two full runs of
`main.ts` into separate directories are byte-identical (`diff -r`
clean). The dashboard is a static page — `index.html`, `app.css`,
`app.js` reading `data.js` alone — with no framework, no external
library or CDN, and no network access; it renders from `file://`.
Three screenshots (board, detail, filtered view, 1440×900) are
included and were visually checked, including an 820 px-wide view.

## 11. Version history

| Version | Change |
| --- | --- |
| radar-2 | Initial entry: 178 rows, top Steakhouse $1.52B, total $5.25B. |
| radar-3 | Review fixes: comp ratios winsorised at 3.0x (Prediction Market 1.50 → 0.705); staked-token tickers excluded (Valantis stHYPE Restaking removed, 178 → 177 rows). Top 10 unchanged. |
| radar-4 | Astra review: singleton cap 2× global median on single-comp categories (Risk Curators 0.7008 → 0.492, five more categories to the cap); USDD/dTAO disclosure; farm heading relabelled "Interaction checklist — unverified"; 20-row exclusion table published. Total $5.24B → $4.15B. |
| radar-5 | Dashboard + farm text only; scoring model unchanged, so `MODEL_VERSION` stays `radar-4`. Professional redesign (KPI strip, Top-5 spotlight, sticky table, detail drawer, methodology panel), verify-first farm plans, search and deep-link fixes. Data and ranking byte-identical to radar-4. |

This file is `METHODOLOGY.md` at the repository root, written for the
judge alongside the dashboard's own methodology panel; the two state
the same model, and where they differ in wording, the code in
`lib/model.ts` is the authority.
