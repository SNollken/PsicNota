"use strict";

if (!document.querySelector("#reportDocument")) {
  const menuButton = document.querySelector(".mobile-menu");
  const sidebar = document.querySelector(".sidebar");
  menuButton?.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
} else {
const data = window.PsiNoteData;
const supabaseClient = window.PsicNotaSupabase || null;

const params = new URLSearchParams(window.location.search);
const reportId = params.get('id');

const elements = {
  notFound: document.querySelector('#notFound'),
  reportDocument: document.querySelector('#reportDocument'),
  docAvatar: document.querySelector('#docAvatar'),
  docPatient: document.querySelector('#docPatient'),
  docMeta: document.querySelector('#docMeta'),
  docMood: document.querySelector('#docMood'),
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

const MOODS = [
  { key: 'muito-bem', label: 'Muito bem', face: 'M8 14s1.5 2 4 2 4-2 4-2' },
  { key: 'bem', label: 'Bem', face: 'M8 14s1.5 1 4 1 4-1 4-1' },
  { key: 'neutro', label: 'Estável', face: 'M8 14h8' },
  { key: 'mal', label: 'Mal', face: 'M8 16s1.5-2 4-2 4 2 4 2' },
  { key: 'muito-mal', label: 'Muito mal', face: 'M8 16s1.5-3 4-3 4 3 4 3' }
];

async function render() {
  const _auth = await window.PsicNotaBackend.requireProfile("psicologo");
  if (!_auth) return;

  await data.syncRemoteData();

  const report = data.getReports().find((item) => item.id === reportId);
  if (!reportId || !report) {
    elements.notFound.hidden = false;
    elements.reportDocument.hidden = true;
    elements.printButton.hidden = true;
    return;
  }

  elements.docPatient.textContent = report.patient;
  elements.docAvatar.textContent = report.patient.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR');
  if (report.patientId && supabaseClient) {
    try {
      const { data: patient } = await supabaseClient
        .from('perfis')
        .select('avatar_url')
        .eq('id', report.patientId)
        .eq('papel', 'paciente')
        .maybeSingle();
      if (patient?.avatar_url) {
        const { data: avatar } = await supabaseClient
          .storage
          .from('avatars')
          .createSignedUrl(patient.avatar_url, 3600);
        if (avatar?.signedUrl) {
          const image = document.createElement('img');
          image.alt = '';
          image.src = avatar.signedUrl;
          elements.docAvatar.replaceChildren(image);
        }
      }
    } catch {
      elements.docAvatar.textContent = report.patient.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR');
    }
  }
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

  elements.docMood.replaceChildren();
  MOODS.forEach((mood) => {
    const pill = document.createElement('div');
    pill.className = `mood-pill${report.mood === mood.key ? ' is-selected' : ''}`;
    pill.setAttribute('aria-label', mood.label);
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.8');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');
    const face = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    face.setAttribute('cx', '12');
    face.setAttribute('cy', '12');
    face.setAttribute('r', '9');
    const expression = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    expression.setAttribute('d', mood.face);
    const eyes = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    eyes.setAttribute('d', 'M9 10h.01M15 10h.01');
    icon.append(face, expression, eyes);
    const label = document.createElement('span');
    label.textContent = mood.label;
    pill.append(icon, label);
    elements.docMood.append(pill);
  });

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

void render();
}
