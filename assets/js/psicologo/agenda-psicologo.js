const data = window.PsiNoteData;

const elements = {
  calendarGrid: document.querySelector('#calendarGrid'),
  monthTitle: document.querySelector('#monthTitle'),
  selectedDateTitle: document.querySelector('#selectedDateTitle'),
  selectedDateWeekday: document.querySelector('#selectedDateWeekday'),
  selectedDayCount: document.querySelector('#selectedDayCount'),
  selectedRequestCount: document.querySelector('#selectedRequestCount'),
  appointmentList: document.querySelector('#appointmentList'),
  dayRequestList: document.querySelector('#dayRequestList'),
  emptyAppointments: document.querySelector('#emptyAppointments'),
  emptyDayRequests: document.querySelector('#emptyDayRequests'),
  dayNote: document.querySelector('#dayNote'),
  noteCharacterCount: document.querySelector('#noteCharacterCount'),
  noteSaveStatus: document.querySelector('#noteSaveStatus'),
  pendingCount: document.querySelector('#pendingCount'),
  todayCount: document.querySelector('#todayCount'),
  weekCount: document.querySelector('#weekCount'),
  nextAppointment: document.querySelector('#nextAppointment'),
  requestList: document.querySelector('#requestList'),
  requestEmpty: document.querySelector('#requestEmpty'),
  requestTotal: document.querySelector('#requestTotal'),
  sidebarRequestCount: document.querySelector('#sidebarRequestCount'),
  appointmentModal: document.querySelector('#appointmentModal'),
  appointmentForm: document.querySelector('#appointmentForm'),
  appointmentFormError: document.querySelector('#appointmentFormError'),
  appointmentDate: document.querySelector('#appointmentDate'),
  appointmentTime: document.querySelector('#appointmentTime'),
  toast: document.querySelector('#toast'),
  toastMessage: document.querySelector('#toastMessage'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  psychologistName: document.querySelector('#psychologistName'),
  psychologistAvatar: document.querySelector('#psychologistAvatar'),
  psychologistNameTopbar: document.querySelector('#psychologistNameTopbar'),
  psychologistAvatarTopbar: document.querySelector('#psychologistAvatarTopbar'),
  logoutLink: document.querySelector('#logoutLink')
};

const dateTitleFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const session = data.getSession();
const currentPsychologist = session && ['psicologo', 'psychologist'].includes(session.role)
  ? session
  : { id: 'demo-psychologist', name: 'Psicólogo PsiNote', fullName: 'Psicólogo PsiNote', role: 'psicologo' };

let appointments = data.getAppointments();
let requests = data.getRequests();
let notes = data.getNotes();
let selectedDate = new Date();
selectedDate.setHours(0, 0, 0, 0);
let visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
let activeMenuId = null;
let toastTimeout = null;

function capitalizeFirst(value) {
  return value ? value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1) : value;
}

function getConfirmedForDate(dateKey) {
  return appointments
    .filter((item) => item.date === dateKey && item.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
}

function getPendingRequests() {
  return requests
    .filter((item) => item.status === 'pending')
    .sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));
}

function getPendingForDate(dateKey) {
  return getPendingRequests().filter((item) => item.date === dateKey);
}

function getCalendarStart(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  return data.addDays(firstDay, -firstDay.getDay());
}

