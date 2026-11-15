# FLAGSHIP REVIEW — token launch radar entry (make.fun bounty, $1,325 pool, 1st $1,000)

You are reviewing an entry that an AI judge will compare pairwise against ~3,200 other dashboards. Be adversarial: find what would LOSE. No flattery, no generic praise. Verdicts with evidence, and exact patch text for anything you want changed.

## The competition rule (brief, verbatim substance)
Read a sealed snapshot of every protocol DefiLlama tracks, work out which ones "still record no token and are not a wrapped or staked product of one that trades", rank them by what their launch would be worth; hand in a web dashboard (board, detail view per protocol, steps to farm it). An AI judge compares dashboards two at a time; top 10 share $1,325.

## The model (radar-3)
```
implied = round(TVL * category_multiple * growth_mult * maturity_mult)
category_multiple: median mcap/TVL of the category's LIVE-token protocols in this snapshot,
  each ratio winsorised at 3.0x first, then shrunk toward the global median:
  multiple = clamp((n*median + 5*global) / (n+5), 0.05, 1.5). No live comps -> global median.
growth_mult = 1 + clamp(change_7d, -60, 120)/100 * 0.5
maturity_mult = 0.6 + min(age_days, 1095)/1095 * 0.4  (age unknown: 365d)
global median (all live ratios, winsorised): 0.246
```
"Pre-token" = record carries no mcap, no CoinGecko id, no symbol. Excluded from ranking: categories Bridge/Canonical Bridge/Liquid Staking/Liquid Restaking/Restaked BTC/CEX; versioned names (v2, 2.0); whole word wrapped/staked/staking; staked-token ticker in name (stHYPE, stETH, stSOL); names starting with an exchange name. The snapshot has NO parentProtocol field, so that part of the house rule cannot be checked from the snapshot — the methodology says so. Farm plans are template steps driven by category/TVL/age (not per-protocol research). No protocol name is special-cased.

## Category multiples (live_n, live_median, multiple)
Lending 15, 0.1324, 0.1608 | Dexs 11, 0.3424, 0.3123 | Liquid Staking 9, 0.0406, 0.1139 | RWA 9, 0.2748, 0.2645 | Yield 9, 0.1914, 0.2109 | Canonical Bridge 8, 0.7464, 0.5539 | Basis Trading 7, 0.6544, 0.4842 | Bridge 6, 0.5567, 0.4155 | Cross Chain Bridge 4, 1.2205, 0.6791 | Yield Aggregator 4, 0.151, 0.2038 | CDP 3, 0.1687, 0.217 | Indexes 3, 0.1477, 0.2091 | Privacy 3, 0.9691, 0.5172 | AI Agents 2, 0.6047, 0.3485 | Derivatives 2, 2.1619, 0.7934 | Liquid Restaking 2, 0.1828, 0.2279 | Onchain Capital Allocator 2, 0.0125, 0.1793 | Payments 2, 0.1813, 0.2275 | Restaking 2, 0.0246, 0.1827 | Staking Pool 2, 0.0018, 0.1762 | Token Locker 2, 1.5326, 0.6136 | Chain 1, 3.0(capped), 0.705 | Collateral Management 1, 3.0(capped), 0.705 | DOR 1, 0.0898, 0.22 | Decentralized AI 1, 2.0604, 0.5484 | Dual-Token Stablecoin 1, 0.0316, 0.2103 | Launchpad 1, 0.1306, 0.2268 | Leveraged Farming 1, 0.1725, 0.2337 | Liquidity Manager 1, 0.015, 0.2075 | NFT Marketplace 1, 2.0017, 0.5386 | Options 1, 1.5145, 0.4574 | Prediction Market 1, 3.0(capped), 0.705 | Risk Curators 1, 2.9747, 0.7008

