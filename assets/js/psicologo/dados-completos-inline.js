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

  panel.className = "patient-details";
  panel.id = "dados-completos";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="details-heading"><h2>Dados completos</h2><p>Informações do perfil de ${text(profile.socialName || profile.fullName || patientName)}</p></div>
    <div class="details-grid">
      <article class="details-card"><h3>Informações pessoais</h3><dl><div><dt>Nome completo</dt><dd>${text(profile.fullName || patientName)}</dd></div><div><dt>Nome social</dt><dd>${text(profile.socialName)}</dd></div><div><dt>Data de nascimento</dt><dd>${text(profile.birthDate)}</dd></div><div><dt>Pronomes</dt><dd>${text(profile.pronoun || profile.pronouns)}</dd></div><div><dt>Gênero</dt><dd>${text(profile.gender)}</dd></div></dl></article>
      <article class="details-card"><h3>Contato</h3><dl><div><dt>E-mail</dt><dd>${text(profile.email || document.querySelector("#patientEmail")?.textContent)}</dd></div><div><dt>Celular</dt><dd>${text(profile.phone || profile.telephone || document.querySelector("#patientPhone")?.textContent)}</dd></div><div><dt>Localização</dt><dd>${text(profile.location || profile.city || document.querySelector("#patientLocation")?.textContent)}</dd></div></dl></article>
      <article class="details-card"><h3>Preferências de atendimento</h3><dl><div><dt>Formato preferido</dt><dd>${text(profile.preferredFormat)}</dd></div><div><dt>Período preferido</dt><dd>${text(profile.preferredPeriod)}</dd></div></dl></article>
    </div>`;

  tabs.after(panel);

  detailsTab.addEventListener("click", event => {
    event.preventDefault();
    document.querySelectorAll(".appointment-grid, .content-grid, .consultas-container, .notes-history, .reports-history").forEach(section => { section.hidden = true; });
    document.querySelectorAll(".patient-tabs a").forEach(tab => { tab.classList.toggle("active", tab === detailsTab); });
    panel.hidden = false;
  });
})();
