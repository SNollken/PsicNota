"use strict";

if (!document.querySelector("#consultaContent")) {
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
const appointmentId = params.get('id');

const elements = {
  notFound: document.querySelector('#notFound'),
  consultaContent: document.querySelector('#consultaContent'),
  consultaTitle: document.querySelector('#consultaTitle'),
  consultaSub: document.querySelector('#consultaSub'),
  patientPillAvatar: document.querySelector('#patientPillAvatar'),
  historicoLink: document.querySelector('#historicoLink'),
  infoDate: document.querySelector('#infoDate'),
  infoTime: document.querySelector('#infoTime'),
  infoDuration: document.querySelector('#infoDuration'),
  infoMode: document.querySelector('#infoMode'),
  infoStatus: document.querySelector('#infoStatus'),
  sessionNote: document.querySelector('#sessionNote'),
  sessionReport: document.querySelector('#sessionReport'),
  noteSaveStatus: document.querySelector('#noteSaveStatus'),
  noteUpdatedAt: document.querySelector('#noteUpdatedAt'),
  reportSaveStatus: document.querySelector('#reportSaveStatus'),
  noteMoodPicker: document.querySelector('#noteMoodPicker'),
  finishAppointmentButton: document.querySelector('#finishAppointmentButton'),
  saveNoteButton: document.querySelector('#saveNoteButton'),
  saveReportButton: document.querySelector('#saveReportButton'),
  psychologistName: document.querySelector('#psychologistName'),
  psychologistAvatar: document.querySelector('#psychologistAvatar'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

let appointment = null;
let currentMood = null;

function getInitials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatDuration(duration) {
  const value = Number(duration);
  if (value === 60) return '1 hora';
  return `${value} minutos`;
}

function renderHeader() {
  const session = data.getSession();
  const displayName = (session && (session.fullName || session.name)) || 'Psicólogo PsiNote';
  elements.psychologistName.textContent = displayName;
  elements.psychologistAvatar.textContent = getInitials(displayName);
}

function renderAppointmentInfo() {
  elements.consultaSub.textContent = `${appointment.patient} - ${shortDateFormatter.format(data.fromDateKey(appointment.date))} às ${appointment.time}`;
  elements.infoDate.textContent = fullDateFormatter.format(data.fromDateKey(appointment.date));
  elements.infoTime.textContent = appointment.time;
  elements.infoDuration.textContent = formatDuration(appointment.duration);
  elements.infoMode.textContent = appointment.mode;
  elements.infoStatus.textContent = appointment.status === 'confirmed' ? 'Confirmada' : appointment.status === 'cancelled' ? 'Cancelada' : 'Pendente';

  const encodedPatient = encodeURIComponent(appointment.patient);
  const idParam = appointment.patientId ? `id=${encodeURIComponent(appointment.patientId)}&` : "";
  elements.patientPillAvatar.textContent = getInitials(appointment.patient);
  elements.historicoLink.href = `historico.html?${idParam}paciente=${encodedPatient}`;
}

async function loadPatientAvatar() {
  if (!supabaseClient || !appointment.patientId) return;

  try {
    const { data: patient, error } = await supabaseClient
      .from('perfis')
      .select('avatar_url')
      .eq('id', appointment.patientId)
      .eq('papel', 'paciente')
      .maybeSingle();
    if (error || !patient?.avatar_url) return;

    const { data: signed, error: signedError } = await supabaseClient
      .storage
      .from('avatars')
      .createSignedUrl(patient.avatar_url, 3600);
    if (signedError || !signed?.signedUrl) return;

    const image = document.createElement('img');
    image.alt = '';
    image.addEventListener('load', () => elements.patientPillAvatar.replaceChildren(image), { once: true });
    image.src = signed.signedUrl;
  } catch {
    console.error('Não foi possível carregar a foto do paciente.');
  }
}

function renderMoodPicker() {
  elements.noteMoodPicker.querySelectorAll('.mood-option').forEach((option) => {
    const selected = option.dataset.mood === currentMood;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-checked', String(selected));
  });
}

function renderNotes() {
  const note = data.getAppointmentNote(appointment.id);
  elements.sessionNote.value = note;
  currentMood = data.getAppointmentMood(appointment.id) || null;
  renderMoodPicker();
  elements.noteUpdatedAt.textContent = note || currentMood ? 'Anotações salvas' : '';
  elements.noteUpdatedAt.hidden = !(note || currentMood);
}

function findAppointmentReport() {
  return data.getReports().find((report) => report.appointmentId === appointment.id) || null;
}

function renderReport() {
  const report = findAppointmentReport();
  elements.sessionReport.value = report?.freeText || '';
  elements.reportSaveStatus.textContent = report
    ? report.status === 'final' ? 'Relatório salvo' : 'Rascunho salvo'
    : '';
}

async function saveNotes() {
  const text = elements.sessionNote.value;
  data.setAppointmentNote(appointment.id, text);
  data.setAppointmentMood(appointment.id, currentMood || '');

  if (text.trim() || currentMood) {
    const saved = await data.saveNoteToDb(appointment.id, text, currentMood || null);
    elements.noteSaveStatus.textContent = saved ? 'Salvo' : 'Salvo localmente (sem conexão)';
  } else {
    elements.noteSaveStatus.textContent = 'Salvo';
  }

  elements.noteUpdatedAt.textContent = 'Anotações salvas';
  elements.noteUpdatedAt.hidden = false;
  window.setTimeout(() => { elements.noteSaveStatus.textContent = ''; }, 1800);
}

async function saveReport() {
  const freeText = elements.sessionReport.value.trim();
  if (!freeText) {
    elements.reportSaveStatus.textContent = 'Escreva o relatório antes de salvar.';
    elements.sessionReport.focus();
    return false;
  }

  const reports = data.getReports();
  const existing = findAppointmentReport();
  const now = new Date().toISOString();
  const report = {
    ...(existing || {}),
    id: existing?.id || data.createId('report'),
    patient: appointment.patient,
    patientId: appointment.patientId,
    appointmentId: appointment.id,
    mood: currentMood,
    blocks: existing?.blocks || {},
    freeText,
    status: 'final',
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  let savedId = null;
  try {
    savedId = await data.saveReportToDb(report);
  } catch {
    savedId = null;
  }
  if (savedId) report.id = savedId;
  if (existing) {
    reports[reports.findIndex((item) => item.id === existing.id)] = report;
  } else {
    reports.push(report);
  }
  data.saveReports(reports);

  elements.reportSaveStatus.textContent = savedId || !window.PsicNotaSupabase
    ? 'Relatório salvo'
    : 'Não foi possível salvar no banco; o relatório ficou salvo localmente.';
  return true;
}

async function init() {
  const _auth = await window.PsicNotaBackend.requireProfile("psicologo");
  if (!_auth) return;

  renderHeader();

  await data.syncRemoteData();

  if (!appointmentId) {
    elements.notFound.hidden = false;
    return;
  }

  appointment = data.getAppointments().find((item) => item.id === appointmentId);
  if (!appointment) {
    elements.notFound.hidden = false;
    return;
  }

  elements.consultaContent.hidden = false;
  renderAppointmentInfo();

  const pill = document.querySelector('#patientPill');
  if (pill) {
    pill.style.cursor = 'pointer';
    pill.addEventListener('click', () => {
      const idP = appointment.patientId ? `id=${encodeURIComponent(appointment.patientId)}&` : '';
      window.location.href = `paciente-perfil.html?${idP}paciente=${encodeURIComponent(appointment.patient)}`;
    });
  }

  renderNotes();
  renderReport();
  void loadPatientAvatar();

  elements.saveNoteButton.addEventListener('click', () => void saveNotes());
  elements.saveReportButton.addEventListener('click', () => void saveReport());
  elements.finishAppointmentButton.addEventListener('click', async () => {
    await saveNotes();
    if (elements.sessionReport.value.trim()) await saveReport();
    window.location.href = `historico.html?${appointment.patientId ? `id=${encodeURIComponent(appointment.patientId)}&` : ""}paciente=${encodeURIComponent(appointment.patient)}`;
  });
  elements.noteMoodPicker.querySelectorAll('.mood-option').forEach((option) => {
    option.addEventListener('click', () => {
      currentMood = currentMood === option.dataset.mood ? null : option.dataset.mood;
      renderMoodPicker();
    });
  });
  elements.sessionReport.addEventListener('input', () => {
    elements.reportSaveStatus.textContent = '';
  });
}

elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());
window.addEventListener('storage', () => {
  if (appointment) {
    renderNotes();
  }
});

void init();
}
