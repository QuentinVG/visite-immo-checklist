import { photoChecklist, quickBlockers, sections, scoringCriteria } from './data.js';
import {
  collectMissingCritical,
  collectRedFlags,
  collectWarnings,
  createInitialState,
  formatAnswer,
  generateChatGptExport,
  generatePostVisitEmail,
  getProgress,
  getSectionStatus,
  getSummary,
  parseState,
  serializeState,
  updateAnswer,
  updateCurrentSection,
} from './logic.js';

const STORAGE_KEY = 'visite-immo-checklist-v1';
const quickSection = { id: 'mode_rapide', number: 'R', title: 'Mode rapide : 10 points bloquants', critical: false, fields: quickBlockers };
const photoSection = { id: 'photos', number: 'P', title: 'Photos à prendre', critical: false, fields: photoChecklist };
const reportSections = [quickSection, photoSection, ...sections];
const app = document.querySelector('#app');

let menuOpen = false;
let saveStatus = 'Sauvegardé sur cet appareil';
let photoOpen = false;
let state = loadState();

render();
registerServiceWorker();

app.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === 'start') {
    state = updateCurrentSection({ ...state, started: true }, 0);
    persistAndRender();
  }

  if (action === 'resume') {
    state = { ...state, started: true };
    persistAndRender();
  }

  if (action === 'reset') {
    if (confirm('Réinitialiser toutes les réponses enregistrées sur cet appareil ?')) {
      state = createInitialState();
      persistAndRender();
    }
  }

  if (action === 'prev') {
    goToSection(Math.max(0, state.currentSection - 1));
  }

  if (action === 'next') {
    goToSection(Math.min(sections.length - 1, state.currentSection + 1));
  }

  if (action === 'open-steps') {
    menuOpen = true;
    render();
  }

  if (action === 'close-steps') {
    menuOpen = false;
    render();
  }

  if (action === 'go-section') {
    menuOpen = false;
    goToSection(Number(button.dataset.index));
  }

  if (action === 'answer') {
    state = updateAnswer(state, button.dataset.field, coerceValue(button.dataset.value));
    persistAndRender();
  }

  if (action === 'copy-export') {
    await copyExport();
  }

  if (action === 'copy-email') {
    await copyEmail();
  }

  if (action === 'open-photos') {
    photoOpen = true;
    render();
  }

  if (action === 'close-photos') {
    photoOpen = false;
    render();
  }

  if (action === 'print') {
    window.print();
  }

  if (action === 'download-json') {
    downloadJson();
  }
});

app.addEventListener('input', (event) => {
  const input = event.target.closest('[data-input-field], [data-note-field]');
  if (!input) {
    return;
  }

  if (input.dataset.inputField) {
    state = updateAnswer(state, input.dataset.inputField, input.value);
  }

  if (input.dataset.noteField) {
    const currentValue = state.answers[input.dataset.noteField] ?? '';
    state = updateAnswer(state, input.dataset.noteField, currentValue, input.value);
  }

  persist(false);
  updateLiveStatus();
});

function render() {
  if (!state.started) {
    app.innerHTML = renderHome();
    return;
  }

  const section = sections[state.currentSection] ?? sections[0];
  const progress = getProgress(sections, state);
  const summary = getSummary(reportSections, scoringCriteria, state);

  app.innerHTML = `
    ${renderTopBar(progress)}
    <section class="step-panel ${section.critical ? 'is-critical' : ''}">
      <div class="step-meta">
        <span>${section.number}</span>
        <strong>${escapeHtml(section.badge ?? 'Visite')}</strong>
      </div>
      <h1>${escapeHtml(section.title)}</h1>
      <p class="intro">${escapeHtml(section.intro)}</p>
      ${section.innerQuestion ? `<blockquote>${escapeHtml(section.innerQuestion)}</blockquote>` : ''}
      ${renderReminders(section.reminders)}
      <div class="fields">${section.fields.map((field) => renderField(field)).join('')}</div>
    </section>
    ${state.currentSection === sections.length - 1 ? renderSummary(summary) : ''}
    ${renderBottomNav()}
    ${menuOpen ? renderStepMenu() : ''}
    ${photoOpen ? renderPhotoModal() : ''}
  `;
}

