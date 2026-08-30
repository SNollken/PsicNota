"use strict";

if (!document.querySelector("#introTitle")) {
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
const patientName = params.get('paciente') || '';

const elements = {
  introTitle: document.querySelector('#introTitle'),
  timeline: document.querySelector('#timeline'),
  emptyTimeline: document.querySelector('#emptyTimeline'),
  statConsultas: document.querySelector('#statConsultas'),
  statRelatorios: document.querySelector('#statRelatorios'),
  statNotas: document.querySelector('#statNotas'),
  statDocs: document.querySelector('#statDocs'),
  docList: document.querySelector('#docList'),
  emptyDocs: document.querySelector('#emptyDocs'),
  psychologistName: document.querySelector('#psychologistName'),
  psychologistAvatar: document.querySelector('#psychologistAvatar'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function getInitials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function renderHeader() {
  const session = data.getSession();
  const displayName = (session && (session.fullName || session.name)) || 'Psicólogo PsiNote';
  elements.psychologistName.textContent = displayName;
  elements.psychologistAvatar.textContent = getInitials(displayName);
}

function addTimelineItem({ kind, title, when, body }) {
  const item = document.createElement('div');
  item.className = `timeline-item timeline-${kind}`;
  const titleEl = document.createElement('p');
  titleEl.className = 'timeline-title';
  titleEl.textContent = title;
  const whenEl = document.createElement('p');
  whenEl.className = 'timeline-when';
  whenEl.textContent = when;
  item.append(titleEl, whenEl);
  if (body) {
    const bodyEl = document.createElement('p');
    bodyEl.className = 'timeline-body';
    bodyEl.textContent = body;
    item.append(bodyEl);
  }
  elements.timeline.append(item);
}

function init() {
  renderHeader();

  if (!patientName) {
    elements.introTitle.textContent = 'Nenhum paciente selecionado';
    elements.emptyTimeline.hidden = false;
    return;
  }

  elements.introTitle.textContent = patientName;
  document.title = `PsicNota | Histórico de ${patientName}`;

  const appointments = data.getAppointments()
    .filter((item) => item.patient === patientName)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const reports = data.getReports()
    .filter((report) => report.patient === patientName)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  const documents = data.getDocuments()
    .filter((doc) => doc.patient === patientName)
    .sort((a, b) => new Date(b.attachedAt) - new Date(a.attachedAt));

  const notesCount = appointments.filter((item) => data.hasAppointmentNote(item.id)).length;

  elements.statConsultas.textContent = String(appointments.filter((item) => item.status !== 'cancelled').length);
  elements.statRelatorios.textContent = String(reports.length);
  elements.statNotas.textContent = String(notesCount);
  elements.statDocs.textContent = String(documents.length);

  const entries = [];

  appointments.forEach((appointment) => {
    const date = data.fromDateKey(appointment.date);
    const cancelled = appointment.status === 'cancelled';
    const note = data.getAppointmentNote(appointment.id);
    entries.push({
      sortKey: `${appointment.date}T${appointment.time}`,
      kind: cancelled ? 'cancelled' : 'consultation',
      title: cancelled
        ? `Consulta cancelada · ${appointment.time} · ${appointment.mode}`
        : `Consulta confirmada · ${appointment.time} · ${appointment.mode}`,
      when: fullDateFormatter.format(date),
      body: [appointment.observation, note ? `Notas rápidas:\n${note}` : ''].filter(Boolean).join('\n\n')
    });
  });

  reports.forEach((report) => {
    const blocksText = Object.entries(report.blocks || {})
      .filter(([, value]) => value && value.trim())
      .map(([key, value]) => {
        const labels = { queixa: 'Queixa', intervencao: 'Intervenção', evolucao: 'Evolução', proxima: 'Próxima sessão' };
        return `${labels[key] || key}: ${value.trim()}`;
      })
      .join('\n');
    entries.push({
      sortKey: (report.updatedAt || report.createdAt || '').slice(0, 16).replace('T', 'T'),
      kind: 'report',
      title: 'Relatório pós-consulta',
      when: `Atualizado em ${shortDateFormatter.format(new Date(report.updatedAt || report.createdAt))}`,
      body: [blocksText, report.freeText || ''].filter(Boolean).join('\n\n')
    });
  });

  entries.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  elements.timeline.replaceChildren();
  elements.emptyTimeline.hidden = entries.length > 0;
  entries.forEach((entry) => addTimelineItem(entry));

  elements.docList.replaceChildren();
  elements.emptyDocs.hidden = documents.length > 0;
  documents.forEach((doc) => {
    const item = document.createElement('div');
    item.className = 'doc-item';
    const info = document.createElement('div');
    info.className = 'doc-item-info';
    const title = document.createElement('strong');
    title.textContent = doc.name;
    const meta = document.createElement('span');
    meta.textContent = `${doc.type === 'laudo' ? 'Laudo' : 'Receita'} · anexado em ${shortDateFormatter.format(new Date(doc.attachedAt))}`;
    info.append(title, meta);
    const badge = document.createElement('span');
    badge.className = doc.type === 'laudo' ? 'badge badge-laudos' : 'badge badge-receita';
    badge.textContent = doc.type === 'laudo' ? 'Laudo' : 'Receita';
    item.append(info, badge);
    elements.docList.append(item);
  });
}

elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());

init();
}
