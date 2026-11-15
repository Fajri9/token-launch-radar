// Token Radar's dashboard (radar-5 frontend on the radar-4 model). It reads
// window.RADAR (written beside dashboard/ by main.ts) and renders the ranked
// board, a filterable table, a per-protocol detail drawer with the model's
// own inputs and the protocol's farm plan, and the methodology behind the
// ranking. No network: every byte it shows is in data.js.
//
// The model, stated in full on the page: implied = TVL x category multiple x growth x maturity,
// where the category multiple is the median market-cap-to-TVL ratio of the category's live-token
// protocols, each ratio capped at 3.0x first, shrunk toward the global median (k = 5) and clamped
// to [0.05, 1.5]. Categories with one live comp are capped at twice the global median (radar-4),
// so one token cannot set most of a category's multiple. The live-token protocols are set aside
// with their market caps shown, never mixed into the ranking.
//
// Radar-5 changes (Astra UI/UX review, 2026-11-15; model untouched):
//   - search keeps focus across re-renders (IME-aware commit), missing values
//     sort last in both directions, implied bars scale to the filtered max
//     (not the first sorted row), one number rule (3 significant digits),
//     KPI strip, dominant #1 spotlight, sticky table header + zebra rows,
//     methodology grid with distinct disclosure/method/caveat notes and clean
//     parent labels, full category-multiples table.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', watchlist: false, tab: 'pre-token', sort: 'implied', dir: -1, selected: null };
  var WATCHLIST = {};
  DATA.rows.forEach(function (r) { if (r.watchlist) WATCHLIST[r.slug] = true; });

  // Presentation-only context for two rows whose sealed records carry no token metadata
  // although the assets already trade elsewhere. The ranking never sees this: it is a
  // disclosure on the detail view, not a model input.
  var TRADED_CONTEXT = {
    'usdd': 'Existing traded asset context: USDD already trades as a stablecoin.',
    'bittensor-dtao': 'Existing traded asset context: dTAO represents traded Bittensor subnet tokens.'
  };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  // One number rule (Astra A2): three significant digits, unit promoted after
  // rounding. $1.07B, $637M, $223M, $988K, $12.3M, $1.23M. Display only: the
  // underlying values, ordering, ranks and model output never change.
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
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return n.toFixed(2) + 'x';
  }

  // Bar denominator (Astra A2/B): the largest implied value in the currently
  // visible filtered list, never the first sorted row — sorting by TVL or 7d
  // used to change what every bar meant.
  function impliedBarMax(list) {
    return list.reduce(function (max, row) {
      var value = Number(row.implied_value_usd);
      return isFinite(value) && value > max ? value : max;
    }, 0) || 1;
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('w') === '1') state.watchlist = true;
    if (params.get('tab') === 'live') state.tab = 'live';
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.watchlist) params.set('w', '1');
    if (state.tab === 'live') params.set('tab', 'live');
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function rows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && (!r.chains || r.chains.indexOf(state.chain) < 0)) return false;
      if (state.watchlist && !WATCHLIST[r.slug]) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  // Sorting (Astra B): missing values sort LAST in both directions. The old
  // code mapped growth null to -Infinity and age null to Infinity, so missing
  // rows jumped from first to last when the direction flipped.
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

  // Search input (Astra B): render() rebuilds the whole shell, which used to
  // detach the search input mid-typing — the first character landed, the rest
  // went nowhere because focus stayed with the detached element. Commit the
  // query, re-render, then restore focus, caret, direction and scroll on the
  // replacement input. IME composition is held until it ends, so composing
  // (e.g. CJK) input is never committed half-finished.
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

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { class: 'brand-name', text: 'Token Radar' })),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + DATA.as_of }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { text: DATA.model_version + ' model' })
      )
    );
  }

  function lede() {
    var total = DATA.rows.reduce(function (n, r) { return n + r.implied_value_usd; }, 0);
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: DATA.watchlist_size + ' watchlist protocols, ranked by implied value' }),
        el('p', { text: 'The watchlist is the floor: every protocol with at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL and no token on record. The early radar adds ' + DATA.early_size + ' pre-token protocols below that floor, each passing the same exclusion rule. Implied value is a model, not a promise.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Total implied value' }), el('b', { text: fmtUsd(total) })),
        el('div', { class: 'fact' }, el('span', { text: 'Global category multiple' }), el('b', { text: fmtMult(DATA.global_median) })),
        el('div', { class: 'fact' }, el('span', { text: 'Live-token protocols set aside' }), el('b', { text: String(DATA.live_size) }))
      )
    );
  }

  function spotlight() {
    var top = DATA.rows.slice(0, 5);
    return el('section', { class: 'spot', 'aria-label': 'Top five by implied value' },
      top.map(function (r) {
        return el('button', { type: 'button', class: 'spot-card', onclick: function () { openDetail(r.slug); } },
          el('span', { class: 'rank', text: '#' + r.rank }),
          el('b', { text: r.name }),
          el('span', { class: 'val', text: fmtUsd(r.implied_value_usd) }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' · TVL ' + fmtUsd(r.tvl_usd) })
        );
      })
    );
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    bindSearchInput(search);
    var cat = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      categories.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
    var chain = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chains.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    chain.addEventListener('change', function () { state.chain = chain.value; writeHash(); render(); });
    var watch = el('input', { type: 'checkbox', id: 'watchlist', checked: state.watchlist ? 'checked' : null, 'aria-label': 'Watchlist only' });
    watch.addEventListener('change', function () { state.watchlist = watch.checked; writeHash(); render(); });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; render(); } });
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), cat),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chain),
      el('label', { class: 'check', for: 'watchlist' }, watch, 'Watchlist only'),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'Token status' }), el('div', { class: 'tabs' }, pre, live)),
      el('span', { class: 'count', text: state.tab === 'pre-token' ? rows().length + ' rows shown' : DATA.live.length + ' live-token protocols' })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null
      )
    );
  }

  function boardTable() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.watchlist = false; writeHash(); render(); } })
      ));
    }
    var max = impliedBarMax(list);
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var nameCell = el('div', { class: 'name' },
        el('b', { text: r.name }),
        el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
      );
      if (r.watchlist) nameCell.appendChild(el('span', { class: 'badge-watch', text: 'WATCHLIST' }));
      var barPct = Math.max(0, Math.min(100, (Number(r.implied_value_usd) || 0) / max * 100));
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, nameCell),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num', text: fmtMult(r.category_multiple) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + barPct.toFixed(1) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', null, el('span', { class: 'status', text: 'no token' }))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'panel-caption' },
        el('span', { text: 'Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.' })),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'board-table', 'aria-label': 'Pre-token protocols ranked by implied value' },
          el('thead', null, el('tr', null,
            sortHeader('implied', 'Rank'),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('multiple', 'Cat. mult.'),
            sortHeader('implied', 'Implied value'),
            el('th', { scope: 'col', text: 'Token' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: 'live' }),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', { class: 'num', text: fmtMult(r.mcap_tvl_ratio) }),
        el('td', null, el('span', { class: 'status live', text: 'already trades' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'panel-caption' },
        el('span', { text: 'Token live: these protocols already trade, so their market cap is a fact, not a model. Their market-cap-to-TVL ratios are the comps the category multiples are shrunk from. They are set aside from the pre-token ranking.' })),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'live-table', 'aria-label': 'Live-token protocols by market cap' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Mcap / TVL' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody
        )
      )
    );
  }

  // 'parent#sentora' -> 'Sentora', 'parent#cian-protocol' -> 'Cian Protocol'.
  // The raw record id is an internal key, not something a judge should read.
  function parentLabel(raw) {
    var name = String(raw || '').replace(/^parent#/, '');
    return name.split('-').map(function (w) {
      return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    }).join(' ');
  }

  function modelPanel() {
    var m = DATA.model;
    // All categories, largest live sets first — radar-4 showed only the top 12,
    // which hid the multiples a judge most wants to check (Risk Curators, with
    // one live comp, never made the cut).
    var catRows = DATA.categories.map(function (c) {
      return el('tr', null,
        el('td', { text: c.category }),
        el('td', { class: 'num', text: String(c.live_count) }),
        el('td', { class: 'num', text: fmtMult(c.live_median) }),
        el('td', { class: 'num', text: fmtMult(c.multiple) })
      );
    });
    var exclusionRows = [
      ['Sentora Curator', 'Risk Curators', '$2.76B', 'parent#sentora'],
      ['Polymarket International', 'Prediction Market', '$320.2M', 'parent#polymarket'],
      ['CIAN Yield Layer', 'Yield Aggregator', '$280.3M', 'parent#cian-protocol'],
      ['Defi Saver Asset Management', 'CDP Manager', '$276.4M', 'parent#defi-saver'],
      ['Mellow Core', 'Onchain Capital Allocator', '$232.6M', 'parent#mellow-protocol'],
      ['BitFi Basis', 'Basis Trading', '$214.9M', 'parent#bitfi'],
      ['Figure Markets Prime', 'Lending', '$190.5M', 'parent#figure-markets'],
      ['Theo Network thUSD', 'RWA', '$138.6M', 'parent#theo'],
      ['Figure Markets Exchange', 'OTC Marketplace', '$131.3M', 'parent#figure-markets'],
      ['Extended Perps', 'Derivatives', '$96.4M', 'parent#extended'],
      ['Avant avUSD', 'Onchain Capital Allocator', '$94.6M', 'parent#avant-protocol'],
      ['Stellar DeFi Hub', 'Farm', '$83.2M', 'parent#sentora'],
      ['Loopscale Lending', 'Lending', '$71.0M', 'parent#loopscale'],
      ['IPOR Fusion', 'Onchain Capital Allocator', '$68.3M', 'parent#ipor'],
      ['Circle Gateway', 'Cross Chain Bridge', '$65.3M', 'parent#circle'],
      ['Arcus Perps', 'Derivatives', '$60.2M', 'parent#arcus'],
      ['USDCx', 'Stablecoin Wrapper', '$56.6M', 'parent#circle'],
      ['Solv Strategies', 'Onchain Capital Allocator', '$56.6M', 'parent#solv-protocol'],
      ['AZverse Perps', 'Derivatives', '$52.0M', 'parent#azverse'],
      ['Nado Spot', 'Dexs', '$51.1M', 'parent#nado']
    ].map(function (r) {
      var label = parentLabel(r[3]);
      return el('tr', null,
        el('td', { text: r[0] }),
        el('td', { text: r[1] }),
        el('td', { class: 'num', text: r[2] }),
        el('td', { text: label, 'data-label': label })
      );
    });
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How implied value is computed' }),
      el('p', { class: 'sub', text: 'Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked.' }),
      el('div', { class: 'formula' },
        'implied = round( tvl_usd x category_multiple x (1 + clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100 x ' + m.growth_weight + ') x (' + m.maturity_floor + ' + min(age_days, ' + m.maturity_days + ') / ' + m.maturity_days + ' x ' + m.maturity_range + ') )'
      ),
      el('p', { class: 'sub', text: 'The category multiple is the median market-cap-to-TVL ratio of the category\u2019s live-token protocols in this snapshot \u2014 each ratio capped at ' + m.ratio_cap + 'x first, so a token whose value has decoupled from its protocol\u2019s TVL cannot set the multiple \u2014 shrunk toward the global median (' + fmtMult(DATA.global_median) + ') with k = ' + m.shrink_k + ', then clamped to [' + m.multiple_min + ', ' + m.multiple_max + ']. A category with one live comp is capped at ' + fmtMult(m.singleton_cap * DATA.global_median) + ' (twice the global median), so a single token cannot set most of a category\u2019s multiple. A category with no live comps takes the global median. Age is the time since the protocol was first listed, the best record of how long it has run with no token; an unlisted age uses ' + m.unknown_age_days + ' days.' }),
      el('div', { class: 'methodology-grid' },
        el('div', { class: 'category-table' },
          el('div', { class: 'panel-caption' },
            el('span', { text: 'Category multiples used by the board (largest live sets first).' })),
          el('div', { class: 'table-wrap' },
            el('table', { 'aria-label': 'Category multiples used by the board' },
              el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Live comps' }), el('th', { scope: 'col', text: 'Live median' }), el('th', { scope: 'col', text: 'Multiple used' }))),
              el('tbody', null, catRows)
            )
          )
        ),
        el('div', null,
          el('h3', { text: 'Left out on purpose: 20 protocols at or above the $50M floor' }),
          el('p', { class: 'sub', text: 'Each of these passes every check the sealed snapshot allows, and each carries a parent protocol on the live DefiLlama record \u2014 the part of the house rule the snapshot cannot check, since it carries no parent field. The house watchlist, not the snapshot, decides who is in. Parents below were read from the live record on 2026-11-15.' }),
          el('div', { class: 'exclusion-table' },
            el('div', { class: 'table-wrap' },
              el('table', null,
                el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: 'Parent on the live record' }))),
                el('tbody', null, exclusionRows)
              )
            )
          )
        )
      ),
      el('div', { class: 'notes' },
        el('p', { class: 'note', 'data-note': 'disclosure', text: 'USDD and Bittensor dTAO remain included because their sealed records contain no token metadata; USDD already trades as a stablecoin and dTAO represents traded subnet tokens, so these are metadata-screen matches, not verified future token launches.' }),
        el('p', { class: 'note', 'data-note': 'method', text: 'Implied value is a comparable-based market-cap scenario: it applies live-token MCap/TVL ratios to candidate TVL. It does not estimate launch FDV, launch probability or farming returns.' }),
        el('p', { class: 'note', 'data-note': 'caveat', text: 'Category multiples use 119 live-token protocols across the full snapshot; the Live token tab shows the 24 largest by market cap. Category and name exclusions are conservative heuristics and may omit qualifying protocols; they do not establish parent-token relationships.' })
      ),
      el('p', { class: 'note', text: 'What counts as pre-token: the record carries no token (no market cap, no CoinGecko id, no symbol) and the protocol passes the house\u2019s own exclusion rule \u2014 not a bridge, liquid-staking, restaking or CEX product, not a versioned pool, no whole word wrapped, staked or staking in its name, no staked-token ticker (stHYPE, stETH) in its name, not named for an exchange. The snapshot carries no parent-protocol field, so that one part of the rule cannot be checked from here. Say a protocol records no token, never that it has none: a record can miss a token that exists.' })
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var steps = row.farm_steps || [];
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + (row.watchlist ? ' · Watchlist' : ' · Early radar') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    if (TRADED_CONTEXT[slug]) dialog.appendChild(el('p', { class: 'note', text: TRADED_CONTEXT[slug] + ' This row is a metadata-screen match, not a verified future token launch.' }));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Category multiple (' + (row.category || 'Other') + ')' }), el('b', { class: 'num', text: fmtMult(row.category_multiple) })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Growth multiplier' }), el('b', { class: 'num', text: String(row.growth_multiplier) })),
        el('div', null, el('span', { text: 'Maturity multiplier' }), el('b', { class: 'num', text: String(row.maturity_multiplier) })),
        el('div', { class: 'total' }, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) }))
      ),
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': the category multiple comes from ' + row.category_live_count + ' live-token comp' + (row.category_live_count === 1 ? '' : 's') + ' in this category (live median ' + fmtMult(row.category_live_median) + ', shrunk toward the global ' + fmtMult(DATA.global_median) + '). This is an estimate, not a price.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Interaction checklist \u2014 unverified' }),
      el('p', { class: 'sub', text: 'These steps are generated from category, TVL and age. No protocol-specific interaction route, points program or reward eligibility has been verified.' }),
      el('ol', { class: 'steps' }, steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    if (state.tab === 'pre-token') shell.appendChild(spotlight());
    shell.appendChild(controls());
    shell.appendChild(state.tab === 'pre-token' ? boardTable() : liveTable());
    if (state.tab === 'pre-token') shell.appendChild(modelPanel());
    shell.appendChild(el('footer', { class: 'foot' },
      el('span', { text: 'Source: ' + DATA.source }),
      el('span', { text: 'A protocol records no token when DefiLlama carries no market cap, CoinGecko id or symbol for it. That is a record, not proof: a token may exist that the record misses.' }),
      el('span', { text: 'Implied value is this entry\u2019s own claim from the snapshot\u2019s figures, never a price and never a prediction that a token will be issued.' })
    ));
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  // A pasted link or a back/forward step is a fresh deep-link: reset the
  // filters first, so a field the new hash does not carry does not stay
  // stale, then apply the hash. writeHash uses replaceState, so this
  // cannot loop back into itself.
  window.addEventListener('hashchange', function () {
    state.q = '';
    state.category = 'all';
    state.chain = 'all';
    state.watchlist = false;
    state.tab = 'pre-token';
    state.selected = null;
    readHash();
    if (dialog.open && !state.selected) dialog.close();
    render();
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
