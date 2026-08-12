"use strict";

const data = window.PsiNoteData;

const form = document.querySelector("#profileForm");

const editButton = document.querySelector("#editButton");
const cancelButton = document.querySelector("#cancelButton");
const formActions = document.querySelector("#formActions");

const feedback = document.querySelector("#feedback");
const feedbackText = document.querySelector("#feedbackText");

const avatarInput = document.querySelector("#avatarInput");
const changePhotoButton = document.querySelector("#changePhotoButton");

const agendaLink = document.querySelector("#agendaLink");
const agendaLinkText = document.querySelector("#agendaLinkText");
const brandLink = document.querySelector("#brandLink");

const sidebar = document.querySelector(".sidebar");
const mobileMenu = document.querySelector(".mobile-menu");

let profiles = data.getProfiles();

const session = data.getSession();

let currentProfile = resolveCurrentProfile();

let currentRole = normalizeRole(
  currentProfile.role || session?.role
);

let editing = false;

let originalValues = {};

let pendingAvatar =
  currentProfile.avatarDataUrl || "";


/* =========================
   TIPO DE USUÁRIO
========================= */

function normalizeRole(role) {
  const normalized = String(role || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return [
    "psicologo",
    "psychologist"
  ].includes(normalized)
    ? "psicologo"
    : "paciente";
}


/* =========================
   LOCALIZA PERFIL ATUAL
========================= */

function resolveCurrentProfile() {
  const byId =
    session?.id &&
    profiles.find(
      (profile) =>
        profile.id === session.id
    );

  const byEmail =
    session?.email &&
    profiles.find(
      (profile) =>
        profile.email?.toLowerCase() ===
        session.email.toLowerCase()
    );

  let latest = null;

  try {
    latest = JSON.parse(
      localStorage.getItem(
        "psinoteProfileDemo"
      ) || "null"
    );
  } catch {
    latest = null;
  }

  return (
    byId ||
    byEmail ||
    latest || {
      id:
        session?.id ||
        data.createId("perfil"),

      role:
        session?.role ||
        "paciente",

      fullName:
        session?.fullName ||
        session?.name ||
        "Usuário PsicNota",

      email:
        session?.email ||
        "",

      birthDate: "",

      phone: "",

      createdAt:
        new Date().toISOString()
    }
  );
}


/* =========================
   INICIAIS
========================= */

function getInitials(name) {
  return (
    String(name || "PN")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ||
    "PN"
  );
}


/* =========================
   CAMPOS EDITÁVEIS
========================= */

function editableControls() {
  return [
    ...form.querySelectorAll(
      "input[name], select[name]"
    )
  ];
}


/* =========================
   DEFINE VALOR
========================= */

function setControlValue(name, value) {
  const control = form.elements[name];

  if (!control) {
    return;
  }

  if (control.type === "checkbox") {
    control.checked = Boolean(value);
  } else {
    control.value = value ?? "";
  }
}


/* =========================
   PEGA VALOR
========================= */

function getControlValue(name) {
  const control = form.elements[name];

  if (!control) {
    return "";
  }

  if (control.type === "checkbox") {
    return control.checked;
  }

  return String(
    control.value || ""
  ).trim();
}


/* =========================
   GUARDA VALORES ANTES DE EDITAR
========================= */

function storeOriginalValues() {
  originalValues = {};

  editableControls().forEach(
    (control) => {
      originalValues[control.name] =
        control.type === "checkbox"
          ? control.checked
          : control.value;
    }
  );

  originalValues.avatarDataUrl =
    currentProfile.avatarDataUrl || "";
}


/* =========================
   CANCELAR ALTERAÇÕES
========================= */

function restoreOriginalValues() {
  editableControls().forEach(
    (control) => {
      if (
        !(control.name in originalValues)
      ) {
        return;
      }

      if (
        control.type === "checkbox"
      ) {
        control.checked =
          originalValues[control.name];
      } else {
        control.value =
          originalValues[control.name];
      }
    }
  );

  pendingAvatar =
    originalValues.avatarDataUrl || "";

  renderAvatar();
  updateHeaderAndSummary();
}


/* =========================
   MODO EDIÇÃO
========================= */

function setEditing(state) {
  editing = state;

  editableControls().forEach(
    (control) => {
      const section =
        control.closest(
          "[data-profile-section]"
        );

      const sectionIsHidden =
        section?.hidden;

      control.disabled =
        !state ||
        Boolean(sectionIsHidden);
    }
  );

  formActions.hidden = !state;

  editButton.hidden = state;

  feedback.hidden = true;

  if (state) {
    storeOriginalValues();

    form.elements.fullName?.focus();
  }
}


/* =========================
   FOTO / AVATAR
========================= */

function renderAvatar() {
  const name =
    getControlValue("fullName") ||
    currentProfile.fullName;

  const initials =
    getInitials(name);

  document
    .querySelectorAll("[data-avatar]")
    .forEach((avatar) => {

      avatar.textContent =
        initials;

      avatar.classList.toggle(
        "has-photo",
        Boolean(pendingAvatar)
      );

      avatar.style.backgroundImage =
        pendingAvatar
          ? `url("${pendingAvatar}")`
          : "";
    });
}


/* =========================
   TEXTO PADRÃO
========================= */

function textOrFallback(
  value,
  fallback = "Não informado"
) {
  return value || fallback;
}


/* =========================
   FORMATO DE ATENDIMENTO
========================= */

function serviceFormatLabel(value) {
  const map = {
    online: "Online",
    presencial: "Presencial",
    ambos: "Online/presencial"
  };

  return (
    map[value] ||
    value ||
    "Não informado"
  );
}


/* =========================
   CABEÇALHO E RESUMO
========================= */

function updateHeaderAndSummary() {
  const city =
    getControlValue("city");

  const state =
    getControlValue("state");

  const location =
    city && state
      ? `${city}/${state}`
      : city ||
        state ||
        "Não informado";

  const displayName =
    getControlValue("socialName") ||
    getControlValue("fullName") ||
    currentProfile.fullName ||
    "Usuário PsicNota";

  document.querySelector(
    "[data-profile-name]"
  ).textContent = displayName;

  document.querySelector(
    "[data-summary-email]"
  ).textContent =
    textOrFallback(
      getControlValue("email")
    );

  document.querySelector(
    "[data-summary-phone]"
  ).textContent =
    textOrFallback(
      getControlValue("phone")
    );

  document.querySelector(
    "[data-summary-location]"
  ).textContent =
    location;

  document.querySelector(
    "[data-summary-preference-label]"
  ).textContent =
    "Forma de atendimento";

  const preference =
    currentRole === "psicologo"
      ? serviceFormatLabel(
          getControlValue(
            "serviceFormat"
          )
        )
      : textOrFallback(
          getControlValue(
            "preferredFormat"
          )
        );

  document.querySelector(
    "[data-summary-preference]"
  ).textContent =
    preference;
}


/* =========================
   CARREGA PERFIL
========================= */

function applyProfile() {
  currentRole =
    normalizeRole(
      currentProfile.role ||
      session?.role
    );

  const professional =
    currentProfile.professionalData ||
    {};

  const patient =
    currentProfile.patientData ||
    {};

  const preferences =
    currentProfile.preferences ||
    {};

  setControlValue(
    "fullName",
    currentProfile.fullName
  );

  setControlValue(
    "birthDate",
    currentProfile.birthDate
  );

  setControlValue(
    "socialName",
    currentProfile.socialName
  );

  const pronounMap = {
    "Ela/dela": "Ela/Dela",
    "Ele/dele": "Ele/Dele",
    "Elu/delu": "Elu/Delu"
  };

  setControlValue(
    "pronoun",
    pronounMap[
      currentProfile.pronoun
    ] ||
    currentProfile.pronoun
  );

  setControlValue(
    "email",
    currentProfile.email
  );

  setControlValue(
    "phone",
    currentProfile.phone
  );

  setControlValue(
    "city",
    currentProfile.city
  );

  setControlValue(
    "state",
    currentProfile.state
  );

  /* PACIENTE */

  setControlValue(
    "preferredFormat",
    patient.preferredFormat
  );

  setControlValue(
    "preferredPeriod",
    patient.preferredPeriod
  );

  /* PSICÓLOGO */

  setControlValue(
    "crp",
    professional.crp
  );

  setControlValue(
    "crpState",
    professional.crpState
  );

  setControlValue(
    "specialty",
    professional.specialty
  );

  setControlValue(
    "serviceFormat",
    professional.serviceFormat
  );

  setControlValue(
    "gender",
    professional.gender ||
    currentProfile.gender
  );

  /* NOTIFICAÇÕES */

  setControlValue(
    "appointmentReminders",
    preferences.appointmentReminders ??
    true
  );

  setControlValue(
    "emailNotifications",
    preferences.emailNotifications ??
    true
  );

  /* MOSTRA A SEÇÃO CORRETA */

  document
    .querySelectorAll(
      "[data-profile-section]"
    )
    .forEach((section) => {

      section.hidden =
        section.dataset
          .profileSection !==
        currentRole;

    });

  const roleLabel =
    currentRole === "psicologo"
      ? "Psicólogo"
      : "Paciente";

  const agendaHref =
    currentRole === "psicologo"
      ? "profissional/agenda.html"
      : "paciente/agenda-paciente.html";

  document.querySelector(
    "[data-role-pill]"
  ).textContent =
    roleLabel;

  document.querySelector(
    "[data-profile-description]"
  ).textContent =
    currentRole === "psicologo"
      ? "Atualize suas informações profissionais."
      : "Atualize seus dados e preferências de atendimento.";

  agendaLink.href =
    agendaHref;

  brandLink.href =
    agendaHref;

  agendaLinkText.textContent =
    "Agendar consulta";

  const laudosLink =
    document.querySelector("#laudosLink");

  if (laudosLink) {
    laudosLink.hidden =
      currentRole !== "paciente";
  }

  pendingAvatar =
    currentProfile.avatarDataUrl ||
    "";

  renderAvatar();

  updateHeaderAndSummary();

  setEditing(false);
}


/* =========================
   MENSAGENS
========================= */

function showFeedback(
  message,
  isError = false
) {
  feedbackText.textContent =
    message;

  feedback.classList.toggle(
    "is-error",
    isError
  );

  feedback.hidden =
    false;
}


/* =========================
   TELEFONE
========================= */

function formatPhone(value) {
  const digits =
    String(value)
      .replace(/\D/g, "")
      .slice(0, 11);

  if (
    digits.length <= 2
  ) {
    return digits;
  }

  if (
    digits.length <= 6
  ) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(2)}`;
  }

  if (
    digits.length <= 10
  ) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(
      2,
      6
    )}-${digits.slice(6)}`;
  }

  return `(${digits.slice(
    0,
    2
  )}) ${digits.slice(
    2,
    7
  )}-${digits.slice(7)}`;
}


