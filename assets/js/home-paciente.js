const data = window.PsiNoteData;

const elements = {
  greetingTitle: document.querySelector('#greetingTitle'),
  patientName: document.querySelector('#patientName'),
  patientAvatar: document.querySelector('#patientAvatar'),
  nextAppointment: document.querySelector('#nextAppointment'),
  pendingCount: document.querySelector('#pendingCount'),
  doneCount: document.querySelector('#doneCount'),
  docCount: document.querySelector('#docCount'),
  avisosCard: document.querySelector('#avisosCard'),
  noticeList: document.querySelector('#noticeList'),
  upcomingList: document.querySelector('#upcomingList'),
  emptyUpcoming: document.querySelector('#emptyUpcoming'),
  requestList: document.querySelector('#requestList'),
  emptyRequests: document.querySelector('#emptyRequests'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

const session = data.getSession();
const currentPatient = session && ['paciente', 'patient'].includes(session.role)
  ? { ...session, name: session.fullName || session.name, role: 'paciente' }
  : { id: 'demo-paciente', name: 'Paciente PsiNote', role: 'paciente' };

function getInitials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function isMineAppointment(item) {
  if (item.status === 'cancelled') return false;
  if (currentPatient.id && item.patientId && item.patientId === currentPatient.id) return true;
  return item.patient === currentPatient.name;
}

function isMineRequest(item) {
  if (currentPatient.id && item.patientId) return item.patientId === currentPatient.id;
  return item.patient === currentPatient.name;
}

function myAppointments() {
  return data.getAppointments().filter(isMineAppointment);
}

function myRequests() {
  return data.getRequests().filter(isMineRequest);
}

function myDocuments() {
  return data.getDocuments().filter((doc) => doc.patient === currentPatient.name);
}

function addNotice(text, tone = 'info') {
  const notice = document.createElement('div');
  notice.className = `notice-item notice-${tone}`;
  notice.textContent = text;
  elements.noticeList.append(notice);
}

function renderHeader() {
  const displayName = currentPatient.name || 'Paciente';
  const firstName = String(displayName).split(/\s+/)[0];
  elements.greetingTitle.textContent = `Olá, ${firstName}`;
  elements.patientName.textContent = displayName;
  elements.patientAvatar.textContent = getInitials(displayName);
}

function renderSummary() {
  const now = new Date();
  const appointments = myAppointments()
    .map((item) => ({ ...item, dateTime: new Date(`${item.date}T${item.time}:00`) }));

  const next = appointments
    .filter((item) => item.dateTime >= now)
    .sort((a, b) => a.dateTime - b.dateTime)[0];
  elements.nextAppointment.textContent = next
    ? `${shortDateFormatter.format(next.dateTime)} às ${next.time}`
    : 'Nenhuma marcada';

  const requests = myRequests();
  const pending = requests.filter((item) => item.status === 'pending');
  elements.pendingCount.textContent = pending.length === 1 ? '1 pedido' : `${pending.length} pedidos`;

  const done = appointments.filter((item) => item.dateTime < now);
  elements.doneCount.textContent = done.length === 1 ? '1 consulta' : `${done.length} consultas`;

  const docs = myDocuments();
  elements.docCount.textContent = docs.length === 1 ? '1 documento' : `${docs.length} documentos`;

  if (pending.length > 0) {
    addNotice(`Você tem ${pending.length === 1 ? '1 solicitação em análise' : `${pending.length} solicitações em análise`}. O psicólogo responde por ordem de chegada.`, 'info');
  }
  const approved = requests.filter((item) => item.status === 'approved');
  if (approved.length > 0) {
    const last = approved.sort((a, b) => new Date(b.reviewedAt || 0) - new Date(a.reviewedAt || 0))[0];
    addNotice(`Sua solicitação para ${shortDateFormatter.format(data.fromDateKey(last.date))} às ${last.time} foi aprovada.`, 'success');
  }
  const rejected = requests.filter((item) => item.status === 'rejected');
  if (rejected.length > 0) {
    addNotice(`${rejected.length === 1 ? 'Uma solicitação sua foi recusada' : `${rejected.length} solicitações suas foram recusadas`}. Você pode escolher outro horário.`, 'warning');
  }
  if (docs.length > 0) {
    const lastDoc = docs.sort((a, b) => new Date(b.attachedAt) - new Date(a.attachedAt))[0];
    addNotice(`Novo documento disponível: ${lastDoc.name}.`, 'info');
  }
  if (elements.noticeList.children.length > 0) {
    elements.avisosCard.hidden = false;
  }
}

function renderUpcoming() {
  const now = new Date();
  const upcoming = myAppointments()
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
    const title = document.createElement('strong');
    title.textContent = 'Consulta confirmada';
    const meta = document.createElement('span');
    meta.textContent = item.mode;
    info.append(title, meta);

    row.append(when, info);
    elements.upcomingList.append(row);
  });
}

function renderRequests() {
  const statusLabel = { pending: 'Em análise', approved: 'Aprovada', rejected: 'Recusada' };
  const recent = myRequests()
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
    .slice(0, 5);

  elements.requestList.replaceChildren();
  elements.emptyRequests.hidden = recent.length > 0;

  recent.forEach((request) => {
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
    const title = document.createElement('strong');
    title.textContent = statusLabel[request.status] || request.status;
    const meta = document.createElement('span');
    meta.textContent = `Pedido em ${data.formatRequestMoment(request.requestedAt, false)}`;
    info.append(title, meta);

    row.append(when, info);
    elements.requestList.append(row);
  });
}

function init() {
  renderHeader();
  renderSummary();
  renderUpcoming();
  renderRequests();
}

elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());
window.addEventListener('storage', init);

init();
