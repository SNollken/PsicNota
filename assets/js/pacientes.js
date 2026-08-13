const data = window.PsiNoteData;

const elements = {
  psychologistName: document.querySelector('#psychologistName'),
  psychologistAvatar: document.querySelector('#psychologistAvatar'),
  patientSearch: document.querySelector('#patientSearch'),
  patientList: document.querySelector('#patientList'),
  patientTotal: document.querySelector('#patientTotal'),
  emptyPatients: document.querySelector('#emptyPatients'),
  noMatch: document.querySelector('#noMatch'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const session = data.getSession();
const currentPsychologist = session && ['psicologo', 'psychologist'].includes(session.role)
  ? session
  : { id: 'demo-psychologist', name: 'Psicólogo PsiNote', fullName: 'Psicólogo PsiNote', role: 'psicologo' };

function getInitials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function buildPatients() {
  const appointments = data.getAppointments();
  const reports = data.getReports();
  const documents = data.getDocuments();
  const now = new Date();

  const byName = new Map();
  appointments.forEach((item) => {
    const name = String(item.patient || '').trim();
    if (!name) return;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(item);
  });

  const patients = [];
  byName.forEach((items, name) => {
    const active = items
      .filter((item) => item.status !== 'cancelled')
      .map((item) => ({ ...item, dateTime: new Date(`${item.date}T${item.time}:00`) }));
    const past = active.filter((item) => item.dateTime < now).sort((a, b) => b.dateTime - a.dateTime);
    const future = active.filter((item) => item.dateTime >= now).sort((a, b) => a.dateTime - b.dateTime);

    patients.push({
      name,
      total: active.length,
      last: past[0] || null,
      next: future[0] || null,
      notes: items.filter((item) => data.hasAppointmentNote(item.id)).length,
      reports: reports.filter((report) => report.patient === name).length,
      documents: documents.filter((doc) => doc.patient === name).length,
      sortKey: past[0] ? past[0].dateTime : (future[0] ? future[0].dateTime : new Date(0))
    });
  });

  return patients.sort((a, b) => b.sortKey - a.sortKey);
}

function renderPatient(patient) {
  const card = document.createElement('article');
  card.className = 'patient-card';

  const avatar = document.createElement('div');
  avatar.className = 'mini-avatar patient-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = getInitials(patient.name);

  const info = document.createElement('div');
  info.className = 'patient-info';
  const name = document.createElement('strong');
  name.textContent = patient.name;
  const meta = document.createElement('span');
  const parts = [];
  parts.push(patient.total === 1 ? '1 consulta' : `${patient.total} consultas`);
  if (patient.last) parts.push(`última em ${shortDateFormatter.format(patient.last.dateTime)}`);
  if (patient.next) parts.push(`próxima em ${shortDateFormatter.format(patient.next.dateTime)} às ${patient.next.time}`);
  if (patient.notes > 0) parts.push(patient.notes === 1 ? '1 nota registrada' : `${patient.notes} notas registradas`);
  if (patient.reports > 0) parts.push(patient.reports === 1 ? '1 relatório' : `${patient.reports} relatórios`);
  if (patient.documents > 0) parts.push(patient.documents === 1 ? '1 documento' : `${patient.documents} documentos`);
  meta.textContent = parts.join(' · ');
  info.append(name, meta);

  const history = document.createElement('a');
  history.className = 'button button-primary button-compact';
  history.href = `historico.html?paciente=${encodeURIComponent(patient.name)}`;
  history.textContent = 'Ver histórico';

  card.append(avatar, info, history);
  return card;
}

function render() {
  const patients = buildPatients();
  const query = elements.patientSearch.value.trim().toLowerCase();
  const filtered = query
    ? patients.filter((patient) => patient.name.toLowerCase().includes(query))
    : patients;

  elements.patientList.replaceChildren();
  elements.emptyPatients.hidden = patients.length > 0;
  elements.noMatch.hidden = !(patients.length > 0 && filtered.length === 0);
  elements.patientTotal.textContent = patients.length === 1 ? '1 paciente' : `${patients.length} pacientes`;

  filtered.forEach((patient) => elements.patientList.append(renderPatient(patient)));
}

function renderHeader() {
  const displayName = currentPsychologist.fullName || currentPsychologist.name || 'Psicólogo PsiNote';
  elements.psychologistName.textContent = displayName;
  elements.psychologistAvatar.textContent = getInitials(displayName);
}

elements.patientSearch.addEventListener('input', render);
elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());
window.addEventListener('storage', render);

renderHeader();
render();
