# Visite Immo Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a static, anonymized, mobile-first GitHub Page for fast property-visit note taking, strict scoring, local autosave, ChatGPT export, JSON backup, and browser PDF printing.

**Architecture:** The app is a plain static site. `data.js` owns the anonymized checklist model, `logic.js` owns pure state/scoring/export behavior, and `app.js` owns DOM rendering, localStorage, navigation, and browser actions. Tests use Node's built-in test runner against the pure modules and static files.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Node.js built-in `node:test`, GitHub Pages.

---

## File Structure

- Create `package.json`: project metadata and `npm test` command.
- Create `index.html`: static shell, app landmarks, sticky top controls, export fallback container.
- Create `styles.css`: mobile-first app styling and print stylesheet.
- Create `data.js`: complete anonymized visit sections, fields, options, prompts, red-flag metadata, scoring criteria.
- Create `logic.js`: pure helpers for initial state, updates, progress, section status, red flags, decision, exports.
- Create `app.js`: DOM rendering, event handling, localStorage autosave, modal navigation, copy/print/download actions.
- Create `manifest.webmanifest`: install/cache metadata.
- Create `sw.js`: simple cache-first service worker for static assets.
- Create `tests/content.test.js`: anonymization and content-coverage tests.
- Create `tests/logic.test.js`: scoring, red-flag, progress, export, and section-status tests.
- Create `tests/static.test.js`: static file and offline asset reference tests.
- Create `README.md`: usage, GitHub Pages URL, limits of local-only storage.

---

### Task 1: Project Test Harness And Content Contract

**Files:**
- Create: `package.json`
- Create: `tests/content.test.js`
- Create: `data.js`

- [ ] **Step 1: Add Node test script**

Create `package.json`:

```json
{
  "name": "visite-immo-checklist",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write failing content contract tests**

Create `tests/content.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sections, scoringCriteria } from '../data.js';

