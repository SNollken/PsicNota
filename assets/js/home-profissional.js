const data = window.PsiNoteData;

const elements = {
  greetingTitle: document.querySelector('#greetingTitle'),
  psychologistName: document.querySelector('#psychologistName'),
  psychologistAvatar: document.querySelector('#psychologistAvatar'),
  pendingCount: document.querySelector('#pendingCount'),
  todayCount: document.querySelector('#todayCount'),
  weekCount: document.querySelector('#weekCount'),
  patientCount: document.querySelector('#patientCount'),
  avisosCard: document.querySelector('#avisosCard'),
  noticeList: document.querySelector('#noticeList'),
  upcomingList: document.querySelector('#upcomingList'),
  emptyUpcoming: document.querySelector('#emptyUpcoming'),
  recentRequests: document.querySelector('#recentRequests'),
  emptyRequests: document.querySelector('#emptyRequests'),
  todayReminder: document.querySelector('#todayReminder'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });

const session = data.getSession();
const currentPsychologist = session && ['psicologo', 'psychologist'].includes(session.role)
  ? session
  : { id: 'demo-psychologist', name: 'Psicólogo PsiNote', fullName: 'Psicólogo PsiNote', role: 'psicologo' };

function getInitials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function getConfirmed() {
  return data.getAppointments().filter((item) => item.status !== 'cancelled');
}

function getPendingRequests() {
  return data.getRequests()
    .filter((item) => item.status === 'pending')
    .sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));
}

function addNotice(text, tone = 'info') {
  const notice = document.createElement('div');
  notice.className = `notice-item notice-${tone}`;
  notice.textContent = text;
  elements.noticeList.append(notice);
}

function renderHeader() {
  const displayName = currentPsychologist.fullName || currentPsychologist.name || 'Psicólogo PsiNote';
  const firstName = String(displayName).split(/\s+/)[0];
  elements.greetingTitle.textContent = `Olá, ${firstName}`;
  elements.psychologistName.textContent = displayName;
  elements.psychologistAvatar.textContent = getInitials(displayName);
}

function renderSummary() {
  const now = new Date();
  const todayKey = data.toDateKey(now);
  const confirmed = getConfirmed();
  const pending = getPendingRequests();

  elements.pendingCount.textContent = pending.length === 1 ? '1 solicitação' : `${pending.length} solicitações`;

  const today = confirmed.filter((item) => item.date === todayKey);
  elements.todayCount.textContent = today.length === 1 ? '1 consulta' : `${today.length} consultas`;

  const dayOfWeek = now.getDay();
  const weekStart = data.addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -dayOfWeek);
  const weekEnd = data.addDays(weekStart, 6);
  const week = confirmed.filter((item) => {
    const date = data.fromDateKey(item.date);
    return date >= weekStart && date <= weekEnd;
  });
  elements.weekCount.textContent = week.length === 1 ? '1 consulta' : `${week.length} consultas`;

  const patients = new Set(confirmed.map((item) => item.patient));
  elements.patientCount.textContent = String(patients.size);

  if (pending.length > 0) {
    addNotice(`Você tem ${pending.length === 1 ? '1 solicitação de consulta aguardando aprovação' : `${pending.length} solicitações de consulta aguardando aprovação`} na fila.`, 'warning');
  }
  if (today.length > 0) {
    addNotice(`Hoje você tem ${today.length === 1 ? '1 consulta' : `${today.length} consultas`}. A primeira é às ${today.sort((a, b) => a.time.localeCompare(b.time))[0].time}.`, 'info');
  }
  const withoutNote = today.filter((item) => !data.hasAppointmentNote(item.id));
  if (withoutNote.length > 0) {
    addNotice(`${withoutNote.length === 1 ? '1 consulta de hoje ainda está sem notas rápidas' : `${withoutNote.length} consultas de hoje ainda estão sem notas rápidas`}. Registre durante o atendimento.`, 'info');
  }
  if (elements.noticeList.children.length > 0) {
    elements.avisosCard.hidden = false;
  }
}

function renderUpcoming() {
  const now = new Date();
  const upcoming = getConfirmed()
    .map((item) => ({ ...item, dateTime: new Date(`${item.date}T${item.time}:00`) }))
    .filter((item) => item.dateTime >= now)
    .sort((a, b) => a.dateTime - b.dateTime)
    .slice(0, 5);

  elements.upcomingList.replaceChildren();
  elements.emptyUpcoming.hidden = upcoming.length > 0;

  upcoming.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'mini-item';

    const when = document.createElement('div');
    when.className = 'mini-item-when';
    const day = document.createElement('strong');
    day.textContent = shortDateFormatter.format(item.dateTime);
    const time = document.createElement('span');
    time.textContent = item.time;
    when.append(day, time);

    const info = document.createElement('div');
    info.className = 'mini-item-info';
    const name = document.createElement('strong');
    name.textContent = item.patient;
    const meta = document.createElement('span');
    meta.textContent = `${item.mode}${data.hasAppointmentNote(item.id) ? ' · com notas' : ''}`;
    info.append(name, meta);

    const open = document.createElement('a');
    open.className = 'button button-secondary button-compact';
    open.href = `consulta.html?id=${item.id}`;
    open.textContent = 'Abrir';

    row.append(when, info, open);
    elements.upcomingList.append(row);
  });
}

function renderRecentRequests() {
  const pending = getPendingRequests().slice(0, 4);
  elements.recentRequests.replaceChildren();
  elements.emptyRequests.hidden = pending.length > 0;

  pending.forEach((request) => {
    const row = document.createElement('div');
    row.className = 'mini-item';

    const when = document.createElement('div');
    when.className = 'mini-item-when';
    const day = document.createElement('strong');
    day.textContent = shortDateFormatter.format(data.fromDateKey(request.date));
    const time = document.createElement('span');
    time.textContent = request.time;
    when.append(day, time);

    const info = document.createElement('div');
    info.className = 'mini-item-info';
    const name = document.createElement('strong');
    name.textContent = request.patient;
    const meta = document.createElement('span');
    meta.textContent = `Pedido em ${data.formatRequestMoment(request.requestedAt, false)}`;
    info.append(name, meta);

    const review = document.createElement('a');
    review.className = 'button button-primary button-compact';
    review.href = 'agenda.html#solicitacoes';
    review.textContent = 'Analisar';

    row.append(when, info, review);
    elements.recentRequests.append(row);
  });
}

function renderTodayReminder() {
  const todayKey = data.toDateKey(new Date());
  const notes = data.getNotes();
  const reminder = (notes[todayKey] || '').trim();
  elements.todayReminder.textContent = reminder || 'Sem lembrete para hoje.';
}

function init() {
  renderHeader();
  renderSummary();
  renderUpcoming();
  renderRecentRequests();
  renderTodayReminder();
}

elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());
window.addEventListener('storage', init);

init();
