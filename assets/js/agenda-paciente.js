const patientData = window.PsiNoteData;

const ui = {
  grid: document.querySelector('#patientCalendarGrid'),
  monthTitle: document.querySelector('#patientMonthTitle'),
  dateTitle: document.querySelector('#bookingDateTitle'),
  dateWeekday: document.querySelector('#bookingDateWeekday'),
  timeSlotGrid: document.querySelector('#timeSlotGrid'),
  noSlots: document.querySelector('#noSlots'),
  form: document.querySelector('#bookingForm'),
  error: document.querySelector('#bookingError'),
  requestList: document.querySelector('#patientRequestList'),
  requestEmpty: document.querySelector('#patientRequestEmpty'),
  pendingCount: document.querySelector('#patientPendingCount'),
  approvedCount: document.querySelector('#patientApprovedCount'),
  nextAppointment: document.querySelector('#patientNextAppointment'),
  nextMode: document.querySelector('#patientNextMode'),
  nameTop: document.querySelector('#patientNameTop'),
  avatar: document.querySelector('#patientAvatar'),
  toast: document.querySelector('#patientToast'),
  toastMessage: document.querySelector('#patientToastMessage'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  therapistAvatar: document.querySelector('#therapistAvatar'),
  therapistName: document.querySelector('#therapistName'),
  therapistDetails: document.querySelector('#therapistDetails'),
  logoutLink: document.querySelector('#logoutLink')
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const session = patientData.getSession();
const currentPatient = session && ['paciente', 'patient'].includes(session.role)
  ? {
      ...session,
      name: session.fullName || session.name,
      role: 'paciente'
    }
  : { id: 'demo-paciente', name: 'Paciente PsiNote', role: 'paciente', email: 'paciente@exemplo.com' };

const psychologistProfile = patientData.getProfiles().find((profile) => profile.role === 'psicologo');
const responsiblePsychologist = psychologistProfile || {
  fullName: 'Profissional PsiNote',
  professionalData: { serviceFormat: 'ambos', specialty: 'Psicologia clínica' }
};

let requests = patientData.getRequests();
let appointments = patientData.getAppointments();
let selectedDate = findFirstAvailableDate();
let visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
let selectedTime = '';
let toastTimer = null;

function capitalizeFirst(value) {
  return value ? value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1) : value;
}

function getInitials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function todayAtMidnight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getSelectableSlots(dateKey) {
  const slots = patientData.getOpenSlots(dateKey);
  const todayKey = patientData.toDateKey(new Date());
  if (dateKey !== todayKey) return slots;

  const now = new Date();
  return slots.filter((time) => {
    const [hour, minute] = time.split(':').map(Number);
    const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    return slotDate.getTime() > now.getTime() + 30 * 60 * 1000;
  });
}

function findFirstAvailableDate() {
  const today = todayAtMidnight();
  for (let index = 0; index < 60; index += 1) {
    const candidate = patientData.addDays(today, index);
    if (getSelectableSlots(patientData.toDateKey(candidate)).length > 0) return candidate;
  }
  return today;
}

function getCalendarStart(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  return patientData.addDays(firstDay, -firstDay.getDay());
}

function renderCalendar() {
  ui.grid.replaceChildren();
  ui.monthTitle.textContent = capitalizeFirst(monthFormatter.format(visibleMonth));
  const start = getCalendarStart(visibleMonth);
  const selectedKey = patientData.toDateKey(selectedDate);
  const todayKey = patientData.toDateKey(new Date());
  const today = todayAtMidnight();

  for (let index = 0; index < 42; index += 1) {
    const date = patientData.addDays(start, index);
    const dateKey = patientData.toDateKey(date);
    const slots = getSelectableSlots(dateKey);
    const pendingForDay = requests.filter((request) => request.date === dateKey && request.status === 'pending').length;
    const isOtherMonth = date.getMonth() !== visibleMonth.getMonth();
    const isPast = date < today;
    const unavailable = slots.length === 0 || isPast;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'patient-day';
    button.setAttribute('role', 'gridcell');
    button.disabled = unavailable || isOtherMonth;
    if (isOtherMonth) button.classList.add('other-month');
    if (unavailable) button.classList.add('unavailable');
    if (dateKey === selectedKey) button.classList.add('selected');
    if (dateKey === todayKey) button.classList.add('today');

    const number = document.createElement('span');
    number.className = 'patient-day-number';
    number.textContent = String(date.getDate());
    const status = document.createElement('span');
    status.className = 'patient-day-status';
    status.textContent = unavailable
      ? 'Sem horários'
      : `${slots.length} horário${slots.length === 1 ? '' : 's'} livre${slots.length === 1 ? '' : 's'}`;
    button.append(number, status);

    if (pendingForDay > 0 && !isOtherMonth) {
      const badge = document.createElement('span');
      badge.className = 'patient-day-request-count';
      badge.textContent = `${pendingForDay}`;
      badge.title = `${pendingForDay} solicitação(ões) em análise neste dia`;
      button.append(badge);
    }

    button.setAttribute('aria-label', `${fullDateFormatter.format(date)}, ${status.textContent}`);
    button.addEventListener('click', () => selectDate(date));
    ui.grid.append(button);
  }
}

function selectDate(date) {
  selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  selectedTime = '';
  if (selectedDate.getMonth() !== visibleMonth.getMonth() || selectedDate.getFullYear() !== visibleMonth.getFullYear()) {
    visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  }
  ui.error.hidden = true;
  renderCalendar();
  renderBookingPanel();
}

function renderBookingPanel() {
  const dateKey = patientData.toDateKey(selectedDate);
  const slots = getSelectableSlots(dateKey);
  ui.dateTitle.textContent = capitalizeFirst(dateFormatter.format(selectedDate));
  ui.dateWeekday.textContent = capitalizeFirst(weekdayFormatter.format(selectedDate));
  ui.timeSlotGrid.replaceChildren();
  ui.noSlots.hidden = slots.length > 0;

  slots.forEach((time) => {
    const pendingAtTime = requests.filter((request) => request.date === dateKey && request.time === time && request.status === 'pending').length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'time-slot';
    if (time === selectedTime) button.classList.add('selected');
    if (pendingAtTime > 0) button.classList.add('has-pending');
    button.innerHTML = `${time}${pendingAtTime ? `<small>${pendingAtTime} em análise</small>` : ''}`;
    button.setAttribute('aria-pressed', String(time === selectedTime));
    button.addEventListener('click', () => {
      selectedTime = time;
      ui.error.hidden = true;
      renderBookingPanel();
    });
    ui.timeSlotGrid.append(button);
  });
}

function handleBookingSubmit(event) {
  event.preventDefault();
  ui.error.hidden = true;

  if (!selectedTime) {
    showFormError('Escolha um horário antes de enviar a solicitação.');
    return;
  }

  const dateKey = patientData.toDateKey(selectedDate);
  const duplicate = requests.some((request) => (
    request.patientId === currentPatient.id &&
    request.date === dateKey &&
    request.time === selectedTime &&
    (request.status === 'pending' || request.status === 'approved')
  ));

  if (duplicate) {
    showFormError('Você já possui uma solicitação ou consulta nesse mesmo horário.');
    return;
  }

  if (!getSelectableSlots(dateKey).includes(selectedTime)) {
    showFormError('Esse horário acabou de ficar indisponível. Escolha outro.');
    refreshData();
    return;
  }

  const formData = new FormData(ui.form);
  const request = {
    id: patientData.createId('request'),
    patientId: currentPatient.id,
    patient: currentPatient.name,
    date: dateKey,
    time: selectedTime,
    duration: 50,
    mode: String(formData.get('mode')),
    note: String(formData.get('note')).trim(),
    requestedAt: new Date().toISOString(),
    status: 'pending'
  };

  requests.push(request);
  patientData.saveRequests(requests);
  selectedTime = '';
  ui.form.reset();
  renderAll();
  showToast(`Solicitação enviada em ${patientData.formatRequestMoment(request.requestedAt, true)}.`);
  document.querySelector('#meus-pedidos').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showFormError(message) {
  ui.error.textContent = message;
  ui.error.hidden = false;
}

function getMyRequests() {
  return requests
    .filter((request) => request.patientId === currentPatient.id)
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
}

function getQueuePosition(request) {
  const pending = requests
    .filter((item) => item.status === 'pending')
    .sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));
  const index = pending.findIndex((item) => item.id === request.id);
  return index >= 0 ? index + 1 : null;
}