test('published content stays fully anonymized', () => {
  const content = JSON.stringify({ sections, scoringCriteria });

  assert.match(content, /ma fille/);
  assert.match(content, /ce bien/);
  assert.match(content, /l'autre bien/);
  assert.match(content, /l'organisme vendeur/);
  assert.equal(content.includes('prénom'), false);
  assert.equal(content.includes('ville exacte'), false);
});

test('visit keeps the approved 0 to 15 section order', () => {
  assert.deepEqual(sections.map((section) => section.number), [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15',
  ]);
});

test('critical sections include direct text capture', () => {
  const criticalSections = sections.filter((section) => section.critical);
  assert.ok(criticalSections.length >= 8);

  for (const section of criticalSections) {
    const hasVisibleText = section.fields.some((field) => ['text', 'textarea'].includes(field.type) && field.important === true);
    assert.equal(hasVisibleText, true, `${section.number} ${section.title} needs an important text field`);
  }
});

test('scoring criteria match the strict decision rules', () => {
  assert.deepEqual(scoringCriteria.map((criterion) => criterion.id), [
    'quartier',
    'calme_voisinage',
    'mitoyennete',
    'humidite_eau',
    'etat_technique',
    'chaudiere',
    'jardin',
    'luminosite',
    'projection_famille',
    'envie_vivre',
    'preference_autre_bien',
  ]);
});
```

- [ ] **Step 3: Run content tests and verify RED**

Run: `npm test`

Expected: FAIL with an import error for `../data.js`, because the content model does not exist yet.

- [ ] **Step 4: Implement anonymized checklist data**

Create `data.js` with:

```js
export const scoringCriteria = [
  { id: 'quartier', label: 'Quartier / ambiance' },
  { id: 'calme_voisinage', label: 'Calme / voisinage' },
  { id: 'mitoyennete', label: 'Mitoyenneté' },
  { id: 'humidite_eau', label: 'Humidité / eaux pluviales' },
  { id: 'etat_technique', label: 'État technique global' },
  { id: 'chaudiere', label: 'Chaudière / chauffage' },
  { id: 'jardin', label: 'Jardin / extérieur' },
  { id: 'luminosite', label: 'Luminosité' },
  { id: 'projection_famille', label: 'Projection avec ma fille' },
  { id: 'envie_vivre', label: "Envie réelle d'y vivre" },
  { id: 'preference_autre_bien', label: "Préférence vs l'autre bien" },
];
```

Then add the complete `sections` array with section numbers `0` through `15`, using the approved spec wording, anonymized labels, and direct `textarea` fields marked `important: true` on each critical section. Every choice option that can change the decision must include `severity: 'warning'` or `severity: 'red'`.

- [ ] **Step 5: Run content tests and verify GREEN**

Run: `npm test`

Expected: PASS for all content tests.

- [ ] **Step 6: Commit content model**

Run:

```bash
git add package.json tests/content.test.js data.js
git commit -m "feat: add anonymized visit checklist model"
```

---

### Task 2: Pure State, Scoring, And Export Logic

**Files:**
- Create: `tests/logic.test.js`
- Create: `logic.js`

- [ ] **Step 1: Write failing logic tests**

Create `tests/logic.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sections, scoringCriteria } from '../data.js';
import {
  createInitialState,
  updateAnswer,
  getProgress,
  getSectionStatus,
  getSummary,
  generateChatGptExport,
  serializeState,
  parseState,
} from '../logic.js';

test('progress and section status update when answers are filled', () => {
  let state = createInitialState(sections, scoringCriteria);
  assert.equal(getSectionStatus(sections[1], state), 'vide');

  const firstRequired = sections[1].fields.find((field) => field.required);
  state = updateAnswer(state, firstRequired.id, 'oui');

  assert.equal(getSectionStatus(sections[1], state), 'en cours');
  assert.ok(getProgress(sections, state).answered > 0);
});

test('hard stop beats a good average when water or humidity is weak', () => {
  let state = createInitialState(sections, scoringCriteria);
  for (const criterion of scoringCriteria) {
    state = updateAnswer(state, `score_${criterion.id}`, 9);
  }
  state = updateAnswer(state, 'score_humidite_eau', 6);

  const summary = getSummary(sections, scoringCriteria, state);

  assert.equal(summary.decision.level, 'stop');
  assert.match(summary.decision.reason, /Humidité|eau/);
});

test('unclear clauses block a firm offer', () => {
  let state = createInitialState(sections, scoringCriteria);
  for (const criterion of scoringCriteria) {
    state = updateAnswer(state, `score_${criterion.id}`, 9);
  }
  state = updateAnswer(state, 'clauses_floues', 'oui');

  const summary = getSummary(sections, scoringCriteria, state);

  assert.equal(summary.decision.level, 'pause');
  assert.match(summary.decision.reason, /Clauses/);
});

test('ChatGPT export is strict, complete, and anonymized', () => {
  let state = createInitialState(sections, scoringCriteria);
  state = updateAnswer(state, 'eau_stagne_facade', 'mauvais', 'Eau visible contre le mur après pluie.');
  state = updateAnswer(state, 'score_humidite_eau', 5);

  const exportText = generateChatGptExport(sections, scoringCriteria, state);

  assert.match(exportText, /Sois critique, honnête et exigeant/);
  assert.match(exportText, /Ne me rassure pas artificiellement/);
  assert.match(exportText, /Eau visible contre le mur/);
  assert.equal(exportText.includes('ville exacte'), false);
  assert.equal(exportText.includes('prénom'), false);
  assert.equal(exportText.includes('nom du vendeur'), false);
});

test('state serialization round-trips safely', () => {
  let state = createInitialState(sections, scoringCriteria);
  state = updateAnswer(state, 'feeling_immediat', 7, 'Correct, sans coup de cœur.');

  assert.deepEqual(parseState(serializeState(state)), state);
});
```

- [ ] **Step 2: Run logic tests and verify RED**

Run: `npm test`

Expected: FAIL with an import error for `../logic.js`.

- [ ] **Step 3: Implement pure logic**

Create `logic.js` exporting these functions with stable signatures:

```js
export function createInitialState(sections, scoringCriteria) {}
export function updateAnswer(state, fieldId, value, note = '') {}
export function getProgress(sections, state) {}
export function getSectionStatus(section, state) {}
export function getSummary(sections, scoringCriteria, state) {}
export function generateChatGptExport(sections, scoringCriteria, state) {}
export function serializeState(state) {}
export function parseState(serialized) {}
```

Implementation rules:

- `createInitialState` returns `{ answers: {}, notes: {}, currentSection: 0, updatedAt: ISO string }`.
- `updateAnswer` returns a new state object and never mutates the input.
- `getProgress` counts required fields only.
- `getSectionStatus` returns `vide`, `en cours`, or `rempli`.
- `getSummary` computes average score and applies hard-stop rules before average rules.
- `generateChatGptExport` starts with the strict instruction block from the spec and includes red flags, missing critical fields, answers, notes, and verdict.
- `parseState` returns a valid empty state if JSON parsing fails.

- [ ] **Step 4: Run logic tests and verify GREEN**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit logic**

Run:

```bash
git add tests/logic.test.js logic.js
git commit -m "feat: add strict visit scoring logic"
```

---

### Task 3: Static UI Shell And Browser App

**Files:**
- Create: `tests/static.test.js`
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`

- [ ] **Step 1: Write failing static file tests**

Create `tests/static.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('index references the app assets and has a no-marketing visit shell', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<main id="app"/);
  assert.match(html, /styles\.css/);
  assert.match(html, /app\.js/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /Copier pour ChatGPT/);
});

test('stylesheet includes mobile controls and print support', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.step-button/);
  assert.match(css, /\.choice-grid/);
  assert.match(css, /@media print/);
});
```

- [ ] **Step 2: Run static tests and verify RED**

Run: `npm test`

Expected: FAIL because `index.html` and `styles.css` do not exist.

- [ ] **Step 3: Implement the static shell and app DOM**

Create `index.html` with a semantic shell:

```html
<main id="app" class="app-shell" aria-live="polite"></main>
```

It must load `styles.css`, `manifest.webmanifest`, and `<script type="module" src="app.js"></script>`.

Create `app.js` to:

- load state from `localStorage`;
- render home, current step, step navigation dialog, and final summary;
- bind buttons and text inputs to `updateAnswer`;
- persist after every change;
- support direct section jumps through an `Étapes` button;
- support `Reprendre où j'étais`;
- copy ChatGPT export with a textarea fallback;
- download JSON backup;
- call `window.print()` for PDF.

Create `styles.css` to:

- prioritize mobile layout;
- use large touch targets;
- keep sticky progress and navigation controls;
- visually distinguish warnings and red flags;
- provide clean print output for PDF.

- [ ] **Step 4: Run static and logic tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit UI**

Run:

```bash
git add index.html styles.css app.js tests/static.test.js
git commit -m "feat: build visit checklist interface"
```

---

### Task 4: Offline Cache, Manifest, And Documentation

**Files:**
- Modify: `tests/static.test.js`
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `README.md`

- [ ] **Step 1: Extend failing static tests for offline assets**

Append to `tests/static.test.js`:

```js
test('service worker caches every static app asset', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  for (const asset of ['index.html', 'styles.css', 'app.js', 'data.js', 'logic.js', 'manifest.webmanifest']) {
    assert.match(sw, new RegExp(asset.replace('.', '\\.')));
  }
});

test('README documents local-only storage and GitHub Pages usage', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

  assert.match(readme, /GitHub Pages/);
  assert.match(readme, /localStorage/);
  assert.match(readme, /Copier pour ChatGPT/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test`

Expected: FAIL because `sw.js` and `README.md` do not exist.

- [ ] **Step 3: Implement offline assets and docs**

Create `manifest.webmanifest` with app name, start URL, display mode, theme color, and background color.

Create `sw.js` with:

```js
const CACHE_NAME = 'visite-immo-checklist-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data.js',
  './logic.js',
  './manifest.webmanifest',
];
```

Use install-time cache add, activate-time old cache cleanup, and cache-first fetch fallback for same-origin GET requests.

Create `README.md` explaining:

- the GitHub Pages URL;
- that data is saved only on the current device with `localStorage`;
- open the page before the visit for quasi offline use;
- use `Copier pour ChatGPT`, `Imprimer / PDF`, and JSON backup after the visit.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit offline support**

Run:

```bash
git add manifest.webmanifest sw.js README.md tests/static.test.js
git commit -m "feat: add offline-ready static publishing"
```

---

### Task 5: Verification, Audit, And GitHub Pages Publishing

**Files:**
- Modify if needed based on audit findings.

- [ ] **Step 1: Run full automated tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run anonymization audit**

Run a local-only search for the sensitive source terms from the original brief. Put the pattern directly in a temporary PowerShell variable during execution and do not save that variable or those terms in any repository file.

Expected: no matches.

- [ ] **Step 3: Serve locally**

Run:

```bash
python -m http.server 4173
```

Expected: local app reachable at `http://127.0.0.1:4173/`.

- [ ] **Step 4: Browser verification**

Open the local app and verify:

- mobile layout renders without text overlap;
- `Étapes` opens direct navigation;
- jumping to another step preserves existing answers;
- important text fields accept and persist text;
- reload restores answers;
- final scoring shows strict stop/pause verdicts;
- ChatGPT export contains strict instruction and notes;
- print view opens.

- [ ] **Step 5: Commit any audit fixes**

If files changed:

```bash
git add .
git commit -m "fix: address visit page verification findings"
```

- [ ] **Step 6: Create GitHub repository and push**

Run:

```bash
gh repo create QuentinVG/visite-immo-checklist --public --source=. --remote=origin --push
```

If the repo already exists:

```bash
git remote add origin git@github.com:QuentinVG/visite-immo-checklist.git
git push -u origin main
```

- [ ] **Step 7: Enable GitHub Pages**

Run:

```bash
gh api repos/QuentinVG/visite-immo-checklist/pages -X POST -f source.branch=main -f source.path=/
```

If Pages is already enabled, run:

```bash
gh api repos/QuentinVG/visite-immo-checklist/pages
```

Expected URL: `https://quentinvg.github.io/visite-immo-checklist/`.

- [ ] **Step 8: Final remote verification**

Open `https://quentinvg.github.io/visite-immo-checklist/` and verify the page loads. If GitHub Pages is still building, wait and retry.