function renderHome() {
  const progress = getProgress(sections, state);
  const hasProgress = progress.answered > 0;

  return `
    <section class="home">
      <div class="home-kicker">Visite immobilière</div>
      <h1>Ce bien doit convaincre. Pas l'inverse.</h1>
      <p>Ouvre cette page avant la visite. Les réponses restent sur cet appareil et l’export final est prêt à coller dans ChatGPT.</p>
      <div class="home-actions">
        <button class="primary-action" type="button" data-action="${hasProgress ? 'resume' : 'start'}">
          ${hasProgress ? "Reprendre où j'étais" : 'Démarrer la visite'}
        </button>
        <button class="secondary-action" type="button" data-action="open-steps">Étapes</button>
        <button class="secondary-action" type="button" data-action="open-photos">Photos</button>
      </div>
      ${renderQuickMode()}
      ${renderPhotoChecklist(false)}
      <div class="guardrails">
        <p>Un point flou n'est pas un point rassurant.</p>
        <p>Un red flag technique ou juridique bloque la décision.</p>
        <p>Pas d'offre orale sous pression.</p>
      </div>
      <button class="text-action" type="button" data-action="reset">Réinitialiser les réponses locales</button>
    </section>
    ${menuOpen ? renderStepMenu() : ''}
    ${photoOpen ? renderPhotoModal() : ''}
  `;
}

function renderTopBar(progress) {
  return `
    <header class="topbar">
      <div>
        <span class="eyebrow">Progression</span>
        <strong>${progress.answered}/${progress.total}</strong>
      </div>
      <div class="progress-track" aria-label="Progression ${progress.percent}%">
        <span style="width:${progress.percent}%"></span>
      </div>
      <button class="step-button" type="button" data-action="open-steps">Étapes</button>
      <button class="step-button" type="button" data-action="open-photos">Photos</button>
      <p id="saveStatus" class="save-status">${escapeHtml(saveStatus)}</p>
    </header>
  `;
}

function renderQuickMode() {
  return `
    <section class="quick-panel">
      <div class="quick-head">
        <span>Mode rapide</span>
        <strong>10 points bloquants</strong>
      </div>
      <p>À utiliser si la visite est groupée, courte ou stressante. Si un point est mauvais, il passe avant la moyenne.</p>
      <div class="fields compact">${quickBlockers.map((field) => renderField(field)).join('')}</div>
    </section>
  `;
}

function renderField(field) {
  const value = state.answers[field.id] ?? '';

  if (field.type === 'choice') {
    return `
      <article class="field-card ${field.important ? 'important' : ''}">
        <div class="field-head">
          <h2>${escapeHtml(field.label)}</h2>
          ${field.required ? '<span>requis</span>' : ''}
        </div>
        <div class="choice-grid">
          ${field.options.map((option) => `
            <button
              class="choice-button ${value === option.value ? 'selected' : ''} ${option.severity ? `severity-${option.severity}` : ''}"
              type="button"
              data-action="answer"
              data-field="${escapeHtml(field.id)}"
              data-value="${escapeHtml(option.value)}"
            >
              ${escapeHtml(option.label)}
            </button>
          `).join('')}
        </div>
        ${renderOptionalNote(field)}
      </article>
    `;
  }

  if (field.type === 'scale') {
    return `
      <article class="field-card ${field.important ? 'important' : ''}">
        <div class="field-head">
          <h2>${escapeHtml(field.label)}</h2>
          ${field.required ? '<span>note /10</span>' : ''}
        </div>
        <div class="scale-grid">
          ${Array.from({ length: 11 }, (_, score) => `
            <button
              class="scale-button ${Number(value) === score ? 'selected' : ''}"
              type="button"
              data-action="answer"
              data-field="${escapeHtml(field.id)}"
              data-value="${score}"
            >
              ${score}
            </button>
          `).join('')}
        </div>
        ${renderOptionalNote(field)}
      </article>
    `;
  }

  if (field.type === 'textarea') {
    return `
      <article class="field-card ${field.important ? 'important' : ''}">
        <label class="text-label" for="${escapeHtml(field.id)}">${escapeHtml(field.label)}</label>
        <textarea
          id="${escapeHtml(field.id)}"
          data-input-field="${escapeHtml(field.id)}"
          rows="4"
          placeholder="${escapeHtml(field.placeholder ?? '')}"
        >${escapeHtml(value)}</textarea>
      </article>
    `;
  }

  return `
    <article class="field-card ${field.important ? 'important' : ''}">
      <label class="text-label" for="${escapeHtml(field.id)}">${escapeHtml(field.label)}</label>
      <input
        id="${escapeHtml(field.id)}"
        data-input-field="${escapeHtml(field.id)}"
        type="text"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(field.placeholder ?? '')}"
      >
    </article>
  `;
}