## Top 12 board rows (rank, name, category, TVL, multiple, implied)
1 Steakhouse Financial, Risk Curators, $2.75B, 0.7008, $1.52B
2 Gauntlet, Risk Curators, $1.58B, 0.7008, $907.6M
3 Veda, Onchain Capital Allocator, $1.56B, 0.1793, $223.3M
4 Nonce Capital, Risk Curators, $513.8M, 0.7008, $211.1M
5 USDD, CDP, $1.06B, 0.217, $186.0M
6 RockawayX, Risk Curators, $292.5M, 0.7008, $138.7M
7 Hive Protocol, Chain, $198.8M, 0.705, $124.7M
8 Hyperithm, Risk Curators, $221.6M, 0.7008, $121.3M
9 K3 Capital, Risk Curators, $207.7M, 0.7008, $111.0M
10 Clearstar, Risk Curators, $161.8M, 0.7008, $85.9M
12 Bittensor dTAO, Dexs, ~$324M TVL, $~70M implied (check: category Dexs multiple 0.3123)
Board: 177 rows (40 watchlist + 137 early), 24 live-token set aside. Total implied $5.24B.

## My own fresh cross-checks (live DefiLlama API, just now — use as ground truth)
- Top 10 ALL pre-token on the live record (mcap null, gecko null, symbol "-"), no parentProtocol. TVLs close to snapshot (small drift).
- USDD: live record also carries NO token (mcap/gecko null) — yet in reality USDD is a stablecoin that trades. Bittensor dTAO (rank 12): live record also no token — yet dTAO is a subnet token that trades in reality. Both are on the house watchlist, so including them follows the snapshot rule — but a judge may still ask why a stablecoin and a subnet token rank as launch candidates.
- Api3 (the ONLY live comp behind Risk Curators): live mcap $31.0M / TVL $11.6M = 2.68x (snapshot 2.97x). Rain (only live comp behind Prediction Market): live mcap $2.57B / TVL $6.4M = ~400x (snapshot 400.2x) — the winsorisation cap was needed.
- The 20 pre-token protocols ≥$50M floor NOT on the board (Sentora Curator $2.71B TVL, Cian Yield Layer, Mellow Core, Polymarket International, ...): ALL carry a parentProtocol on the live record (Sentora Curator -> parent#sentora etc.). Excluding them follows the house rule's parent part.
- Valantis stHYPE Restaking (was rank 173, now excluded by the st-ticker rule): live record parent parent#valantis — confirms it is a sub-product.

## YOUR QUESTIONS — answer each with a verdict
Q1 THIN COMPS (the big one): 6 of the top 10 are Risk Curators, all at multiple 0.7008, which rests on ONE live comp (Api3, ~2.7-3.0x). Chain and Prediction Market multiples (0.705) each rest on ONE comp whose ratio was winsorised at 3.0. Is shrink k=5 a sufficient guard, or does this need a fix? MEASURED COST of the obvious fix (minimum comps n>=3, else global median): it would reshuffle 175/178 rows and roughly halve total implied value ($5.25B -> $2.95B) — a model redesign, not a fix. If you judge a change is needed, propose the SMALLEST surgical change that fixes the worst of it (e.g. extra shrink for n=1, a cap on single-comp multiples, a different winsorisation) WITH exact numbers and patch text — or argue KEEP with reasons. Do not hand-wave.
Q2 USDD + dTAO: propose the exact one-line methodology-note wording that pre-empts a judge's objection (or argue convincingly that no note is needed). The dashboard already says "records no token, never that it has none".
Q3 WINSORISATION + CLAMP: is cap 3.0x and clamp [0.05, 1.5] defensible? Scan the category table above for any other multiple that looks wrong and say which and why.
Q4 BUGS: any bug in the model logic as presented above (shrink formula, median, growth/maturity clamps, exclusion rules)? Check the arithmetic, not the style.
Q5 SUBMIT-READINESS: is this entry, as it stands, defensible in a pairwise AI-judge comparison against 3,200 dashboards? What single change would most improve its chance of ranking top 10 — or is it already at its best given the snapshot?

## Output format
- One section per question: VERDICT (KEEP / CHANGE), evidence, and exact patch text (code or wording) when CHANGE.
- Then "ADDITIONAL FINDINGS" (anything else, with evidence) and "FINAL VERDICT" (submit-ready as-is / submit after listed changes / not ready + why).
- Keep it tight: no preamble, no summary of what I already told you.
