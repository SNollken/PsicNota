"use strict";

if (!document.querySelector("#consultaContent")) {
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
  noteSaveStatus: document.querySelector('#noteSaveStatus'),
  noteUpdatedAt: document.querySelector('#noteUpdatedAt'),
  noteMoodPicker: document.querySelector('#noteMoodPicker'),
  finishAppointmentButton: document.querySelector('#finishAppointmentButton'),
  saveNoteButton: document.querySelector('#saveNoteButton'),
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
  elements.patientPillAvatar.textContent = getInitials(appointment.patient);
  elements.historicoLink.href = `historico.html?paciente=${encodedPatient}`;
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

function saveNotes() {
  const text = elements.sessionNote.value;
  data.setAppointmentNote(appointment.id, text);
  data.setAppointmentMood(appointment.id, currentMood || '');
  elements.noteSaveStatus.textContent = 'Salvo';
  elements.noteUpdatedAt.textContent = 'Anotações salvas';
  elements.noteUpdatedAt.hidden = false;
  window.setTimeout(() => { elements.noteSaveStatus.textContent = ''; }, 1800);
}

function init() {
  renderHeader();

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
  renderNotes();

  elements.saveNoteButton.addEventListener('click', saveNotes);
  elements.finishAppointmentButton.addEventListener('click', () => {
    saveNotes();
    window.location.href = `historico.html?paciente=${encodeURIComponent(appointment.patient)}`;
  });
  elements.noteMoodPicker.querySelectorAll('.mood-option').forEach((option) => {
    option.addEventListener('click', () => {
      currentMood = currentMood === option.dataset.mood ? null : option.dataset.mood;
      renderMoodPicker();
    });
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

init();
}