function renderOptionalNote(field) {
  if (!field.important) {
    return '';
  }

  return `
    <label class="note-label">
      Note pertinente
      <textarea
        data-note-field="${escapeHtml(field.id)}"
        rows="3"
        placeholder="Écris ce qui peut changer la décision."
      >${escapeHtml(state.notes[field.id] ?? '')}</textarea>
    </label>
  `;
}

function renderReminders(reminders = []) {
  if (!reminders.length) {
    return '';
  }

  return `
    <div class="reminders">
      ${reminders.map((reminder) => `<p>${escapeHtml(reminder)}</p>`).join('')}
    </div>
  `;
}

function renderBottomNav() {
  return `
    <nav class="bottom-nav" aria-label="Navigation visite">
      <button class="secondary-action" type="button" data-action="prev" aria-label="Étape précédente" ${state.currentSection === 0 ? 'disabled' : ''}>Préc.</button>
      <button class="secondary-action" type="button" data-action="open-steps">Étapes</button>
      <button class="secondary-action" type="button" data-action="open-photos">Photos</button>
      <button class="primary-action" type="button" data-action="next" aria-label="Étape suivante" ${state.currentSection === sections.length - 1 ? 'disabled' : ''}>Suiv.</button>
    </nav>
  `;
}

function renderStepMenu() {
  return `
    <div class="modal-backdrop">
      <section class="step-menu" role="dialog" aria-modal="true" aria-label="Étapes de visite">
        <div class="menu-head">
          <h2>Aller à une étape</h2>
          <button class="text-action" type="button" data-action="close-steps">Fermer</button>
        </div>
        <button class="primary-action full" type="button" data-action="go-section" data-index="${state.currentSection}">Reprendre où j'étais</button>
        <div class="step-list">
          ${sections.map((section, index) => {
            const status = getSectionStatus(section, state);
            return `
              <button class="step-row ${index === state.currentSection ? 'current' : ''}" type="button" data-action="go-section" data-index="${index}">
                <span>${section.number}</span>
                <strong>${escapeHtml(section.title)}</strong>
                <em>${status}</em>
                ${section.critical ? '<small>critique</small>' : ''}
              </button>
            `;
          }).join('')}
        </div>
      </section>
    </div>
  `;
}

function renderPhotoModal() {
  return `
    <div class="modal-backdrop">
      <section class="step-menu" role="dialog" aria-modal="true" aria-label="Photos à prendre">
        <div class="menu-head">
          <h2>Photos à prendre</h2>
          <button class="text-action" type="button" data-action="close-photos">Fermer</button>
        </div>
        ${renderPhotoChecklist(true)}
      </section>
    </div>
  `;
}

function renderPhotoChecklist(inModal) {
  return `
    <section class="${inModal ? 'photo-panel in-modal' : 'photo-panel'}">
      <div class="quick-head">
        <span>Preuves</span>
        <strong>Checklist photos</strong>
      </div>
      <p>Les photos évitent de reconstruire la visite avec le stress ou l’envie d’acheter.</p>
      <div class="fields compact">${photoChecklist.map((field) => renderField(field)).join('')}</div>
    </section>
  `;
}

function renderSummary(summary) {
  return `
    <section class="summary-panel" id="summary">
      <div class="summary-head">
        <span>Synthèse stricte</span>
        <strong>${summary.average === null ? 'Incomplète' : `${summary.average}/10`}</strong>
      </div>
      <div class="decision ${summary.decision.level}">
        <h2>${escapeHtml(summary.decision.label)}</h2>
        <p>${escapeHtml(summary.decision.reason)}</p>
      </div>
      ${renderIssueList('Red flags détectés', summary.redFlags, 'red')}
      ${renderIssueList('Points flous / manquants', [...summary.warnings, ...summary.missingCritical], 'warning')}
      <div class="export-actions">
        <button class="primary-action" type="button" data-action="copy-export">Copier pour ChatGPT</button>
        <button class="secondary-action" type="button" data-action="copy-email">Copier mail post-visite</button>
        <button class="secondary-action" type="button" data-action="print">Imprimer / PDF</button>
        <button class="secondary-action" type="button" data-action="download-json">Télécharger sauvegarde JSON</button>
      </div>
      <textarea id="exportFallback" class="export-fallback" readonly hidden></textarea>
      ${renderPrintableReport(summary)}
    </section>
  `;
}

