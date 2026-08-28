"use strict";

if (!document.querySelector("#reportDocument")) {
  const menuButton = document.querySelector(".mobile-menu");
  const sidebar = document.querySelector(".sidebar");
  menuButton?.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
  document.addEventListener("click", (event) => {
    if (window.innerWidth <= 720 && sidebar && menuButton
      && !sidebar.contains(event.target) && !menuButton.contains(event.target)) {
      sidebar.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
} else {
const data = window.PsiNoteData;

const params = new URLSearchParams(window.location.search);
const reportId = params.get('id');

const elements = {
  notFound: document.querySelector('#notFound'),
  reportDocument: document.querySelector('#reportDocument'),
  docPatient: document.querySelector('#docPatient'),
  docMeta: document.querySelector('#docMeta'),
  docMood: document.querySelector('#docMood'),
  docAttachments: document.querySelector('#docAttachments'),
  docDraftBadge: document.querySelector('#docDraftBadge'),
  docBlocks: document.querySelector('#docBlocks'),
  printButton: document.querySelector('#printButton'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const BLOCKS = [
  { key: 'queixa', label: 'Queixa principal' },
  { key: 'intervencao', label: 'Intervenções realizadas' },
  { key: 'evolucao', label: 'Evolução do paciente' },
  { key: 'proxima', label: 'Encaminhamentos' }
];

function render() {
  const report = data.getReports().find((item) => item.id === reportId);
  if (!reportId || !report) {
    elements.notFound.hidden = false;
    elements.reportDocument.hidden = true;
    elements.printButton.hidden = true;
    return;
  }

  elements.docPatient.textContent = report.patient;
  elements.notFound.hidden = true;
  elements.reportDocument.hidden = false;
  elements.printButton.hidden = false;

  const appointment = report.appointmentId
    ? data.getAppointments().find((item) => item.id === report.appointmentId)
    : null;
  elements.docMeta.textContent = appointment
    ? `${fullDateFormatter.format(data.fromDateKey(appointment.date))} · ${appointment.time} · ${appointment.duration} min · ${appointment.mode}`
    : `Atualizado em ${shortDateFormatter.format(new Date(report.updatedAt || report.createdAt))}`;

  elements.docDraftBadge.hidden = report.status !== 'rascunho';

  const MOODS = {
    'muito-bem': { label: 'Muito bem', emoji: '😄' },
    bem: { label: 'Bem', emoji: '🙂' },
    neutro: { label: 'Estável', emoji: '😐' },
    mal: { label: 'Mal', emoji: '🙁' },
    'muito-mal': { label: 'Muito mal', emoji: '😞' }
  };
  const mood = MOODS[report.mood];
  elements.docMood.hidden = !mood;
  if (mood) {
    elements.docMood.textContent = `Emoção do dia: ${mood.emoji} ${mood.label}`;
  }

  const attachments = Array.isArray(report.attachments) ? report.attachments : [];
  elements.docAttachments.hidden = attachments.length === 0;
  elements.docAttachments.replaceChildren();
  if (attachments.length > 0) {
    const label = document.createElement('span');
    label.className = 'report-block-label';
    label.textContent = attachments.length === 1 ? 'Anexo' : 'Anexos';
    elements.docAttachments.append(label);
    attachments.forEach((file) => {
      const chip = document.createElement('span');
      chip.className = 'attach-chip attach-chip-static';
      chip.textContent = `📎 ${file.name}`;
      elements.docAttachments.append(chip);
    });
  }

  elements.docBlocks.replaceChildren();
  BLOCKS.forEach((block) => {
    const text = (report.blocks?.[block.key] || '').trim();
    if (!text) return;
    const wrap = document.createElement('div');
    wrap.className = 'report-block';
    const label = document.createElement('span');
    label.className = 'report-block-label';
    label.textContent = block.label;
    const body = document.createElement('p');
    body.className = 'report-block-text';
    body.textContent = text;
    wrap.append(label, body);
    elements.docBlocks.append(wrap);
  });

  const free = (report.freeText || '').trim();
  if (free) {
    const wrap = document.createElement('div');
    wrap.className = 'report-block';
    const label = document.createElement('span');
    label.className = 'report-block-label';
    label.textContent = 'Texto livre';
    const body = document.createElement('p');
    body.className = 'report-block-text';
    body.textContent = free;
    wrap.append(label, body);
    elements.docBlocks.append(wrap);
  }
}

elements.printButton.addEventListener('click', () => window.print());
elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());

render();
}
