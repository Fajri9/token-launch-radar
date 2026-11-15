I’m treating this as a CSS-only replacement. I’ll preserve the current selectors and make the existing facts block function as the KPI strip, while adding optional hook selectors for visual distinctions that CSS cannot infer reliably from content, especially the USDD/dTAO disclosure and methodology table variants.## VERDICT

The current CSS is a competent dark table skin. It is not yet a flagship analytics interface because the visual hierarchy is flat, the facts remain secondary to the headline, the controls depend on accidental flex wrapping, and the table loses operational context during scroll.

The replacement below keeps the existing class names and file structure. It adds:

- A five-cell KPI strip using the existing `.facts` and `.fact` elements.
- A dominant #1 spotlight card with scaled-down supporting cards.
- A vertically scrollable table viewport with a sticky header, zebra rows, stronger hover state, and compact responsive columns.
- A deterministic control grid that remains usable at 820px.
- A drawer with scannable equation rows and numbered farm steps.
- A methodology layout with a formula block, distinct disclosure treatment, compact tables, and optional clean labels for exclusion rows.
- Existing keyboard focus, reduced-motion handling, dark theme, and responsive behavior.

CSS cannot change number formatting or remove `parent#` from text nodes. The exact optional hooks required for those content-level changes are listed after the patch.

## EVIDENCE

The current stylesheet has four structural weaknesses:

1. `.facts` is inside the two-column `.lede`, so the five key numbers are visually subordinate to the headline and paragraph.
2. `.controls` uses `display: flex` with unconstrained children. At 820px, the browser decides the line breaks and produces an unstable control hierarchy.
3. `.table-wrap` only handles horizontal overflow. The header has no sticky positioning, and every row has the same visual weight.
4. `.spot-card`, `.note`, `.equation`, and `.steps` have nearly identical visual density. The #1 result, the USDD/dTAO disclosure, and the farm actions do not receive the emphasis their decision value requires.

## EXACT PATCH TEXT

Replace `dashboard/app.css` completely with:

