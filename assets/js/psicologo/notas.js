"use strict";

(() => {
  const data = window.PsiNoteData;
  const appointmentSelect = document.querySelector('#notesAppointment');
  const noteText = document.querySelector('#noteText');
  const status = document.querySelector('#notesStatus');
  const patientAvatar = document.querySelector('#patientAvatar');
  const defaultPatientAvatar = patientAvatar.src;
  const supabaseClient = window.PsicNotaSupabase;
  const moodButtons = [...document.querySelectorAll('#notesMoodPicker [data-mood]')];
  const params = new URLSearchParams(location.search);
  let psychologistId = '';
  let selectedMood = '';
  let appointments = [];
  let saveTimer = 0;
  let activeAppointmentId;
  let pendingSave = null;
  const saveQueues = new Map();
  const latestSaves = new Map();

  const formatDate = (key) => new Intl.DateTimeFormat('pt-BR').format(data.fromDateKey(key));
  const selectedId = () => appointmentSelect.value || null;
  const storageId = (consultaId) => consultaId || `__sem_consulta__:${psychologistId}`;

  function buildAppointmentOptions() {
    appointments.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    appointmentSelect.replaceChildren();
    const unlinkedOption = document.createElement('option');
    unlinkedOption.value = '';
    unlinkedOption.textContent = 'Sem consulta vinculada';
    appointmentSelect.append(unlinkedOption);
    for (const appointment of appointments) {
      const option = document.createElement('option');
      option.value = appointment.id;
      option.textContent = `${appointment.patient} - ${formatDate(appointment.date)} as ${appointment.time}`;
      appointmentSelect.append(option);
    }
    appointmentSelect.disabled = false;
    if (appointments.some((item) => item.id === params.get('consulta'))) {
      appointmentSelect.value = params.get('consulta');
    } else {
      appointmentSelect.value = '';
    }
    document.querySelector('#finishConsultation').disabled = !selectedId();
  }

  function renderMood() {
    for (const button of moodButtons) {
      const checked = button.dataset.mood === selectedMood;
      button.setAttribute('aria-checked', String(checked));
      button.classList.toggle('selected', checked);
    }
  }

  function loadAppointment() {
    if (activeAppointmentId !== undefined && activeAppointmentId !== selectedId()) {
      const hasPendingSave = pendingSave?.consultaId === activeAppointmentId;
      void flushPendingSave();
      if (!hasPendingSave) {
        persistNote(activeAppointmentId, noteText.value.trim(), selectedMood);
      }
    }
    clearTimeout(saveTimer);
    pendingSave = null;
    activeAppointmentId = selectedId();
    noteText.value = data.getAppointmentNote(storageId(activeAppointmentId));
    selectedMood = data.getAppointmentMood(storageId(activeAppointmentId));
    patientAvatar.src = defaultPatientAvatar;
    void loadPatientAvatar(selectedId());
    document.querySelector('#finishConsultation').disabled = !selectedId();
    renderMood();
    status.textContent = '';
  }

  async function loadPatientAvatar(appointmentId) {
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment?.patientId || !supabaseClient) return;

    try {
      const { data: patient, error } = await supabaseClient
        .from('perfis')
        .select('avatar_url')
        .eq('id', appointment.patientId)
        .eq('papel', 'paciente')
        .maybeSingle();
      if (error || !patient?.avatar_url) return;

      const { data: avatar, error: avatarError } = await supabaseClient
        .storage
        .from('avatars')
        .createSignedUrl(patient.avatar_url, 3600);
      if (avatarError || !avatar?.signedUrl || selectedId() !== appointmentId) return;

      patientAvatar.src = avatar.signedUrl;
    } catch {
      patientAvatar.src = defaultPatientAvatar;
    }
  }

  function persistNote(consultaId, conteudo, humor) {
    const noteId = storageId(consultaId);
    data.setAppointmentNote(noteId, conteudo);
    data.setAppointmentMood(noteId, humor);

    const saveId = (latestSaves.get(consultaId) || 0) + 1;
    latestSaves.set(consultaId, saveId);
    const previousSave = saveQueues.get(consultaId) || Promise.resolve();
    const save = previousSave.catch(() => false).then(() => data.saveNoteToDb(consultaId, conteudo, humor || null));
    saveQueues.set(consultaId, save);
    return save.then((saved) => {
      if (selectedId() === consultaId && latestSaves.get(consultaId) === saveId) {
        status.textContent = saved ? 'Anotações salvas.' : 'Anotações salvas localmente (sem conexão).';
      }
      return saved;
    }).catch(() => {
      if (selectedId() === consultaId && latestSaves.get(consultaId) === saveId) {
        status.textContent = 'Anotações salvas localmente (sem conexão).';
      }
      return false;
    });
  }

  function scheduleSave() {
    const consultaId = selectedId();
    pendingSave = { consultaId, conteudo: noteText.value.trim(), humor: selectedMood };
    data.setAppointmentNote(storageId(consultaId), pendingSave.conteudo);
    data.setAppointmentMood(storageId(consultaId), pendingSave.humor);
    status.textContent = 'Salvando…';
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => { void flushPendingSave(); }, 650);
  }

  function flushPendingSave() {
    clearTimeout(saveTimer);
    if (!pendingSave) return saveQueues.get(activeAppointmentId) || Promise.resolve(true);
    const snapshot = pendingSave;
    pendingSave = null;
    return persistNote(snapshot.consultaId, snapshot.conteudo, snapshot.humor);
  }

  appointmentSelect.addEventListener('change', loadAppointment);
  moodButtons.forEach((button) => button.addEventListener('click', () => {
    selectedMood = selectedMood === button.dataset.mood ? '' : button.dataset.mood;
    renderMood();
    scheduleSave();
  }));
  noteText.addEventListener('input', scheduleSave);
  document.querySelector('#finishConsultation').addEventListener('click', async () => {
    await flushPendingSave();
    location.href = `relatorios.html?consulta=${encodeURIComponent(selectedId())}&usarNotas=1`;
  });
  document.querySelector('.mobile-menu').addEventListener('click', (event) => {
    const sidebar = document.querySelector('.sidebar');
    const open = sidebar.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });

  async function init() {
    const auth = await window.PsicNotaBackend.requireProfile("psicologo");
    if (!auth) return;
    psychologistId = auth.user.id;

    await data.syncRemoteData();
    appointments = data.getAppointments().filter((item) => item.status !== 'cancelled');
    buildAppointmentOptions();
    loadAppointment();
  }

  void init();
})();
