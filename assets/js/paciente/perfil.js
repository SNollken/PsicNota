"use strict";

(function () {
  const ROLE = "paciente";
  const ROLE_LABEL = "Paciente";
  const data = window.PsiNoteData;
  const backend = window.PsicNotaBackend;
  const form = document.getElementById("profileForm");

  if (!form || !data || !backend) return;

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

    const sidebarName = document.getElementById(ROLE === "paciente" ? "patientNameTop" : "psychologistName");
    if (sidebarName) sidebarName.textContent = displayName;

    setAvatar(avatarDataUrl, displayName);
  }

  let editing = false;

  function setEditing(next) {
    editing = next;

    form.querySelectorAll("input, select").forEach((field) => {
      if (field.id !== "avatarInput") field.disabled = !editing;
    });
    if (elements.edit) elements.edit.hidden = editing;
    if (elements.formActions) elements.formActions.hidden = !editing;
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

  async function saveProfile() {
    const profile = collectForm();
    elements.confirmSave.disabled = true;
    elements.confirmSave.textContent = "Salvando...";

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
      setEditing(false);
      openModal(elements.successModal);
    } catch (error) {
      console.error(error);
      showFeedback("Não foi possível salvar o perfil. Tente novamente.", true);
    } finally {
      elements.confirmSave.disabled = false;
      elements.confirmSave.textContent = "Salvar";
    }
  }

  setEditing(false);

  elements.edit?.addEventListener("click", () => {
    startEditing();
    form.elements.namedItem("fullName")?.focus();
  });

  elements.cancel?.addEventListener("click", () => {
    avatarDataUrl = session.avatarDataUrl || "";
    pendingAvatarFile = null;
    removeAvatar = false;
    render(snapshot);
    setEditing(false);
  });

  elements.changePhoto?.addEventListener("click", () => {
    startEditing();
    elements.avatarInput?.click();
  });

  elements.changePassword?.addEventListener("click", () => {
    showFeedback("A alteração de senha estará disponível em breve.");
  });

  elements.avatarInput?.addEventListener("change", () => {
    const file = elements.avatarInput.files?.[0];
    if (!file) return;
    pendingAvatarFile = file;
    removeAvatar = false;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setAvatar(String(reader.result || ""), value("fullName"));
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
    openModal(elements.confirmModal);
  });

  elements.confirmCancel?.addEventListener("click", () => closeModal(elements.confirmModal));
  elements.confirmSave?.addEventListener("click", async () => {
    closeModal(elements.confirmModal);
    await saveProfile();
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
        appointmentReminders: loaded.profile.lembretes_consulta,
        emailNotifications: loaded.profile.notificacoes_email,
        birthDate: loaded.profile.data_nascimento || "",
        phone: loaded.profile.telefone || "",
        email: loaded.profile.email,
        avatarDataUrl
      };
      snapshot = profileFromSession();
      render(snapshot);
      setEditing(false);
    } catch (error) {
      console.error(error);
      showFeedback("Não foi possível carregar seu perfil.", true);
    }
  }

  initialize();
}());