/* =========================
   ATUALIZA SESSÃO
========================= */

function updateStoredSessions(
  updatedProfile,
  oldEmail
) {

  [
    localStorage,
    sessionStorage
  ].forEach((storage) => {

    [
      "psinote.auth.session",
      "psinoteSession"
    ].forEach((key) => {

      try {

        const stored =
          JSON.parse(
            storage.getItem(key) ||
            "null"
          );

        if (!stored) {
          return;
        }

        const sameUser =
          stored.id ===
            updatedProfile.id ||

          stored.email
            ?.toLowerCase() ===
            oldEmail
              ?.toLowerCase();

        if (!sameUser) {
          return;
        }

        storage.setItem(
          key,
          JSON.stringify({
            ...stored,

            id:
              updatedProfile.id,

            name:
              updatedProfile.fullName,

            fullName:
              updatedProfile.fullName,

            email:
              updatedProfile.email,

            role:
              updatedProfile.role,

            professionalData:
              updatedProfile
                .professionalData ||
              null,

            avatarDataUrl:
              updatedProfile
                .avatarDataUrl ||
              ""
          })
        );

      } catch {

        storage.removeItem(
          key
        );

      }

    });

  });
}


/* =========================
   ATUALIZA CONSULTAS
========================= */

function updateRelatedNames(
  updatedProfile
) {
  if (
    currentRole !== "paciente"
  ) {
    return;
  }

  data.saveRequests(
    data
      .getRequests()
      .map((item) =>
        item.patientId ===
        updatedProfile.id
          ? {
              ...item,
              patient:
                updatedProfile.fullName
            }
          : item
      )
  );

  data.saveAppointments(
    data
      .getAppointments()
      .map((item) =>
        item.patientId ===
        updatedProfile.id
          ? {
              ...item,
              patient:
                updatedProfile.fullName
            }
          : item
      )
  );
}


