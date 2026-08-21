"use strict";

/* Preenche o bloco de perfil do menu lateral com os dados da sessão logada.
   Funciona nas áreas do paciente e do profissional (IDs próprios de cada uma). */
(function () {
  const data = window.PsiNoteData;
  if (!data) return;

  const session = data.getSession();
  if (!session) return;

  const nameEl = document.querySelector("#psychologistName, #patientNameTop");
  const avatarEl = document.querySelector("#psychologistAvatar, #patientAvatar");

  const displayName = session.fullName || session.name;
  if (nameEl && displayName) nameEl.textContent = displayName;

  if (avatarEl && session.avatarDataUrl) {
    const img = avatarEl.querySelector("img");
    if (img) img.src = session.avatarDataUrl;
    avatarEl.classList.add("has-photo");
  }
})();