```css
/* Token Radar flagship console
   Offline, zero-dependency, dark analytics interface. */

:root {
  --canvas: #0b1015;
  --canvas-raised: #0f151c;
  --surface: #131b24;
  --surface-raised: #18232e;
  --surface-strong: #1d2b38;

  --ink: #edf3f6;
  --ink-soft: #c5d0d7;
  --muted: #8d9ba7;
  --faint: #63727e;

  --border: #273541;
  --border-strong: #344654;
  --border-soft: rgba(141, 155, 167, 0.14);

  --accent: #f0b429;
  --accent-bright: #ffd166;
  --accent-ink: #171107;
  --accent-wash: rgba(240, 180, 41, 0.1);
  --accent-wash-strong: rgba(240, 180, 41, 0.16);

  --positive: #45c79a;
  --positive-wash: rgba(69, 199, 154, 0.11);
  --negative: #ef6268;
  --negative-wash: rgba(239, 98, 104, 0.1);
  --info: #72a9d8;
  --info-wash: rgba(114, 169, 216, 0.1);

  --radius-control: 7px;
  --radius-panel: 12px;
  --radius-card: 10px;

  --font-body: system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-num: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --step-1: 4px;
  --step-2: 8px;
  --step-3: 12px;
  --step-4: 16px;
  --step-5: 24px;
  --step-6: 32px;
  --step-7: 48px;

  --shadow-panel:
    0 16px 40px rgba(0, 0, 0, 0.16),
    0 1px 0 rgba(255, 255, 255, 0.025) inset;
  --shadow-drawer:
    -20px 0 60px rgba(0, 0, 0, 0.34),
    0 1px 0 rgba(255, 255, 255, 0.025) inset;
}

* {
  box-sizing: border-box;
}

html {
  color-scheme: dark;
  background: var(--canvas);
  scrollbar-color: var(--border-strong) var(--canvas);
}

body {
  margin: 0;
  background:
    linear-gradient(180deg, rgba(24, 35, 46, 0.34) 0, transparent 300px),
    var(--canvas);
  color: var(--ink);
  font: 400 14px/1.5 var(--font-body);
  text-wrap: pretty;
}

h1,
h2,
h3 {
  margin: 0;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

h1 {
  max-width: 760px;
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.08;
  font-weight: 680;
}

h2 {
  font-size: 19px;
  line-height: 1.2;
  font-weight: 670;
}

h3 {
  font-size: 15px;
  line-height: 1.25;
  font-weight: 650;
}

p {
  margin: 0;
}

button,
input,
select {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
}

button,
input,
select {
  -webkit-tap-highlight-color: transparent;
}

a {
  color: var(--accent-bright);
}

.skip {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 20;
  padding: var(--step-2) var(--step-4);
  background: var(--surface-strong);
  border: 1px solid var(--border-strong);
  color: var(--ink);
}

.skip:focus {
  left: var(--step-4);
  top: var(--step-4);
}

:focus-visible {
  outline: 2px solid var(--accent-bright);
  outline-offset: 3px;
}

/* Page frame */

.shell {
  width: min(100% - 48px, 1440px);
  margin: 0 auto;
  padding: var(--step-5) 0 var(--step-7);
}

/* Header */

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--step-5);
  padding-bottom: var(--step-4);
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--step-3);
}

.mark {
  width: 10px;
  height: 10px;
  flex: none;
  border-radius: 50%;
  background: var(--accent);
  box-shadow:
    0 0 0 4px rgba(240, 180, 41, 0.16),
    0 0 18px rgba(240, 180, 41, 0.3);
}

.brand-name {
  color: var(--muted);
  font-family: var(--font-num);
  font-size: 12px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.top-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px 16px;
  color: var(--muted);
  font-family: var(--font-num);
  font-size: 11px;
  line-height: 1.4;
  text-align: right;
}

.top-meta span {
  white-space: nowrap;
}

.top-meta span + span {
  position: relative;
}

.top-meta span + span::before {
  content: "";
  position: absolute;
  left: -9px;
  top: 50%;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--faint);
  transform: translateY(-50%);
}

/* Headline and KPI strip */

.lede {
  display: block;
  padding: var(--step-6) 0 var(--step-5);
}

.lede > p {
  max-width: 74ch;
  margin-top: var(--step-3);
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.facts {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  margin-top: var(--step-6);
  padding: 1px;
  border: 1px solid var(--border);
  border-radius: var(--radius-panel);
  background: var(--border);
  box-shadow: var(--shadow-panel);
}

.fact {
  display: grid;
  align-content: center;
  min-height: 82px;
  gap: 5px;
  padding: var(--step-3) var(--step-4);
  background: var(--surface);
}

.fact:first-child {
  border-radius: calc(var(--radius-panel) - 1px) 0 0 calc(var(--radius-panel) - 1px);
}

.fact:last-child {
  border-radius: 0 calc(var(--radius-panel) - 1px) calc(var(--radius-panel) - 1px) 0;
}

.fact b {
  display: block;
  color: var(--ink);
  font-family: var(--font-num);
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.04em;
  white-space: nowrap;
}

.fact span {
  display: block;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.25;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.fact:nth-child(3) {
  position: relative;
  background:
    linear-gradient(135deg, rgba(240, 180, 41, 0.13), transparent 72%),
    var(--surface-raised);
}

.fact:nth-child(3)::before {
  content: "";
  position: absolute;
  left: 0;
  top: 16px;
  bottom: 16px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent);
}

.fact:nth-child(3) b {
  color: var(--accent-bright);
  font-size: 21px;
}

/* Top five */

.spot {
  display: grid;
  grid-template-columns: 2fr repeat(4, minmax(0, 1fr));
  gap: var(--step-3);
  margin-bottom: var(--step-5);
}

.spot-card {
  position: relative;
  display: grid;
  align-content: start;
  min-width: 0;
  min-height: 148px;
  gap: var(--step-2);
  padding: var(--step-4);
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.025), transparent 55%),
    var(--surface);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  text-align: left;
  transition:
    border-color 140ms ease,
    background 140ms ease,
    transform 140ms ease;
}

.spot-card::after {
  content: "";
  position: absolute;
  right: -26px;
  bottom: -34px;
  width: 110px;
  height: 110px;
  border: 1px solid rgba(240, 180, 41, 0.12);
  border-radius: 50%;
  box-shadow: 0 0 0 18px rgba(240, 180, 41, 0.025);
  pointer-events: none;
}

.spot-card:hover {
  border-color: var(--border-strong);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.04), transparent 55%),
    var(--surface-raised);
  transform: translateY(-1px);
}

.spot-card:focus-visible {
  border-color: var(--accent);
}

.spot-card:first-child {
  min-height: 174px;
  padding: var(--step-5);
  border-color: rgba(240, 180, 41, 0.46);
  background:
    linear-gradient(135deg, rgba(240, 180, 41, 0.17), transparent 54%),
    var(--surface-raised);
  box-shadow:
    0 14px 36px rgba(0, 0, 0, 0.18),
    0 0 0 1px rgba(240, 180, 41, 0.06) inset;
}

.spot-card .rank {
  color: var(--accent-bright);
  font-family: var(--font-num);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.09em;
}

.spot-card:first-child .rank {
  font-size: 12px;
}

.spot-card b {
  max-width: 18ch;
  overflow: hidden;
  color: var(--ink);
  font-size: 15px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spot-card:first-child b {
  max-width: 24ch;
  font-size: 19px;
}

.spot-card .val {
  color: var(--ink-soft);
  font-family: var(--font-num);
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.045em;
  white-space: nowrap;
}

.spot-card:first-child .val {
  color: var(--accent-bright);
  font-size: 29px;
  line-height: 1.05;
}

.spot-card .sub {
  max-width: 28ch;
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Controls */

.controls {
  display: grid;
  grid-template-columns:
    minmax(240px, 1.8fr)
    minmax(145px, 1fr)
    minmax(145px, 1fr)
    auto
    auto
    auto;
  align-items: end;
  gap: var(--step-3);
  padding: var(--step-4) 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.field {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.field label {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.field input,
.field select {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  padding: 0 var(--step-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  outline: 0;
  background: var(--surface);
  color: var(--ink);
  transition:
    border-color 140ms ease,
    background 140ms ease,
    box-shadow 140ms ease;
}

.field input::placeholder {
  color: var(--faint);
}

.field input:hover,
.field select:hover {
  border-color: var(--border-strong);
  background: var(--surface-raised);
}

.field input:focus,
.field select:focus {
  border-color: var(--accent);
  background: var(--surface-raised);
  box-shadow: 0 0 0 3px var(--accent-wash);
}

.check {
  display: flex;
  align-items: center;
  min-height: 38px;
  gap: var(--step-2);
  color: var(--ink-soft);
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.check input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--accent);
}

.check:hover {
  color: var(--ink);
}

.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 38px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface);
}

.tabs button {
  min-height: 30px;
  padding: 0 11px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
  transition:
    background 140ms ease,
    color 140ms ease;
}

.tabs button:hover {
  color: var(--ink);
  background: var(--surface-raised);
}

.tabs button[aria-pressed="true"] {
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 700;
}

.count {
  align-self: center;
  justify-self: end;
  color: var(--muted);
  font-family: var(--font-num);
  font-size: 11px;
  white-space: nowrap;
}

/* Table */

.panel {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-panel);
  background: var(--surface);
  box-shadow: var(--shadow-panel);
}

.panel-caption,
.caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--step-4);
  padding: var(--step-4) var(--step-5);
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
}

.table-wrap {
  max-height: min(68vh, 680px);
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--border-strong) var(--surface);
}

table {
  width: 100%;
  min-width: 930px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
}

th,
td {
  padding: 11px var(--step-3);
  border-bottom: 1px solid var(--border-soft);
  text-align: left;
  vertical-align: middle;
}

th {
  position: sticky;
  top: 0;
  z-index: 3;
  color: var(--muted);
  background: var(--surface-strong);
  box-shadow: 0 1px 0 var(--border-strong);
  font-family: var(--font-num);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
}

th button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
}

th button:hover {
  color: var(--ink);
}

tbody tr {
  cursor: pointer;
  transition: background 100ms ease;
}

tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.018);
}

tbody tr:hover {
  background: var(--surface-raised);
}

tbody tr[data-selected="true"] {
  background:
    linear-gradient(90deg, rgba(240, 180, 41, 0.12), transparent 70%),
    var(--surface-raised);
  box-shadow: inset 2px 0 0 var(--accent);
}

tbody tr:last-child td {
  border-bottom: 0;
}

.num {
  color: var(--ink-soft);
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums lining-nums;
  white-space: nowrap;
}

.name {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.name b {
  overflow: hidden;
  color: var(--ink);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
}

.pos {
  color: var(--positive);
}

.neg {
  color: var(--negative);
}

.bar {
  width: 108px;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--border-strong);
}

.bar i {
  display: block;
  height: 100%;
  min-width: 2px;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-bright));
  box-shadow: 0 0 10px rgba(240, 180, 41, 0.26);
}

.implied {
  display: flex;
  align-items: center;
  min-width: 178px;
  gap: var(--step-2);
}

.implied .num {
  color: var(--ink);
  font-weight: 600;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}

.status::before {
  content: "";
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(240, 180, 41, 0.1);
}

.status.live::before {
  background: var(--positive);
  box-shadow: 0 0 0 3px rgba(69, 199, 154, 0.1);
}

.badge-watch {
  display: inline-block;
  justify-self: start;
  margin-left: 5px;
  padding: 2px 6px;
  border: 1px solid rgba(240, 180, 41, 0.62);
  border-radius: 999px;
  color: var(--accent-bright);
  font-family: var(--font-num);
  font-size: 9px;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
  vertical-align: 1px;
}

/* Empty state */

.empty {
  display: grid;
  justify-items: center;
  gap: var(--step-3);
  padding: var(--step-7) var(--step-5);
  text-align: center;
}

.empty p {
  max-width: 42ch;
  color: var(--muted);
}

/* Methodology */

.model {
  display: grid;
  gap: var(--step-4);
  margin-top: var(--step-5);
  padding: var(--step-5);
  border: 1px solid var(--border);
  border-radius: var(--radius-panel);
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.02), transparent 45%),
    var(--surface);
  box-shadow: var(--shadow-panel);
}

.model h2 {
  margin-bottom: calc(var(--step-1) * -1);
}

.model > p {
  max-width: 82ch;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
}

.formula {
  max-width: 100%;
  overflow-x: auto;
  padding: var(--step-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
  background:
    linear-gradient(90deg, rgba(240, 180, 41, 0.08), transparent 40%),
    var(--canvas-raised);
  color: var(--accent-bright);
  font-family: var(--font-num);
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  scrollbar-color: var(--border-strong) var(--canvas-raised);
}

.formula::before {
  content: "MODEL";
  display: block;
  margin-bottom: var(--step-2);
  color: var(--faint);
  font-size: 9px;
  letter-spacing: 0.12em;
}

.model table {
  width: 100%;
  min-width: 0;
  font-size: 12px;
}

.model th,
.model td {
  padding: 9px var(--step-3);
}

.model th {
  position: static;
  background: var(--surface-raised);
  box-shadow: none;
  font-size: 10px;
}

.model tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.018);
}

.model tbody tr:hover {
  background: var(--surface-raised);
}

/* Optional methodology layout hooks */

.methodology-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.92fr);
  gap: var(--step-4);
  align-items: start;
}

.methodology-grid > * {
  min-width: 0;
}

.category-table,
.exclusion-table {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--canvas-raised);
}

.category-table table,
.exclusion-table table {
  margin: 0;
}

.exclusion-table td:first-child {
  color: var(--ink-soft);
  font-family: var(--font-num);
  font-size: 11px;
}

/*
  If an exclusion cell receives data-label="sentora" or class="parent-id",
  the raw parent# prefix is visually removed by the content hook below.
  CSS cannot strip characters from a text node by itself.
*/
.exclusion-table td[data-label] {
  font-size: 0;
}

.exclusion-table td[data-label]::after {
  content: attr(data-label);
  color: var(--ink-soft);
  font-family: var(--font-body);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.notes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--step-3);
}

.note {
  min-height: 100%;
  padding: var(--step-3) var(--step-4);
  border: 1px solid var(--border);
  border-left: 3px solid var(--border-strong);
  border-radius: 0 var(--radius-control) var(--radius-control) 0;
  background: var(--canvas-raised);
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.note--method,
.note[data-note="method"] {
  border-left-color: var(--info);
  background:
    linear-gradient(135deg, var(--info-wash), transparent 70%),
    var(--canvas-raised);
}

.note--caveat,
.note[data-note="caveat"] {
  border-left-color: var(--faint);
}

.note--disclosure,
.note[data-note="disclosure"] {
  grid-column: 1 / -1;
  padding: var(--step-4) var(--step-5);
  border-color: rgba(240, 180, 41, 0.44);
  border-left: 4px solid var(--accent);
  background:
    linear-gradient(110deg, var(--accent-wash-strong), transparent 68%),
    var(--surface-raised);
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.55;
}

.note--disclosure::before,
.note[data-note="disclosure"]::before {
  content: "DISCLOSURE";
  display: block;
  margin-bottom: var(--step-1);
  color: var(--accent-bright);
  font-family: var(--font-num);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

/* Drawer */

.detail {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  width: min(600px, 100vw);
  max-height: 100%;
  margin: 0 0 0 auto;
  padding: var(--step-5);
  overflow-y: auto;
  border: 0;
  border-left: 1px solid var(--border-strong);
  border-radius: 0;
  background:
    linear-gradient(180deg, rgba(24, 35, 46, 0.48), transparent 280px),
    var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-drawer);
  scrollbar-color: var(--border-strong) var(--surface);
}

.detail::backdrop {
  background: rgba(3, 7, 11, 0.72);
  backdrop-filter: blur(2px);
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--step-4);
  padding-bottom: var(--step-4);
  border-bottom: 1px solid var(--border);
}

.detail-head > div {
  min-width: 0;
}

.detail-head .sub {
  overflow-wrap: anywhere;
}

.detail h2 {
  margin-top: var(--step-1);
  font-size: 27px;
  line-height: 1.08;
}

.detail .sub {
  margin-top: 5px;
}

.close {
  flex: none;
  min-width: 36px;
  min-height: 34px;
  padding: 0 var(--step-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface-raised);
  color: var(--ink-soft);
  font-family: var(--font-num);
  font-size: 11px;
  transition:
    border-color 140ms ease,
    color 140ms ease,
    background 140ms ease;
}

.close:hover {
  border-color: var(--accent);
  background: var(--accent-wash);
  color: var(--accent-bright);
}

.detail-section {
  margin-top: var(--step-5);
  padding-top: var(--step-4);
  border-top: 1px solid var(--border);
}

.detail-section h3 {
  margin-bottom: var(--step-3);
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.equation {
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--border);
  font-family: var(--font-num);
  font-size: 12px;
}

.equation div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--step-4);
  padding: 10px var(--step-3);
  background: var(--surface-raised);
}

.equation span {
  min-width: 0;
  color: var(--muted);
  line-height: 1.35;
}

.equation div > b {
  color: var(--ink-soft);
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
}

.equation .total {
  margin-top: 1px;
  padding-top: 13px;
  padding-bottom: 13px;
  background:
    linear-gradient(90deg, var(--accent-wash), transparent 74%),
    var(--surface-strong);
}

.equation .total span {
  color: var(--ink-soft);
  font-weight: 600;
}

.equation .total b {
  color: var(--accent-bright);
  font-size: 18px;
  font-weight: 700;
}

.equation + .sub,
.equation-note,
.detail-section > .sub {
  max-width: 62ch;
  margin-top: var(--step-3);
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}

/* Farm plan */

.steps {
  display: grid;
  gap: var(--step-2);
  margin: 0;
  padding: 0;
  counter-reset: farm-step;
  list-style: none;
}

.steps li {
  position: relative;
  min-height: 54px;
  padding: 10px var(--step-3) 10px 46px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface-raised);
  color: var(--ink-soft);
  line-height: 1.42;
}

.steps li::before {
  content: counter(farm-step, decimal-leading-zero);
  position: absolute;
  left: 13px;
  top: 12px;
  width: 23px;
  height: 23px;
  counter-increment: farm-step;
  border: 1px solid rgba(240, 180, 41, 0.48);
  border-radius: 50%;
  color: var(--accent-bright);
  font-family: var(--font-num);
  font-size: 9px;
  line-height: 21px;
  text-align: center;
}

.steps li:hover {
  border-color: var(--border-strong);
  background: var(--surface-strong);
}

.steps b {
  display: block;
  margin-bottom: 3px;
  color: var(--ink);
  font-weight: 600;
}

.cost {
  display: inline-flex;
  align-items: center;
  margin-top: 4px;
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--canvas-raised);
  color: var(--muted);
  font-family: var(--font-num);
  font-size: 10px;
  line-height: 1.35;
}

.foot {
  display: grid;
  gap: 3px;
  margin-top: var(--step-5);
  color: var(--faint);
  font-size: 11px;
  line-height: 1.4;
}

/* Buttons and utility controls */

.button {
  min-height: 36px;
  padding: 0 var(--step-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface-raised);
  color: var(--ink);
  transition:
    border-color 140ms ease,
    background 140ms ease;
}

.button:hover {
  border-color: var(--border-strong);
  background: var(--surface-strong);
}

.button.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 700;
}

.button.primary:hover {
  border-color: var(--accent-bright);
  background: var(--accent-bright);
}

/* Tablet layout */

@media (max-width: 1180px) {
  .controls {
    grid-template-columns:
      minmax(0, 1.55fr)
      minmax(0, 1fr)
      minmax(0, 1fr)
      auto
      auto;
  }

  .count {
    grid-column: 1 / -1;
    justify-self: end;
    padding-top: 2px;
  }
}

@media (max-width: 980px) {
  .shell {
    width: min(100% - 32px, 760px);
    padding-top: var(--step-4);
  }

  .top {
    align-items: flex-start;
  }

  .lede {
    padding-top: var(--step-5);
  }

  .facts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .fact:first-child {
    border-radius: calc(var(--radius-panel) - 1px) 0 0 0;
  }

  .fact:nth-child(3) {
    border-radius: 0 calc(var(--radius-panel) - 1px) 0 0;
  }

  .fact:nth-child(4) {
    border-radius: 0 0 0 calc(var(--radius-panel) - 1px);
  }

  .fact:last-child {
    border-radius: 0 0 calc(var(--radius-panel) - 1px) 0;
  }

  .spot {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .spot-card:first-child {
    grid-column: 1 / -1;
    min-height: 158px;
  }

  .controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;
  }

  .controls > .field:first-child {
    grid-column: 1 / -1;
  }

  .controls .check {
    justify-self: start;
  }

  .count {
    grid-column: 1 / -1;
  }

  .table-wrap {
    max-height: 64vh;
  }

  table {
    min-width: 0;
  }

  /* Preserve the implied-value and token columns at tablet widths. */
  table th:nth-child(5),
  table td:nth-child(5),
  table th:nth-child(6),
  table td:nth-child(6) {
    display: none;
  }

  .implied {
    min-width: 154px;
  }

  .bar {
    width: 74px;
  }

  .methodology-grid,
  .notes {
    grid-template-columns: 1fr;
  }

  .note--disclosure,
  .note[data-note="disclosure"] {
    grid-column: auto;
  }
}

@media (max-width: 720px) {
  .shell {
    width: min(100% - 24px, 600px);
  }

  .top {
    display: grid;
    gap: var(--step-3);
  }

  .top-meta {
    justify-content: flex-start;
    text-align: left;
  }

  .top-meta span + span::before {
    display: none;
  }

  h1 {
    font-size: 29px;
  }

  .facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fact:first-child,
  .fact:nth-child(3),
  .fact:nth-child(4),
  .fact:last-child {
    border-radius: 0;
  }

  .fact:nth-child(5) {
    border-radius: 0 0 calc(var(--radius-panel) - 1px) 0;
  }

  .fact:nth-child(4) {
    border-radius: 0 0 0 calc(var(--radius-panel) - 1px);
  }

  .fact:nth-child(3) {
    grid-column: 1 / -1;
    border-radius: 0;
  }

  .spot {
    grid-template-columns: 1fr;
  }

  .spot-card:first-child {
    grid-column: auto;
  }

  .controls {
    grid-template-columns: 1fr;
  }

  .controls > .field:first-child,
  .count {
    grid-column: auto;
  }

  .controls .tabs,
  .controls .check,
  .count {
    justify-self: stretch;
  }

  .tabs {
    width: 100%;
  }

  .tabs button {
    flex: 1;
  }

  .count {
    text-align: left;
  }

  .panel-caption,
  .caption {
    display: grid;
    gap: 4px;
    padding: var(--step-3) var(--step-4);
  }

  .model {
    padding: var(--step-4);
  }

  .detail {
    width: 100vw;
    padding: var(--step-4);
  }
}

@media (max-width: 560px) {
  .facts {
    grid-template-columns: 1fr 1fr;
  }

  .fact {
    min-height: 72px;
    padding: var(--step-3);
  }

  .fact b {
    font-size: 16px;
  }

  .fact:nth-child(3) b {
    font-size: 19px;
  }

  /* At phone width, keep the rank, protocol, TVL, implied, and token signal. */
  table th:nth-child(4),
  table td:nth-child(4) {
    display: none;
  }

  th,
  td {
    padding-right: 9px;
    padding-left: 9px;
  }

  .name {
    max-width: 190px;
  }

  .implied {
    min-width: 128px;
  }

  .bar {
    display: none;
  }

  .equation div {
    gap: var(--step-2);
  }

  .equation div > b {
    font-size: 11px;
  }
}

/* Motion and contrast preferences */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

@media (prefers-contrast: more) {
  :root {
    --border: #40515e;
    --border-strong: #607482;
    --muted: #b3c0c8;
    --faint: #8fa0ac;
  }

  th,
  td,
  .panel,
  .spot-card,
  .fact,
  .steps li,
  .equation {
    border-color: var(--border);
  }
}
```