/* =========================
   SALVAR PERFIL
========================= */

function saveProfile() {
  const oldEmail =
    currentProfile.email;

  const updatedProfile = {
    ...currentProfile,

    role:
      currentRole,

    fullName:
      getControlValue(
        "fullName"
      ),

    birthDate:
      getControlValue(
        "birthDate"
      ),

    socialName:
      getControlValue(
        "socialName"
      ),

    pronoun:
      getControlValue(
        "pronoun"
      ),

    email:
      getControlValue(
        "email"
      ),

    phone:
      getControlValue(
        "phone"
      ),

    city:
      getControlValue(
        "city"
      ),

    state:
      getControlValue(
        "state"
      ),

    avatarDataUrl:
      pendingAvatar,

    preferences: {
      ...(
        currentProfile.preferences ||
        {}
      ),

      appointmentReminders:
        getControlValue(
          "appointmentReminders"
        ),

      emailNotifications:
        getControlValue(
          "emailNotifications"
        )
    },

    updatedAt:
      new Date().toISOString()
  };


  /* PACIENTE */

  if (
    currentRole === "paciente"
  ) {

    updatedProfile.patientData = {
      ...(
        currentProfile.patientData ||
        {}
      ),

      preferredFormat:
        getControlValue(
          "preferredFormat"
        ),

      preferredPeriod:
        getControlValue(
          "preferredPeriod"
        )
    };

  } else {

    /* PSICÓLOGO */

    updatedProfile.professionalData = {
      ...(
        currentProfile
          .professionalData ||
        {}
      ),

      crp:
        getControlValue("crp"),

      crpState:
        getControlValue(
          "crpState"
        ),

      specialty:
        getControlValue(
          "specialty"
        ),

      serviceFormat:
        getControlValue(
          "serviceFormat"
        ),

      gender:
        getControlValue(
          "gender"
        )
    };

    updatedProfile.gender =
      getControlValue(
        "gender"
      );
  }


  /* VERIFICA E-MAIL DUPLICADO */

  const emailConflict =
    profiles.some(
      (profile) =>
        profile.id !==
          updatedProfile.id &&

        updatedProfile.email &&

        profile.email
          ?.toLowerCase() ===
          updatedProfile.email
            .toLowerCase()
    );

  if (
    emailConflict
  ) {

    showFeedback(
      "Este e-mail já está sendo usado por outra conta.",
      true
    );

    return false;
  }


  /* REMOVE PERFIL ANTIGO */

  profiles =
    profiles.filter(
      (profile) =>
        profile.id !==
          updatedProfile.id &&

        profile.email
          ?.toLowerCase() !==
          oldEmail
            ?.toLowerCase()
    );


  /* ADICIONA PERFIL ATUALIZADO */

  profiles.push(
    updatedProfile
  );


  /* SALVA */

  data.saveProfiles(
    profiles
  );

  localStorage.setItem(
    "psinoteProfileDemo",
    JSON.stringify(
      updatedProfile
    )
  );

  updateStoredSessions(
    updatedProfile,
    oldEmail
  );

  updateRelatedNames(
    updatedProfile
  );

  currentProfile =
    updatedProfile;

  return true;
}


