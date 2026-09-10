"use strict";

(function () {
  const ROLE = "psicologo";
  const ROLE_LABEL = "Psicólogo";
  const OTHER_PROFILE_PATH = "../paciente/perfil.html";
  const data = window.PsiNoteData;
  const form = document.getElementById("profileForm");

  if (!form || !data) return;

  const elements = {
    avatar: document.querySelector("[data-avatar]"),
    profileName: document.querySelector("[data-profile-name]"),
    profileMeta: document.querySelector("[data-profile-meta]"),
    profileCrp: document.querySelector("[data-profile-crp]"),
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
    successOk: document.getElementById("successOkBtn"),
    areasChips: document.querySelector("[data-areas-chips]"),
    areasAdd: document.querySelector("[data-areas-add]"),
    areasInput: document.querySelector("[data-areas-input]"),
    areasAddBtn: document.querySelector("[data-areas-add-btn]")
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
  let areas = Array.isArray(session.areas) ? session.areas.slice() : [];
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

    const sidebarAvatar = document.getElementById("psychologistAvatar");
    if (sidebarAvatar) {
      sidebarAvatar.innerHTML = avatarDataUrl
        ? '<img src="' + avatarDataUrl + '" alt="">'
        : initials(name);
    }

    if (elements.removePhoto) elements.removePhoto.hidden = !avatarDataUrl;
  }

  function renderAreas(editing) {
    if (!elements.areasChips) return;
    elements.areasChips.innerHTML = "";

    if (!areas.length) {
      const empty = document.createElement("span");
      empty.className = "areas-chips-empty";
      empty.textContent = "Nenhuma área adicionada.";
      elements.areasChips.appendChild(empty);
      return;
    }

    areas.forEach((area, index) => {
      const chip = document.createElement("span");
      chip.className = "area-chip";
      chip.appendChild(document.createTextNode(area));

      if (editing) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Remover " + area);
        remove.addEventListener("click", () => {
          areas.splice(index, 1);
          renderAreas(true);
        });
        chip.appendChild(remove);
      }

      elements.areasChips.appendChild(chip);
    });
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
      crp: session.crp || professional.crp || "",
      crpState: session.crpState || professional.crpState || "",
      specialty: session.specialty || professional.specialty || "",
      serviceFormat: session.serviceFormat || professional.serviceFormat || "",
      gender: session.gender || "",
      about: session.about || professional.about || "",
      approach: session.approach || professional.approach || "",
      audience: session.audience || professional.audience || ""
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
      crp: value("crp").trim(),
      crpState: value("crpState").trim().toUpperCase(),
      specialty: value("specialty"),
      serviceFormat: value("serviceFormat"),
      gender: value("gender"),
      about: value("about").trim(),
      approach: value("approach").trim(),
      audience: value("audience").trim()
    };
  }

  function render(profile) {
    Object.entries(profile).forEach(([name, fieldValue]) => setValue(name, fieldValue));

    const displayName = profile.socialName || profile.fullName || ROLE_LABEL + " PsicNota";
    if (elements.profileName) elements.profileName.textContent = displayName;
    if (elements.profileMeta) {
      elements.profileMeta.textContent = profile.specialty || ROLE_LABEL;
    }
    if (elements.profileCrp) {
      const crp = [profile.crp, profile.crpState].filter(Boolean).join("/");
      elements.profileCrp.textContent = crp ? "CRP " + crp : "";
    }
    if (elements.summaryEmail) elements.summaryEmail.textContent = profile.email || "Não informado";
    if (elements.summaryPhone) elements.summaryPhone.textContent = profile.phone || "Não informado";

    const location = [profile.city, profile.state].filter(Boolean).join("/");
    if (elements.summaryLocation) elements.summaryLocation.textContent = location || "Não informado";

    const sidebarName = document.getElementById("psychologistName");
    if (sidebarName) sidebarName.textContent = displayName;

    setAvatar(avatarDataUrl, displayName);
  }

  let editing = false;

  function setEditing(next) {
    editing = next;

    form.querySelectorAll("input, select").forEach((field) => {
      if (field.id !== "avatarInput" && !field.hasAttribute("data-areas-input")) field.disabled = !editing;
    });
    if (elements.edit) elements.edit.hidden = editing;
    if (elements.formActions) elements.formActions.hidden = !editing;
    if (elements.areasAdd) elements.areasAdd.hidden = !editing;
    renderAreas(editing);
  }

  function startEditing() {
    if (editing) return;
    snapshot = collectForm();
    snapshot.areas = areas.slice();
    setEditing(true);
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
      avatarDataUrl,
      areas: areas.slice(),
      professionalData: {
        ...existingProfessional,
        crp: profile.crp,
        crpState: profile.crpState,
        specialty: profile.specialty,
        serviceFormat: profile.serviceFormat,
        about: profile.about,
        approach: profile.approach,
        audience: profile.audience
      }
    };

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
    snapshot.areas = areas.slice();
    render(snapshot);
    setEditing(false);
  }

  snapshot = profileFromSession();
  snapshot.areas = areas.slice();
  render(snapshot);
  setEditing(false);

  elements.edit?.addEventListener("click", () => {
    startEditing();
    form.elements.namedItem("fullName")?.focus();
  });

  elements.cancel?.addEventListener("click", () => {
    avatarDataUrl = session.avatarDataUrl || "";
    areas = (snapshot.areas || []).slice();
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
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setAvatar(String(reader.result || ""), value("fullName"));
    });
    reader.readAsDataURL(file);
  });

  elements.removePhoto?.addEventListener("click", () => {
    startEditing();
    setAvatar("", value("fullName"));
  });

  elements.areasAddBtn?.addEventListener("click", () => {
    const input = elements.areasInput;
    if (!input) return;
    const area = input.value.trim();
    if (!area) return;
    if (areas.some((item) => item.toLowerCase() === area.toLowerCase())) {
      showFeedback("Essa área já foi adicionada.", true);
      return;
    }
    areas.push(area);
    input.value = "";
    input.focus();
    renderAreas(true);
  });

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
