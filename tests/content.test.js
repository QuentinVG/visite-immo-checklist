import test from 'node:test';
import assert from 'node:assert/strict';
import { photoChecklist, quickBlockers, sections, scoringCriteria } from '../data.js';

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

test('factual administrative yes answers are not automatic red flags', () => {
  assert.notEqual(getOption('ordre_arrivee_offres', 'oui').severity, 'red');
  assert.notEqual(getOption('residence_principale_obligation', 'oui').severity, 'red');
  assert.notEqual(getOption('asl_copro_charges', 'oui').severity, 'red');
});

test('quick group visit mode exposes the ten blocking points', () => {
  assert.equal(quickBlockers.length, 10);
  assert.deepEqual(quickBlockers.map((field) => field.id), [
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
  ]);
});

test('photo checklist covers technical proof shots', () => {
  assert.equal(photoChecklist.length, 12);
  assert.ok(photoChecklist.some((field) => field.label.includes('Chaudière')));
  assert.ok(photoChecklist.some((field) => field.label.includes('VMC')));
  assert.ok(photoChecklist.every((field) => field.type === 'choice'));
});

test('debrief captures colleague price and cold buy opinion separately', () => {
  const fields = sections.flatMap((section) => section.fields);
  assert.ok(fields.find((field) => field.id === 'prix_max_collegue'));
  assert.ok(fields.find((field) => field.id === 'collegue_acheterait'));
  assert.ok(fields.find((field) => field.id === 'regret_minimise_6_mois'));
});

test('written proof fields separate verbal reassurance from received evidence', () => {
  const fields = sections.flatMap((section) => section.fields);
  const proofPairs = [
    'diagnostics',
    'taxe_fonciere',
    'charges_asl',
    'reglement_lotissement',
    'clauses_revente_location',
    'entretien_chaudiere',
    'factures_energie',
    'sinistres_infiltrations',
  ];

  for (const item of proofPairs) {
    assert.ok(fields.find((field) => field.id === `preuve_oral_${item}`), `missing oral proof ${item}`);
    assert.ok(fields.find((field) => field.id === `preuve_ecrit_${item}`), `missing written proof ${item}`);
  }
});

test('final decision keeps cash, comparison, and anti-panic guardrails visible', () => {
  const fields = sections.flatMap((section) => section.fields);

  for (const id of [
    'cash_imprevus',
    'cash_total_prevoir',
    'comparaison_surface',
    'comparaison_dette',
    'comparaison_apport_conserve',
    'comparaison_patrimoine',
    'decision_demain_matin',
  ]) {
    assert.ok(fields.find((field) => field.id === id), `missing ${id}`);
  }

  const decision = sections.find((section) => section.id === 'decision_scenario');
  assert.ok(decision.reminders.some((item) => item.includes('opportunité rare')));
  assert.ok(decision.reminders.some((item) => item.includes('Décision interdite')));
});

function getOption(fieldId, value) {
  const field = sections.flatMap((section) => section.fields).find((candidate) => candidate.id === fieldId);
  assert.ok(field, `Missing field ${fieldId}`);
  const option = field.options.find((candidate) => candidate.value === value);
  assert.ok(option, `Missing option ${value} on ${fieldId}`);
  return option;
}
