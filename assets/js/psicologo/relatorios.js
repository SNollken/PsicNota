"use strict";

const data = window.PsiNoteData;
const supabaseClient = window.PsicNotaSupabase || null;

if (!data) {
  throw new Error(
    "PsiNoteData não foi carregado. Verifique se shared-data.js é carregado antes."
  );
}

const params = new URLSearchParams(window.location.search);
const editReportId = params.get('edit');
const consultaParam = params.get('consulta');
const novoReportParam = params.get('novo') === '1';
const usarNotas = params.get('usarNotas') === '1';

const elements = {
  pageTitle: document.querySelector('#pageTitle'),
  pageTopbar: document.querySelector('#pageTopbar'),
  listView: document.querySelector('#listView'),
  editorView: document.querySelector('#editorView'),
  reportList: document.querySelector('#reportList'),
  emptyReports: document.querySelector('#emptyReports'),
  reportTotal: document.querySelector('#reportTotal'),
  newReportButton: document.querySelector('#newReportButton'),
  backToListButton: document.querySelector('#backToListButton'),
  reportForm: document.querySelector('#reportForm'),
  reportPatient: document.querySelector('#reportPatient'),
  reportAppointment: document.querySelector('#reportAppointment'),
  reportPatientAvatar: document.querySelector('#reportPatientAvatar'),
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
  moodPicker: document.querySelector('#moodPicker'),
  saveDraftButton: document.querySelector('#saveDraftButton'),
  draftStatus: document.querySelector('#draftStatus'),
  toast: document.querySelector('#toast'),
  toastMessage: document.querySelector('#toastMessage'),
  psychologistName: document.querySelector('#psychologistName'),
  psychologistAvatar: document.querySelector('#psychologistAvatar'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const dropdownBtn = document.querySelector('#appointmentDropdownBtn');
const dropdownList = document.querySelector('#appointmentDropdownList');
const dropdownPillAvatar = document.querySelector('#dropdownPillAvatar');
const dropdownPillLabel = document.querySelector('#dropdownPillLabel');

function dropdownItems() {
  return dropdownList ? Array.from(dropdownList.querySelectorAll('[role="option"]')) : [];
}

function toggleDropdown(open) {
  if (!dropdownBtn || !dropdownList) return;
  const willOpen = open === undefined ? dropdownList.hidden : open;
  dropdownList.hidden = !willOpen;
  dropdownBtn.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) {
    const sel = dropdownList.querySelector('[aria-selected="true"]') || dropdownList.querySelector('[role="option"]');
    if (sel) sel.focus();
  }
}

function updateDropdownTrigger(appointment) {
  if (!dropdownBtn) return;
  const label = appointment ? appointmentLabel(appointment) : 'Sem consulta vinculada';
  const initials = appointment ? getInitials(appointment.patient) : 'PS';
  if (dropdownPillLabel) dropdownPillLabel.textContent = label;
  if (dropdownPillAvatar) dropdownPillAvatar.replaceChildren(Object.assign(document.createElement('span'), { textContent: initials }));
}

function selectAppointmentInDropdown(value) {
  const target = value == null ? '' : String(value);
  if (elements.reportAppointment) elements.reportAppointment.value = target;
  if (dropdownList) {
    dropdownList.querySelectorAll('[role="option"]').forEach((el) => {
      el.setAttribute('aria-selected', String(el.dataset.value === target));
    });
  }
  const appointment = target ? findAppointment(target) : null;
  updateDropdownTrigger(appointment);
  if (elements.reportAppointment) elements.reportAppointment.dispatchEvent(new Event('change'));
  toggleDropdown(false);
}

if (dropdownBtn && dropdownList) {
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });
  dropdownBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown(true);
    } else if (e.key === 'Escape') {
      toggleDropdown(false);
    }
  });
  dropdownList.addEventListener('click', (e) => {
    const item = e.target.closest('[role="option"]');
    if (item) selectAppointmentInDropdown(item.dataset.value);
  });
  dropdownList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const item = e.target.closest('[role="option"]');
      if (item) {
        e.preventDefault();
        selectAppointmentInDropdown(item.dataset.value);
      }
    }
  });
  dropdownList.addEventListener('keydown', (e) => {
    const items = dropdownItems();
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      (items[idx + 1] || items[0])?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      (items[idx - 1] || items[items.length - 1])?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      toggleDropdown(false);
      dropdownBtn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!dropdownList.hidden && !e.target.closest('.report-consultation-select')) toggleDropdown(false);
  });
}

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const DOCUMENT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';
const CHEVRON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