function renderMyRequests() {
  const myRequests = getMyRequests();
  ui.requestList.replaceChildren();
  ui.requestEmpty.hidden = myRequests.length > 0;

  myRequests.forEach((request) => {
    const card = document.createElement('article');
    card.className = 'patient-request-card';
    const statusInfo = getStatusInfo(request.status);
    const position = getQueuePosition(request);

    card.innerHTML = `
      <div class="patient-request-card-top">
        <div>
          <strong>${capitalizeFirst(fullDateFormatter.format(patientData.fromDateKey(request.date)))} às ${escapeHtml(request.time)}</strong>
          <span>${escapeHtml(request.mode)} · 50 minutos</span>
        </div>
        <span class="patient-status ${statusInfo.className}">${statusInfo.label}</span>
      </div>
      <div class="patient-request-meta">
        <div><span>Pedido enviado em</span><strong>${patientData.formatRequestMoment(request.requestedAt, true)}</strong></div>
        <div><span>${position ? 'Posição atual' : 'Resultado'}</span><strong>${position ? `${position}º na fila geral` : (request.rejectionReason || statusInfo.description)}</strong></div>
      </div>
    `;
    ui.requestList.append(card);
  });
}

function getStatusInfo(status) {
  if (status === 'approved') return { label: 'Aprovada', className: 'status-approved', description: 'Consulta confirmada' };
  if (status === 'rejected') return { label: 'Recusada', className: 'status-rejected', description: 'Horário não aprovado' };
  return { label: 'Em análise', className: 'status-pending', description: 'Aguardando psicólogo' };
}

