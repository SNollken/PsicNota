"use strict";

(() => {
  const data = window.PsiNoteData;
  const patientName = new URLSearchParams(window.location.search).get("paciente") || "Paciente";
  const detailsTab = document.querySelector("[data-patient-details]");
  const tabs = document.querySelector(".patient-tabs");

  if (!detailsTab || !tabs) return;

  const profile = data?.getProfiles?.().find(item => item.name === patientName || item.fullName === patientName) || {};
  const text = value => String(value || "Não informado");
  const panel = document.createElement("section");
  const field = (label, value) => `<div class="detail-field"><label>${label}</label><output>${text(value)}</output></div>`;

  panel.className = "patient-details";
  panel.id = "dados-completos";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="details-shell">
      <section class="detail-card"><h2>Informações pessoais</h2><div class="detail-grid">${field("Nome completo", profile.fullName || patientName)}${field("Nome social", profile.socialName)}${field("Data de nascimento", profile.birthDate)}${field("Pronomes", profile.pronoun || profile.pronouns)}${field("Gênero", profile.gender)}</div></section>
      <section class="detail-card"><h2>Contato</h2><div class="detail-grid four">${field("E-mail", profile.email || document.querySelector("#patientEmail")?.textContent)}${field("Celular", profile.phone || profile.telephone || document.querySelector("#patientPhone")?.textContent)}${field("Cidade", profile.city)}${field("Estado", profile.state)}</div></section>
      <section class="detail-card"><h2>Preferências de atendimento</h2><div class="detail-grid three">${field("Formato preferido", profile.preferredFormat)}${field("Período preferido", profile.preferredPeriod)}${field("Sobre mim", profile.about)}</div></section>
    </div>`;

  tabs.after(panel);

  detailsTab.addEventListener("click", event => {
    event.preventDefault();
    document.querySelectorAll(".appointment-grid, .content-grid, .consultas-container, .notes-history, .reports-history").forEach(section => { section.hidden = true; });
    document.querySelectorAll(".patient-tabs a").forEach(tab => { tab.classList.toggle("active", tab === detailsTab); });
    panel.hidden = false;
  });
})();