/* =========================
   REDIMENSIONAR FOTO
========================= */

function resizeAvatar(file) {
  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onerror = () =>
        reject(
          new Error(
            "Não foi possível ler a imagem."
          )
        );

      reader.onload = () => {

        const image =
          new Image();

        image.onerror = () =>
          reject(
            new Error(
              "A imagem selecionada não é válida."
            )
          );

        image.onload = () => {

          const size =
            320;

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            size;

          canvas.height =
            size;

          const context =
            canvas.getContext(
              "2d"
            );

          const scale =
            Math.max(
              size / image.width,
              size / image.height
            );

          const width =
            image.width *
            scale;

          const height =
            image.height *
            scale;

          context.drawImage(
            image,
            (size - width) / 2,
            (size - height) / 2,
            width,
            height
          );

          resolve(
            canvas.toDataURL(
              "image/jpeg",
              0.82
            )
          );

        };

        image.src =
          reader.result;
      };

      reader.readAsDataURL(
        file
      );
    }
  );
}


/* =========================
   BOTÃO EDITAR
========================= */

editButton.addEventListener(
  "click",
  () => {
    setEditing(true);
  }
);


/* =========================
   BOTÃO CANCELAR
========================= */

cancelButton.addEventListener(
  "click",
  () => {
    restoreOriginalValues();
    setEditing(false);
  }
);


