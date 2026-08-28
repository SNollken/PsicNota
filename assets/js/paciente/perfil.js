"use strict";

(function () {
  const ROLE = "paciente";
  const ROLE_LABEL = "Paciente";
  const OTHER_PROFILE_PATH = "../profissional/perfil.html";
  const data = window.PsiNoteData;
  const form = document.getElementById("profileForm");

  if (!form || !data) return;

  const elements = {
    avatar: document.querySelector("[data-avatar]"),
    profileName: document.querySelector("[data-profile-name]"),
    rolePill: document.querySelector("[data-role-pill]"),
    description: document.querySelector("[data-profile-description]"),
    summaryEmail: document.querySelector("[data-summary-email]"),
    summaryPhone: document.querySelector("[data-summary-phone]"),
    summaryLocation: document.querySelector("[data-summary-location]"),
    summaryPreference: document.querySelector("[data-summary-preference]"),
    avatarInput: document.getElementById("avatarInput"),
    changePhoto: document.getElementById("changePhotoButton"),
    removePhoto: document.getElementById("removePhotoButton"),
    edit: document.getElementById("editButton"),
    logout: document.getElementById("logoutLink"),
    formActions: document.getElementById("formActions"),
    cancel: document.getElementById("cancelButton"),
    feedback: document.getElementById("feedback"),
    feedbackText: document.getElementById("feedbackText"),
    confirmModal: document.getElementById("confirmModal"),
    confirmCancel: document.getElementById("confirmCancelBtn"),
    confirmSave: document.getElementById("confirmSaveBtn"),
    successModal: document.getElementById("successModal"),
    successOk: document.getElementById("successOkBtn")
  };

  const currentSession = data.getSession();
  if (currentSession && currentSession.role && currentSession.role !== ROLE) {
    window.location.replace(OTHER_PROFILE_PATH);
    return;
  }

  let session = currentSession || {
    id: "perfil-demo-" + ROLE,
    role: ROLE,
    name: ROLE_LABEL + " PsicNota",
    fullName: ROLE_LABEL + " PsicNota",
    email: ""
  };
  let avatarDataUrl = session.avatarDataUrl || "";
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

  function formatService(valueToFormat) {
    const labels = {
      online: "Online",
      presencial: "Presencial",
      ambos: "Online/presencial"
    };
    return labels[valueToFormat] || valueToFormat || "Não informado";
  }

  function setAvatar(src, name) {
    avatarDataUrl = src || "";
    const markup = avatarDataUrl
      ? '<img src="' + avatarDataUrl + '" alt="Foto de perfil">'
      : initials(name);

    if (elements.avatar) elements.avatar.innerHTML = markup;

    const sidebarAvatar = document.getElementById(ROLE === "paciente" ? "patientAvatar" : "psychologistAvatar");
    if (sidebarAvatar) {
      sidebarAvatar.innerHTML = avatarDataUrl
        ? '<img src="' + avatarDataUrl + '" alt="">'
        : initials(name);
    }

    if (elements.removePhoto) elements.removePhoto.hidden = !avatarDataUrl;
  }

  function profileFromSession() {
    const professional = session.professionalData || {};
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
      appointmentReminders: Boolean(session.appointmentReminders),
      emailNotifications: Boolean(session.emailNotifications),
      crp: session.crp || professional.crp || "",
      crpState: session.crpState || professional.crpState || "",
      specialty: session.specialty || professional.specialty || "",
      serviceFormat: session.serviceFormat || professional.serviceFormat || "",
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
      appointmentReminders: Boolean(form.elements.namedItem("appointmentReminders")?.checked),
      emailNotifications: Boolean(form.elements.namedItem("emailNotifications")?.checked),
      crp: value("crp").trim(),
      crpState: value("crpState").trim(),
      specialty: value("specialty"),
      serviceFormat: value("serviceFormat"),
      gender: value("gender")
    };
  }

  function render(profile) {
    Object.entries(profile).forEach(([name, fieldValue]) => setValue(name, fieldValue));

    const displayName = profile.socialName || profile.fullName || ROLE_LABEL + " PsicNota";
    if (elements.profileName) elements.profileName.textContent = displayName;
    if (elements.rolePill) elements.rolePill.textContent = ROLE_LABEL;
    if (elements.description) elements.description.textContent = "Gerencie seu perfil de " + ROLE_LABEL.toLowerCase() + ".";
    if (elements.summaryEmail) elements.summaryEmail.textContent = profile.email || "Não informado";
    if (elements.summaryPhone) elements.summaryPhone.textContent = profile.phone || "Não informado";

    const location = [profile.city, profile.state].filter(Boolean).join("/");
    if (elements.summaryLocation) elements.summaryLocation.textContent = location || "Não informado";
    if (elements.summaryPreference) {
      elements.summaryPreference.textContent = ROLE === "paciente"
        ? (profile.preferredFormat || "Não informado")
        : formatService(profile.serviceFormat);
    }

    const sidebarName = document.getElementById(ROLE === "paciente" ? "patientNameTop" : "psychologistName");
    if (sidebarName) sidebarName.textContent = displayName;

    setAvatar(avatarDataUrl, displayName);
  }

  function setEditing(editing) {
    form.querySelectorAll("input, select").forEach((field) => {
      if (field.id !== "avatarInput") field.disabled = !editing;
    });
    if (elements.edit) elements.edit.hidden = editing;
    if (elements.formActions) elements.formActions.hidden = !editing;
    if (elements.changePhoto) elements.changePhoto.disabled = !editing;
    if (elements.removePhoto) elements.removePhoto.disabled = !editing;
  }

  function openModal(modal) {
    if (modal) modal.hidden = false;
  }

  function closeModal(modal) {
    if (modal) modal.hidden = true;
  }

  function saveProfile() {
    const profile = collectForm();
    const existingProfessional = session.professionalData || {};

    session = {
      ...session,
      ...profile,
      name: profile.fullName,
      fullName: profile.fullName,
      role: ROLE,
      avatarDataUrl
    };

    if (ROLE === "psicologo") {
      session.professionalData = {
        ...existingProfessional,
        crp: profile.crp,
        crpState: profile.crpState,
        specialty: profile.specialty,
        serviceFormat: profile.serviceFormat
      };
    } else {
      session.professionalData = null;
    }

    const remember = Boolean(localStorage.getItem("psinote.auth.session") || localStorage.getItem("psinoteSession"));
    data.setSession(session, remember);

    const profiles = data.getProfiles();
    const index = profiles.findIndex((item) => item.id === session.id || item.email === session.email);
    const storedProfile = {
      ...(index >= 0 ? profiles[index] : {}),
      ...session
    };

    if (index >= 0) profiles[index] = storedProfile;
    else profiles.push(storedProfile);
    data.saveProfiles(profiles);

    snapshot = profileFromSession();
    render(snapshot);
    setEditing(false);
  }

  snapshot = profileFromSession();
  render(snapshot);
  setEditing(false);

  elements.edit?.addEventListener("click", () => {
    snapshot = collectForm();
    setEditing(true);
    form.elements.namedItem("fullName")?.focus();
  });

  elements.cancel?.addEventListener("click", () => {
    avatarDataUrl = session.avatarDataUrl || "";
    render(snapshot);
    setEditing(false);
  });

  elements.changePhoto?.addEventListener("click", () => elements.avatarInput?.click());

  elements.avatarInput?.addEventListener("change", () => {
    const file = elements.avatarInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setAvatar(String(reader.result || ""), value("fullName"));
    });
    reader.readAsDataURL(file);
  });

  elements.removePhoto?.addEventListener("click", () => setAvatar("", value("fullName")));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    openModal(elements.confirmModal);
  });

  elements.confirmCancel?.addEventListener("click", () => closeModal(elements.confirmModal));
  elements.confirmSave?.addEventListener("click", () => {
    closeModal(elements.confirmModal);
    saveProfile();
    openModal(elements.successModal);
  });
  elements.successOk?.addEventListener("click", () => closeModal(elements.successModal));

  elements.logout?.addEventListener("click", () => {
    data.clearSession();
    window.location.href = "../auth/login.html";
  });
}());
