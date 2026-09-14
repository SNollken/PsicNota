"use strict";

(() => {
  const data = window.PsiNoteData;
  const appointmentSelect = document.querySelector('#notesAppointment');
  const noteText = document.querySelector('#noteText');
  const status = document.querySelector('#notesStatus');
  const moodButtons = [...document.querySelectorAll('.moods button')];
  const appointments = data.getAppointments().filter((item) => item.status !== 'cancelled');
  const params = new URLSearchParams(location.search);
  let selectedMood = '';

  const formatDate = (key) => new Intl.DateTimeFormat('pt-BR').format(data.fromDateKey(key));
  const selectedId = () => appointmentSelect.value;

  appointments.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  appointmentSelect.replaceChildren();
  for (const appointment of appointments) {
    const option = document.createElement('option');
    option.value = appointment.id;
    option.textContent = `${appointment.patient} - ${formatDate(appointment.date)} as ${appointment.time}`;
    appointmentSelect.append(option);
  }
  if (!appointments.length) {
    const option = document.createElement('option');
    option.textContent = 'Nenhuma consulta disponível';
    appointmentSelect.append(option);
    appointmentSelect.disabled = true;
    document.querySelector('#saveNote').disabled = true;
    document.querySelector('#finishConsultation').disabled = true;
  } else if (appointments.some((item) => item.id === params.get('consulta'))) {
    appointmentSelect.value = params.get('consulta');
  }

  function renderMood() {
    for (const button of moodButtons) {
      const checked = button.dataset.mood === selectedMood;
      button.setAttribute('aria-checked', String(checked));
    }
  }

  function loadAppointment() {
    noteText.value = data.getAppointmentNote(selectedId());
    selectedMood = data.getAppointmentMood(selectedId());
    renderMood();
    status.textContent = '';
  }

  function saveNote() {
    if (!selectedId()) return;
    data.setAppointmentNote(selectedId(), noteText.value);
    data.setAppointmentMood(selectedId(), selectedMood);
    status.textContent = 'Anotações salvas.';
  }

  appointmentSelect.addEventListener('change', loadAppointment);
  moodButtons.forEach((button) => button.addEventListener('click', () => {
    selectedMood = selectedMood === button.dataset.mood ? '' : button.dataset.mood;
    renderMood();
    status.textContent = '';
  }));
  noteText.addEventListener('input', () => { status.textContent = ''; });
  document.querySelector('#saveNote').addEventListener('click', saveNote);
  document.querySelector('#finishConsultation').addEventListener('click', () => {
    saveNote();
    location.href = `relatorios.html?consulta=${encodeURIComponent(selectedId())}&usarNotas=1`;
  });
  document.querySelector('.mobile-menu').addEventListener('click', (event) => {
    const sidebar = document.querySelector('.sidebar');
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  if (appointments.length) loadAppointment();
})();
