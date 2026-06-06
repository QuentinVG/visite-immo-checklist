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

test('factual administrative yes answers are not automatic red flags', () => {
  assert.notEqual(getOption('ordre_arrivee_offres', 'oui').severity, 'red');
  assert.notEqual(getOption('residence_principale_obligation', 'oui').severity, 'red');
  assert.notEqual(getOption('asl_copro_charges', 'oui').severity, 'red');
});

function getOption(fieldId, value) {
  const field = sections.flatMap((section) => section.fields).find((candidate) => candidate.id === fieldId);
  assert.ok(field, `Missing field ${fieldId}`);
  const option = field.options.find((candidate) => candidate.value === value);
  assert.ok(option, `Missing option ${value} on ${fieldId}`);
  return option;
}