function updateSummary() {
  const myRequests = getMyRequests();
  const pending = myRequests.filter((request) => request.status === 'pending');
  const approved = myRequests.filter((request) => request.status === 'approved');
  ui.pendingCount.textContent = String(pending.length);
  ui.approvedCount.textContent = String(approved.length);

  const now = new Date();
  const next = appointments
    .filter((item) => item.patientId === currentPatient.id && item.status !== 'cancelled')
    .map((item) => ({ ...item, dateTime: new Date(`${item.date}T${item.time}:00`) }))
    .filter((item) => item.dateTime >= now)
    .sort((a, b) => a.dateTime - b.dateTime)[0];

  if (next) {
    ui.nextAppointment.textContent = `${capitalizeFirst(fullDateFormatter.format(next.dateTime))} às ${next.time}`;
    ui.nextMode.textContent = `${next.mode} · com ${responsiblePsychologist.fullName || 'o psicólogo'}`;
  } else {
    ui.nextAppointment.textContent = 'Nenhuma consulta confirmada';
    ui.nextMode.textContent = pending.length ? 'Aguardando aprovação do psicólogo' : 'Escolha um horário no calendário';
  }
}

function refreshData() {
  requests = patientData.getRequests();
  appointments = patientData.getAppointments();
  renderAll();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  ui.toastMessage.textContent = message;
  ui.toast.hidden = false;
  toastTimer = window.setTimeout(() => { ui.toast.hidden = true; }, 4200);
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
  const psychologistName = responsiblePsychologist.fullName || 'Profissional PsiNote';
  const serviceFormat = responsiblePsychologist.professionalData?.serviceFormat;
  const formatLabel = serviceFormat === 'online' ? 'Atendimento online' : serviceFormat === 'presencial' ? 'Atendimento presencial' : 'Atendimento online e presencial';
  ui.therapistName.textContent = psychologistName;
  ui.therapistAvatar.textContent = getInitials(psychologistName) || 'Ψ';
  ui.therapistAvatar.classList.toggle('has-photo', Boolean(responsiblePsychologist.avatarDataUrl));
  ui.therapistAvatar.style.backgroundImage = responsiblePsychologist.avatarDataUrl ? `url("${responsiblePsychologist.avatarDataUrl}")` : '';
  ui.therapistDetails.textContent = `${responsiblePsychologist.professionalData?.specialty || 'Psicologia clínica'} · ${formatLabel}`;
  ui.nameTop.textContent = currentPatient.name;
  ui.avatar.textContent = getInitials(currentPatient.name);
  ui.avatar.classList.toggle('has-photo', Boolean(currentPatient.avatarDataUrl));
  ui.avatar.style.backgroundImage = currentPatient.avatarDataUrl ? `url("${currentPatient.avatarDataUrl}")` : '';
  renderCalendar();
  renderBookingPanel();
  renderMyRequests();
  updateSummary();
}

document.querySelector('#patientPreviousMonth').addEventListener('click', () => {
  const previous = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  if (previous < currentMonth) return;
  visibleMonth = previous;
  selectedDate = findFirstAvailableDateInMonth(visibleMonth) || new Date(visibleMonth);
  selectedTime = '';
  renderAll();
});

document.querySelector('#patientNextMonth').addEventListener('click', () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  selectedDate = findFirstAvailableDateInMonth(visibleMonth) || new Date(visibleMonth);
  selectedTime = '';
  renderAll();
});

document.querySelector('#patientTodayButton').addEventListener('click', () => {
  selectedDate = findFirstAvailableDate();
  visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  selectedTime = '';
  renderAll();
});

function findFirstAvailableDateInMonth(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  for (let day = 1; day <= last.getDate(); day += 1) {
    const candidate = new Date(first.getFullYear(), first.getMonth(), day);
    if (candidate >= todayAtMidnight() && getSelectableSlots(patientData.toDateKey(candidate)).length > 0) return candidate;
  }
  return null;
}

ui.form.addEventListener('submit', handleBookingSubmit);
ui.mobileMenu.addEventListener('click', () => {
  const isOpen = ui.sidebar.classList.toggle('open');
  ui.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
document.addEventListener('click', (event) => {
  if (window.innerWidth <= 720 && !ui.sidebar.contains(event.target) && !ui.mobileMenu.contains(event.target)) {
    ui.sidebar.classList.remove('open');
    ui.mobileMenu.setAttribute('aria-expanded', 'false');
  }
});
ui.logoutLink?.addEventListener('click', () => patientData.clearSession());
window.addEventListener('storage', refreshData);

renderAll();
