"use strict";

(() => {
  const data = window.PsiNoteData;
  const appointmentSelect = document.querySelector('#notesAppointment');
  const noteText = document.querySelector('#noteText');
  const status = document.querySelector('#notesStatus');
  const moodButtons = [...document.querySelectorAll('#notesMoodPicker [data-mood]')];
  const params = new URLSearchParams(location.search);
  let selectedMood = '';
  let appointments = [];

  const formatDate = (key) => new Intl.DateTimeFormat('pt-BR').format(data.fromDateKey(key));
  const selectedId = () => appointmentSelect.value;

  function buildAppointmentOptions() {
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
  }

  function renderMood() {
    for (const button of moodButtons) {
      const checked = button.dataset.mood === selectedMood;
      button.setAttribute('aria-checked', String(checked));
      button.classList.toggle('selected', checked);
    }
  }

  function loadAppointment() {
    noteText.value = data.getAppointmentNote(selectedId());
    selectedMood = data.getAppointmentMood(selectedId());
    renderMood();
    status.textContent = '';
  }

  async function saveNote() {
    if (!selectedId()) return;
    const consultaId = selectedId();
    const conteudo = noteText.value.trim();

    data.setAppointmentNote(consultaId, conteudo);
    data.setAppointmentMood(consultaId, selectedMood);

    const saved = await data.saveNoteToDb(consultaId, conteudo, selectedMood || null);
    status.textContent = saved ? 'Anotações salvas.' : 'Anotações salvas localmente (sem conexão).';
  }

  appointmentSelect.addEventListener('change', loadAppointment);
  moodButtons.forEach((button) => button.addEventListener('click', () => {
    selectedMood = selectedMood === button.dataset.mood ? '' : button.dataset.mood;
    renderMood();
    status.textContent = '';
  }));
  noteText.addEventListener('input', () => { status.textContent = ''; });
  document.querySelector('#saveNote').addEventListener('click', () => void saveNote());
  document.querySelector('#finishConsultation').addEventListener('click', async () => {
    await saveNote();
    location.href = `relatorios.html?consulta=${encodeURIComponent(selectedId())}&usarNotas=1`;
  });
  document.querySelector('.mobile-menu').addEventListener('click', (event) => {
    const sidebar = document.querySelector('.sidebar');
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });

  async function init() {
    const _auth = await window.PsicNotaBackend.requireProfile("psicologo");
    if (!_auth) return;

    await data.syncRemoteData();
    appointments = data.getAppointments().filter((item) => item.status !== 'cancelled');
    buildAppointmentOptions();
    if (appointments.length) loadAppointment();
  }

  void init();
})();