## HOOKS REQUIRED FOR CONTENT-LEVEL CLEANUP

These are the only parts CSS cannot complete by itself:

- Disclosure emphasis: add `data-note="disclosure"` to the USDD/dTAO note. The existing note element can remain otherwise unchanged.
- Generic methodology note: add `data-note="method"` or `data-note="caveat"` to the other notes.
- Exclusion labels: set `data-label` on the exclusion-table cell after removing the `parent#` prefix from the displayed value. The required one-line content hook is:

```js
cell.dataset.label = raw.replace(/^parent#/, "");
```

- Methodology layout: wrap the category multiples table and exclusion table in `.methodology-grid` if they are currently emitted as adjacent unwrapped elements.
- Notes layout: wrap the three notes in `.notes`.

Without those hooks, the file still applies cleanly, and all table, KPI, responsive, drawer, and spotlight improvements work. The disclosure and exclusion-label requirements cannot be achieved through CSS selectors alone because CSS cannot classify arbitrary text content or edit a substring inside a text node.

## ADDITIONAL FINDINGS

- The displayed precision rule is a formatter concern and cannot be changed in `app.css`. This stylesheet applies tabular numeric alignment and consistent visual weight, but it does not alter `$1.07B`, `$637.2M`, or `$988K`.
- The table now has a bounded vertical scroll region so the sticky header remains useful across 177 rows. At widths below 980px, Age and Category multiple are hidden while Implied value and Token remain visible.
- The CSS does not require a new file, external asset, CDN, network call, or webfont.
- No URL strings are present in the replacement file.

## FINAL VERDICT

**Apply after the listed methodology hooks.** The CSS file is ready to replace `dashboard/app.css` as-is. The two content requirements that CSS cannot perform alone are the `data-note` classification and removal of the `parent#` prefix through a cleaned `data-label` value.
