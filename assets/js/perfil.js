"use strict";

const data = window.PsiNoteData;

const form = document.querySelector("#profileForm");
const editButton = document.querySelector("#editButton");
const cancelButton = document.querySelector("#cancelButton");
const formActions = document.querySelector("#formActions");

const feedback = document.querySelector("#feedback");
const feedbackText = document.querySelector("#feedbackText");

const sidebar = document.querySelector(".sidebar");
const mobileMenu = document.querySelector(".mobile-menu");

const avatarInput = document.querySelector("#avatarInput");

const changePhotoButton = document.querySelector(
  "#changePhotoButton"
);

const agendaLink = document.querySelector("#agendaLink");

const agendaLinkText = document.querySelector(
  "#agendaLinkText"
);

const brandLink = document.querySelector("#brandLink");
const logoutLink = document.querySelector("#logoutLink");

const sectionEditButtons = document.querySelectorAll(
  "[data-edit-section]"
);

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

function normalizeRole(role) {
  const psychologistRoles = [
    "psicologo",
    "psychologist"
  ];

  return psychologistRoles.includes(role)
    ? "psicologo"
    : "paciente";
}

function resolveCurrentProfile() {
  const byId =
    session?.id &&
    profiles.find(
      (profile) => profile.id === session.id
    );

  const byEmail =
    session?.email &&
    profiles.find(
      (profile) =>
        profile.email?.toLowerCase() ===
        session.email.toLowerCase()
    );

  const latest = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("psinoteProfileDemo") ||
          "null"
      );
    } catch {
      return null;
    }
  })();

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
        "Usuário PsiNote",

      email:
        session?.email ||
        "",

      birthDate: "",
      phone: "",

      createdAt: new Date().toISOString()
    }
  );
}

function getInitials(name) {
  return (
    String(name || "PN")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "PN"
  );
}

function editableControls() {
  return [
    ...form.querySelectorAll(
      "input[name], select[name], textarea[name]"
    )
  ];
}

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

function getControlValue(name) {
  const control = form.elements[name];

  if (!control) {
    return "";
  }

  if (control.type === "checkbox") {
    return control.checked;
  }

  return control.value.trim();
}

function storeOriginalValues() {
  originalValues = {};

  editableControls().forEach((control) => {
    originalValues[control.name] =
      control.type === "checkbox"
        ? control.checked
        : control.value;
  });

  originalValues.avatarDataUrl =
    currentProfile.avatarDataUrl || "";
}

function restoreOriginalValues() {
  editableControls().forEach((control) => {
    if (!(control.name in originalValues)) {
      return;
    }

    if (control.type === "checkbox") {
      control.checked =
        originalValues[control.name];
    } else {
      control.value =
        originalValues[control.name];
    }
  });

  pendingAvatar =
    originalValues.avatarDataUrl || "";

  renderAvatar();
  updateProfileSummary();
  updateProfileCompletion();
}

function setEditing(state) {
  editing = state;

  editableControls().forEach((control) => {
    const hiddenSection = control.closest(
      "[data-profile-section][hidden]"
    );

    control.disabled =
      !state || Boolean(hiddenSection);
  });

  formActions.hidden = !state;
  editButton.hidden = state;

  changePhotoButton.disabled = !state;

  feedback.hidden = true;

  if (state) {
    storeOriginalValues();
    form.elements.fullName?.focus();
  }
}