const BLOCKS = [
  { key: 'queixa', label: 'Queixa principal', el: () => elements.blockQueixa },
  { key: 'intervencao', label: 'Intervenções realizadas', el: () => elements.blockIntervencao },
  { key: 'evolucao', label: 'Evolução do paciente', el: () => elements.blockEvolucao },
  { key: 'proxima', label: 'Encaminhamentos', el: () => elements.blockProxima }
];

let currentMood = null;

function getFreeText() {
  return elements.freeText.isContentEditable
    ? elements.freeText.innerText
    : elements.freeText.value;
}

function setFreeText(value) {
  if (elements.freeText.isContentEditable) {
    elements.freeText.textContent = value;
  } else {
    elements.freeText.value = value;
  }
}

function renderMoodPicker() {
  elements.moodPicker.querySelectorAll('.mood-option').forEach((option) => {
    const selected = option.dataset.mood === currentMood;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-checked', String(selected));
  });
}

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

function renderHeader() {
  const session = data.getSession();
  const displayName = (session && (session.fullName || session.name)) || 'Psicólogo PsiNote';
  elements.psychologistName.textContent = displayName;
}

function findAppointment(appointmentId) {
  return data.getAppointments().find((item) => item.id === appointmentId);
}

function findPatientIdByName(name) {
  const normalized = String(name).trim().toLowerCase();
  return data.getAppointments().find((item) => String(item.patient).trim().toLowerCase() === normalized)?.patientId || null;
}

function getInitials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PS';
}

function renderPatientAvatar(appointment) {
  if (!elements.reportPatientAvatar) return;
  const name = appointment?.patient || '';
  elements.reportPatientAvatar.replaceChildren();
  const fallback = document.createElement('span');
  fallback.textContent = getInitials(name);
  elements.reportPatientAvatar.append(fallback);

  if (!supabaseClient || !appointment?.patientId) return;
  const patientId = appointment.patientId;
  supabaseClient
    .from('perfis')
    .select('avatar_url')
    .eq('id', patientId)
    .eq('papel', 'paciente')
    .maybeSingle()
    .then(({ data: patient, error }) => {
      if (error || !patient?.avatar_url) return null;
      return supabaseClient.storage.from('avatars').createSignedUrl(patient.avatar_url, 3600);
    })
    .then((signed) => {
      if (!signed?.data?.signedUrl) return;
      if (elements.reportAppointment.value !== appointment.id) return;
      const image = document.createElement('img');
      image.alt = '';
      image.addEventListener('load', () => elements.reportPatientAvatar.replaceChildren(image), { once: true });
      image.src = signed.data.signedUrl;
    })
    .catch(() => {});
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
    mood: currentMood,
    blocks: {
      queixa: elements.blockQueixa.value,
      intervencao: elements.blockIntervencao.value,
      evolucao: elements.blockEvolucao.value,
      proxima: elements.blockProxima.value
    },
    freeText: getFreeText(),
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
  currentMood = draft.mood || null;
  renderMoodPicker();
  if (draft.blocks) {
    elements.blockQueixa.value = draft.blocks.queixa || '';
    elements.blockIntervencao.value = draft.blocks.intervencao || '';
    elements.blockEvolucao.value = draft.blocks.evolucao || '';
    elements.blockProxima.value = draft.blocks.proxima || '';
  }
  setFreeText(draft.freeText || '');
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

  if (dropdownList) {
    dropdownList.replaceChildren();

    const noneItem = document.createElement('li');
    noneItem.setAttribute('role', 'presentation');
    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.setAttribute('role', 'option');
    noneBtn.className = 'appointment-dropdown-item';
    noneBtn.dataset.value = '';
    const noneAv = document.createElement('span');
    noneAv.className = 'dropdown-pill-avatar';
    noneAv.textContent = '—';
    const noneLb = document.createElement('span');
    noneLb.className = 'dropdown-pill-label';
    noneLb.textContent = 'Sem consulta vinculada';
    noneBtn.append(noneAv, noneLb);
    noneBtn.setAttribute('aria-selected', selectedAppointmentId ? 'false' : 'true');
    noneItem.append(noneBtn);
    dropdownList.append(noneItem);

    appointments.forEach((appointment) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'presentation');
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.className = 'appointment-dropdown-item';
      b.dataset.value = appointment.id;
      const av = document.createElement('span');
      av.className = 'dropdown-pill-avatar';
      av.textContent = getInitials(appointment.patient);
      const lb = document.createElement('span');
      lb.className = 'dropdown-pill-label';
      lb.textContent = appointmentLabel(appointment);
      b.append(av, lb);
      b.setAttribute('aria-selected', String(appointment.id === selectedAppointmentId));
      li.append(b);
      dropdownList.append(li);
    });

    const selected = selectedAppointmentId ? findAppointment(selectedAppointmentId) : null;
    updateDropdownTrigger(selected);
  }
}