function renderCalendar() {
  elements.calendarGrid.replaceChildren();
  elements.monthTitle.textContent = capitalizeFirst(monthFormatter.format(visibleMonth));

  const todayKey = data.toDateKey(new Date());
  const selectedKey = data.toDateKey(selectedDate);
  const start = getCalendarStart(visibleMonth);

  for (let index = 0; index < 42; index += 1) {
    const date = data.addDays(start, index);
    const dateKey = data.toDateKey(date);
    const confirmed = getConfirmedForDate(dateKey);
    const pending = getPendingForDate(dateKey);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.dataset.date = dateKey;
    button.setAttribute('role', 'gridcell');

    if (date.getMonth() !== visibleMonth.getMonth()) button.classList.add('other-month');
    if (dateKey === todayKey) button.classList.add('today');
    if (dateKey === selectedKey) button.classList.add('selected');
    if (pending.length) button.classList.add('has-request');

    const header = document.createElement('span');
    header.className = 'day-cell-header';
    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = String(date.getDate());
    const status = document.createElement('span');
    status.className = 'day-status';
    if (pending.length) status.textContent = `${pending.length} pedido${pending.length === 1 ? '' : 's'}`;
    else if (confirmed.length) status.textContent = `${confirmed.length} consulta${confirmed.length === 1 ? '' : 's'}`;
    else if (notes[dateKey]?.trim()) status.textContent = 'Lembrete';
    else status.textContent = 'Livre';
    header.append(number, status);
    button.append(header);

    const events = document.createElement('span');
    events.className = 'day-events';
    const combined = [
      ...pending.map((item) => ({ kind: 'request', item })),
      ...confirmed.map((item) => ({ kind: 'appointment', item }))
    ];

    combined.slice(0, 2).forEach(({ kind, item }) => {
      const chip = document.createElement('span');
      chip.className = kind === 'request' ? 'event-chip event-request' : `event-chip event-${String(item.mode).toLowerCase()}`;
      const time = document.createElement('span');
      time.className = 'event-time';
      time.textContent = item.time;
      const patient = document.createElement('span');
      patient.className = 'event-patient';
      patient.textContent = kind === 'request' ? `${item.patient} · pedido` : item.patient;
      chip.append(time, patient);
      events.append(chip);
    });

    if (combined.length > 2) {
      const more = document.createElement('span');
      more.className = 'more-events';
      more.textContent = `Ver mais ${combined.length - 2}`;
      events.append(more);
    }

    if (notes[dateKey]?.trim()) {
      const noteIndicator = document.createElement('span');
      noteIndicator.className = 'note-indicator';
      noteIndicator.title = 'Dia com lembrete';
      button.append(noteIndicator);
    }

    button.append(events);
    button.setAttribute('aria-label', `${fullDateFormatter.format(date)}, ${confirmed.length} consultas confirmadas e ${pending.length} solicitações pendentes`);
    button.addEventListener('click', () => selectDate(date));
    elements.calendarGrid.append(button);
  }
}

function selectDate(date) {
  selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (selectedDate.getMonth() !== visibleMonth.getMonth() || selectedDate.getFullYear() !== visibleMonth.getFullYear()) {
    visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  }
  activeMenuId = null;
  renderCalendar();
  renderDayPanel();
}

function renderDayPanel() {
  const dateKey = data.toDateKey(selectedDate);
  const confirmed = getConfirmedForDate(dateKey);
  const pending = getPendingForDate(dateKey);

  elements.selectedDateTitle.textContent = capitalizeFirst(dateTitleFormatter.format(selectedDate));
  elements.selectedDateWeekday.textContent = capitalizeFirst(weekdayFormatter.format(selectedDate));
  elements.selectedDayCount.textContent = String(confirmed.length);
  elements.selectedRequestCount.textContent = String(pending.length);

  elements.appointmentList.replaceChildren();
  elements.dayRequestList.replaceChildren();
  elements.emptyAppointments.hidden = confirmed.length > 0;
  elements.emptyDayRequests.hidden = pending.length > 0;

  confirmed.forEach((appointment) => elements.appointmentList.append(createAppointmentElement(appointment)));
  pending.forEach((request) => elements.dayRequestList.append(createCompactRequestElement(request)));

  elements.dayNote.value = notes[dateKey] || '';
  updateNoteCharacterCount();
  elements.noteSaveStatus.textContent = '';
}

function createAppointmentElement(appointment) {
  const item = document.createElement('article');
  item.className = 'appointment-item';

  const time = document.createElement('time');
  time.className = 'appointment-time';
  time.dateTime = `${appointment.date}T${appointment.time}`;
  time.textContent = appointment.time;

  const info = document.createElement('div');
  info.className = 'appointment-info';
  const patient = document.createElement('strong');
  patient.textContent = appointment.patient;
  const meta = document.createElement('div');
  meta.className = 'appointment-meta';
  meta.innerHTML = `<span>${formatDuration(appointment.duration)}</span><span>${escapeHtml(appointment.mode)}</span>`;
  info.append(patient, meta);
  if (data.hasAppointmentNote(appointment.id)) {
    const badge = document.createElement('span');
    badge.className = 'appointment-note-badge';
    badge.textContent = '✎ Com notas';
    info.append(badge);
  }
  if (appointment.observation) {
    const observation = document.createElement('p');
    observation.className = 'appointment-observation';
    observation.textContent = appointment.observation;
    info.append(observation);
  }

  const menuRow = document.createElement('div');
  menuRow.className = 'appointment-menu-row';

  const quickNote = document.createElement('a');
  quickNote.className = 'appointment-quick-note';
  if (data.hasAppointmentNote(appointment.id)) quickNote.classList.add('has-note');
  quickNote.href = `consulta.html?id=${appointment.id}`;
  quickNote.setAttribute('aria-label', `Notas rápidas da consulta de ${appointment.patient}`);
  quickNote.title = data.hasAppointmentNote(appointment.id) ? 'Ver notas rápidas' : 'Registrar notas rápidas';
  quickNote.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

  const menu = document.createElement('div');
  menu.className = 'appointment-menu';
  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.className = 'icon-button';
  menuButton.setAttribute('aria-label', `Opções da consulta de ${appointment.patient}`);
  menuButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 6h.01M12 12h.01M12 18h.01"/></svg>';
  menuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    activeMenuId = activeMenuId === appointment.id ? null : appointment.id;
    renderDayPanel();
  });
  menu.append(menuButton);

  if (activeMenuId === appointment.id) {
    const actions = document.createElement('div');
    actions.className = 'appointment-actions';
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Abrir consulta';
    open.addEventListener('click', () => { window.location.href = `consulta.html?id=${appointment.id}`; });
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancelar consulta';
    cancel.addEventListener('click', () => deleteAppointment(appointment.id));
    actions.append(open, cancel);
    menu.append(actions);
  }

  item.append(time, info, menu);
  return item;
}

