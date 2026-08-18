const data = window.PsiNoteData;

const elements = {
  psychologistName: document.querySelector('#psychologistName'),
  psychologistAvatar: document.querySelector('#psychologistAvatar'),
  patientSearch: document.querySelector('#patientSearch'),
  patientList: document.querySelector('#patientList'),
  patientTotal: document.querySelector('#patientTotal'),
  emptyPatients: document.querySelector('#emptyPatients'),
  noMatch: document.querySelector('#noMatch'),
  recentAppointments: document.querySelector('#recentAppointments'),
  recentEmpty: document.querySelector('#recentEmpty'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu')
};

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

const session = data.getSession();
const currentPsychologist = session && ['psicologo', 'psychologist'].includes(session.role)
  ? session
  : {
      id: 'demo-psychologist',
      name: 'Psicólogo PsiNote',
      fullName: 'Psicólogo PsiNote',
      role: 'psicologo'
    };

function getInitials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getAppointmentDateTime(appointment) {
  return new Date(`${appointment.date}T${appointment.time}:00`);
}

function formatDuration(duration) {
  const value = Number(duration);
  if (value === 60) return '1 hora';
  if (!Number.isFinite(value)) return 'Duração não informada';
  return `${value} min`;
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
      .map((item) => ({ ...item, dateTime: getAppointmentDateTime(item) }));

    const past = active
      .filter((item) => item.dateTime < now)
      .sort((a, b) => b.dateTime - a.dateTime);

    const future = active
      .filter((item) => item.dateTime >= now)
      .sort((a, b) => a.dateTime - b.dateTime);

    patients.push({
      name,
      total: active.length,
      last: past[0] || null,
      next: future[0] || null,
      notes: items.filter((item) => data.hasAppointmentNote(item.id)).length,
      reports: reports.filter((report) => report.patient === name).length,
      documents: documents.filter((doc) => doc.patient === name).length,
      sortKey: past[0]?.dateTime || future[0]?.dateTime || new Date(0)
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

  const meta = document.createElement('div');
  meta.className = 'patient-meta';

  const consultationCount = document.createElement('span');
  consultationCount.textContent = patient.total === 1 ? '1 consulta' : `${patient.total} consultas`;
  meta.append(consultationCount);

  if (patient.last) {
    const last = document.createElement('span');
    last.textContent = `Última em ${shortDateFormatter.format(patient.last.dateTime)}`;
    meta.append(last);
  }

  if (patient.next) {
    const next = document.createElement('span');
    next.className = 'patient-next';
    next.textContent = `Próxima em ${shortDateFormatter.format(patient.next.dateTime)} às ${patient.next.time}`;
    meta.append(next);
  } else if (patient.reports > 0) {
    const report = document.createElement('span');
    report.textContent = patient.reports === 1 ? '1 relatório' : `${patient.reports} relatórios`;
    meta.append(report);
  } else if (patient.notes > 0) {
    const note = document.createElement('span');
    note.textContent = patient.notes === 1 ? '1 nota registrada' : `${patient.notes} notas registradas`;
    meta.append(note);
  } else if (patient.documents > 0) {
    const documentCount = document.createElement('span');
    documentCount.textContent = patient.documents === 1 ? '1 documento' : `${patient.documents} documentos`;
    meta.append(documentCount);
  }

  info.append(name, meta);

  const history = document.createElement('a');
  history.className = 'button button-primary button-compact';
  history.href = `historico.html?paciente=${encodeURIComponent(patient.name)}`;
  history.textContent = 'Ver histórico';

  card.append(avatar, info, history);
  return card;
}

function getRecentAppointments() {
  const now = new Date();

  return data.getAppointments()
    .filter((item) => item.status !== 'cancelled')
    .map((item) => ({ ...item, dateTime: getAppointmentDateTime(item) }))
    .filter((item) => item.dateTime < now)
    .sort((a, b) => b.dateTime - a.dateTime)
    .slice(0, 4);
}

function renderRecentAppointment(appointment) {
  const item = document.createElement('article');
  item.className = 'recent-appointment';

  const date = document.createElement('div');
  date.className = 'recent-date';

  const day = document.createElement('strong');
  day.textContent = String(appointment.dateTime.getDate()).padStart(2, '0');

  const month = document.createElement('span');
  month.textContent = monthFormatter.format(appointment.dateTime).replace('.', '');
  date.append(day, month);

  const copy = document.createElement('div');
  copy.className = 'recent-copy';

  const patient = document.createElement('strong');
  patient.textContent = appointment.patient;

  const meta = document.createElement('span');
  const mode = appointment.mode || 'Modalidade não informada';
  meta.textContent = `${appointment.time} · ${formatDuration(appointment.duration)} · ${mode}`;
  copy.append(patient, meta);

  const open = document.createElement('a');
  open.className = 'recent-open';
  open.href = `consulta.html?id=${encodeURIComponent(appointment.id)}`;
  open.setAttribute('aria-label', `Abrir registro da consulta de ${appointment.patient}`);
  open.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';

  item.append(date, copy, open);
  return item;
}

function renderPatients() {
  const patients = buildPatients();
  const query = elements.patientSearch.value.trim().toLowerCase();
  const filtered = query
    ? patients.filter((patient) => patient.name.toLowerCase().includes(query))
    : patients;

  elements.patientList.replaceChildren();
  elements.emptyPatients.hidden = patients.length > 0;
  elements.noMatch.hidden = !(patients.length > 0 && filtered.length === 0);
  elements.patientTotal.textContent = filtered.length === 1 ? '1 paciente' : `${filtered.length} pacientes`;

  filtered.forEach((patient) => {
    elements.patientList.append(renderPatient(patient));
  });
}

function renderRecentAppointments() {
  const recent = getRecentAppointments();
  elements.recentAppointments.replaceChildren();
  elements.recentEmpty.hidden = recent.length > 0;

  recent.forEach((appointment) => {
    elements.recentAppointments.append(renderRecentAppointment(appointment));
  });
}

function renderHeader() {
  const displayName = currentPsychologist.fullName || currentPsychologist.name || 'Psicólogo PsiNote';
  elements.psychologistName.textContent = displayName;
  elements.psychologistAvatar.textContent = getInitials(displayName);
  elements.psychologistAvatar.classList.toggle('has-photo', Boolean(currentPsychologist.avatarDataUrl));
  elements.psychologistAvatar.style.backgroundImage = currentPsychologist.avatarDataUrl
    ? `url("${currentPsychologist.avatarDataUrl}")`
    : '';
}

function renderAll() {
  renderHeader();
  renderPatients();
  renderRecentAppointments();
}

elements.patientSearch.addEventListener('input', renderPatients);

elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', (event) => {
  if (
    window.innerWidth <= 720 &&
    !elements.sidebar.contains(event.target) &&
    !elements.mobileMenu.contains(event.target)
  ) {
    elements.sidebar.classList.remove('open');
    elements.mobileMenu.setAttribute('aria-expanded', 'false');
  }
});

window.addEventListener('storage', renderAll);

renderAll();
