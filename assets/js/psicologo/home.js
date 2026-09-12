"use strict";

/* Tela "Início" do psicólogo (docs/designs/Home psicologo.svg).
   Renderiza saudação, indicadores, agenda de hoje, consultas pendentes
   e notas rápidas. Usa os dados reais de window.PsiNoteData quando
   existirem; sem dados, exibe o conteúdo de demonstração do design. */
(function () {
  const data = window.PsiNoteData;

  /* ---- Toggle do menu mobile ---- */
  const menuButton = document.querySelector(".mobile-menu");
  const sidebar = document.querySelector(".sidebar");

  if (menuButton && sidebar) {
    menuButton.addEventListener("click", function () {
      const isOpen = sidebar.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", function (event) {
      if (
        window.innerWidth <= 720
        && !sidebar.contains(event.target)
        && !menuButton.contains(event.target)
      ) {
        sidebar.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Conteúdo de demonstração do design ---- */
  const DEMO_AGENDA = [
    { time: "08:00", patient: "Ana Clara Souza", mode: "Consulta presencial" },
    { time: "09:30", patient: "João Pedro Lima", mode: "Consulta online" },
    { time: "11:00", patient: "Mariana Alvez", mode: "Consulta presencial" },
    { time: "14:00", patient: "Lucas Ferreira", mode: "Consulta online" },
    { time: "15:30", patient: "Beatriz Rocha", mode: "Consulta presencial" }
  ];

  const DEMO_PENDENTES = [
    { time: "08:40", patient: "Maria Clara", mode: "Consulta presencial" },
    { time: "09:30", patient: "Pedro Lima", mode: "Consulta online" },
    { time: "12:15", patient: "Reinaldo Junior", mode: "Consulta presencial" },
    { time: "13:45", patient: "Ferreira Santos", mode: "Consulta online" },
    { time: "16:10", patient: "Bernardo Braga", mode: "Consulta presencial" }
  ];

  const DEMO_NOTAS = [
    { date: "09/07/2026", text: "Paciente relatou que lorem ipsum lore ipsum lorem ipsum.." },
    { date: "09/07/2026", text: "Paciente relatou que lorem ipsum lore ipsum lorem ipsum.." },
    { date: "09/07/2026", text: "Paciente relatou que lorem ipsum lore ipsum lorem ipsum.." }
  ];

  function normalizeMode(mode) {
    const value = String(mode || "").toLowerCase();
    if (value.includes("online") || value.includes("remota")) return "Consulta online";
    return "Consulta presencial";
  }

  function todayAgenda() {
    if (!data) return DEMO_AGENDA;
    const today = data.toDateKey(new Date());
    const items = data.getAppointments()
      .filter((item) => item.date === today && item.status !== "cancelled")
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
    if (!items.length) return DEMO_AGENDA;
    return items.map((item) => ({
      time: item.time,
      patient: item.patient,
      mode: normalizeMode(item.mode)
    }));
  }

  function pendingList() {
    if (!data) return DEMO_PENDENTES;
    const items = data.getRequests()
      .filter((item) => item.status === "pending")
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
    if (!items.length) return DEMO_PENDENTES;
    return items.map((item) => ({
      time: item.time,
      patient: item.patient,
      mode: normalizeMode(item.mode)
    }));
  }

  function notesList() {
    if (!data) return { rows: DEMO_NOTAS, total: 12 };
    const entries = Object.entries(data.getNotes())
      .filter(([key, text]) => key.startsWith("appt:") && !key.endsWith(":mood") && String(text).trim());
    if (!entries.length) return { rows: DEMO_NOTAS, total: 12 };
    const today = new Date().toLocaleDateString("pt-BR");
    return {
      rows: entries.slice(0, 3).map(([key, text]) => ({ date: today, text: String(text).trim() })),
      total: entries.length
    };
  }

  function renderGreeting() {
    const el = document.getElementById("homeUserName");
    if (!el || !data) return;
    const session = data.getSession();
    const fullName = session && (session.name || session.fullName);
    if (fullName) el.textContent = String(fullName).split(" ")[0];
  }

  function renderSlotRow(item, badgeText, badgeClass) {
    const li = document.createElement("li");
    li.className = "slot-row";

    const time = document.createElement("span");
    time.className = "slot-time";
    time.textContent = item.time;

    const name = document.createElement("span");
    name.className = "slot-name";
    name.textContent = item.patient;

    const mode = document.createElement("span");
    mode.className = "slot-mode";
    mode.textContent = item.mode;

    const badge = document.createElement("span");
    badge.className = `badge ${badgeClass}`;
    badge.textContent = badgeText;

    li.append(time, name, mode, badge);
    return li;
  }

  function renderSlots(listId, items, badgeText, badgeClass) {
    const list = document.getElementById(listId);
    if (!list) return items.length;
    list.textContent = "";
    items.forEach((item) => list.appendChild(renderSlotRow(item, badgeText, badgeClass)));
    return items.length;
  }

  function renderNotes() {
    const list = document.getElementById("notasList");
    const notes = notesList();
    if (!list) return notes.total;
    list.textContent = "";
    notes.rows.forEach((note) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.className = "note-row";
      link.href = "historico.html";

      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z");
      icon.appendChild(path);

      const body = document.createElement("span");
      body.className = "note-body";
      const date = document.createElement("span");
      date.className = "note-date";
      date.textContent = note.date;
      const text = document.createElement("p");
      text.className = "note-text";
      text.textContent = note.text;
      body.append(date, text);

      const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chevron.setAttribute("viewBox", "0 0 24 24");
      chevron.setAttribute("class", "note-chevron");
      chevron.setAttribute("aria-hidden", "true");
      const chevronPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      chevronPath.setAttribute("d", "m9 18 6-6-6-6");
      chevron.appendChild(chevronPath);

      link.append(icon, body, chevron);
      li.appendChild(link);
      list.appendChild(li);
    });
    return notes.total;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function render() {
    renderGreeting();
    const agendaCount = renderSlots("agendaHojeList", todayAgenda(), "Confirmado", "badge--ok");
    renderSlots("pendentesList", pendingList(), "Pendente", "badge--pending");
    const notesCount = renderNotes();

    setText("statConsultas", agendaCount);
    setText("statAnotacoes", notesCount);
    if (data) {
      const profiles = data.getProfiles().length;
      if (profiles) setText("statPacientes", profiles);
    }
  }

  render();
}());