function renderList() {
  const reports = data.getReports()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  elements.reportList.replaceChildren();
  elements.emptyReports.hidden = reports.length > 0;
  elements.reportTotal.textContent = reports.length === 1 ? '1 relatório' : `${reports.length} relatórios`;

  elements.pageTopbar.classList.remove('report-editor-topbar');
  elements.pageTopbar.classList.add('reports-topbar');
  elements.reportTotal.hidden = false;

  reports.forEach((report) => {
    const appointment = report.appointmentId ? findAppointment(report.appointmentId) : null;

    const card = document.createElement('article');
    card.className = 'report-card';

    const main = document.createElement('a');
    main.className = 'report-card-main';
    main.href = `relatorio-view.html?id=${encodeURIComponent(report.id)}`;

    const icon = document.createElement('span');
    icon.className = 'report-card-icon';
    icon.innerHTML = DOCUMENT_ICON;

    const body = document.createElement('span');
    body.className = 'report-card-body';

    const titleline = document.createElement('span');
    titleline.className = 'report-card-titleline';
    const title = document.createElement('strong');
    title.textContent = report.patient;
    titleline.append(title);
    if (report.status === 'rascunho') {
      const draftBadge = document.createElement('span');
      draftBadge.className = 'badge report-draft-badge';
      draftBadge.textContent = 'Rascunho';
      titleline.append(draftBadge);
    }
    body.append(titleline);

    const meta = document.createElement('span');
    meta.className = 'report-card-meta';
    meta.textContent = appointment
      ? [
          shortDateFormatter.format(data.fromDateKey(appointment.date)),
          appointment.time,
          appointment.mode
        ].filter(Boolean).join(' · ')
      : `Atualizado em ${shortDateFormatter.format(new Date(report.updatedAt || report.createdAt))}`;
    body.append(meta);

    const chevron = document.createElement('span');
    chevron.className = 'report-card-chevron';
    chevron.innerHTML = CHEVRON_ICON;

    main.append(icon, body, chevron);

    const actions = document.createElement('div');
    actions.className = 'report-card-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'report-card-action';
    editButton.setAttribute('aria-label', `Editar relatório de ${report.patient}`);
    editButton.innerHTML = EDIT_ICON;
    editButton.addEventListener('click', () => {
      window.location.href = `relatorios.html?edit=${encodeURIComponent(report.id)}`;
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'report-card-action';
    deleteButton.setAttribute('aria-label', `Excluir relatório de ${report.patient}`);
    deleteButton.innerHTML = TRASH_ICON;
    deleteButton.addEventListener('click', async () => {
      if (!window.confirm(`Excluir o relatório de ${report.patient}? Essa ação não pode ser desfeita.`)) return;
      await data.deleteReportFromDb(report.id);
      data.saveReports(data.getReports().filter((item) => item.id !== report.id));
      renderList();
      showToast('Relatório excluído.');
    });

    actions.append(editButton, deleteButton);

    card.append(main, actions);
    elements.reportList.append(card);
  });
}

function openEditor(report, appointmentId) {
  elements.listView.hidden = true;
  elements.editorView.hidden = false;
  elements.pageTitle.textContent = report ? 'Editar relatório da consulta' : 'Novo relatório da consulta';
  elements.pageTopbar.classList.remove('reports-topbar');
  elements.pageTopbar.classList.add('report-editor-topbar');
  elements.reportTotal.hidden = true;
  elements.newReportButton.hidden = true;
  if (elements.backToListButton) elements.backToListButton.hidden = false;

  const targetAppointmentId = report?.appointmentId || appointmentId || '';
  buildAppointmentOptions(targetAppointmentId);

  elements.reportPatient.value = report?.patient || '';
  currentMood = report?.mood
    || (targetAppointmentId ? data.getAppointmentMood(targetAppointmentId) || null : null)
    || null;
  renderMoodPicker();
  elements.blockQueixa.value = report?.blocks?.queixa || '';
  elements.blockIntervencao.value = report?.blocks?.intervencao || '';
  elements.blockEvolucao.value = report?.blocks?.evolucao || '';
  elements.blockProxima.value = report?.blocks?.proxima || '';
  setFreeText(report?.freeText || '');

  const appointment = targetAppointmentId ? findAppointment(targetAppointmentId) : null;
  renderAppointmentInfo(appointment);
  renderPatientAvatar(appointment);

  if (usarNotas && appointmentId) {
    const note = data.getAppointmentNote(appointmentId);
    if (note) {
      setFreeText([getFreeText(), note].filter(Boolean).join('\n\n'));
      showToast('As notas rápidas da consulta foram adicionadas ao texto livre.');
    }
  }

  if (!elements.reportPatient.value && appointment) {
    elements.reportPatient.value = appointment.patient;
  }

  if (!report) {
    loadDraftIfMatches();
  }
}

async function persistReport(status) {
  const patient = elements.reportPatient.value.trim();
  if (!patient) {
    showToast('Informe o nome do paciente antes de salvar.', true);
    elements.reportPatient.focus();
    return false;
  }

  const blocks = {};
  BLOCKS.forEach((block) => {
    blocks[block.key] = block.el().value.trim();
  });

  const reports = data.getReports();
  const existing = editReportId ? reports.find((item) => item.id === editReportId) : null;
  const appointmentId = elements.reportAppointment.value || null;
  const appointment = appointmentId ? findAppointment(appointmentId) : null;

  const payload = {
    patient,
    patientId: appointment?.patientId || existing?.patientId || findPatientIdByName(patient),
    appointmentId,
    mood: currentMood,
    blocks,
    freeText: getFreeText().trim(),
    status,
    updatedAt: new Date().toISOString()
  };

  let report;

  if (existing) {
    Object.assign(existing, payload);
    report = existing;
  } else {
    report = {
      id: data.createId('report'),
      createdAt: new Date().toISOString(),
      ...payload
    };
    reports.push(report);
  }

  const savedId = await data.saveReportToDb(report);
  if (savedId) {
    report.id = savedId;
  } else if (window.PsicNotaSupabase) {
    showToast('Não foi possível salvar no banco. O relatório ficou salvo localmente.', true);
  }

  data.saveReports(reports);
  clearDraft();
  return true;
}

async function handleReportSubmit(event) {
  event.preventDefault();
  if (!(await persistReport('final'))) return;
  showToast('Relatório salvo. Ele já aparece no histórico do paciente.');
  window.location.href = 'relatorios.html';
}

async function handleSaveDraft() {
  if (!(await persistReport('rascunho'))) return;
  showToast('Rascunho salvo. Você pode retomá-lo quando quiser.');
  window.location.href = 'relatorios.html';
}

async function init() {
  const _auth = await window.PsicNotaBackend.requireProfile("psicologo");
  if (!_auth) return;

  renderHeader();

  await data.syncRemoteData();

  elements.reportForm.addEventListener('submit', handleReportSubmit);
  elements.saveDraftButton.addEventListener('click', handleSaveDraft);

  elements.moodPicker.querySelectorAll('.mood-option').forEach((option) => {
    option.addEventListener('click', () => {
      currentMood = currentMood === option.dataset.mood ? null : option.dataset.mood;
      renderMoodPicker();
      scheduleDraftSave();
    });
  });

  const toolbar = document.querySelector('#reportToolbar');
  if (toolbar) {
    toolbar.addEventListener('mousedown', (event) => {
      if (event.target.closest('button')) event.preventDefault();
    });
    toolbar.querySelectorAll('button[data-cmd]').forEach((toolButton) => {
      toolButton.addEventListener('click', () => {
        elements.freeText.focus();
        document.execCommand(toolButton.dataset.cmd, false, null);
      });
    });
    const formatBlockSelect = toolbar.querySelector('#formatBlockSelect');
    if (formatBlockSelect) {
      formatBlockSelect.addEventListener('change', () => {
        elements.freeText.focus();
        document.execCommand('formatBlock', false, formatBlockSelect.value);
      });
    }
    const fontSizeSelect = toolbar.querySelector('#fontSizeSelect');
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener('change', () => {
        elements.freeText.focus();
        document.execCommand('fontSize', false, fontSizeSelect.value);
      });
    }
  }

  const cancelEditButton = document.querySelector('#cancelEditButton');
  if (cancelEditButton) {
    cancelEditButton.addEventListener('click', () => {
      window.location.href = 'relatorios.html';
    });
  }
  if (elements.backToListButton) {
    elements.backToListButton.addEventListener('click', () => {
      window.location.href = 'relatorios.html';
    });
  }

  elements.reportAppointment.addEventListener('change', () => {
    const appointment = elements.reportAppointment.value ? findAppointment(elements.reportAppointment.value) : null;
    renderAppointmentInfo(appointment);
    renderPatientAvatar(appointment);
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

  if (novoReportParam) {
    openEditor(null, null);
    return;
  }

  renderList();
}

elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());

void init();
