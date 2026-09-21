"use strict";

(() => {
  const data = window.PsiNoteData;
  const client = window.PsicNotaSupabase;
  const query = new URLSearchParams(location.search);
  const patientId = query.get("id") || "";
  const patientName = query.get("paciente") || "";
  const escape = data.escapeHtml;
  const ICONS = {
    user: `<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"/>`,
    phone: `<path d="M5 4h3l2 5-2 1.5a15 15 0 0 0 5.5 5.5L15 14l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z"/>`,
    globe: `<path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9Z"/>`,
    pin: `<path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>`,
    mail: `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>`,
    calendar: `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>`,
    bubble: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
    document: `<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>`
  };
  const sectionIcon = (inner) => `<span class="section-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${inner}</svg></span>`;
  const tabs = ["overview", "appointments", "notes", "reports", "details"];
  const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const now = new Date();
  let appointments = [];
  let reports = [];
  let profile = {};
  let notes = [];

  const menuButton = document.querySelector(".mobile-menu");
  const sidebar = document.querySelector(".sidebar");
  if (menuButton && sidebar) {
    menuButton.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });
    document.addEventListener("click", (event) => {
      if (window.innerWidth <= 720 && !sidebar.contains(event.target) && !menuButton.contains(event.target)) {
        sidebar.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  function loadLocalRecords() {
    const matchId = profile.id || patientId;
    const matchPatient = item => matchId ? item.patientId === matchId : item.patient === patientName;
    appointments = data.getAppointments().filter(item => matchPatient(item) && item.status !== "cancelled").sort((a, b) => new Date(`${b.date}T${b.time || "00:00"}`) - new Date(`${a.date}T${a.time || "00:00"}`));
    reports = data.getReports().filter(matchPatient).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    notes = appointments.filter(item => data.hasAppointmentNote(item.id)).map(item => ({ appointment: item, text: data.getAppointmentNote(item.id) }));
  }

  function formatDate(value) {
    if (!value) return "Data não informada";
    const parsed = value.includes("/") ? new Date(value.split("/").reverse().join("-") + "T00:00:00") : new Date(value + "T00:00:00");
    return Number.isNaN(parsed.getTime()) ? "Data não informada" : dateFormat.format(parsed);
  }

  function age(value) {
    if (!value) return "Idade não informada";
    const parts = value.includes("/") ? value.split("/").reverse() : value.split("-");
    const birth = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(birth.getTime())) return "Idade não informada";
    let years = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--;
    return `${years} anos`;
  }

  function recordCard(kind, title, description, href) {
    return `<a class="record-card" href="${href}"><span class="record-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${kind === "note" ? ICONS.bubble : ICONS.document}</svg></span><span class="record-copy"><strong>${escape(title)}</strong><span>${escape(description || "Sem descrição")}</span></span><span class="record-arrow" aria-hidden="true">›</span></a>`;
  }

  function noteCards(items) {
    return items.map(item => recordCard("note", formatDate(item.appointment.date), item.text, `notas.html?consulta=${encodeURIComponent(item.appointment.id)}`)).join("");
  }

  function reportCards(items) {
    return items.map(item => recordCard("report", formatDate(item.updatedAt || item.createdAt), item.title || item.tipo || "Relatório", `relatorio-view.html?id=${encodeURIComponent(item.id)}`)).join("");
  }


  function empty(message) { return `<p class="empty">${escape(message)}</p>`; }
  function section(name, items, kind) {
    const panel = document.createElement("div");
    panel.className = "records-panel";
    panel.innerHTML = `<div class="record-list">${kind === "note" ? noteCards(items.slice(0, 8)) : reportCards(items.slice(0, 8))}</div>${items.length ? "" : empty(`Nenhum ${name.toLowerCase()} registrado para este paciente.`)}${items.length > 8 ? '<button class="load-more" type="button">Carregar mais</button>' : ""}`;
    if (items.length > 8) {
      let shown = 8;
      panel.querySelector(".load-more").addEventListener("click", event => {
        shown += 8;
        panel.querySelector(".record-list").innerHTML = kind === "note" ? noteCards(items.slice(0, shown)) : reportCards(items.slice(0, shown));
        event.currentTarget.hidden = shown >= items.length;
      });
    }
    return panel;
  }

  function field(label, value) {
    return `<div class="detail-field"><label>${escape(label)}</label><output>${escape(value || "Não informado")}</output></div>`;
  }
  function detailCard(icon, title, fields, columns) {
    return `<section class="detail-card"><h2>${sectionIcon(icon)}<span>${escape(title)}</span></h2><div class="detail-grid ${columns}">${fields.join("")}</div></section>`;
  }
  function availability(icon, title, value) {
    const days = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
    const periods = [["Manhã", "06:00 - 12:00"], ["Tarde", "12:00 - 18:00"], ["Noite", "18:00 - 22:00"]];
    const selected = Array.isArray(value) ? value : [];
    return `<section class="detail-card"><h2>${sectionIcon(icon)}<span>Disponibilidade semanal — ${escape(title)}</span></h2><p>Horários em que a paciente tem preferência para consultas ${title.toLowerCase()}.</p><table class="availability"><thead><tr><th>Dia da semana</th>${periods.map(([period, range]) => `<th>${period}<small>${range}</small></th>`).join("")}</tr></thead><tbody>${days.map(day => `<tr><th>${day}</th>${periods.map(([period]) => `<td>${selected.includes(`${day}:${period}`) ? '<span class="available">✓ Disponível</span>' : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
  }

  function render() {
    if (!patientName && !patientId) {
      document.querySelector(".profile-content").innerHTML = `<p class="empty">Selecione um paciente em <a href="pacientes.html">Meus pacientes</a>.</p>`;
      return;
    }
    const display = profile.socialName || patientName;
    document.title = `PsicNota · ${display}`;
    document.querySelector("#pageTitle").textContent = `PERFIL DE ${display.split(" ")[0].toUpperCase()}`;
    document.querySelector("#patientName").textContent = display;
    document.querySelector("#patientMeta").textContent = [age(profile.birthDate), profile.pronoun].filter(Boolean).join(" • ");
    document.querySelector("#patientEmail").textContent = profile.email || "E-mail não informado";
    document.querySelector("#patientPhone").textContent = profile.phone || "Telefone não informado";
    document.querySelector("#patientLocation").textContent = [profile.city, profile.state, profile.country].filter(Boolean).join(", ") || "Local não informado";
    const avatar = document.querySelector("#patientAvatar");
    if (profile.avatarDataUrl) avatar.style.backgroundImage = `url("${profile.avatarDataUrl}")`;
    else avatar.textContent = display.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    const upcoming = appointments.filter(item => new Date(`${item.date}T${item.time || "00:00"}`) >= now).sort((a, b) => new Date(`${a.date}T${a.time || "00:00"}`) - new Date(`${b.date}T${b.time || "00:00"}`))[0];
    const last = appointments.find(item => new Date(`${item.date}T${item.time || "00:00"}`) < now);
    const appointmentPreview = (title, item) => `<article class="overview-card"><h2>${title}</h2>${item ? `<a class="overview-link" href="consulta.html?id=${encodeURIComponent(item.id)}"><span class="overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS.calendar}</svg></span><span>${formatDate(item.date)}<small>${escape(item.time || "")} • ${escape(item.mode || "Não informada")}</small></span><span>›</span></a>` : empty("Nenhuma consulta")}</article>`;
    document.querySelector("#panel-overview").innerHTML = `<div class="overview-top">${appointmentPreview("Próxima consulta", upcoming)}${appointmentPreview("Última consulta", last)}</div><div class="overview-lists"><div class="overview-list"><h2>Notas Rápidas</h2><div class="record-list">${noteCards(notes.slice(0, 3)) || empty("Nenhuma nota registrada.")}</div></div><div class="overview-list"><h2>Relatórios Recentes</h2><div class="record-list">${reportCards(reports.slice(0, 3)) || empty("Nenhum relatório registrado.")}</div></div></div>`;
    const appointmentPanel = document.querySelector("#panel-appointments");
    appointmentPanel.innerHTML = `<div class="records-panel appointments-panel">${appointments.map(item => `<div class="appointment-row"><span class="appointment-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS.calendar}</svg></span><strong class="appointment-date">${formatDate(item.date)}</strong><span>${escape(item.time || "")} • ${escape(item.mode || "Não informada")}</span><div class="appointment-actions"><a href="notas.html?consulta=${encodeURIComponent(item.id)}"><svg viewBox="0 0 24 24">${ICONS.bubble}</svg><span>Abrir Notas</span></a><a href="relatorios.html?consulta=${encodeURIComponent(item.id)}"><svg viewBox="0 0 24 24">${ICONS.document}</svg><span>Abrir Relatórios</span></a><a class="appointment-chevron" href="consulta.html?id=${encodeURIComponent(item.id)}" aria-label="Abrir consulta"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></a></div></div>`).join("")}${appointments.length ? "" : empty("Nenhuma consulta registrada para este paciente.")}</div>`;
    document.querySelector("#panel-notes").replaceChildren(section("Nota", notes, "note"));
    document.querySelector("#panel-reports").replaceChildren(section("Relatório", reports, "report"));
    document.querySelector("#panel-details").innerHTML = `<div class="details-shell">${detailCard(ICONS.user, "Informações pessoais", [field("Nome completo", profile.fullName || patientName), field("Nome social", profile.socialName), field("Data de Nascimento", profile.birthDate ? formatDate(profile.birthDate) : ""), field("Pronomes", profile.pronoun), field("Gênero", profile.gender)], "")}${detailCard(ICONS.phone, "Contato", [field("E-mail", profile.email), field("Celular", profile.phone), field("Cidade", profile.city), field("Estado", profile.state)], "four")}${detailCard(ICONS.globe, "Preferências de atendimento", [field("Formato preferido", profile.preferredFormat), field("Período preferido", profile.preferredPeriod), field("Sobre mim", profile.about)], "three")}${availability(ICONS.globe, "Online", profile.availabilityOnline)}${availability(ICONS.pin, "Presencial", profile.availabilityInPerson)}</div>`;
    document.querySelector("#quickNoteButton").addEventListener("click", () => { if (appointments[0]) location.href = `notas.html?consulta=${encodeURIComponent(appointments[0].id)}`; else selectTab("notes"); });
    const aba = query.get("aba") || (location.hash ? location.hash.slice(1) : "overview");
    selectTab(tabs.includes(aba) ? aba : "overview");
  }

  async function loadProfile() {
    if (!client) throw new Error("Não foi possível iniciar a conexão com o banco de dados.");
    let patient = null;
    if (patientId) {
      const { data: row, error } = await client
        .from("perfis")
        .select("*")
        .eq("id", patientId)
        .single();
      if (error) throw error;
      patient = row;
    } else {
      const { data: row, error } = await client
        .from("perfis")
        .select("*")
        .eq("papel", "paciente")
        .eq("nome_completo", patientName)
        .maybeSingle();
      if (error) throw error;
      patient = row;
    }
    if (!patient) throw new Error("Paciente não encontrado.");

    if (patient.avatar_url) {
      try {
        const { data: assinada, error: erroAvatar } = await client.storage.from("avatars").createSignedUrl(patient.avatar_url, 3600);
        if (!erroAvatar && assinada?.signedUrl) profile.avatarDataUrl = assinada.signedUrl;
        else console.warn("Avatar não encontrado no bucket; usando iniciais.");
      } catch {
        console.warn("Avatar não encontrado no bucket; usando iniciais.");
      }
    }

    profile = {
      id: patient.id,
      fullName: patient.nome_completo,
      socialName: patient.nome_social,
      birthDate: patient.data_nascimento,
      pronoun: patient.pronomes,
      gender: patient.genero,
      email: patient.email,
      phone: patient.telefone,
      city: patient.cidade,
      state: patient.estado,
      country: patient.cidade || patient.estado ? "Brasil" : "",
      preferredFormat: patient.formato_preferido,
      preferredPeriod: patient.periodo_preferido,
      avatar_url: patient.avatar_url
    };
    render();
  }

  function showProfileError(error) {
    document.querySelector(".profile-content").innerHTML = `<p class="empty">${escape(error.message || "Não foi possível carregar o perfil do paciente.")}</p>`;
  }

  function selectTab(name) {
    const active = tabs.includes(name) ? name : "overview";
    document.querySelectorAll('[role="tab"]').forEach(button => {
      const selected = button.dataset.tab === active;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    tabs.forEach(tab => { document.querySelector(`#panel-${tab}`).hidden = tab !== active; });
    const activeId = profile.id || patientId;
    history.replaceState(null, "", `?${activeId ? `id=${encodeURIComponent(activeId)}&` : ""}paciente=${encodeURIComponent(patientName)}&aba=${active}`);
  }

  document.querySelectorAll('[role="tab"]').forEach((button, index) => {
    button.addEventListener("click", () => selectTab(button.dataset.tab));
    button.addEventListener("keydown", event => {
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!direction) return;
      event.preventDefault();
      const next = document.querySelectorAll('[role="tab"]')[(index + direction + tabs.length) % tabs.length];
      selectTab(next.dataset.tab);
      next.focus();
    });
  });
  async function init() {
    const _auth = await window.PsicNotaBackend.requireProfile("psicologo");
    if (!_auth) return;

    await data.syncRemoteData();
    loadLocalRecords();
    if (!patientName && !patientId) render();
    else void loadProfile().catch(showProfileError);
  }

  void init();
})();

