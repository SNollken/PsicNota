const data = window.PsiNoteData;

const params = new URLSearchParams(window.location.search);
const appointmentId = params.get('id');

const elements = {
  notFound: document.querySelector('#notFound'),
  consultaContent: document.querySelector('#consultaContent'),
  consultaTitle: document.querySelector('#consultaTitle'),
  consultaSub: document.querySelector('#consultaSub'),
  historicoLink: document.querySelector('#historicoLink'),
  relatorioLink: document.querySelector('#relatorioLink'),
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
  attachDocForm: document.querySelector('#attachDocForm'),
  docType: document.querySelector('#docType'),
  docName: document.querySelector('#docName'),
  patientDocs: document.querySelector('#patientDocs'),
  emptyDocs: document.querySelector('#emptyDocs'),
  toast: document.querySelector('#toast'),
  toastMessage: document.querySelector('#toastMessage'),
  psychologistName: document.querySelector('#psychologistName'),
  psychologistAvatar: document.querySelector('#psychologistAvatar'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

let toastTimeout = null;
let appointment = null;
let currentMood = null;

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
  elements.historicoLink.href = `historico.html?paciente=${encodedPatient}`;
  elements.relatorioLink.href = `relatorios.html?consulta=${appointment.id}`;
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

function renderDocuments() {
  const documents = data.getDocuments()
    .filter((doc) => doc.patient === appointment.patient)
    .sort((a, b) => new Date(b.attachedAt) - new Date(a.attachedAt));

  elements.patientDocs.replaceChildren();
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
    elements.patientDocs.append(item);
  });
}

function handleAttachDoc(event) {
  event.preventDefault();
  const name = elements.docName.value.trim();
  if (!name) {
    showToast('Informe o nome do documento.', true);
    elements.docName.focus();
    return;
  }

  const documents = data.getDocuments();
  documents.push({
    id: data.createId('doc'),
    patient: appointment.patient,
    type: elements.docType.value,
    name,
    attachedAt: new Date().toISOString()
  });
  data.saveDocuments(documents);

  elements.docName.value = '';
  renderDocuments();
  showToast(`${elements.docType.value === 'laudo' ? 'Laudo' : 'Receita'} anexado para ${appointment.patient}.`);
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
  renderDocuments();

  elements.saveNoteButton.addEventListener('click', saveNotes);
  elements.finishAppointmentButton.addEventListener('click', () => {
    saveNotes();
    window.location.href = `relatorios.html?consulta=${appointment.id}&usarNotas=1`;
  });
  elements.noteMoodPicker.querySelectorAll('.mood-option').forEach((option) => {
    option.addEventListener('click', () => {
      currentMood = currentMood === option.dataset.mood ? null : option.dataset.mood;
      renderMoodPicker();
    });
  });
  elements.attachDocForm.addEventListener('submit', handleAttachDoc);
}

elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());
window.addEventListener('storage', () => {
  if (appointment) {
    renderNotes();
    renderDocuments();
  }
});

init();