function renderAvatar() {
  const name =
    getControlValue("fullName") ||
    currentProfile.fullName;

  const initials = getInitials(name);

  document
    .querySelectorAll("[data-avatar]")
    .forEach((avatar) => {
      avatar.textContent = initials;

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

function textOrFallback(
  value,
  fallback = "Não informado"
) {
  return value ? value : fallback;
}

function updateProfileSummary() {
  const city = getControlValue("city");
  const state = getControlValue("state");

  const location =
    city && state
      ? `${city} / ${state}`
      : city || state || "Não informado";

  document.querySelector(
    "[data-summary-email]"
  ).textContent = textOrFallback(
    getControlValue("email")
  );

  document.querySelector(
    "[data-summary-phone]"
  ).textContent = textOrFallback(
    getControlValue("phone")
  );

  document.querySelector(
    "[data-summary-location]"
  ).textContent = location;

  const preferenceLabel =
    document.querySelector(
      "[data-summary-preference-label]"
    );

  const preferenceValue =
    document.querySelector(
      "[data-summary-preference]"
    );

  if (currentRole === "psicologo") {
    preferenceLabel.textContent =
      "Formato de atendimento";

    const formatMap = {
      online: "Somente online",
      presencial: "Somente presencial",
      ambos: "Online e presencial"
    };

    const selectedFormat =
      getControlValue("serviceFormat");

    preferenceValue.textContent =
      textOrFallback(
        formatMap[selectedFormat] ||
          selectedFormat
      );
  } else {
    preferenceLabel.textContent =
      "Atendimento preferido";

    preferenceValue.textContent =
      textOrFallback(
        getControlValue("preferredFormat")
      );
  }
}

function calculateProfileCompletion() {
  const requiredCommon = [
    "fullName",
    "birthDate",
    "email",
    "phone",
    "city",
    "state"
  ];

  const roleSpecific =
    currentRole === "psicologo"
      ? [
          "crp",
          "crpState",
          "specialty",
          "serviceFormat",
          "approach",
          "biography"
        ]
      : [
          "preferredFormat",
          "preferredPeriod",
          "accessibility",
          "socialName",
          "pronoun"
        ];

  const allFields = [
    ...requiredCommon,
    ...roleSpecific
  ];

  const filledCount = allFields.filter(
    (field) => {
      const value = getControlValue(field);
      return Boolean(value);
    }
  ).length;

  const notificationBonus = [
    "appointmentReminders",
    "emailNotifications"
  ].filter((field) =>
    getControlValue(field)
  ).length;

  const totalItems =
    allFields.length + 2;

  const completedItems =
    filledCount + notificationBonus;

  const rawScore = Math.round(
    (completedItems / totalItems) * 100
  );

  return Math.max(
    35,
    Math.min(100, rawScore)
  );
}

function profileCompletionMessage(value) {
  if (value >= 100) {
    return "Perfil completo!";
  }

  if (value >= 80) {
    return "Falta pouco!";
  }

  if (value >= 60) {
    return "Você está indo bem!";
  }

  return "Complete mais alguns dados";
}

function updateProfileCompletion() {
  const completion =
    calculateProfileCompletion();

  document.querySelector(
    "[data-profile-completion]"
  ).textContent = String(completion);

  document.querySelector(
    "[data-profile-progress-fill]"
  ).style.width = `${completion}%`;

  document.querySelector(
    "[data-profile-completion-message]"
  ).textContent =
    profileCompletionMessage(completion);

  const status = document.querySelector(
    "[data-summary-status]"
  );

  if (completion >= 100) {
    status.textContent = "Completo";
  } else if (completion >= 70) {
    status.textContent = "Quase completo";
  } else {
    status.textContent = "Em andamento";
  }
}

function applyProfile() {
  currentRole = normalizeRole(
    currentProfile.role
  );

  const professional =
    currentProfile.professionalData || {};

  const patient =
    currentProfile.patientData || {};

  const preferences =
    currentProfile.preferences || {};

  const displayName =
    currentProfile.socialName ||
    currentProfile.fullName ||
    "Usuário PsiNote";

  const roleLabel =
    currentRole === "psicologo"
      ? "Psicólogo"
      : "Paciente";

  const agendaHref =
    currentRole === "psicologo"
      ? "agenda.html"
      : "agenda-paciente.html";

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

  setControlValue(
    "pronoun",
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

  setControlValue(
    "preferredFormat",
    patient.preferredFormat
  );

  setControlValue(
    "preferredPeriod",
    patient.preferredPeriod
  );

  setControlValue(
    "accessibility",
    patient.accessibility
  );

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
    "approach",
    professional.approach
  );

  setControlValue(
    "biography",
    professional.biography
  );

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

  document
    .querySelectorAll(
      "[data-profile-section]"
    )
    .forEach((section) => {
      section.hidden =
        section.dataset.profileSection !==
        currentRole;
    });

  

  document.querySelector(
    "[data-profile-name]"
  ).textContent = displayName;

  document.querySelector(
    "[data-role-pill]"
  ).textContent = roleLabel;

  document.querySelector(
    "[data-profile-description]"
  ).textContent =
    currentRole === "psicologo"
      ? "Atualize suas informações profissionais e os dados apresentados aos pacientes."
      : "Gerencie seus dados pessoais e suas preferências de atendimento.";

  agendaLink.href = agendaHref;
  brandLink.href = agendaHref;

  agendaLinkText.textContent =
    currentRole === "psicologo"
      ? "Agenda"
      : "Agendar consulta";

  pendingAvatar =
    currentProfile.avatarDataUrl || "";

  renderAvatar();
  updateProfileSummary();
  updateProfileCompletion();
  setEditing(false);
}

function showFeedback(
  message,
  isError = false
) {
  feedbackText.textContent = message;

  feedback.classList.toggle(
    "is-error",
    isError
  );

  feedback.hidden = false;
}

function formatPhone(value) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return (
      `(${digits.slice(0, 2)}) ` +
      digits.slice(2)
    );
  }

  if (digits.length <= 10) {
    return (
      `(${digits.slice(0, 2)}) ` +
      `${digits.slice(2, 6)}-` +
      digits.slice(6)
    );
  }

  return (
    `(${digits.slice(0, 2)}) ` +
    `${digits.slice(2, 7)}-` +
    digits.slice(7)
  );
}

function updateStoredSessions(
  updatedProfile
) {
  [localStorage, sessionStorage].forEach(
    (storage) => {
      [
        "psinote.auth.session",
        "psinoteSession"
      ].forEach((key) => {
        try {
          const stored = JSON.parse(
            storage.getItem(key) ||
              "null"
          );

          if (!stored) {
            return;
          }

          const sameUser =
            stored.id ===
              updatedProfile.id ||
            stored.email?.toLowerCase() ===
              currentProfile.email?.toLowerCase();

          if (!sameUser) {
            return;
          }

          storage.setItem(
            key,
            JSON.stringify({
              ...stored,

              id: updatedProfile.id,

              name:
                updatedProfile.fullName,

              fullName:
                updatedProfile.fullName,

              email:
                updatedProfile.email,

              role:
                updatedProfile.role,

              professionalData:
                updatedProfile.professionalData ||
                null,

              avatarDataUrl:
                updatedProfile.avatarDataUrl ||
                ""
            })
          );
        } catch {
          storage.removeItem(key);
        }
      });
    }
  );
}

function updateRelatedNames(
  updatedProfile
) {
  if (currentRole !== "paciente") {
    return;
  }

  const requests = data
    .getRequests()
    .map((item) => {
      if (
        item.patientId ===
        updatedProfile.id
      ) {
        return {
          ...item,
          patient:
            updatedProfile.fullName
        };
      }

      return item;
    });

  const appointments = data
    .getAppointments()
    .map((item) => {
      if (
        item.patientId ===
        updatedProfile.id
      ) {
        return {
          ...item,
          patient:
            updatedProfile.fullName
        };
      }

      return item;
    });

  data.saveRequests(requests);
  data.saveAppointments(appointments);
}

function saveProfile() {
  const oldEmail =
    currentProfile.email;

  const updatedProfile = {
    ...currentProfile,

    role: currentRole,

    fullName:
      getControlValue("fullName"),

    birthDate:
      getControlValue("birthDate"),

    socialName:
      getControlValue("socialName"),

    pronoun:
      getControlValue("pronoun"),

    email:
      getControlValue("email"),

    phone:
      getControlValue("phone"),

    city:
      getControlValue("city"),

    state:
      getControlValue("state"),

    avatarDataUrl:
      pendingAvatar,

    preferences: {
      ...(currentProfile.preferences ||
        {}),

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

  if (currentRole === "paciente") {
    updatedProfile.patientData = {
      ...(currentProfile.patientData ||
        {}),

      preferredFormat:
        getControlValue(
          "preferredFormat"
        ),

      preferredPeriod:
        getControlValue(
          "preferredPeriod"
        ),

      accessibility:
        getControlValue(
          "accessibility"
        )
    };
  } else {
    updatedProfile.professionalData = {
      ...(currentProfile.professionalData ||
        {}),

      crp:
        getControlValue("crp"),

      crpState:
        getControlValue("crpState"),

      specialty:
        getControlValue("specialty"),

      serviceFormat:
        getControlValue(
          "serviceFormat"
        ),

      approach:
        getControlValue("approach"),

      biography:
        getControlValue("biography")
    };
  }

  const emailConflict =
    profiles.some((profile) => {
      return (
        profile.id !==
          updatedProfile.id &&
        profile.email?.toLowerCase() ===
          updatedProfile.email.toLowerCase()
      );
    });

  if (emailConflict) {
    showFeedback(
      "Este e-mail já está sendo usado por outra conta.",
      true
    );

    return false;
  }

  profiles = profiles.filter(
    (profile) => {
      const differentId =
        profile.id !==
        updatedProfile.id;

      const differentEmail =
        profile.email?.toLowerCase() !==
        oldEmail?.toLowerCase();

      return (
        differentId &&
        differentEmail
      );
    }
  );

  profiles.push(updatedProfile);

  data.saveProfiles(profiles);

  localStorage.setItem(
    "psinoteProfileDemo",
    JSON.stringify(updatedProfile)
  );

  updateStoredSessions(updatedProfile);
  updateRelatedNames(updatedProfile);

  currentProfile = updatedProfile;

  return true;
}

function resizeAvatar(file) {
  return new Promise(
    (resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(
          new Error(
            "Não foi possível ler a imagem."
          )
        );
      };

      reader.onload = () => {
        const image = new Image();

        image.onerror = () => {
          reject(
            new Error(
              "A imagem selecionada não é válida."
            )
          );
        };

        image.onload = () => {
          const size = 320;

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width = size;
          canvas.height = size;

          const context =
            canvas.getContext("2d");

          const scale = Math.max(
            size / image.width,
            size / image.height
          );

          const width =
            image.width * scale;

          const height =
            image.height * scale;

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

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    }
  );
}

function enableEditingAndFocus(
  sectionButton
) {
  if (!editing) {
    setEditing(true);
  }

  const section =
    sectionButton.closest(
      ".section-card"
    );

  const firstControl =
    section?.querySelector(
      "input[name]:not([disabled]), select[name]:not([disabled]), textarea[name]:not([disabled])"
    );

  if (firstControl) {
    firstControl.focus();

    firstControl.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
}

editButton.addEventListener(
  "click",
  () => {
    setEditing(true);
  }
);

sectionEditButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        enableEditingAndFocus(button);
      }
    );
  }
);

cancelButton.addEventListener(
  "click",
  () => {
    restoreOriginalValues();
    setEditing(false);
  }
);

form.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    feedback.hidden = true;

    if (!form.reportValidity()) {
      return;
    }

    try {
      const saved = saveProfile();

      if (!saved) {
        return;
      }

      applyProfile();

      showFeedback(
        "Alterações salvas com sucesso."
      );

      document
        .querySelector("#perfil")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
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

form.elements.phone.addEventListener(
  "input",
  () => {
    form.elements.phone.value =
      formatPhone(
        form.elements.phone.value
      );

    updateProfileSummary();
    updateProfileCompletion();
  }
);

const watchedFields = [
  "fullName",
  "socialName",
  "email",
  "city",
  "state",
  "preferredFormat",
  "serviceFormat",
  "preferredPeriod",
  "accessibility",
  "crp",
  "crpState",
  "specialty",
  "approach",
  "biography",
  "pronoun",
  "birthDate"
];

watchedFields.forEach(
  (fieldName) => {
    const control =
      form.elements[fieldName];

    if (!control) {
      return;
    }

    control.addEventListener(
      "input",
      () => {
        if (
          fieldName === "fullName"
        ) {
          renderAvatar();
        }

        updateProfileSummary();
        updateProfileCompletion();
      }
    );

    control.addEventListener(
      "change",
      () => {
        if (
          fieldName === "fullName"
        ) {
          renderAvatar();
        }

        updateProfileSummary();
        updateProfileCompletion();
      }
    );
  }
);

[
  "appointmentReminders",
  "emailNotifications"
].forEach((fieldName) => {
  const control =
    form.elements[fieldName];

  if (!control) {
    return;
  }

  control.addEventListener(
    "change",
    updateProfileCompletion
  );
});

changePhotoButton.addEventListener(
  "click",
  () => {
    if (!editing) {
      return;
    }

    avatarInput.click();
  }
);

avatarInput.addEventListener(
  "change",
  async () => {
    const file =
      avatarInput.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
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
        await resizeAvatar(file);

      renderAvatar();
    } catch (error) {
      showFeedback(
        error.message,
        true
      );
    } finally {
      avatarInput.value = "";
    }
  }
);

document
  .querySelector(
    "#changePasswordButton"
  )
  .addEventListener(
    "click",
    () => {
      showFeedback(
        "A alteração de senha será conectada ao backend posteriormente."
      );
    }
  );

if (mobileMenu) {
  mobileMenu.addEventListener(
    "click",
    () => {
      const isOpen =
        sidebar.classList.toggle("open");

      mobileMenu.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }
  );

  document.addEventListener(
    "click",
    (event) => {
      if (window.innerWidth > 720) {
        return;
      }

      const clickedInsideSidebar =
        sidebar.contains(event.target);

      const clickedMenuButton =
        mobileMenu.contains(event.target);

      if (
        !clickedInsideSidebar &&
        !clickedMenuButton
      ) {
        sidebar.classList.remove("open");

        mobileMenu.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    }
  );
}

logoutLink.addEventListener(
  "click",
  () => {
    data.clearSession();
  }
);

applyProfile();