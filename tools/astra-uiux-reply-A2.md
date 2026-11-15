I’m limiting this to the requested frontend JavaScript questions. The search defect is real from the supplied render lifecycle; the smallest safe fix is focus and caret restoration after the existing synchronous rebuild, which preserves the current architecture and avoids touching data or ranking.## Q2 — Search / focus bug

### VERDICT

Confirmed. Issue #1 is a real functional bug.

The input handler runs:

```js
state.q = value;
writeHash();
render();
```

`render()` begins by clearing the shell:

```js
app.textContent = '';
```

That detaches the input that received the event. `controls()` then creates a new input from `state.q`, but the browser focus and caret remain associated with the detached element. The first character is accepted; subsequent typing goes nowhere until the user clicks the replacement input.

### Exact patch

Keep the existing `controls()` listener. Add this complete wrapper immediately after the existing `render()` function and before the first initial `render()` call:

```js
var radarRenderWithoutFocusLoss = render;

render = function () {
  var active = document.activeElement;
  var preserveSearchFocus =
    active &&
    active.tagName === 'INPUT' &&
    active.type === 'search';

  var selectionStart = preserveSearchFocus &&
    typeof active.selectionStart === 'number'
      ? active.selectionStart
      : 0;

  var selectionEnd = preserveSearchFocus &&
    typeof active.selectionEnd === 'number'
      ? active.selectionEnd
      : selectionStart;

  radarRenderWithoutFocusLoss();

  if (!preserveSearchFocus) return;

  var nextSearch = document.querySelector('input[type="search"]');
  if (!nextSearch) return;

  nextSearch.focus({ preventScroll: true });

  var length = nextSearch.value.length;
  nextSearch.setSelectionRange(
    Math.min(selectionStart, length),
    Math.min(selectionEnd, length)
  );
};
```

This preserves both focus and the caret after every render, including renders triggered by hash updates or other controls. No data or ranking behavior changes.

---

## Q3 — Implied-value bar and number format

### VERDICT

Issue #2 is confirmed. `list[0]` is only the largest row when the active sort is implied value descending. Sorting by TVL, growth, age, multiple, or name changes the denominator and therefore changes the meaning of every bar.

The bar denominator should be the largest `implied_value_usd` in the currently visible filtered list. This keeps the bars stable when sorting changes while allowing each filtered view to use its own range.

Issue #3 is also confirmed. The current output uses varying significant precision:

- `$1.07B` — three significant digits
- `$637.2M` — four significant digits
- `$223.3M` — four significant digits
- `$988K` — three significant digits

Use one rule: **three significant digits, with unit promotion after rounding**.

Expected results:

```text
$1.07B
$637M
$223M
$988K
$12.3M
$1.23M
```

### Exact bar patch

Add this complete helper near the other formatting functions:

```js
function impliedBarMax(list) {
  return list.reduce(function (max, row) {
    var value = Number(row.implied_value_usd);
    return isFinite(value) && value > max ? value : max;
  }, 0) || 1;
}
```

In `boardTable()`, replace:

```js
var max = list[0].implied_value_usd || 1;
```

with:

```js
var max = impliedBarMax(list);
```

Where the row bar width is calculated, replace the existing width expression with this bounded value:

```js
var barPct = Math.max(
  0,
  Math.min(
    100,
    (Number(r.implied_value_usd) || 0) / max * 100
  )
);
```

Use `barPct` in the existing bar style:

```js
'width:' + barPct.toFixed(1) + '%'
```

The denominator now depends on filtering, but never on the active sort.

### Exact `fmtUsd()` replacement

Replace the complete existing `fmtUsd()` function with:

```js
function fmtUsd(n) {
  if (n === null || n === undefined || !isFinite(n)) return 'n/a';

  var sign = n < 0 ? '-' : '';
  var value = Math.abs(n);

  var units = [
    { threshold: 1e9, suffix: 'B' },
    { threshold: 1e6, suffix: 'M' },
    { threshold: 1e3, suffix: 'K' },
    { threshold: 1, suffix: '' }
  ];

  var unitIndex = units.length - 1;

  for (var i = 0; i < units.length; i += 1) {
    if (value >= units[i].threshold) {
      unitIndex = i;
      break;
    }
  }

  function threeSignificantDigits(number) {
    var decimals;

    if (number >= 100) decimals = 0;
    else if (number >= 10) decimals = 1;
    else decimals = 2;

    var rounded = Number(number.toFixed(decimals));

    if (rounded >= 100) return rounded.toFixed(0);
    if (rounded >= 10) return rounded.toFixed(1);
    return rounded.toFixed(2);
  }

  var scaled = value / units[unitIndex].threshold;
  var roundedScaled = Number(
    threeSignificantDigits(scaled)
  );

  if (
    roundedScaled >= 1000 &&
    unitIndex > 0
  ) {
    unitIndex -= 1;
    scaled = value / units[unitIndex].threshold;
  }

  return sign +
    '$' +
    threeSignificantDigits(scaled) +
    units[unitIndex].suffix;
}
```

This is a display-only change. The underlying `implied_value_usd` values, ordering, ranks, and model output remain unchanged.

## ADDITIONAL FINDINGS

The two requested defects can be fixed without rebuilding the rendering architecture. The focus wrapper is the smallest safe change for the current static shell; the bar helper removes the sort-dependent denominator without changing filtering or ranking semantics.

## FINAL VERDICT

**Apply after the listed edits.** The current JS is not ready because search focus is functionally broken and the implied-value bars are semantically unstable under sorting.
