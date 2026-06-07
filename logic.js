export function createInitialState() {
  return {
    answers: {},
    notes: {},
    currentSection: 0,
    started: false,
    updatedAt: new Date().toISOString(),
  };
}

export function updateAnswer(state, fieldId, value, note = undefined) {
  const next = {
    ...createInitialState(),
    ...state,
    answers: { ...(state?.answers ?? {}) },
    notes: { ...(state?.notes ?? {}) },
    updatedAt: new Date().toISOString(),
  };

  if (value === undefined || value === null || value === '') {
    delete next.answers[fieldId];
  } else {
    next.answers[fieldId] = value;
  }

  if (note !== undefined) {
    if (note === '') {
      delete next.notes[fieldId];
    } else {
      next.notes[fieldId] = note;
    }
  }

  return next;
}

export function updateCurrentSection(state, currentSection) {
  return {
    ...createInitialState(),
    ...state,
    currentSection,
    started: true,
    updatedAt: new Date().toISOString(),
  };
}

export function getProgress(sections, state) {
  const requiredFields = getAllFields(sections).filter((field) => field.required);
  const answered = requiredFields.filter((field) => hasAnswer(state, field.id)).length;

  return {
    answered,
    total: requiredFields.length,
    percent: requiredFields.length === 0 ? 0 : Math.round((answered / requiredFields.length) * 100),
  };
}

export function getSectionStatus(section, state) {
  const requiredFields = section.fields.filter((field) => field.required);
  const answeredRequired = requiredFields.filter((field) => hasAnswer(state, field.id)).length;
  const answeredAny = section.fields.some((field) => hasAnswer(state, field.id) || hasNote(state, field.id));

  if (!answeredAny) {
    return 'vide';
  }

  if (requiredFields.length > 0 && answeredRequired === requiredFields.length) {
    return 'rempli';
  }

  return 'en cours';
}

export function getSummary(sections, scoringCriteria, state) {
  const scores = scoringCriteria.map((criterion) => {
    const raw = Number(state?.answers?.[`score_${criterion.id}`]);
    return {
      ...criterion,
      value: Number.isFinite(raw) ? raw : null,
    };
  });

  const numericScores = scores.map((score) => score.value).filter((value) => value !== null);
  const average = numericScores.length === 0
    ? null
    : Math.round((numericScores.reduce((sum, value) => sum + value, 0) / numericScores.length) * 10) / 10;

  const redFlags = collectRedFlags(sections, state);
  const warnings = collectWarnings(sections, state);
  const missingCritical = collectMissingCritical(sections, state);
  const decision = getStrictDecision({ average, scores, redFlags, warnings, missingCritical, state });

  return {
    progress: getProgress(sections, state),
    average,
    scores,
    redFlags,
    warnings,
    missingCritical,
    decision,
  };
}

export function getQuickVerdict(state) {
  const ids = [
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
  ];

  const values = ids.map((id) => state?.answers?.[id] ?? '');
  const counts = {
    bad: values.filter((value) => value === 'mauvais').length,
    doubt: values.filter((value) => value === 'doute').length,
    missing: values.filter((value) => value === '').length,
  };

  if (counts.bad > 0) {
    return {
      level: 'stop',
      label: 'Stop provisoire',
      reason: "Un point rapide est mauvais : pas d'offre sans preuve ou clarification.",
      counts,
    };
  }

  if (counts.doubt > 0) {
    return {
      level: 'pause',
      label: 'Temporiser',
      reason: 'Un ou plusieurs doutes doivent être levés avant décision.',
      counts,
    };
  }

  if (counts.missing > 0) {
    return {
      level: 'incomplete',
      label: 'Incomplet',
      reason: 'Tous les 10 points rapides ne sont pas encore renseignés.',
      counts,
    };
  }

  return {
    level: 'go',
    label: 'Rapide OK',
    reason: "Aucun mauvais point ni doute dans le mode rapide. Le verdict complet reste nécessaire pour confirmer une offre.",
    counts,
  };
}

export function collectRedFlags(sections, state) {
  return collectFieldIssues(sections, state, 'red');
}

export function collectWarnings(sections, state) {
  return collectFieldIssues(sections, state, 'warning');
}

export function collectMissingCritical(sections, state) {
  const missing = [];

  for (const section of sections) {
    if (!section.critical) {
      continue;
    }

    for (const field of section.fields) {
      if ((field.required || field.important) && !hasAnswer(state, field.id) && !hasNote(state, field.id)) {
        missing.push({
          section: `${section.number}. ${section.title}`,
          label: field.label,
          severity: 'warning',
        });
      }
    }
  }

  return missing;
}

