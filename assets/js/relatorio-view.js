const data = window.PsiNoteData;

const params = new URLSearchParams(window.location.search);
const reportId = params.get('id');

const elements = {
  notFound: document.querySelector('#notFound'),
  reportDocument: document.querySelector('#reportDocument'),
  docPatient: document.querySelector('#docPatient'),
  docMeta: document.querySelector('#docMeta'),
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

  const appointment = report.appointmentId
    ? data.getAppointments().find((item) => item.id === report.appointmentId)
    : null;
  elements.docMeta.textContent = appointment
    ? `${fullDateFormatter.format(data.fromDateKey(appointment.date))} · ${appointment.time} · ${appointment.duration} min · ${appointment.mode}`
    : `Atualizado em ${shortDateFormatter.format(new Date(report.updatedAt || report.createdAt))}`;

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
