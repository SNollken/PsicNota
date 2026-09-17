"use strict";

(() => {
  const data = window.PsiNoteData;
  const client = window.PsicNotaSupabase;
  const patientName = new URLSearchParams(window.location.search).get("paciente") || "Paciente";
  const detailsTab = document.querySelector("[data-patient-details]");
  const tabs = document.querySelector(".patient-tabs");

  if (!detailsTab || !tabs) return;

  let profile = data?.getProfiles?.().find(item => item.name === patientName || item.fullName === patientName) || {};
  const text = value => String(value || "Não informado");
  const panel = document.createElement("section");
  const field = (label, value) => `<div class="detail-field"><label>${label}</label><output>${text(value)}</output></div>`;
  const availability = title => `<section class="detail-card availability-card"><h2>Disponibilidade semanal — ${title}</h2><p>Horários em que a paciente tem preferência para consultas ${title.toLowerCase()}.</p><div class="availability-scroll"><table class="availability"><thead><tr><th>Dia da semana</th><th>Manhã</th><th>Tarde</th><th>Noite</th></tr></thead><tbody>${["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"].map(day => `<tr><th>${day}</th><td>—</td><td>—</td><td>—</td></tr>`).join("")}</tbody></table></div></section>`;

  panel.className = "patient-details";
  panel.id = "dados-completos";
  panel.hidden = true;
  function renderDetails() {
    panel.innerHTML = `
    <div class="details-shell">
      <section class="detail-card"><h2>Informações pessoais</h2><div class="detail-grid">${field("Nome completo", profile.fullName || patientName)}${field("Nome social", profile.socialName)}${field("Data de nascimento", profile.birthDate)}${field("Pronomes", profile.pronoun || profile.pronouns)}${field("Gênero", profile.gender)}</div></section>
      <section class="detail-card"><h2>Contato</h2><div class="detail-grid four">${field("E-mail", profile.email || document.querySelector("#patientEmail")?.textContent)}${field("Celular", profile.phone || profile.telephone || document.querySelector("#patientPhone")?.textContent)}${field("Cidade", profile.city)}${field("Estado", profile.state)}</div></section>
      <section class="detail-card"><h2>Preferências de atendimento</h2><div class="detail-grid three">${field("Formato preferido", profile.preferredFormat)}${field("Período preferido", profile.preferredPeriod)}${field("Sobre mim", profile.about)}</div></section>
      ${availability("Online")}
      ${availability("Presencial")}
    </div>`;
  }

  renderDetails();

  tabs.after(panel);

  async function loadPatient() {
    if (!client) return;
    const { data: patient, error } = await client
      .from("perfis")
      .select("*")
      .eq("papel", "paciente")
      .eq("nome_completo", patientName)
      .maybeSingle();
    if (error || !patient) return;
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
      about: patient.sobre_mim
    };
    renderDetails();
  }

  void loadPatient();

  detailsTab.addEventListener("click", event => {
    event.preventDefault();
    document.querySelectorAll(".appointment-grid, .content-grid, .consultas-container, .notes-history, .reports-history").forEach(section => { section.hidden = true; });
    document.querySelectorAll(".patient-tabs a").forEach(tab => { tab.classList.toggle("active", tab === detailsTab); });
    panel.hidden = false;
  });
})();