function createCompactRequestElement(request) {
  const item = document.createElement('article');
  item.className = 'compact-request';
  const position = getPendingRequests().findIndex((itemRequest) => itemRequest.id === request.id) + 1;
  item.innerHTML = `
    <span class="compact-request-position">${position}º</span>
    <div>
      <strong>${escapeHtml(request.patient)} · ${escapeHtml(request.time)}</strong>
      <span>Pedido enviado em ${data.formatRequestMoment(request.requestedAt, false)}</span>
    </div>
  `;
  item.addEventListener('click', () => document.querySelector(`#request-${CSS.escape(request.id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  return item;
}

function renderRequestQueue() {
  const pending = getPendingRequests();
  elements.requestList.replaceChildren();
  elements.requestEmpty.hidden = pending.length > 0;
  elements.requestTotal.textContent = pending.length === 1 ? '1 pendente' : `${pending.length} pendentes`;
  if (elements.sidebarRequestCount) {
    elements.sidebarRequestCount.textContent = String(pending.length);
  }

  pending.forEach((request, index) => {
    const card = document.createElement('article');
    card.className = 'request-card';
    card.id = `request-${request.id}`;

    const queue = document.createElement('div');
    queue.className = 'queue-position';
    queue.innerHTML = `<span>${index + 1}º</span><small>na fila</small>`;

    const content = document.createElement('div');
    content.className = 'request-card-content';
    const top = document.createElement('div');
    top.className = 'request-card-top';
    top.innerHTML = `<div><strong>${escapeHtml(request.patient)}</strong><span>${escapeHtml(request.mode)} · ${formatDuration(request.duration)}</span></div><span class="request-status">Aguardando</span>`;

    const details = document.createElement('div');
    details.className = 'request-details';
    details.innerHTML = `
      <div><span>Consulta solicitada</span><strong>${capitalizeFirst(fullDateFormatter.format(data.fromDateKey(request.date)))} às ${escapeHtml(request.time)}</strong></div>
      <div><span>Pedido enviado em</span><strong>${data.formatRequestMoment(request.requestedAt, true)}</strong></div>
    `;
    content.append(top, details);
    if (request.note) {
      const note = document.createElement('p');
      note.className = 'request-note';
      note.textContent = request.note;
      content.append(note);
    }

    const actions = document.createElement('div');
    actions.className = 'request-card-actions';
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'button button-secondary button-compact';
    reject.textContent = 'Recusar';
    reject.addEventListener('click', () => rejectRequest(request.id));
    const approve = document.createElement('button');
    approve.type = 'button';
    approve.className = 'button button-primary button-compact';
    approve.textContent = 'Aprovar horário';
    approve.addEventListener('click', () => approveRequest(request.id));
    actions.append(reject, approve);

    card.append(queue, content, actions);
    elements.requestList.append(card);
  });
}

function approveRequest(requestId) {
  const request = requests.find((item) => item.id === requestId);
  if (!request || request.status !== 'pending') return;

  const earlierSameSlot = getPendingRequests().find((item) => (
    item.id !== request.id &&
    item.date === request.date &&
    item.time === request.time &&
    new Date(item.requestedAt) < new Date(request.requestedAt)
  ));

  if (earlierSameSlot) {
    showToast(`Existe um pedido anterior de ${earlierSameSlot.patient} para esse mesmo horário.` , true);
    return;
  }

  const conflict = appointments.some((item) => item.date === request.date && item.time === request.time && item.status !== 'cancelled');
  if (conflict) {
    showToast('Esse horário já foi ocupado por uma consulta confirmada.', true);
    return;
  }

  appointments.push({
    id: data.createId('appointment'),
    patient: request.patient,
    patientId: request.patientId,
    date: request.date,
    time: request.time,
    duration: request.duration,
    mode: request.mode,
    observation: request.note || '',
    status: 'confirmed',
    source: 'patient-request',
    requestId: request.id
  });
  request.status = 'approved';
  request.reviewedAt = new Date().toISOString();

  requests.forEach((otherRequest) => {
    if (
      otherRequest.id !== request.id &&
      otherRequest.status === 'pending' &&
      otherRequest.date === request.date &&
      otherRequest.time === request.time
    ) {
      otherRequest.status = 'rejected';
      otherRequest.reviewedAt = request.reviewedAt;
      otherRequest.rejectionReason = 'Horário preenchido por uma solicitação anterior.';
    }
  });

  data.saveAppointments(appointments);
  data.saveRequests(requests);

  selectedDate = data.fromDateKey(request.date);
  visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  renderAll();
  showToast(`Solicitação de ${request.patient} aprovada para ${request.time}.`);
}

function rejectRequest(requestId) {
  const request = requests.find((item) => item.id === requestId);
  if (!request || request.status !== 'pending') return;
  const confirmed = window.confirm(`Recusar a solicitação de ${request.patient} para ${request.time}?`);
  if (!confirmed) return;
  request.status = 'rejected';
  request.reviewedAt = new Date().toISOString();
  data.saveRequests(requests);
  renderAll();
  showToast(`Solicitação de ${request.patient} recusada.`);
}

function deleteAppointment(appointmentId) {
  const appointment = appointments.find((item) => item.id === appointmentId);
  if (!appointment) return;
  if (!window.confirm(`Cancelar a consulta de ${appointment.patient} às ${appointment.time}?`)) return;
  appointment.status = 'cancelled';
  activeMenuId = null;
  data.saveAppointments(appointments);
  renderAll();
  showToast('Consulta cancelada. O horário voltou a ficar disponível.');
}

function updateSummary() {
  const pending = getPendingRequests();
  elements.pendingCount.textContent = pending.length === 1 ? '1 solicitação' : `${pending.length} solicitações`;

  const now = new Date();
  const todayKey = data.toDateKey(now);
  const today = getConfirmedForDate(todayKey);
  elements.todayCount.textContent = formatAppointmentCount(today.length);

  const dayOfWeek = now.getDay();
  const weekStart = data.addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -dayOfWeek);
  const weekEnd = data.addDays(weekStart, 6);
  const week = appointments.filter((item) => {
    if (item.status === 'cancelled') return false;
    const date = data.fromDateKey(item.date);
    return date >= weekStart && date <= weekEnd;
  });
  elements.weekCount.textContent = formatAppointmentCount(week.length);

  const next = appointments
    .filter((item) => item.status !== 'cancelled')
    .map((item) => ({ ...item, dateTime: new Date(`${item.date}T${item.time}:00`) }))
    .filter((item) => item.dateTime >= now)
    .sort((a, b) => a.dateTime - b.dateTime)[0];
  elements.nextAppointment.textContent = next ? `${shortDateFormatter.format(next.dateTime)} às ${next.time} · ${next.patient}` : 'Nenhum agendamento futuro';
}

function formatAppointmentCount(count) {
  return count === 1 ? '1 consulta' : `${count} consultas`;
}

function formatDuration(duration) {
  const value = Number(duration);
  if (value === 60) return '1 hora';
  return `${value} minutos`;
}

function updateNoteCharacterCount() {
  elements.noteCharacterCount.textContent = `${elements.dayNote.value.length}/280`;
}

function saveCurrentNote() {
  const dateKey = data.toDateKey(selectedDate);
  const value = elements.dayNote.value.trim();
  if (value) notes[dateKey] = value;
  else delete notes[dateKey];
  data.saveNotes(notes);
  renderCalendar();
  elements.noteSaveStatus.textContent = 'Salvo';
  window.setTimeout(() => { elements.noteSaveStatus.textContent = ''; }, 1800);
}

function clearCurrentNote() {
  elements.dayNote.value = '';
  updateNoteCharacterCount();
  saveCurrentNote();
}

function openAppointmentModal(date = selectedDate) {
  elements.appointmentForm.reset();
  elements.appointmentDate.value = data.toDateKey(date);
  elements.appointmentTime.value = '09:00';
  document.querySelector('#appointmentDuration').value = '50';
  elements.appointmentFormError.hidden = true;
  elements.appointmentModal.hidden = false;
  document.body.classList.add('modal-open');
  window.setTimeout(() => document.querySelector('#appointmentPatient').focus(), 0);
}

function closeAppointmentModal() {
  elements.appointmentModal.hidden = true;
  elements.appointmentFormError.hidden = true;
  document.body.classList.remove('modal-open');
}

function handleAppointmentSubmit(event) {
  event.preventDefault();
  elements.appointmentFormError.hidden = true;
  if (!elements.appointmentForm.reportValidity()) return;

  const formData = new FormData(elements.appointmentForm);
  const newAppointment = {
    id: data.createId('appointment'),
    patient: String(formData.get('patient')).trim(),
    patientId: null,
    date: String(formData.get('date')),
    time: String(formData.get('time')),
    duration: Number(formData.get('duration')),
    mode: String(formData.get('mode')),
    observation: String(formData.get('observation')).trim(),
    status: 'confirmed',
    source: 'psychologist'
  };

  const conflict = appointments.some((item) => item.date === newAppointment.date && item.time === newAppointment.time && item.status !== 'cancelled');
  if (conflict) {
    elements.appointmentFormError.textContent = 'Já existe uma consulta confirmada nesse dia e horário.';
    elements.appointmentFormError.hidden = false;
    return;
  }

  appointments.push(newAppointment);
  data.saveAppointments(appointments);
  selectedDate = data.fromDateKey(newAppointment.date);
  visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  closeAppointmentModal();
  renderAll();
  showToast(`Consulta de ${newAppointment.patient} salva com sucesso.`);
}

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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderAll() {
  const displayName = currentPsychologist.fullName || currentPsychologist.name || 'Psicólogo PsiNote';
  [elements.psychologistName, elements.psychologistNameTopbar].forEach((nameElement) => {
    if (nameElement) nameElement.textContent = displayName;
  });
  [elements.psychologistAvatar, elements.psychologistAvatarTopbar].forEach((avatarElement) => {
    if (!avatarElement) return;
    avatarElement.textContent = getInitials(displayName);
    avatarElement.classList.toggle('has-photo', Boolean(currentPsychologist.avatarDataUrl));
    avatarElement.style.backgroundImage = currentPsychologist.avatarDataUrl ? `url("${currentPsychologist.avatarDataUrl}")` : '';
  });
  appointments = data.getAppointments();
  requests = data.getRequests();
  notes = data.getNotes();
  renderRequestQueue();
  renderCalendar();
  renderDayPanel();
  updateSummary();
}

document.querySelector('#previousMonthButton').addEventListener('click', () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  renderAll();
});
document.querySelector('#nextMonthButton').addEventListener('click', () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  renderAll();
});
document.querySelector('#todayButton').addEventListener('click', () => selectDate(new Date()));
document.querySelector('#newAppointmentButton').addEventListener('click', () => openAppointmentModal(selectedDate));
document.querySelector('#addAppointmentForDayButton').addEventListener('click', () => openAppointmentModal(selectedDate));
document.querySelector('#closeModalButton').addEventListener('click', closeAppointmentModal);
document.querySelector('#cancelModalButton').addEventListener('click', closeAppointmentModal);
document.querySelector('#saveNoteButton').addEventListener('click', saveCurrentNote);
document.querySelector('#clearNoteButton').addEventListener('click', clearCurrentNote);
elements.dayNote.addEventListener('input', updateNoteCharacterCount);
elements.appointmentForm.addEventListener('submit', handleAppointmentSubmit);
elements.appointmentModal.addEventListener('click', (event) => { if (event.target === elements.appointmentModal) closeAppointmentModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !elements.appointmentModal.hidden) closeAppointmentModal(); });
elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
document.addEventListener('click', (event) => {
  if (window.innerWidth <= 720 && !elements.sidebar.contains(event.target) && !elements.mobileMenu.contains(event.target)) {
    elements.sidebar.classList.remove('open');
    elements.mobileMenu.setAttribute('aria-expanded', 'false');
  }
  if (!event.target.closest('.appointment-menu') && activeMenuId) {
    activeMenuId = null;
    renderDayPanel();
  }
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());
window.addEventListener('storage', renderAll);

renderAll();
