## Q4 BACKEND

**VERDICT: Keep the build/presentation split and both output shapes. Fix search focus and missing-value sorting. Keep full rendering provisionally; there is no measured performance evidence here to justify a larger rewrite.**

**(a) Formatting/logic duplication: NONE demonstrated.**

According to the supplied description, `main.ts` orchestrates generation and packaging. Its single `toLocaleString` call formats a console message. `app.js` formats displayed values and handles interaction. Those are separate responsibilities.

The full `main.ts` was not supplied, so this is a verdict on the described implementation, not a source-level audit. **No backend formatting patch.**

**(b) Dual row shape: KEEP.**

`board.json` is the gate-facing artifact; `data.js` is a browser projection. Flattening model fields and omitting unused identifiers is a defensible boundary. It becomes a problem only if the projection recomputes model values or independently implements scoring.

Changing every frontend access to use `r.model.*` would introduce churn without improving correctness. Keep one model calculation and the existing serialization projection. **No schema patch.**

**(c) Rendering: confirmed search bug; performance unmeasured.**

Replacing the focused input during its own `input` event removes that element from the document. Unless omitted code explicitly restores focus, typing loses focus after the first character.

A 177-row board does not, by itself, establish a performance problem. It also does not establish that rebuilding the methodology and dialog is fast. No browser timings were supplied, and I cannot honestly provide measured timings from excerpts.

For this patch, retain `render()` and repair focus, selection, and IME handling. That avoids inventing a replacement shell around omitted builder implementations.

Add these complete functions to `app.js`:

```js
function commitSearchInput(input) {
  var nextQuery = input.value;
  if (nextQuery === state.q) return;

  var hadFocus = document.activeElement === input;
  var start = input.selectionStart;
  var end = input.selectionEnd;
  var direction = input.selectionDirection;
  var horizontalScroll = input.scrollLeft;

  state.q = nextQuery;
  writeHash();
  render();

  if (!hadFocus) return;

  var replacement = app.querySelector('input[type="search"]');
  if (!replacement) return;

  replacement.focus({ preventScroll: true });

  if (start !== null && end !== null) {
    replacement.setSelectionRange(
      Math.min(start, replacement.value.length),
      Math.min(end, replacement.value.length),
      direction || 'none'
    );
  }

  replacement.scrollLeft = horizontalScroll;
}

function onSearchInput(event) {
  if (event.isComposing || event.currentTarget.__radarComposing) return;
  commitSearchInput(event.currentTarget);
}

function onSearchCompositionStart(event) {
  event.currentTarget.__radarComposing = true;
}

function onSearchCompositionEnd(event) {
  var input = event.currentTarget;
  input.__radarComposing = false;

  // Allow a final input event to commit first, if the browser emits one.
  queueMicrotask(function () {
    if (input.isConnected) commitSearchInput(input);
  });
}

function bindSearchInput(input) {
  input.addEventListener('input', onSearchInput);
  input.addEventListener('compositionstart', onSearchCompositionStart);
  input.addEventListener('compositionend', onSearchCompositionEnd);
}
```

In `controls()`, **replace**, rather than supplement, the existing search `input` listener with:

```js
bindSearchInput(searchInput);
```

Here `searchInput` means the existing local variable holding the search element; its actual identifier was omitted from the excerpt.

This fixes the demonstrated failure without changing hash links, filter semantics, dialog construction, or rendering order. It is not a claim that rendering performance has been measured or optimized.

**(d) Filtering: KEEP. Sorting: FIX.**

The provided filtering logic correctly:

- Applies category, chain, and watchlist filters together.
- Performs a trimmed, case-insensitive substring search.
- Searches names, slugs, categories, and chains.
- Leaves the source array untouched.

`sortedRows()` also correctly sorts a copy and uses an ascending slug tie-break.

The missing-value handling is inconsistent:

| Field | Ascending | Descending |
|---|---|---|
| Growth `null → -Infinity` | Missing first | Missing last |
| Age `null → Infinity` | Missing last | Missing first |

`undefined` and `NaN` are not handled reliably. Use **missing last in both directions**, with the existing slug tie-break.

Replace `sortedRows()` with these complete functions:

```js
function sortValue(row, key) {
  if (key === 'name') {
    return typeof row.name === 'string'
      ? row.name.toLowerCase()
      : null;
  }

  var field =
    key === 'tvl' ? 'tvl_usd' :
    key === 'growth' ? 'change_7d' :
    key === 'age' ? 'age_days' :
    key === 'multiple' ? 'category_multiple' :
    'implied_value_usd';

  var value = row[field];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function compareSlugs(a, b) {
  var left = String(a.slug || '');
  var right = String(b.slug || '');
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedRows(list) {
  var key = state.sort;
  var direction = state.dir === 1 ? 1 : -1;

  return list.slice().sort(function (a, b) {
    var av = sortValue(a, key);
    var bv = sortValue(b, key);
    var aMissing = av === null;
    var bMissing = bv === null;

    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    if (aMissing) return compareSlugs(a, b);

    if (av < bv) return -direction;
    if (av > bv) return direction;
    return compareSlugs(a, b);
  });
}
```

This changes interactive ordering for missing values only. It does not change model ranks or generated artifacts. At 177 rows, neither caching search text nor memoizing sort results is warranted by the supplied evidence.

## Q5 FARM PLANS

**VERDICT: Replace `actionFor()`. The current generator presents category guesses as executable protocol instructions. The CDP instruction is mechanically wrong, and several other branches make equally unsupported assumptions.**

| Existing branch | Verdict | Evidence |
|---|---|---|
| Lending / CDP / collateral | **FIX** | Lending supply and collateralized minting are different operations. “Collateral” alone does not establish either workflow. USDC support is unverified. |
| DEX / yield / leveraged farm | **SPLIT** | Pool liquidity, vault deposits, and leveraged positions are different products. A “main pool” is not established by category. |
| Bridge | **FIX** | Neither supported USDC routes nor the role of `chain` as a destination is established. |
| Staking / restaking | **FIX** | Restaking may accept liquid staking tokens or other assets; a transferable receipt token is not guaranteed. |
| Perpetual / derivative | **FIX** | USDC margin is unverified. A position is a hedge only relative to an existing exposure. |
| Prediction | **FIX** | “Fund $capital” does not distinguish wallet funding from the amount exposed to loss. |
| Curator / allocator | **FIX** | A curator may manage vaults hosted by another protocol. It need not operate its own deposit application. |
| Stable | **FIX** | A stablecoin category does not establish public minting or a deposit product. |
| RWA | **FIX** | Mint access, eligibility, minimums, and transfer restrictions vary. KYC is not necessarily just a preliminary step. |
| Insurance | **FIX** | The amount paid as premium differs from the amount covered. |
| Chain | **FIX** | Substring matching is too broad. Repeated transactions have no demonstrated eligibility benefit. |
| Default | **FIX** | Unknown category cannot justify a USDC deposit instruction. |

The ordering issue is broader than `dex`: “Yield Aggregator” reaches the shared yield branch; “RWA Lending” reaches lending before eligibility is considered; “Leveraged Lending” also reaches lending. “Onchain Capital Allocator” currently avoids the chain branch only because allocator appears earlier.

There is also a separate defect in the supplied function: **`name` has no local declaration**. If it resolves to an outer binding, the function depends on hidden context; otherwise it fails. Bind it from `p`.

Replace the entire function with:

```ts
function actionFor(p, capital, chain) {
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
```

For USDD, the relevant before/after is:

- **Before:** “Supply $150 of USDC to USDD on Tron…”
- **After:** “Verify whether USDD offers public collateralized minting on Tron. If supported and understood, supply no more than $150 of approved collateral…”

The replacement corrects the CDP concept without asserting that USDD exposes a particular retail minting route.

**Regenerate through `main.ts`; do not edit `board.json`.** This is a farm-text change, not a valuation change. Expected numerical delta: **zero** for TVL, model fields, implied values, and ranks. That expectation still requires a before/after artifact comparison.

`weeklyFor()` and the code assembling the other five steps were not supplied. Their wording cannot be audited from this excerpt. In particular, check that recurring instructions do not contradict “skip” or invent a weekly activity requirement. Run the existing gate against the final assembled steps to verify the 3–12-step and 20–600-character requirements.

## Q6 MODEL/DATA

**VERDICT: KEEP numerical outputs. No supplied evidence supports changing the valuation model.**