function renderPrintableReport(summary) {
  return `
    <section class="print-report">
      <h2>Rapport complet de visite</h2>
      <p><strong>Verdict :</strong> ${escapeHtml(summary.decision.label)} - ${escapeHtml(summary.decision.reason)}</p>
      <p><strong>Moyenne :</strong> ${summary.average === null ? 'Incomplète' : `${summary.average}/10`}</p>
      <h3>Red flags</h3>
      ${renderPrintIssues(summary.redFlags)}
      <h3>Points flous / manquants</h3>
      ${renderPrintIssues([...summary.warnings, ...summary.missingCritical])}
      <h3>Réponses et notes</h3>
      ${reportSections.map((section) => `
        <section class="print-section">
          <h4>${escapeHtml(section.number)}. ${escapeHtml(section.title)}</h4>
          <ul>
            ${section.fields.map((field) => `
              <li>
                <strong>${escapeHtml(field.label)} :</strong>
                ${escapeHtml(formatAnswer(field, state.answers[field.id]))}
                ${state.notes[field.id] ? `<br><em>Note : ${escapeHtml(state.notes[field.id])}</em>` : ''}
              </li>
            `).join('')}
          </ul>
        </section>
      `).join('')}
    </section>
  `;
}

function renderPrintIssues(issues) {
  if (issues.length === 0) {
    return '<p>Aucun signal remonté.</p>';
  }

  return `
    <ul>
      ${issues.map((issue) => `
        <li>
          <strong>${escapeHtml(issue.section)} :</strong>
          ${escapeHtml(issue.label)}
          ${issue.value ? ` (${escapeHtml(issue.value)})` : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

function renderIssueList(title, issues, kind) {
  return `
    <div class="issue-list ${kind}">
      <h3>${escapeHtml(title)}</h3>
      ${issues.length === 0 ? '<p>Aucun signal remonté pour l’instant.</p>' : `
        <ul>
          ${issues.slice(0, 18).map((issue) => `
            <li>
              <span>${escapeHtml(issue.section)}</span>
              <strong>${escapeHtml(issue.label)}</strong>
              ${issue.value ? `<em>${escapeHtml(issue.value)}</em>` : ''}
            </li>
          `).join('')}
        </ul>
      `}
    </div>
  `;
}

function goToSection(index) {
  state = updateCurrentSection(state, index);
  persistAndRender();
}

function persistAndRender() {
  persist();
  render();
}

function persist(shouldRenderStatus = true) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeState(state));
    saveStatus = 'Sauvegardé sur cet appareil';
  } catch {
    saveStatus = "Sauvegarde locale indisponible : exporte régulièrement.";
  }

  if (shouldRenderStatus) {
    updateLiveStatus();
  }
}

function updateLiveStatus() {
  const target = document.querySelector('#saveStatus');
  if (target) {
    target.textContent = saveStatus;
  }
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseState(stored) : createInitialState();
  } catch {
    saveStatus = "Sauvegarde locale indisponible : exporte régulièrement.";
    return createInitialState();
  }
}

async function copyExport() {
  const exportText = generateChatGptExport(reportSections, scoringCriteria, state);
  await writeTextWithFallback(exportText, 'Export copié pour ChatGPT');
}

async function copyEmail() {
  const emailText = generatePostVisitEmail(reportSections, state);
  await writeTextWithFallback(emailText, 'Mail post-visite copié');
}

async function writeTextWithFallback(text, successMessage) {
  const fallback = document.querySelector('#exportFallback');

  try {
    await navigator.clipboard.writeText(text);
    saveStatus = successMessage;
    updateLiveStatus();
  } catch {
    fallback.hidden = false;
    fallback.value = text;
    fallback.focus();
    fallback.select();
    saveStatus = 'Copie impossible : texte affiché ci-dessous';
    updateLiveStatus();
  }
}

function downloadJson() {
  const blob = new Blob([serializeState(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `visite-immo-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') {
    return;
  }

  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function coerceValue(value) {
  const numeric = Number(value);
  return value !== '' && Number.isFinite(numeric) && String(numeric) === value ? numeric : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

window.__VISIT_APP__ = {
  getState: () => state,
  setState: (nextState) => {
    state = nextState;
    persistAndRender();
  },
  sections,
  scoringCriteria,
  collectMissingCritical,
  collectRedFlags,
  collectWarnings,
  formatAnswer,
};
