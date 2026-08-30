"use strict";

/* Preenche o bloco de perfil do menu lateral com os dados da sessão logada.
   Roda no evento "load" para aplicar DEPOIS dos scripts de página (que
   substituem o avatar por iniciais), garantindo o avatar ilustrado do Figma
   em todas as telas. Vale para as áreas do paciente e do psicólogo. */
(function () {
  const data = window.PsiNoteData;

  function render() {
    const avatarEl = document.querySelector("#psychologistAvatar, #patientAvatar");
    if (!avatarEl) return;

    const isPsychologist = avatarEl.id === "psychologistAvatar";
    const defaultSrc =
      "../assets/img/" +
      (isPsychologist ? "avatar-psicologo.png" : "avatar-paciente.png");

    const session = data ? data.getSession() : null;

    const nameEl = document.querySelector("#psychologistName, #patientNameTop");
    if (nameEl && session) {
      const displayName = session.fullName || session.name;
      if (displayName) nameEl.textContent = displayName;
    }

    // Limpa resquícios do padrão de iniciais (texto/background) dos scripts de página.
    avatarEl.classList.remove("has-photo");
    avatarEl.style.backgroundImage = "";

    let img = avatarEl.querySelector("img");
    if (!img) {
      avatarEl.textContent = "";
      img = document.createElement("img");
      img.alt = "";
      avatarEl.appendChild(img);
    }
    img.src = session && session.avatarDataUrl ? session.avatarDataUrl : defaultSrc;
  }

  if (document.readyState === "complete") {
    render();
  } else {
    window.addEventListener("load", render);
  }
})();
