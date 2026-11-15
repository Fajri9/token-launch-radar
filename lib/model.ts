// The token radar's model, radar-3: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and adds the
// pre-token protocols below the watchlist floor that pass the house's own exclusion rule (the checkable
// parts of it: not a bridge, liquid-staking, restaking or CEX product, not a versioned pool, no whole
// word wrapped / staked / staking in the name, no staked-token ticker (stHYPE, stETH) in the name,
// not named for an exchange). A protocol is pre-token when its record carries no token (no market cap,
// no CoinGecko id, no symbol); the snapshot's live-token protocols are kept apart and shown as the
// market's own values, never mixed into the ranked board.
//
// Implied value follows only from the snapshot's own figures. The one thing the starter's flat
// multiple gets wrong is that a dollar of TVL is not worth the same in every category: the live
// market already prices that. So each category's multiple is the median market-cap-to-TVL ratio of
// the live-token protocols in that category — each ratio winsorised at 3.0x first, so a token whose
// value has decoupled from its protocol's TVL cannot set a category's multiple — shrunk toward the
// global median so a category with one or two live comps cannot swing the board, and clamped to a
// sane band:
//
//   catMultiple = clamp((n * median(min(cat, 3.0)) + K * globalMedian) / (n + K), 0.05, 1.5)   K = 5
//   single-comp categories (n = 1) are further capped at 2x the global median, so one token's
//   ratio cannot set most of a category's multiple (see MODEL_VERSION, radar-4).
//   base        = tvl_usd x catMultiple
//   growth      = clamp(change_7d, -60, 120) per cent
//   growthMult  = 1 + (growth / 100) x 0.5
//   maturity    = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age_days unknown: 365)
//   implied     = max(1, round(base x growthMult x maturity))
//
// No protocol name is ever special-cased: the same function scores every row, and the category
// table is computed from the snapshot at run time, never written in by hand.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  shrink_k: number;
  multiple_min: number;
  multiple_max: number;
  /** Winsorisation cap on a live comp's mcap/TVL ratio, applied before the category median. */
  ratio_cap: number;
  /** Cap on a single-comp category's multiple, as a multiple of the global median. */
  singleton_cap: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  shrink_k: 5,
  multiple_min: 0.05,
  multiple_max: 1.5,
  ratio_cap: 3,
  singleton_cap: 2,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-4';
// radar-4 = radar-3 + Astra review (2026-11-15):
//   (1) a category with a single live comp (n = 1) is capped at 2x the global median —
//       the shrink alone still let one token's ratio set most of the multiple (Risk Curators
//       sat at 0.7008 on Api3 alone, 59% of the board's implied value through seven top-10
//       rows); (2) methodology disclosures only (USDD/dTAO note, farm-plan honesty, exclusion
//       list) — no other model change.
// radar-3 = radar-2 + two fixes from the 2026-11-15 review (see README, "Changes in radar-3"):
//   (1) each live comp's mcap/TVL ratio is winsorised at 3.0x before the category median —
//       the uncapped median let one tiny-TVL comp with a 400x ratio set Prediction Market's
//       multiple to 1.50 (clamped); (2) a staked-token ticker in a name (stHYPE, stETH, stSOL)
//       now fails isRankable — Valantis stHYPE Restaking was on the radar-2 board at rank 173
//       although it is a restaking vault for stHYPE, a liquid-staked HYPE token that trades.

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One category's multiple, with the live comps behind it. */
export interface CategoryMultiple {
  category: string;
  live_count: number;
  live_median: number | null;
  multiple: number;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    category_live_count: number;
    category_live_median: number | null;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  category_multiple: number;
  category_live_count: number;
  category_live_median: number | null;
  growth_multiplier: number;
  maturity_multiplier: number;
  farm_steps: string[];
  watchlist: boolean;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  mcap_tvl_ratio: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  global_median: number;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  categories: CategoryMultiple[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty sorted array of numbers; the mean of the two middles when even. */
function medianOf(sorted: number[]): number {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/**
 * The category multiples, derived from the snapshot's own live-token protocols: for each category,
 * the median market-cap-to-TVL ratio of its live protocols (exchanges excluded, they are not a
 * market for launch multiples), each ratio winsorised at model.ratio_cap first — a ratio above the
 * cap is a token whose value has decoupled from its protocol's TVL, not a launch comp — then
 * shrunk toward the global median and clamped. A category with no live comps, and a protocol with
 * no category, take the global median. Nothing is hand-written.
 */
export function categoryMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): { byCategory: Map<string, CategoryMultiple>; global: number } {
  const byCat = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    if (p.gecko_id === null && p.symbol === null) continue;
    if (p.category === 'CEX') continue;
    const ratio = Math.min(p.mcap_usd / p.tvl_usd, model.ratio_cap);
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    all.push(ratio);
    const key = p.category ?? 'Other';
    const list = byCat.get(key);
    if (list === undefined) byCat.set(key, [ratio]);
    else list.push(ratio);
  }
  all.sort((a, b) => a - b);
  const global = all.length > 0 ? medianOf(all) : 0.25;
  const byCategory = new Map<string, CategoryMultiple>();
  for (const [cat, ratios] of byCat) {
    ratios.sort((a, b) => a - b);
    const med = medianOf(ratios);
    const n = ratios.length;
    const shrunk = (n * med + model.shrink_k * global) / (n + model.shrink_k);
    let multiple = Math.min(model.multiple_max, Math.max(model.multiple_min, shrunk));
    // A single live comp cannot push a category above twice the global median: with n = 1 the
    // shrink alone still leaves one token's ratio setting most of the multiple (Risk Curators
    // sat at 0.7008 on Api3 alone, 59% of the board's implied value through seven top-10 rows).
    if (n === 1) multiple = Math.min(multiple, model.singleton_cap * global);
    byCategory.set(cat, { category: cat, live_count: n, live_median: round4(med), multiple: round4(multiple) });
  }
  return { byCategory, global: round4(global) };
}

/** The multiple a category gets: its shrunk median, or the global median when it has no live comps. */
export function multipleFor(category: string | null, multiples: { byCategory: Map<string, CategoryMultiple>; global: number }): CategoryMultiple {
  const key = category ?? 'Other';
  const found = multiples.byCategory.get(key);
  if (found !== undefined) return found;
  return { category: key, live_count: 0, live_median: null, multiple: multiples.global };
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  multiples: { byCategory: Map<string, CategoryMultiple>; global: number },
  model: ModelConstants = MODEL,
): { implied: number; growthPct: number; growthMult: number; maturityMult: number; age: number | null; cat: CategoryMultiple } {
  const age = ageDays(asOf, protocol.listed_at);
  const cat = multipleFor(protocol.category, multiples);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const base = protocol.tvl_usd * cat.multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult));
  return { implied, growthPct, growthMult, maturityMult, age, cat };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A whole word wrapped, staked or staking in a name: a wrapped or staked product of another token. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** A staked-token ticker in a name (stHYPE, stETH, stSOL): a liquid-staked product of a token that
    trades. The whole-word rule misses it — "Restaking" contains "staking" but is not the word, and
    the ticker itself carries no whole word at all — so it needs its own pattern. Added in radar-3:
    Valantis stHYPE Restaking was on the radar-2 board although it is a restaking vault for stHYPE,
    the liquid-staked HYPE token (HYPE itself trades, CoinGecko rank ~11). */
