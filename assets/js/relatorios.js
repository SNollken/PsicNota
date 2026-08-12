const data = window.PsiNoteData;

const params = new URLSearchParams(window.location.search);
const editReportId = params.get('edit');
const consultaParam = params.get('consulta');
const usarNotas = params.get('usarNotas') === '1';

const elements = {
  pageTitle: document.querySelector('#pageTitle'),
  listView: document.querySelector('#listView'),
  editorView: document.querySelector('#editorView'),
  reportList: document.querySelector('#reportList'),
  emptyReports: document.querySelector('#emptyReports'),
  reportTotal: document.querySelector('#reportTotal'),
  newReportButton: document.querySelector('#newReportButton'),
  reportForm: document.querySelector('#reportForm'),
  editorContext: document.querySelector('#editorContext'),
  reportPatient: document.querySelector('#reportPatient'),
  reportAppointment: document.querySelector('#reportAppointment'),
  blockQueixa: document.querySelector('#blockQueixa'),
  blockIntervencao: document.querySelector('#blockIntervencao'),
  blockEvolucao: document.querySelector('#blockEvolucao'),
  blockProxima: document.querySelector('#blockProxima'),
  freeText: document.querySelector('#freeText'),
  toast: document.querySelector('#toast'),
  toastMessage: document.querySelector('#toastMessage'),
  psychologistName: document.querySelector('#psychologistName'),
  psychologistAvatar: document.querySelector('#psychologistAvatar'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const BLOCKS = [
  { key: 'queixa', label: 'Queixa / demanda da sessão', el: () => elements.blockQueixa },
  { key: 'intervencao', label: 'Intervenção', el: () => elements.blockIntervencao },
  { key: 'evolucao', label: 'Evolução', el: () => elements.blockEvolucao },
  { key: 'proxima', label: 'Próxima sessão', el: () => elements.blockProxima }
];

let toastTimeout = null;

function showToast(message, isError = false) {
  window.clearTimeout(toastTimeout);
  elements.toastMessage.textContent = message;
  elements.toast.classList.toggle('toast-error', isError);
  elements.toast.hidden = false;
  toastTimeout = window.setTimeout(() => { elements.toast.hidden = true; }, 3800);
}

function getInitials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function renderHeader() {
  const session = data.getSession();
  const displayName = (session && (session.fullName || session.name)) || 'Psicólogo PsiNote';
  elements.psychologistName.textContent = displayName;
  elements.psychologistAvatar.textContent = getInitials(displayName);
}

function findAppointment(appointmentId) {
  return data.getAppointments().find((item) => item.id === appointmentId);
}

function appointmentLabel(appointment) {
  if (!appointment) return 'Sem consulta vinculada';
  return `${fullDateFormatter.format(data.fromDateKey(appointment.date))} às ${appointment.time} · ${appointment.patient}`;
}

function buildAppointmentOptions(selectedAppointmentId) {
  const appointments = data.getAppointments()
    .filter((item) => item.status !== 'cancelled')
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  elements.reportAppointment.replaceChildren();
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'Sem consulta vinculada';
  elements.reportAppointment.append(none);

  appointments.forEach((appointment) => {
    const option = document.createElement('option');
    option.value = appointment.id;
    option.textContent = appointmentLabel(appointment);
    if (appointment.id === selectedAppointmentId) option.selected = true;
    elements.reportAppointment.append(option);
  });
}

function renderList() {
  const reports = data.getReports()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  elements.reportList.replaceChildren();
  elements.emptyReports.hidden = reports.length > 0;
  elements.reportTotal.textContent = reports.length === 1 ? '1 relatório' : `${reports.length} relatórios`;

  reports.forEach((report) => {
    const card = document.createElement('article');
    card.className = 'report-card';

    const top = document.createElement('div');
    top.className = 'report-card-top';
    const titleWrap = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = report.patient;
    const meta = document.createElement('span');
    meta.className = 'report-card-meta';
    const appointment = report.appointmentId ? findAppointment(report.appointmentId) : null;
    meta.textContent = appointment
      ? `Consulta de ${shortDateFormatter.format(data.fromDateKey(appointment.date))} às ${appointment.time}`
      : 'Sem consulta vinculada';
    titleWrap.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'action-row';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'button button-secondary button-compact';
    editButton.textContent = 'Editar';
    editButton.addEventListener('click', () => {
      window.location.href = `relatorios.html?edit=${encodeURIComponent(report.id)}`;
    });
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'button button-secondary button-compact';
    deleteButton.textContent = 'Excluir';
    deleteButton.addEventListener('click', () => {
      if (!window.confirm(`Excluir o relatório de ${report.patient}? Essa ação não pode ser desfeita.`)) return;
      data.saveReports(data.getReports().filter((item) => item.id !== report.id));
      renderList();
      showToast('Relatório excluído.');
    });
    actions.append(editButton, deleteButton);
    top.append(titleWrap, actions);

    const filledBlocks = BLOCKS.filter((block) => (report.blocks?.[block.key] || '').trim());
    const blocksWrap = document.createElement('div');
    blocksWrap.className = 'report-blocks';
    filledBlocks.forEach((block) => {
      const tag = document.createElement('span');
      tag.className = 'report-block-tag';
      tag.textContent = block.label;
      blocksWrap.append(tag);
    });

    const previewText = [
      ...filledBlocks.map((block) => report.blocks[block.key].trim()),
      (report.freeText || '').trim()
    ].filter(Boolean).join(' ');
    const preview = document.createElement('p');
    preview.className = 'report-card-preview';
    preview.textContent = previewText ? `${previewText.slice(0, 220)}${previewText.length > 220 ? '…' : ''}` : 'Sem conteúdo registrado.';

    const updated = document.createElement('span');
    updated.className = 'report-card-meta';
    updated.textContent = `Atualizado em ${shortDateFormatter.format(new Date(report.updatedAt || report.createdAt))}`;

    card.append(top, blocksWrap, preview, updated);
    elements.reportList.append(card);
  });
}

function openEditor(report, appointmentId) {
  elements.listView.hidden = true;
  elements.editorView.hidden = false;
  elements.pageTitle.textContent = report ? 'Editar relatório' : 'Novo relatório';
  elements.newReportButton.hidden = true;

  buildAppointmentOptions(report?.appointmentId || appointmentId || '');

  elements.reportPatient.value = report?.patient || '';
  elements.blockQueixa.value = report?.blocks?.queixa || '';
  elements.blockIntervencao.value = report?.blocks?.intervencao || '';
  elements.blockEvolucao.value = report?.blocks?.evolucao || '';
  elements.blockProxima.value = report?.blocks?.proxima || '';
  elements.freeText.value = report?.freeText || '';

  if (usarNotas && appointmentId) {
    const note = data.getAppointmentNote(appointmentId);
    if (note) {
      elements.freeText.value = [elements.freeText.value, note].filter(Boolean).join('\n\n');
      showToast('As notas rápidas da consulta foram adicionadas ao texto livre.');
    }
  }

  const appointment = (report?.appointmentId || appointmentId) ? findAppointment(report?.appointmentId || appointmentId) : null;
  elements.editorContext.textContent = appointment
    ? `Consulta de ${appointment.patient} em ${fullDateFormatter.format(data.fromDateKey(appointment.date))} às ${appointment.time}.`
    : 'Nenhuma consulta vinculada ainda.';

  if (!elements.reportPatient.value && appointment) {
    elements.reportPatient.value = appointment.patient;
  }
}

function handleReportSubmit(event) {
  event.preventDefault();
  const patient = elements.reportPatient.value.trim();
  if (!patient) {
    showToast('Informe o nome do paciente antes de salvar.', true);
    elements.reportPatient.focus();
    return;
  }

  const blocks = {};
  BLOCKS.forEach((block) => {
    blocks[block.key] = block.el().value.trim();
  });

  const reports = data.getReports();
  const existing = editReportId ? reports.find((item) => item.id === editReportId) : null;
  const appointmentId = elements.reportAppointment.value || null;

  if (existing) {
    existing.patient = patient;
    existing.appointmentId = appointmentId;
    existing.blocks = blocks;
    existing.freeText = elements.freeText.value.trim();
    existing.updatedAt = new Date().toISOString();
  } else {
    reports.push({
      id: data.createId('report'),
      patient,
      appointmentId,
      blocks,
      freeText: elements.freeText.value.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  data.saveReports(reports);
  showToast('Relatório salvo. Ele já aparece no histórico do paciente.');
  window.location.href = 'relatorios.html';
}

function init() {
  renderHeader();

  elements.reportForm.addEventListener('submit', handleReportSubmit);
  document.querySelector('#cancelEditButton').addEventListener('click', () => {
    window.location.href = 'relatorios.html';
  });
  elements.newReportButton.addEventListener('click', () => openEditor(null, null));

  if (editReportId) {
    const report = data.getReports().find((item) => item.id === editReportId);
    if (!report) {
      showToast('Relatório não encontrado.', true);
      renderList();
      return;
    }
    openEditor(report, null);
    return;
  }

  if (consultaParam) {
    const existingReport = data.getReports().find((item) => item.appointmentId === consultaParam);
    openEditor(existingReport || null, consultaParam);
    return;
  }

  renderList();
}

elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());

init();