- **Model — KEEP:** The supplied defects concern presentation and interaction instructions, not the scoring formula or its calibration.
- **Data — KEEP numeric fields and ranks:** Regenerate farm text only; there is no new snapshot evidence supporting additions, exclusions, token-status changes, or repricing.
- **Methodology — KEEP substantive claims and disclosures:** Preserve the comparable-scenario caveat, live-token treatment, USDD/dTAO disclosure, and exclusion rationale. Presentation and category-table completeness belong to Part A.
- **README — NO PATCH:** Its contents were not supplied; no evidence-backed correction can be identified.

No model patch. No minimum-comparables rule.

## Q7 NOT CHANGED

**VERDICT: Deliberately leave these alone. No patch.**

| Considered | Left unchanged because |
|---|---|
| `main.ts` orchestration | No demonstrated duplication or misplaced presentation logic. |
| Nested gate rows / flattened browser rows | A serialization projection is a reasonable boundary and preserves the gate contract. |
| Full-shell rendering | Fix the demonstrated focus failure now; a larger rewrite needs the full source and browser measurements. |
| Filter implementation | The supplied predicates are correct for pre-token rows. |
| Live-token filtering | Its implementation was omitted; the pre-token `rows()` function does not establish live-tab correctness. |
| Slug tie-break | It is deterministic and independent of sort direction. |
| Canonical rank numbers | Interactive sorting must not rewrite model ranks. |
| Farm capital and step count | No evidence supports changing their policy; only action wording is patched. |
| Growth, maturity, shrinkage, winsorization, and caps | No calibration evidence or numerical comparison supports changing them. |
| CSS, layout, drawer presentation, KPI strip | Explicitly assigned to Part A. |
| Screenshots and packaging | Preserve the stated artifact contract; no new files or dependencies are needed. |

## ADDITIONAL FINDINGS

**The implied-value bar denominator is a confirmed data-encoding bug.**

Using the first sorted row makes the denominator depend on the selected sort. Define bars as **value divided by the largest value in the filtered result**, independent of order.

Add:

```js
function maximumImpliedValue(list) {
  var maximum = 0;

  list.forEach(function (row) {
    var value = row.implied_value_usd;
    if (typeof value === 'number' &&
        Number.isFinite(value) &&
        value > maximum) {
      maximum = value;
    }
  });

  return maximum || 1;
}
```

In `boardTable()`, replace:

```js
var max = list[0].implied_value_usd || 1;
```

with:

```js
var max = maximumImpliedValue(list);
```

The existing `implied / max * 100` calculation can remain. This also removes the empty-array dereference from that line.

**Currency precision should follow one explicit rule.**

Use two decimal places for every displayed dollar scale: `$1.07B`, `$637.20M`, `$223.30M`, `$988.00K`. Promote the suffix when rounding would otherwise produce `$1000.00K`. This is a display-only change.

Replace `fmtUsd()`:

```js
function fmtUsd(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 'n/a';

  var magnitude = Math.abs(n);
  var units = [
    { divisor: 1, suffix: '' },
    { divisor: 1e3, suffix: 'K' },
    { divisor: 1e6, suffix: 'M' },
    { divisor: 1e9, suffix: 'B' },
    { divisor: 1e12, suffix: 'T' }
  ];

  var index = 0;
  while (
    index < units.length - 1 &&
    magnitude >= units[index + 1].divisor
  ) {
    index += 1;
  }

  var displayed = Number(
    (magnitude / units[index].divisor).toFixed(2)
  );

  if (displayed >= 1000 && index < units.length - 1) {
    index += 1;
    displayed = Number(
      (magnitude / units[index].divisor).toFixed(2)
    );
  }

  var sign = n < 0 && displayed !== 0 ? '-' : '';
  return sign + '$' + displayed.toFixed(2) + units[index].suffix;
}
```

None of these patches introduces a dependency, network operation, additional file, or forbidden URL string.

## FINAL VERDICT

**Apply after the listed edits; do not declare the entry validated yet.**

The demonstrated defects are search focus loss, direction-dependent missing-value placement, sort-dependent bar scaling, and unsupported farm instructions. The numerical model stays unchanged.

The supplied excerpts are sufficient for the replacement functions above, but not for an honest complete-file patch or a full farm-plan audit. Finish by inspecting `weeklyFor()`, regenerating the artifacts, checking numerical and rank equality against the prior build, and running the existing gate. Confirm multi-character search, caret editing, IME input, hash links, and null-last sorting in the browser.
