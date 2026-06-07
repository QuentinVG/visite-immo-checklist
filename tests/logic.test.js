import test from 'node:test';
import assert from 'node:assert/strict';
import { sections, scoringCriteria } from '../data.js';
import {
  createInitialState,
  updateAnswer,
  getQuickVerdict,
  getProgress,
  getSectionStatus,
  getSummary,
  generateChatGptExport,
  generatePostVisitEmail,
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

test('high scores cannot allow an offer when critical fields are missing', () => {
  let state = createInitialState(sections, scoringCriteria);
  for (const criterion of scoringCriteria) {
    state = updateAnswer(state, `score_${criterion.id}`, 9);
  }

  const summary = getSummary(sections, scoringCriteria, state);

  assert.equal(summary.decision.level, 'pause');
  assert.match(summary.decision.reason, /critiques manquantes/);
  assert.ok(summary.missingCritical.length > 0);
});

test('important blank text fields are treated as missing critical information', () => {
  const state = createInitialState(sections, scoringCriteria);
  const summary = getSummary(sections, scoringCriteria, state);

  assert.ok(summary.missingCritical.some((item) => item.label === 'Note mentale avant visite'));
});

test('immediate blocker field stops the decision regardless of score', () => {
  let state = createInitialState(sections, scoringCriteria);
  for (const criterion of scoringCriteria) {
    state = updateAnswer(state, `score_${criterion.id}`, 9);
  }
  state = updateAnswer(state, 'bloquant_lotissement', 'oui');

  const summary = getSummary(sections, scoringCriteria, state);

  assert.equal(summary.decision.level, 'stop');
  assert.match(summary.decision.reason, /bloquant immédiat/);
});

test('quick verdict gives a usable visit signal before the full checklist is complete', () => {
  let state = createInitialState(sections, scoringCriteria);
  state = updateAnswer(state, 'quick_bruit_voisinage', 'ok');
  state = updateAnswer(state, 'quick_mitoyennete_sejour', 'doute');
  state = updateAnswer(state, 'quick_humidite_odeur', 'mauvais');

  const quick = getQuickVerdict(state);

  assert.equal(quick.counts.bad, 1);
  assert.equal(quick.counts.doubt, 1);
  assert.equal(quick.counts.missing, 7);
  assert.equal(quick.level, 'stop');
  assert.match(quick.label, /Stop provisoire/);
});

test('quick verdict separates incomplete, temporary, and ok states', () => {
  let state = createInitialState(sections, scoringCriteria);
  assert.equal(getQuickVerdict(state).level, 'incomplete');

  for (const id of [
    'quick_bruit_voisinage',
    'quick_mitoyennete_sejour',
    'quick_mitoyennete_chambres',
    'quick_humidite_odeur',
    'quick_facade_eaux',
    'quick_chaudiere',
    'quick_charges',
    'quick_clauses',
    'quick_offre',
    'quick_preference_autre_bien',
  ]) {
    state = updateAnswer(state, id, 'ok');
  }
  assert.equal(getQuickVerdict(state).level, 'go');

  state = updateAnswer(state, 'quick_charges', 'doute');
  assert.equal(getQuickVerdict(state).level, 'pause');
});

test('ChatGPT export is strict, complete, and anonymized', () => {
  let state = createInitialState(sections, scoringCriteria);
  state = updateAnswer(state, 'eau_stagne_facade', 'mauvais', 'Eau visible contre le mur après pluie.');
  state = updateAnswer(state, 'score_humidite_eau', 5);

  const exportText = generateChatGptExport(sections, scoringCriteria, state);

  assert.match(exportText, /Sois critique, honnête et exigeant/);
  assert.match(exportText, /Ne me rassure pas artificiellement/);
  assert.match(exportText, /Verdict rapide/);
  assert.match(exportText, /Preuves écrites/);
  assert.match(exportText, /Eau visible contre le mur/);
  assert.equal(exportText.includes('ville exacte'), false);
  assert.equal(exportText.includes('prénom'), false);
  assert.equal(exportText.includes('nom du vendeur'), false);
});

test('post-visit email asks for missing proof documents', () => {
  const state = createInitialState(sections, scoringCriteria);
  const email = generatePostVisitEmail(sections, state);

  assert.match(email, /diagnostics complets/);
  assert.match(email, /taxe foncière/);
  assert.match(email, /certificat d'entretien chaudière/);
  assert.match(email, /conditions de revente/);
});

test('state serialization round-trips safely', () => {
  let state = createInitialState(sections, scoringCriteria);
  state = updateAnswer(state, 'feeling_immediat', 7, 'Correct, sans coup de cœur.');

  assert.deepEqual(parseState(serializeState(state)), state);
});