/* =========================
   BOTÃO SALVAR
========================= */

form.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();

    feedback.hidden =
      true;

    if (
      !form.reportValidity()
    ) {
      return;
    }

    try {

      if (
        !saveProfile()
      ) {
        return;
      }

      applyProfile();

      

    } catch (error) {

      console.error(
        "Erro ao salvar o perfil:",
        error
      );

      showFeedback(
        "Não foi possível salvar as alterações.",
        true
      );

    }

  }
);


/* =========================
   MÁSCARA DE TELEFONE
========================= */

form.elements.phone
  ?.addEventListener(
    "input",
    () => {

      form.elements.phone.value =
        formatPhone(
          form.elements.phone.value
        );

      updateHeaderAndSummary();

    }
  );


/* =========================
   ATUALIZA RESUMO ENQUANTO EDITA
========================= */

[
  "fullName",
  "socialName",
  "email",
  "phone",
  "city",
  "state",
  "preferredFormat",
  "preferredPeriod",
  "crp",
  "crpState",
  "specialty",
  "serviceFormat",
  "gender",
  "pronoun",
  "birthDate"
].forEach(
  (fieldName) => {

    const control =
      form.elements[
        fieldName
      ];

    if (!control) {
      return;
    }

    const update = () => {

      if (
        fieldName ===
        "fullName"
      ) {
        renderAvatar();
      }

      updateHeaderAndSummary();

    };

    control.addEventListener(
      "input",
      update
    );

    control.addEventListener(
      "change",
      update
    );

  }
);


/* =========================
   ALTERAR FOTO
========================= */

changePhotoButton.addEventListener(
  "click",
  () => {

    if (!editing) {
      setEditing(true);
    }

    avatarInput.click();

  }
);


/* =========================
   SELEÇÃO DA FOTO
========================= */

avatarInput.addEventListener(
  "change",
  async () => {

    const file =
      avatarInput.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      showFeedback(
        "Selecione um arquivo de imagem válido.",
        true
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {

      showFeedback(
        "Escolha uma imagem com até 5 MB.",
        true
      );

      return;
    }

    try {

      pendingAvatar =
        await resizeAvatar(
          file
        );

      renderAvatar();

    } catch (error) {

      showFeedback(
        error.message,
        true
      );

    } finally {

      avatarInput.value =
        "";

    }

  }
);


/* =========================
   MENU MOBILE
========================= */

if (mobileMenu) {

  mobileMenu.addEventListener(
    "click",
    () => {

      const isOpen =
        sidebar.classList.toggle(
          "open"
        );

      mobileMenu.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

    }
  );

  document.addEventListener(
    "click",
    (event) => {

      if (
        window.innerWidth >
        720
      ) {
        return;
      }

      if (
        sidebar.contains(
          event.target
        ) ||
        mobileMenu.contains(
          event.target
        )
      ) {
        return;
      }

      sidebar.classList.remove(
        "open"
      );

      mobileMenu.setAttribute(
        "aria-expanded",
        "false"
      );

    }
  );
}


/* =========================
   LINKS AINDA NÃO IMPLEMENTADOS
========================= */

document
  .querySelectorAll(
    "[data-placeholder-link]"
  )
  .forEach(
    (link) => {

      link.addEventListener(
        "click",
        (event) =>
          event.preventDefault()
      );

    }
  );


/* =========================
   INICIALIZA
========================= */

applyProfile();