export function generateChatGptExport(sections, scoringCriteria, state) {
  const summary = getSummary(sections, scoringCriteria, state);
  const quick = getQuickVerdict(state);
  const lines = [
    'Voici mes notes anonymisées de visite immobilière.',
    'Sois critique, honnête et exigeant.',
    'Ne me rassure pas artificiellement.',
    'Dis-moi si je suis en train de minimiser un red flag.',
    'Dis-moi si la décision devrait être bloquée, temporisée ou possible.',
    '',
    '## Verdict calculé',
    `Décision: ${summary.decision.label}`,
    `Raison: ${summary.decision.reason}`,
    `Moyenne: ${summary.average === null ? 'incomplète' : `${summary.average}/10`}`,
    `Progression: ${summary.progress.answered}/${summary.progress.total} (${summary.progress.percent}%)`,
    '',
    '## Verdict rapide',
    `Signal: ${quick.label}`,
    `Raison: ${quick.reason}`,
    `Mauvais: ${quick.counts.bad}`,
    `Doutes: ${quick.counts.doubt}`,
    `Non renseignés: ${quick.counts.missing}`,
    '',
    '## Preuves écrites',
    "Règle: pas écrit = pas sécurisé.",
    ...formatWrittenProof(sections, state),
    '',
    '## Red flags',
    ...formatIssues(summary.redFlags),
    '',
    '## Points flous à sécuriser',
    ...formatIssues([...summary.warnings, ...summary.missingCritical]),
    '',
    '## Réponses par étape',
  ];

  for (const section of sections) {
    lines.push('', `### ${section.number}. ${section.title}`);

    for (const field of section.fields) {
      const value = state?.answers?.[field.id];
      const note = state?.notes?.[field.id];
      if (!hasAnswer(state, field.id) && !note) {
        if ((field.required || field.important) && section.critical) {
          lines.push(`- ${field.label}: NON RENSEIGNÉ`);
        }
        continue;
      }

      lines.push(`- ${field.label}: ${formatAnswer(field, value)}`);
      if (note) {
        lines.push(`  Note: ${note}`);
      }
    }
  }

  lines.push(
    '',
    '## Demande',
    "Analyse froidement ces notes. Dis-moi ce qui bloque, ce qui doit être prouvé par document, ce que je pourrais minimiser, et quelle décision rationnelle ressort.",
  );

  return lines.join('\n');
}

export function generatePostVisitEmail(sections, state) {
  const requested = new Set([
    'diagnostics complets',
    'taxe foncière',
    'charges ASL / lotissement',
    'règlement du lotissement',
    'conditions de revente',
    "certificat d'entretien chaudière",
    'factures énergie',
    'historique des sinistres',
  ]);

  if (state?.answers?.diagnostics_disponibles === 'oui') {
    requested.delete('diagnostics complets');
  }
  if (hasAnswer(state, 'taxe_fonciere')) {
    requested.delete('taxe foncière');
  }
  if (state?.answers?.certificat_entretien === 'oui') {
    requested.delete("certificat d'entretien chaudière");
  }
  if (state?.answers?.factures_energie === 'oui') {
    requested.delete('factures énergie');
  }

  const missingAdmin = collectMissingCritical(sections, state)
    .filter((item) => item.section.startsWith('10.'))
    .map((item) => item.label);

  const requestedItems = [...new Set([
    ...requested,
    ...missingAdmin.slice(0, 8),
  ])];

  const lines = [
    'Bonjour,',
    '',
    'Merci pour la visite.',
    "Avant de me positionner proprement, pourriez-vous me transmettre ou confirmer les éléments suivants :",
    '',
    ...requestedItems.map((item) => `- ${item}`),
    '',
    "Cela me permettra de faire une offre sérieuse avec tous les éléments écrits, plutôt qu'une décision précipitée.",
    '',
    'Bonne journée,',
  ];

  return lines.join('\n');
}

export function serializeState(state) {
  return JSON.stringify({
    ...createInitialState(),
    ...state,
  });
}

export function parseState(serialized) {
  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object') {
      return createInitialState();
    }

    return {
      ...createInitialState(),
      ...parsed,
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
    };
  } catch {
    return createInitialState();
  }
}

export function formatAnswer(field, value) {
  if (value === undefined || value === null || value === '') {
    return 'Non renseigné';
  }

  if (field.type === 'scale') {
    return `${value}/10`;
  }

  const option = field.options?.find((item) => item.value === value);
  return option?.label ?? String(value);
}

