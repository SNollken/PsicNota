"use strict";

(() => {
  const data = window.PsiNoteData;
  const client = window.PsicNotaSupabase;
  const queryParams = new URLSearchParams(window.location.search);
  const patientId = queryParams.get("id") || "";
  const patientName = queryParams.get("paciente") || "Paciente";
  const detailsTab = document.querySelector("[data-patient-details]");
  const tabs = document.querySelector(".patient-tabs");

  if (!detailsTab || !tabs) return;

  let profile = {};
  const escape = value => data.escapeHtml(String(value ?? "Não informado"));
  const text = value => String(value || "Não informado");
  const panel = document.createElement("section");
  const field = (label, value) => `<div class="detail-field"><label>${escape(label)}</label><output>${escape(text(value))}</output></div>`;
  const availability = (title, value) => {
    const days = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
    const periods = ["Manhã", "Tarde", "Noite"];
    const selected = Array.isArray(value) ? value : [];
    return `<section class="detail-card availability-card"><h2>Disponibilidade semanal — ${escape(title)}</h2><p>Horários em que a paciente tem preferência para consultas ${escape(title.toLowerCase())}.</p><div class="availability-scroll"><table class="availability"><thead><tr><th>Dia da semana</th>${periods.map(period => `<th>${escape(period)}</th>`).join("")}</tr></thead><tbody>${days.map(day => `<tr><th>${escape(day)}</th>${periods.map(period => `<td>${selected.includes(`${day}:${period}`) ? "Disponível" : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
  };

  panel.className = "patient-details";
  panel.id = "dados-completos";
  panel.hidden = true;
  function renderDetails(status = "") {
    panel.innerHTML = `
    ${status ? `<p class="details-load-status" role="status">${escape(status)}</p>` : ""}
    <div class="details-shell">
      <section class="detail-card"><h2>Informações pessoais</h2><div class="detail-grid">${field("Nome completo", profile.fullName)}${field("Nome social", profile.socialName)}${field("Data de nascimento", profile.birthDate ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${profile.birthDate}T00:00:00`)) : "")}${field("Pronomes", profile.pronoun || profile.pronouns)}${field("Gênero", profile.gender)}</div></section>
      <section class="detail-card"><h2>Contato</h2><div class="detail-grid four">${field("E-mail", profile.email)}${field("Celular", profile.phone || profile.telephone)}${field("Cidade", profile.city)}${field("Estado", profile.state)}</div></section>
      <section class="detail-card"><h2>Preferências de atendimento</h2><div class="detail-grid three">${field("Formato preferido", profile.preferredFormat)}${field("Período preferido", profile.preferredPeriod)}${field("Sobre mim", profile.about)}</div></section>
      ${availability("Online", profile.availabilityOnline)}
      ${availability("Presencial", profile.availabilityInPerson)}
    </div>`;
  }

  renderDetails("Carregando dados do paciente...");

  tabs.after(panel);

  async function loadPatient() {
    if (!client) throw new Error("Conexão com o banco indisponível.");
    let patient = null;
    if (patientId) {
      const { data: row, error } = await client
        .from("perfis")
        .select("*")
        .eq("id", patientId)
        .single();
      if (error || !row) throw error || new Error("Paciente não encontrado.");
      patient = row;
    } else {
      const { data: row, error } = await client
        .from("perfis")
        .select("*")
        .eq("papel", "paciente")
        .eq("nome_completo", patientName)
        .maybeSingle();
      if (error || !row) throw error || new Error("Paciente não encontrado.");
      patient = row;
    }
    if (!patient) throw new Error("Paciente não encontrado.");
    profile = {
      fullName: patient.nome_completo,
      socialName: patient.nome_social,
      birthDate: patient.data_nascimento,
      pronoun: patient.pronomes,
      gender: patient.genero,
      email: patient.email,
      phone: patient.telefone,
      city: patient.cidade,
      state: patient.estado,
      preferredFormat: patient.formato_preferido,
      preferredPeriod: patient.periodo_preferido,
      about: patient.sobre_mim,
      availabilityOnline: patient.disponibilidade_online,
      availabilityInPerson: patient.disponibilidade_presencial
    };
    const hasAvailabilityColumns = "disponibilidade_online" in patient && "disponibilidade_presencial" in patient;
    renderDetails(hasAvailabilityColumns ? "" : "A disponibilidade semanal será exibida após a atualização do banco de dados.");
  }

  void loadPatient().catch(() => renderDetails("Não foi possível carregar os dados do paciente no banco de dados."));

  detailsTab.addEventListener("click", event => {
    event.preventDefault();
    document.querySelectorAll(".appointment-grid, .content-grid, .consultas-container, .notes-history, .reports-history").forEach(section => { section.hidden = true; });
    document.querySelectorAll(".patient-tabs a").forEach(tab => { tab.classList.toggle("active", tab === detailsTab); });
    panel.hidden = false;
  });
})();
