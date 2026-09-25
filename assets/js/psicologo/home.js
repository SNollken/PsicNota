"use strict";

(function () {
  const client = window.PsicNotaSupabase;
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const today = `${dateParts.find((part) => part.type === "year").value}-${dateParts.find((part) => part.type === "month").value}-${dateParts.find((part) => part.type === "day").value}`;

  const menuButton = document.querySelector(".mobile-menu");
  const sidebar = document.querySelector(".sidebar");
  if (menuButton && sidebar) {
    menuButton.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });
    document.addEventListener("click", (event) => {
      if (window.innerWidth <= 1024 && !sidebar.contains(event.target) && !menuButton.contains(event.target)) {
        sidebar.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  function displayName(profile) {
    return profile?.nome_social || profile?.nome_completo || "Paciente";
  }

  function formatTime(time) {
    return String(time || "").slice(0, 5);
  }

  function formatMode(mode) {
    return mode === "online" ? "Consulta online" : "Consulta presencial";
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(`${date}T00:00:00`));
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function createSlot(item, badgeText, badgeClass) {
    const listItem = document.createElement("li");
    listItem.className = "slot-row";
    const link = document.createElement("a");
    link.className = "slot-link";
    link.href = item.id ? `consulta.html?id=${encodeURIComponent(item.id)}` : "agenda-psicologo.html";
    link.setAttribute("aria-label", `Abrir consulta de ${item.patient} às ${item.time}`);

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

    link.append(time, name, mode, badge);
    listItem.appendChild(link);
    return listItem;
  }

  function renderSlots(listId, items, badgeText, badgeClass, emptyMessage) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.textContent = "";
    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "slot-row";
      empty.textContent = emptyMessage;
      list.appendChild(empty);
      return;
    }
    items.forEach((item) => list.appendChild(createSlot(item, badgeText, badgeClass)));
  }

  const NOTE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const REPORT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';
  const CHEVRON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

  function createNote(note) {
    const listItem = document.createElement("li");
    const link = document.createElement("a");
    link.className = "note-row";
    const patient = displayName(note.consultas.paciente);
    link.href = `consulta.html?id=${encodeURIComponent(note.consulta_id)}&paciente=${encodeURIComponent(patient)}`;
    const icon = document.createElement("span");
    icon.className = "note-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = NOTE_ICON;
    const body = document.createElement("span");
    body.className = "note-body";
    const date = document.createElement("span");
    date.className = "note-date";
    date.textContent = formatDate(note.consultas.data);
    const text = document.createElement("p");
    text.className = "note-text";
    text.textContent = note.conteudo;
    const chevron = document.createElement("span");
    chevron.className = "note-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML = CHEVRON_ICON;
    body.append(text);
    link.append(icon, body, date, chevron);
    listItem.appendChild(link);
    return listItem;
  }

  function renderNotes(notes) {
    const list = document.getElementById("notasList");
    if (!list) return;
    list.textContent = "";
    if (!notes.length) {
      const empty = document.createElement("li");
      empty.textContent = "Nenhuma anotação registrada.";
      list.appendChild(empty);
      return;
    }
    notes.forEach((note) => list.appendChild(createNote(note)));
  }

  function createReport(report) {
    const listItem = document.createElement("li");
    const link = document.createElement("a");
    link.className = "report-row";
    link.href = `relatorio-view.html?id=${encodeURIComponent(report.id)}`;

    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = REPORT_ICON;
    const body = document.createElement("span");
    body.className = "report-body";
    const date = document.createElement("span");
    date.className = "report-date";
    date.textContent = formatDate(String(report.atualizado_em || report.criado_em).slice(0, 10));
    const summary = document.createElement("p");
    const content = report.bloco_queixa || report.bloco_intervencao || report.bloco_evolucao || report.bloco_encaminhamentos || report.texto_livre;
    const excerpt = String(content || "Relatório sem descrição.").trim();
    summary.textContent = excerpt.length > 140 ? `${excerpt.slice(0, 137).trimEnd()}…` : excerpt;
    const chevron = document.createElement("span");
    chevron.className = "report-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML = CHEVRON_ICON;

    body.append(date, summary);
    link.append(icon, body, chevron);
    listItem.appendChild(link);
    return listItem;
  }

  function renderReports(reports) {
    const list = document.getElementById("relatoriosRecentesList");
    if (!list) return;
    list.textContent = "";
    if (reports.length) {
      reports.forEach((report) => list.appendChild(createReport(report)));
      return;
    }
    const empty = document.createElement("li");
    empty.textContent = "Nenhum relatório registrado.";
    list.appendChild(empty);
  }

  async function loadHome() {
    if (!client) return;
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      window.location.replace("../auth/login.html");
      return;
    }

    const psychologistId = authData.user.id;
    const [profileResult, patientsResult, appointmentsResult, requestsResult, notesResult, notesCountResult, reportsResult] = await Promise.all([
      client.from("perfis").select("nome_completo, nome_social, papel").eq("id", psychologistId).single(),
      client.from("consultas").select("paciente_id").eq("psicologo_id", psychologistId).neq("status", "cancelled"),
      client.from("consultas").select("id, horario, modalidade, paciente:perfis!consultas_paciente_id_fkey(nome_completo, nome_social)").eq("psicologo_id", psychologistId).eq("data", today).neq("status", "cancelled").order("horario"),
      client.from("solicitacoes").select("horario, modalidade, paciente:perfis!solicitacoes_paciente_id_fkey(nome_completo, nome_social)").eq("psicologo_id", psychologistId).eq("status", "pending").order("data_desejada").order("horario"),
      client.from("notas").select("consulta_id, conteudo, atualizado_em, consultas!inner(data, paciente:perfis!consultas_paciente_id_fkey(nome_completo, nome_social))").eq("psicologo_id", psychologistId).not("conteudo", "is", null).order("atualizado_em", { ascending: false }).limit(3),
      client.from("notas").select("consulta_id", { count: "exact", head: true }).eq("psicologo_id", psychologistId).not("conteudo", "is", null),
      client.from("relatorios").select("id, bloco_queixa, bloco_intervencao, bloco_evolucao, bloco_encaminhamentos, texto_livre, criado_em, atualizado_em").eq("psicologo_id", psychologistId).order("atualizado_em", { ascending: false }).limit(2)
    ]);

    if ([profileResult, patientsResult, appointmentsResult, requestsResult, notesResult, notesCountResult, reportsResult].some((result) => result.error)) {
      console.error("Falha ao carregar a página inicial.");
      return;
    }
    if (profileResult.data.papel !== "psicologo") {
      window.location.replace("../paciente/home.html");
      return;
    }

    const appointments = (appointmentsResult.data || []).map((item) => ({ id: item.id, time: formatTime(item.horario), patient: displayName(item.paciente), mode: formatMode(item.modalidade) }));
    const requests = (requestsResult.data || []).map((item) => ({ time: formatTime(item.horario), patient: displayName(item.paciente), mode: formatMode(item.modalidade) }));
    const notes = notesResult.data || [];

    setText("homeUserName", displayName(profileResult.data).split(" ")[0]);
    setText("statConsultas", appointments.length);
    setText("statPacientes", new Set((patientsResult.data || []).map((item) => item.paciente_id)).size);
    setText("statAnotacoes", notesCountResult.count || 0);
    renderSlots("agendaHojeList", appointments, "Confirmado", "badge--ok", "Nenhuma consulta para hoje.");
    renderSlots("pendentesList", requests, "Pendente", "badge--pending", "Nenhuma consulta pendente.");
    renderNotes(notes);
    renderReports(reportsResult.data || []);
  }

  renderReports([]);
  void loadHome();
}());
