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
  backToListButton: document.querySelector('#backToListButton'),
  reportForm: document.querySelector('#reportForm'),
  editorContext: document.querySelector('#editorContext'),
  reportPatient: document.querySelector('#reportPatient'),
  reportAppointment: document.querySelector('#reportAppointment'),
  appointmentInfoGrid: document.querySelector('#appointmentInfoGrid'),
  reportInfoPatient: document.querySelector('#reportInfoPatient'),
  reportInfoDate: document.querySelector('#reportInfoDate'),
  reportInfoTime: document.querySelector('#reportInfoTime'),
  reportInfoDuration: document.querySelector('#reportInfoDuration'),
  reportInfoMode: document.querySelector('#reportInfoMode'),
  blockQueixa: document.querySelector('#blockQueixa'),
  blockIntervencao: document.querySelector('#blockIntervencao'),
  blockEvolucao: document.querySelector('#blockEvolucao'),
  blockProxima: document.querySelector('#blockProxima'),
  freeText: document.querySelector('#freeText'),
  draftStatus: document.querySelector('#draftStatus'),
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
  { key: 'queixa', label: 'Queixa principal', el: () => elements.blockQueixa },
  { key: 'intervencao', label: 'Intervenções realizadas', el: () => elements.blockIntervencao },
  { key: 'evolucao', label: 'Evolução do paciente', el: () => elements.blockEvolucao },
  { key: 'proxima', label: 'Encaminhamentos', el: () => elements.blockProxima }
];

const DRAFT_KEY = 'psinote.reportDraft';
let draftTimer = null;

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

function formatDuration(duration) {
  const value = Number(duration);
  if (value === 60) return '1 hora';
  return `${value} minutos`;
}

function renderAppointmentInfo(appointment) {
  if (!appointment) {
    elements.appointmentInfoGrid.hidden = true;
    return;
  }
  elements.appointmentInfoGrid.hidden = false;
  elements.reportInfoPatient.value = appointment.patient;
  elements.reportInfoDate.value = shortDateFormatter.format(data.fromDateKey(appointment.date));
  elements.reportInfoTime.value = appointment.time;
  elements.reportInfoDuration.value = formatDuration(appointment.duration);
  elements.reportInfoMode.value = appointment.mode;
}

function draftContextId() {
  return editReportId || elements.reportAppointment.value || 'novo';
}

function saveDraft() {
  const draft = {
    contextId: draftContextId(),
    patient: elements.reportPatient.value,
    appointmentId: elements.reportAppointment.value,
    blocks: {
      queixa: elements.blockQueixa.value,
      intervencao: elements.blockIntervencao.value,
      evolucao: elements.blockEvolucao.value,
      proxima: elements.blockProxima.value
    },
    freeText: elements.freeText.value,
    savedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    elements.draftStatus.textContent = `Rascunho salvo automaticamente às ${time}`;
  } catch {
    elements.draftStatus.textContent = '';
  }
}

function scheduleDraftSave() {
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(saveDraft, 800);
}

function clearDraft() {
  window.clearTimeout(draftTimer);
  localStorage.removeItem(DRAFT_KEY);
  elements.draftStatus.textContent = '';
}

function loadDraftIfMatches() {
  let draft = null;
  try {
    draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  } catch {
    draft = null;
  }
  if (!draft || draft.contextId !== draftContextId()) return false;
  elements.reportPatient.value = draft.patient || elements.reportPatient.value;
  if (draft.blocks) {
    elements.blockQueixa.value = draft.blocks.queixa || '';
    elements.blockIntervencao.value = draft.blocks.intervencao || '';
    elements.blockEvolucao.value = draft.blocks.evolucao || '';
    elements.blockProxima.value = draft.blocks.proxima || '';
  }
  elements.freeText.value = draft.freeText || '';
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(draft.savedAt));
  elements.draftStatus.textContent = `Rascunho recuperado (salvo às ${time})`;
  return true;
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
    const viewButton = document.createElement('a');
    viewButton.className = 'button button-secondary button-compact';
    viewButton.href = `relatorio-view.html?id=${encodeURIComponent(report.id)}`;
    viewButton.textContent = 'Ver';
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
    actions.append(viewButton, editButton, deleteButton);
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
  elements.pageTitle.textContent = 'Relatório de Consulta';
  elements.newReportButton.hidden = true;
  elements.backToListButton.hidden = false;

  const targetAppointmentId = report?.appointmentId || appointmentId || '';
  buildAppointmentOptions(targetAppointmentId);

  elements.reportPatient.value = report?.patient || '';
  elements.blockQueixa.value = report?.blocks?.queixa || '';
  elements.blockIntervencao.value = report?.blocks?.intervencao || '';
  elements.blockEvolucao.value = report?.blocks?.evolucao || '';
  elements.blockProxima.value = report?.blocks?.proxima || '';
  elements.freeText.value = report?.freeText || '';

  const appointment = targetAppointmentId ? findAppointment(targetAppointmentId) : null;
  renderAppointmentInfo(appointment);

  if (usarNotas && appointmentId) {
    const note = data.getAppointmentNote(appointmentId);
    if (note) {
      elements.freeText.value = [elements.freeText.value, note].filter(Boolean).join('\n\n');
      showToast('As notas rápidas da consulta foram adicionadas ao texto livre.');
    }
  }

  elements.editorContext.textContent = appointment
    ? `Consulta de ${appointment.patient} em ${fullDateFormatter.format(data.fromDateKey(appointment.date))} às ${appointment.time}.`
    : 'Nenhuma consulta vinculada ainda.';

  if (!elements.reportPatient.value && appointment) {
    elements.reportPatient.value = appointment.patient;
  }

  if (!report) {
    loadDraftIfMatches();
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
  clearDraft();
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
  elements.backToListButton.addEventListener('click', () => {
    window.location.href = 'relatorios.html';
  });

  elements.reportAppointment.addEventListener('change', () => {
    const appointment = elements.reportAppointment.value ? findAppointment(elements.reportAppointment.value) : null;
    renderAppointmentInfo(appointment);
    elements.editorContext.textContent = appointment
      ? `Consulta de ${appointment.patient} em ${fullDateFormatter.format(data.fromDateKey(appointment.date))} às ${appointment.time}.`
      : 'Nenhuma consulta vinculada ainda.';
    if (appointment && !elements.reportPatient.value.trim()) {
      elements.reportPatient.value = appointment.patient;
    }
    scheduleDraftSave();
  });

  [elements.reportPatient, elements.blockQueixa, elements.blockIntervencao, elements.blockEvolucao, elements.blockProxima, elements.freeText].forEach((control) => {
    control.addEventListener('input', scheduleDraftSave);
  });

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