const STAKED_TICKER = /\bst[A-Z][A-Za-z0-9]+\b/;
/** The house rule's excluded categories: bridges and staking products of tokens that already trade. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** Names beginning with an exchange's name are that exchange's product, not a launch of their own. */
const EXCHANGE_NAMES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and passing every checkable part of the
 * house's own watchlist rule (the snapshot carries no parentProtocol field, so that one part cannot
 * be checked from here, and the methodology says so). No name is ever special-cased.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (STAKED_TICKER.test(p.name)) return false;
  for (const e of EXCHANGE_NAMES) if (p.name.startsWith(e)) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const multiples = categoryMultiples(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but
  // the board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor that pass the house's own
  // exclusion rule, every one of them (the list is short enough to carry whole). Never a
  // replacement for a watchlist row: a chosen protocol stays chosen.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, multiples, model);
    return { p, v };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.v.age,
    implied_value_usd: s.v.implied,
    model: {
      category_multiple: s.v.cat.multiple,
      category_live_count: s.v.cat.live_count,
      category_live_median: s.v.cat.live_median,
      growth_pct: s.v.growthPct,
      growth_multiplier: round4(s.v.growthMult),
      maturity_multiplier: round4(s.v.maturityMult),
      age_days: s.v.age,
    },
    farm_steps: farmSteps(s.p, s.v.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow.
 *  Radar-5 (Astra review): the old generator presented category guesses as
 *  executable protocol instructions — "Supply USDC to USDD" for a CDP is
 *  mechanically wrong (a CDP mints against collateral), a "main pool" is not
 *  established by a category, and a curator need not run its own deposit app.
 *  Every branch now says what to VERIFY first and to skip when the route is
 *  not documented; the budget is a cap ("no more than $X"), never an order.
 *  Eligibility restrictions (RWA, leverage) are checked before the subtype. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const name = String(p.name || p.slug || 'this protocol');
  const network = String(chain || 'the supported network');
  const budget = `$${capital}`;

  const category = String(p.category || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const has = (pattern: RegExp) => pattern.test(category);

  // Eligibility restrictions take priority over the product subtype.
  if (has(/\brwa\b|\breal world assets?\b/)) {
    return `Check ${name}'s eligibility, minimum investment, redemption terms and supported network. Only if eligible, use its documented investment route with no more than ${budget}; otherwise skip.`;
  }

  // Do not infer that leverage is necessary or appropriate.
  if (has(/\bleverag(?:e|ed)\b/)) {
    return `Review ${name}'s collateral, liquidation and withdrawal rules on ${network}. Use no more than ${budget} only if a documented unleveraged route exists; otherwise skip this interaction.`;
  }

  // Curators can operate through vaults hosted by another protocol.
  if (has(/\bcurators?\b|\ballocators?\b/)) {
    return `Find a vault explicitly managed by ${name} on ${network} and verify its host, deposit asset, fees and withdrawal terms. If accessible, deposit no more than ${budget} through that verified vault; otherwise skip.`;
  }

  if (has(/\bcdps?\b/)) {
    return `Verify whether ${name} offers public collateralized minting on ${network}. If supported and understood, supply no more than ${budget} of approved collateral and mint only within its documented limits; otherwise skip.`;
  }

  if (has(/\blend(?:ing|er|ers)?\b/)) {
    return `Check ${name}'s supported lending markets on ${network}, including deposit assets and withdrawal liquidity. If a suitable market exists, supply no more than ${budget} of an approved asset without borrowing; otherwise skip.`;
  }

  if (has(/\bcollateral\b/)) {
    return `Identify ${name}'s documented collateral workflow on ${network}, including accepted assets and liquidation risks. Do not assume it accepts deposits or supports minting; commit no capital until the workflow is verified.`;
  }

  if (has(/\bdex(?:s|es)?\b|\bdecentralized exchanges?\b/)) {
    return `Verify an accessible ${name} liquidity pool on ${network}, its assets, fees and liquidity risks. If suitable, add no more than ${budget} in total pool assets using its documented route; otherwise skip.`;
  }

  if (has(/\byield\b/)) {
    return `Check whether ${name} offers an accessible yield vault on ${network}. Verify its underlying strategy, deposit asset, fees and withdrawal terms; if suitable, deposit no more than ${budget}, otherwise skip.`;
  }

  if (has(/\bbridg(?:e|es|ing)\b/)) {
    return `Verify that ${name} supports the intended source and destination networks, asset and return route. If a route involving ${network} is supported, bridge no more than ${budget} of an approved asset; otherwise skip.`;
  }

  if (has(/\bstaking\b|\brestak(?:e|ed|ing)\b/)) {
    return `Verify ${name}'s accepted staking or restaking assets on ${network}, slashing exposure and exit conditions. If suitable, stake no more than ${budget} through the documented route and record the resulting position; otherwise skip.`;
  }

  if (has(/\bperpetuals?\b|\bderivatives?\b/)) {
    return `Check ${name}'s supported collateral, margin rules and withdrawal route on ${network}. If appropriate, fund no more than ${budget} using an approved asset; this checklist does not require opening a leveraged position.`;
  }

  if (has(/\bprediction\b/)) {
    return `Review ${name}'s market rules, eligibility, settlement and liquidity. If participation is suitable, cap the total amount exposed to loss at ${budget}; otherwise skip the market interaction.`;
  }

  if (has(/\bstable(?:coin|coins)?\b/)) {
    return `Verify how ${name}'s stable asset can be acquired and redeemed on ${network}. Use no more than ${budget} only through an accessible documented route; do not assume public minting or a deposit product exists.`;
  }

  if (has(/\binsurance\b/)) {
    return `Check whether ${name} offers relevant cover on ${network}. Review exclusions, claims and policy duration; if suitable, spend no more than ${budget} on the premium and record the separate coverage amount.`;
  }

  if (/^(?:chains?|blockchains?|layer [12]|l[12]|rollups?|sidechains?)$/.test(category)) {
    return `Verify ${name}'s network identity, gas asset and supported funding route. If useful, fund the network with no more than ${budget} and make one documented application interaction; do not assume repeated transactions earn eligibility.`;
  }

  return `Identify ${name}'s documented user workflow and supported assets on ${network}. Reserve ${budget} as a maximum budget, but make no deposit until access, asset support and withdrawal terms are verified.`;
}

/** The category's weekly qualifying action. Radar-5: conditional on having
 *  opened a position — step 2 of the plan may say "otherwise skip", and a
 *  weekly action must not contradict that. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `If you opened a position, make one qualifying action each week, such as a deposit, a borrow or a repayment.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `If you opened a position, make one qualifying action each week, such as a swap, adding liquidity or claiming rewards.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `If you opened a position, make one qualifying action each week, such as a small trade or adjusting the hedge.`;
  if (c.includes('prediction')) return `If you opened a position, make one qualifying action each week, such as a new market position.`;
  if (c.includes('curator') || c.includes('allocator')) return `If you opened a position, make one qualifying action each week, such as a deposit, a rebalance or a vote.`;
  if (c.includes('rwa')) return `If you opened a position, make one qualifying action each week, such as a mint, a redemption or a vote.`;
  return `If you opened a position, make one qualifying action each week, such as a deposit, a swap or a vote.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list
 * of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: weeklyFor(p),
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      mcap_tvl_ratio: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow, onWatchlist: boolean): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    category_live_count: row.model.category_live_count,
    category_live_median: row.model.category_live_median,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    farm_steps: row.farm_steps,
    watchlist: onWatchlist,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const multiples = categoryMultiples(snapshot, model);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const categories = [...multiples.byCategory.values()].sort((a, b) => b.live_count - a.live_count || (a.category < b.category ? -1 : 1));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    global_median: multiples.global,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    categories,
    rows: board.map((r) => radarRow(r, snapshot.watchlist.includes(r.slug))),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