function getStrictDecision({ average, scores, redFlags, warnings, missingCritical, state }) {
  const scoreMap = Object.fromEntries(scores.map((score) => [score.id, score.value]));
  const immediateBlocker = redFlags.find((issue) => issue.blocksDecision);

  if (immediateBlocker) {
    return { level: 'stop', label: 'Ne pas acheter', reason: `bloquant immédiat : ${immediateBlocker.label}.` };
  }

  if (isBelow(scoreMap.calme_voisinage, 7)) {
    return { level: 'stop', label: 'Ne pas acheter', reason: 'Voisinage / calme sous 7 : règle dure bloquante.' };
  }

  if (isBelow(scoreMap.humidite_eau, 7)) {
    return { level: 'stop', label: 'Ne pas acheter', reason: 'Humidité / eau sous 7 : règle dure bloquante.' };
  }

  if (state?.answers?.clauses_floues === 'oui') {
    return { level: 'pause', label: "Pas d'offre ferme", reason: 'Clauses floues : documents et conditions à obtenir avant toute offre ferme.' };
  }

  if (state?.answers?.charges_floues === 'oui') {
    return { level: 'pause', label: "Pas d'offre ferme", reason: 'Charges floues : montant, règlement et frais communs à prouver.' };
  }

  if (isBelow(scoreMap.preference_autre_bien, 7)) {
    return { level: 'pause', label: 'Temporiser', reason: "La préférence face à l'autre bien n'est pas assez claire." };
  }

  if (average !== null && average < 7) {
    return { level: 'stop', label: 'Ne pas acheter', reason: 'Moyenne sous 7 : le bien ne convainc pas assez.' };
  }

  if (redFlags.length > 0) {
    return { level: 'pause', label: 'Temporiser', reason: 'Un ou plusieurs red flags doivent être levés avant décision.' };
  }

  if (missingCritical.length > 0) {
    return { level: 'pause', label: 'Décision incomplète', reason: `${missingCritical.length} informations critiques manquantes : pas d'offre possible sans preuve.` };
  }

  if (average !== null && average > 8 && warnings.length === 0) {
    return { level: 'go', label: 'Offre possible conditionnée', reason: 'Moyenne supérieure à 8 et aucun red flag détecté.' };
  }

  if (average !== null && average >= 7) {
    return { level: 'pause', label: 'Temporiser / demander documents', reason: 'Score entre 7 et 8 ou points encore flous.' };
  }

  return { level: 'pause', label: 'Décision incomplète', reason: 'Il manque encore trop de réponses pour décider froidement.' };
}

function collectFieldIssues(sections, state, severity) {
  const issues = [];

  for (const section of sections) {
    for (const field of section.fields) {
      if (!hasAnswer(state, field.id)) {
        continue;
      }

      const value = state.answers[field.id];
      const option = field.options?.find((item) => item.value === value);
      const scaleSeverity = getScaleSeverity(field, value);

      if (option?.severity === severity || scaleSeverity === severity) {
        issues.push({
          section: `${section.number}. ${section.title}`,
          label: field.label,
          value: formatAnswer(field, value),
          note: state?.notes?.[field.id] ?? '',
          severity,
          fieldId: field.id,
          blocksDecision: field.blocksDecision === true,
        });
      }
    }
  }

  return issues;
}

function getScaleSeverity(field, value) {
  if (field.type !== 'scale') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (numeric < 7) {
    return 'red';
  }

  if (numeric < 8) {
    return 'warning';
  }

  return null;
}

function formatWrittenProof(sections, state) {
  const proofFields = getAllFields(sections).filter((field) => field.id.startsWith('preuve_'));
  if (proofFields.length === 0) {
    return ['- Aucune preuve écrite suivie dans cette version.'];
  }

  return proofFields.map((field) => `- ${field.label}: ${formatAnswer(field, state?.answers?.[field.id])}`);
}

function formatIssues(issues) {
  if (issues.length === 0) {
    return ['- Aucun signal remonté pour l’instant.'];
  }

  return issues.map((issue) => {
    const value = issue.value ? ` (${issue.value})` : '';
    const note = issue.note ? ` - Note: ${issue.note}` : '';
    return `- [${issue.section}] ${issue.label}${value}${note}`;
  });
}

function getAllFields(sections) {
  return sections.flatMap((section) => section.fields);
}

function hasAnswer(state, fieldId) {
  const value = state?.answers?.[fieldId];
  return value !== undefined && value !== null && value !== '';
}

function hasNote(state, fieldId) {
  const value = state?.notes?.[fieldId];
  return value !== undefined && value !== null && value !== '';
}

function isBelow(value, threshold) {
  return typeof value === 'number' && value < threshold;
}
