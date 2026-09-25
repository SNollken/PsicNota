"use strict";

(function () {
  const ROLE = "paciente";
  const ROLE_LABEL = "Paciente";
  const data = window.PsiNoteData;
  const backend = window.PsicNotaBackend;
  const form = document.getElementById("profileForm");

  if (!form || !data || !backend) return;

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

  const elements = {
    avatar: document.querySelector("[data-avatar]"),
    profileName: document.querySelector("[data-profile-name]"),
    profileMeta: document.querySelector("[data-profile-meta]"),
    summaryEmail: document.querySelector("[data-summary-email]"),
    summaryPhone: document.querySelector("[data-summary-phone]"),
    summaryLocation: document.querySelector("[data-summary-location]"),
    avatarInput: document.getElementById("avatarInput"),
    changePhoto: document.getElementById("changePhotoButton"),
    removePhoto: document.getElementById("removePhotoButton"),
    edit: document.getElementById("editButton"),
    changePassword: document.getElementById("changePasswordButton"),
    logout: document.getElementById("logoutLink"),
    feedback: document.getElementById("feedback"),
    feedbackText: document.getElementById("feedbackText"),
    successModal: document.getElementById("successModal"),
    successOk: document.getElementById("successOkBtn")
  };

  let session = data.getSession() || {};
  let userId = "";
  let avatarPath = "";
  let avatarDataUrl = "";
  let pendingAvatarFile = null;
  let removeAvatar = false;
  let snapshot = {};

  function value(name, fallback = "") {
    const field = form.elements.namedItem(name);
    return field ? field.value : fallback;
  }

  function setValue(name, fieldValue) {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(fieldValue);
    else field.value = fieldValue || "";
  }

  function initials(name) {
    const parts = String(name || ROLE_LABEL).trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "PN";
  }

  function ageFrom(birthDate) {
    if (!birthDate) return null;

    let date;
    if (String(birthDate).includes("/")) {
      const [day, month, year] = String(birthDate).split("/").map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(birthDate + "T00:00:00");
    }

    if (Number.isNaN(date.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age -= 1;

    return age >= 0 && age < 130 ? age : null;
  }

  let feedbackTimer = 0;
  function showFeedback(message, isError = false) {
    if (!elements.feedback || !elements.feedbackText) return;
    elements.feedbackText.textContent = message;
    elements.feedback.classList.toggle("is-error", isError);
    elements.feedback.hidden = false;
    window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
      if (elements.feedback) elements.feedback.hidden = true;
    }, 4000);
  }

  function setAvatar(src, name) {
    avatarDataUrl = src || "";
    if (elements.avatar) {
      elements.avatar.classList.toggle("has-photo", Boolean(avatarDataUrl));
      elements.avatar.replaceChildren();

      if (avatarDataUrl) {
        const image = document.createElement("img");
        image.src = avatarDataUrl;
        image.alt = "Foto de perfil";
        image.addEventListener("error", () => {
          avatarDataUrl = "";
          elements.avatar.classList.remove("has-photo");
          elements.avatar.textContent = initials(name);
        }, { once: true });
        elements.avatar.append(image);
      } else {
        elements.avatar.textContent = initials(name);
      }
    }

    const sidebarAvatar = document.getElementById("patientAvatar");
    if (sidebarAvatar) {
      sidebarAvatar.classList.toggle("has-photo", Boolean(avatarDataUrl));
      sidebarAvatar.replaceChildren();

      if (avatarDataUrl) {
        const image = document.createElement("img");
        image.src = avatarDataUrl;
        image.alt = "";
        image.addEventListener("error", () => {
          sidebarAvatar.classList.remove("has-photo");
          sidebarAvatar.textContent = initials(name);
        }, { once: true });
        sidebarAvatar.append(image);
      } else {
        sidebarAvatar.textContent = initials(name);
      }
    }

    if (elements.removePhoto) elements.removePhoto.hidden = !avatarDataUrl;
  }

  function profileFromSession() {
    return {
      fullName: session.fullName || session.name || "",
      birthDate: session.birthDate || "",
      socialName: session.socialName || "",
      pronoun: session.pronoun || "",
      email: session.email || "",
      phone: session.phone || "",
      city: session.city || "",
      state: session.state || "",
      preferredFormat: session.preferredFormat || "",
      preferredPeriod: session.preferredPeriod || "",
      availabilityOnline: Array.isArray(session.availabilityOnline) ? [...session.availabilityOnline] : [],
      availabilityInPerson: Array.isArray(session.availabilityInPerson) ? [...session.availabilityInPerson] : [],
      availabilitySupported: session.availabilitySupported === true,
      appointmentReminders: Boolean(session.appointmentReminders),
      emailNotifications: Boolean(session.emailNotifications),
      gender: session.gender || ""
    };
  }

  function collectForm() {
    return {
      fullName: value("fullName").trim(),
      birthDate: value("birthDate"),
      socialName: value("socialName").trim(),
      pronoun: value("pronoun"),
      email: value("email").trim(),
      phone: value("phone").trim(),
      city: value("city").trim(),
      state: value("state"),
      preferredFormat: value("preferredFormat"),
      preferredPeriod: value("preferredPeriod"),
      ...collectAvailability(),
      availabilitySupported: session.availabilitySupported === true,
      appointmentReminders: Boolean(form.elements.namedItem("appointmentReminders")?.checked),
      emailNotifications: Boolean(form.elements.namedItem("emailNotifications")?.checked),
      gender: value("gender")
    };
  }

  function render(profile) {
    Object.entries(profile).forEach(([name, fieldValue]) => setValue(name, fieldValue));

    const displayName = profile.socialName || profile.fullName || ROLE_LABEL + " PsicNota";
    if (elements.profileName) elements.profileName.textContent = displayName;
    if (elements.profileMeta) {
      const age = ageFrom(profile.birthDate);
      const metaParts = [];
      if (age !== null) metaParts.push(age + " anos");
      if (profile.pronoun) metaParts.push(profile.pronoun);
      elements.profileMeta.textContent = metaParts.join(" • ") || ROLE_LABEL;
    }
    if (elements.summaryEmail) elements.summaryEmail.textContent = profile.email || "Não informado";
    if (elements.summaryPhone) elements.summaryPhone.textContent = profile.phone || "Não informado";

    const location = [profile.city, profile.state].filter(Boolean).join("/");
    if (elements.summaryLocation) elements.summaryLocation.textContent = location || "Não informado";

    const sidebarName = document.getElementById("patientNameTop");
    if (sidebarName) sidebarName.textContent = displayName;

    setAvatar(avatarDataUrl, displayName);
  }

  let editing = false;

  function setEditing(next) {
    editing = next;

    form.querySelectorAll("input, select").forEach((field) => {
      if (field.id === "avatarInput") return;
      if (field.type === "checkbox" || field.tagName === "SELECT") {
        field.disabled = !editing;
      } else {
        field.disabled = false;
        field.readOnly = !editing;
      }
    });
    if (elements.edit) elements.edit.hidden = editing;
  }

  function renderAvailability(button, isAvailable) {
    button.setAttribute("aria-pressed", String(isAvailable));
    button.setAttribute("aria-label", isAvailable ? "Disponível" : "Indisponível");

    const status = document.createElement("span");
    status.className = isAvailable ? "cell-available" : "cell-empty";

    if (isAvailable) {
      status.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>Disponível';
    } else {
      status.textContent = "———";
    }

    button.replaceChildren(status);
  }

  function collectAvailability() {
    const selections = { availabilityOnline: [], availabilityInPerson: [] };
    const periods = ["Manhã", "Tarde", "Noite"];

    form.querySelectorAll(".availability-table").forEach((table) => {
      const title = table.closest(".availability-card")?.querySelector(".availability-card-title")?.textContent.toLowerCase() || "";
      const key = title.includes("presenciais") ? "availabilityInPerson" : "availabilityOnline";

      table.querySelectorAll("tbody tr").forEach((row) => {
        const day = row.querySelector("th")?.textContent.trim();
        row.querySelectorAll(".availability-toggle").forEach((button, index) => {
          if (button.getAttribute("aria-pressed") === "true" && day && periods[index]) {
            selections[key].push(`${day}:${periods[index]}`);
          }
        });
      });
    });

    return selections;
  }

  function renderWeeklyAvailability(profile) {
    const selections = {
      availabilityOnline: Array.isArray(profile.availabilityOnline) ? profile.availabilityOnline : [],
      availabilityInPerson: Array.isArray(profile.availabilityInPerson) ? profile.availabilityInPerson : []
    };

    form.querySelectorAll(".availability-table").forEach((table) => {
      const title = table.closest(".availability-card")?.querySelector(".availability-card-title")?.textContent.toLowerCase() || "";
      const key = title.includes("presenciais") ? "availabilityInPerson" : "availabilityOnline";

      table.querySelectorAll("tbody tr").forEach((row) => {
        const day = row.querySelector("th")?.textContent.trim();
        row.querySelectorAll(".availability-toggle").forEach((button, index) => {
          renderAvailability(button, Boolean(day && selections[key].includes(`${day}:${["Manhã", "Tarde", "Noite"][index]}`)));
          button.disabled = profile.availabilitySupported !== true;
        });
      });
    });
  }

  document.querySelectorAll(".availability-table tbody td").forEach((cell) => {
    const isAvailable = Boolean(cell.querySelector(".cell-available"));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "availability-toggle";
    button.disabled = true;
    renderAvailability(button, isAvailable);
    button.addEventListener("click", async () => {
      renderAvailability(button, button.getAttribute("aria-pressed") !== "true");
      button.disabled = true;
      const saved = await saveProfile(false);
      button.disabled = false;
      if (!saved) renderWeeklyAvailability(session);
    });
    cell.replaceChildren(button);
  });

  function isProfileField(field) {
    return field instanceof HTMLInputElement &&
      field.id !== "avatarInput" &&
      field.type !== "checkbox";
  }

  async function saveFromField() {
    if (!form.reportValidity()) return;
    await saveProfile();
  }

  function startEditing() {
    if (editing) return;
    snapshot = collectForm();
    setEditing(true);
  }

  function openModal(modal) {
    if (modal) modal.hidden = false;
  }

  function closeModal(modal) {
    if (modal) modal.hidden = true;
  }

  async function saveProfile(showSuccess = true) {
    const profile = collectForm();

    try {
      avatarPath = await backend.saveProfile(
        userId,
        ROLE,
        profile,
        pendingAvatarFile,
        removeAvatar,
        avatarPath
      );
      avatarDataUrl = await backend.avatarUrl(avatarPath);

      session = {
        ...session,
        ...profile,
        id: userId,
        name: profile.socialName || profile.fullName,
        fullName: profile.fullName,
        role: ROLE,
        avatarDataUrl
      };
      const remember = Boolean(localStorage.getItem("psinote.auth.session") || localStorage.getItem("psinoteSession"));
      data.setSession(session, remember);
      pendingAvatarFile = null;
      removeAvatar = false;
      snapshot = profileFromSession();
      render(snapshot);
      renderWeeklyAvailability(snapshot);
      setEditing(false);
      if (showSuccess) openModal(elements.successModal);
      else showFeedback("Disponibilidade salva.");
      return true;
    } catch (error) {
      console.error(error);
      showFeedback("Não foi possível salvar o perfil. Tente novamente.", true);
      return false;
    }
  }

  async function saveSelectedAvatar(file, previousAvatarUrl) {
    if (elements.edit) elements.edit.disabled = true;

    try {
      avatarPath = await backend.saveProfile(
        userId,
        ROLE,
        collectForm(),
        file,
        false,
        avatarPath
      );
      avatarDataUrl = await backend.avatarUrl(avatarPath);

      session = {
        ...session,
        avatarDataUrl
      };
      const remember = Boolean(localStorage.getItem("psinote.auth.session") || localStorage.getItem("psinoteSession"));
      data.setSession(session, remember);
      snapshot = profileFromSession();
      render(snapshot);
      showFeedback("Foto de perfil atualizada.");
    } catch (error) {
      console.error(error);
      setAvatar(previousAvatarUrl, value("fullName"));
      showFeedback("Não foi possível salvar a foto. Tente novamente.", true);
    } finally {
      pendingAvatarFile = null;
      if (elements.edit) elements.edit.disabled = false;
      if (elements.avatarInput) elements.avatarInput.value = "";
    }
  }

  setEditing(false);

  function openPhotoPicker() {
    elements.avatarInput?.click();
  }

  elements.edit?.addEventListener("click", openPhotoPicker);

  form.querySelectorAll("input:not([type='checkbox'])").forEach((field) => {
    if (!isProfileField(field)) return;

    field.addEventListener("focus", () => {
      if (!editing) startEditing();
    });

    field.addEventListener("click", () => {
      if (!editing) startEditing();
    });

    field.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || !editing) return;
      event.preventDefault();
      void saveFromField();
    });
  });

  elements.changePhoto?.addEventListener("click", openPhotoPicker);

  elements.changePassword?.addEventListener("click", () => {
    showFeedback("A alteração de senha estará disponível em breve.");
  });

  elements.avatarInput?.addEventListener("change", () => {
    const file = elements.avatarInput.files?.[0];
    if (!file) return;
    const previousAvatarUrl = avatarDataUrl;
    pendingAvatarFile = file;
    removeAvatar = false;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setAvatar(String(reader.result || ""), value("fullName"));
      void saveSelectedAvatar(file, previousAvatarUrl);
    });
    reader.readAsDataURL(file);
  });

  elements.removePhoto?.addEventListener("click", () => {
    startEditing();
    pendingAvatarFile = null;
    removeAvatar = true;
    setAvatar("", value("fullName"));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    void saveProfile();
  });

  elements.successOk?.addEventListener("click", () => closeModal(elements.successModal));

  elements.logout?.addEventListener("click", async (event) => {
    event.preventDefault();
    await backend.signOut();
    data.clearSession();
    window.location.href = "../auth/login.html";
  });

  async function initialize() {
    try {
      const loaded = await backend.requireProfile(ROLE);
      if (!loaded) return;
      userId = loaded.user.id;
      avatarPath = loaded.profile.avatar_url || "";
      avatarDataUrl = loaded.avatarUrl;
      session = {
        id: userId,
        role: ROLE,
        name: loaded.profile.nome_social || loaded.profile.nome_completo,
        fullName: loaded.profile.nome_completo,
        socialName: loaded.profile.nome_social || "",
        pronoun: loaded.profile.pronomes || "",
        gender: loaded.profile.genero || "",
        city: loaded.profile.cidade || "",
        state: loaded.profile.estado || "",
        preferredFormat: loaded.profile.formato_preferido || "",
        preferredPeriod: loaded.profile.periodo_preferido || "",
        availabilityOnline: Array.isArray(loaded.profile.disponibilidade_online) ? loaded.profile.disponibilidade_online : [],
        availabilityInPerson: Array.isArray(loaded.profile.disponibilidade_presencial) ? loaded.profile.disponibilidade_presencial : [],
        availabilitySupported: "disponibilidade_online" in loaded.profile && "disponibilidade_presencial" in loaded.profile,
        appointmentReminders: loaded.profile.lembretes_consulta,
        emailNotifications: loaded.profile.notificacoes_email,
        birthDate: loaded.profile.data_nascimento || "",
        phone: loaded.profile.telefone || "",
        email: loaded.profile.email,
        avatarDataUrl
      };
      snapshot = profileFromSession();
      render(snapshot);
      renderWeeklyAvailability(snapshot);
      setEditing(false);
      if (!session.availabilitySupported) {
        showFeedback("A disponibilidade semanal ficará disponível após a atualização do banco.", true);
      }
    } catch (error) {
      console.error(error);
      showFeedback("Não foi possível carregar seu perfil.", true);
    }
  }

  initialize();
}());
