"use strict";

(function () {
  const ROLE = "psicologo";
  const ROLE_LABEL = "Psicólogo";
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
  }

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
    feedback: document.getElementById("feedback"),
    feedbackText: document.getElementById("feedbackText"),
    successModal: document.getElementById("successModal"),
    successOk: document.getElementById("successOkBtn"),
    areasChips: document.querySelector("[data-areas-chips]"),
    areasToggle: document.querySelector("[data-areas-toggle]"),
    areasAdd: document.querySelector("[data-areas-add]")
  };

  let session = data.getSession() || {};
  let userId = "";
  let avatarPath = "";
  let avatarDataUrl = "";
  let pendingAvatarFile = null;
  let removeAvatar = false;
  let areas = [];
  let snapshot = {};
  const citiesByState = new Map();
  let citiesRequest = 0;

  function value(name, fallback = "") {
    const field = form.elements.namedItem(name);
    return field ? field.value : fallback;
  }

  function setValue(name, fieldValue) {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(fieldValue);
    else {
      const nextValue = fieldValue || "";
      if (field instanceof HTMLSelectElement) {
        if (!nextValue) {
          field.value = "";
          return;
        }
        const matchingOption = Array.from(field.options).find((option) =>
          option.value.toLocaleLowerCase("pt-BR") === String(nextValue).toLocaleLowerCase("pt-BR")
        );
        if (matchingOption) field.value = matchingOption.value;
        else {
          field.add(new Option(nextValue, nextValue));
          field.value = nextValue;
        }
        return;
      }
      field.value = nextValue;
    }
  }

  function normalizeState(value) {
    const state = String(value || "").trim();
    if (!state) return "";
    const upperState = state.toLocaleUpperCase("pt-BR");
    const stateField = form.elements.namedItem("state");
    const matchingOption = Array.from(stateField.options).find((option) => {
      const optionLabel = option.textContent.replace(/^[A-Z]{2}\s-\s/, "");
      return option.value === upperState || optionLabel.localeCompare(state, "pt-BR", { sensitivity: "base" }) === 0;
    });
    return matchingOption?.value || upperState;
  }

  function normalizeCity(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");
  }

  async function loadCities(state, selectedCity = "") {
    const cityField = form.elements.namedItem("city");
    const stateField = form.elements.namedItem("state");
    const stateCode = normalizeState(state);
    const request = ++citiesRequest;

    cityField.replaceChildren(new Option(stateCode ? "Carregando cidades..." : "Selecione o estado primeiro", ""));
    cityField.disabled = true;
    cityField.dataset.loadedFor = "";
    if (stateField.value !== stateCode) stateField.value = stateCode;
    if (!stateCode) {
      if (selectedCity) {
        cityField.add(new Option(selectedCity, selectedCity));
        cityField.value = selectedCity;
      }
      return;
    }

    try {
      let cities = citiesByState.get(stateCode);
      if (!cities) {
        const response = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(stateCode)}/municipios?orderBy=nome`
        );
        if (!response.ok) throw new Error("Não foi possível carregar municípios do IBGE.");
        const municipalities = await response.json();
        if (!Array.isArray(municipalities)) throw new Error("Resposta inválida ao carregar municípios.");
        cities = municipalities.map((municipality) => municipality.nome).filter(Boolean);
        citiesByState.set(stateCode, cities);
      }

      if (request !== citiesRequest) return;
      cityField.replaceChildren(new Option("Selecione uma cidade", ""));
      cities.forEach((city) => cityField.add(new Option(city, city)));

      const matchingCity = cities.find((city) => normalizeCity(city) === normalizeCity(selectedCity));
      if (selectedCity && !matchingCity) {
        cityField.add(new Option(selectedCity, selectedCity));
      }
      cityField.value = matchingCity || selectedCity || "";
      cityField.dataset.loadedFor = stateCode;
      cityField.disabled = false;
    } catch (error) {
      if (request !== citiesRequest) return;
      console.error(error);
      cityField.replaceChildren(new Option("Não foi possível carregar as cidades", ""));
      if (selectedCity) {
        cityField.add(new Option(selectedCity, selectedCity));
        cityField.value = selectedCity;
      }
      showFeedback("Não foi possível carregar as cidades. Verifique sua conexão.", true);
    }
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

  function normalizeArea(area) {
    return String(area || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");
  }

  function renderAreas(editing) {
    if (!elements.areasChips) return;
    elements.areasChips.innerHTML = "";

    if (!areas.length) {
      const empty = document.createElement("span");
      empty.className = "areas-chips-empty";
      empty.textContent = "Nenhuma área adicionada.";
      elements.areasChips.appendChild(empty);
    } else {
      areas.forEach((area, index) => {
        const chip = document.createElement("span");
        chip.className = "area-chip";
        chip.appendChild(document.createTextNode(area));

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.disabled = !editing;
        remove.setAttribute("aria-label", "Remover " + area);
        remove.addEventListener("click", () => {
          areas.splice(index, 1);
          renderAreas(true);
        });
        chip.appendChild(remove);

        elements.areasChips.appendChild(chip);
      });
    }

    const selectedAreas = new Set(areas.map(normalizeArea));
    elements.areasAdd.querySelectorAll("[data-area-option]").forEach((option) => {
      const isSelected = selectedAreas.has(normalizeArea(option.dataset.areaOption));
      option.disabled = !editing || isSelected;
      option.setAttribute("aria-pressed", String(isSelected));
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

  async function render(profile) {
    const state = normalizeState(profile.state);
    setValue("state", state);
    await loadCities(state, profile.city);
    Object.entries(profile).forEach(([name, fieldValue]) => {
      if (name !== "state" && name !== "city") setValue(name, fieldValue);
    });

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
      if (field.id === "avatarInput") return;
      if (field.name === "city") {
        field.disabled = !form.elements.namedItem("state").value ||
          field.dataset.loadedFor !== form.elements.namedItem("state").value;
      } else if (field.tagName === "SELECT" || field.type === "checkbox") {
        field.disabled = false;
      } else {
        field.disabled = false;
        field.readOnly = !editing;
      }
    });
    if (elements.areasToggle) {
      elements.areasToggle.disabled = !editing;
      elements.areasToggle.setAttribute("aria-expanded", "false");
    }
    if (elements.areasAdd) elements.areasAdd.hidden = true;
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

  async function saveProfile(showSuccess = true) {
    const profile = collectForm();
    profile.areas = areas.slice();

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
        avatarDataUrl,
        areas: areas.slice(),
        professionalData: {
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
      pendingAvatarFile = null;
      removeAvatar = false;
      snapshot = profileFromSession();
      snapshot.areas = areas.slice();
      await render(snapshot);
      setEditing(false);
      if (showSuccess) openModal(elements.successModal);
      return true;
    } catch (error) {
      console.error(error);
      showFeedback("Não foi possível salvar o perfil. Tente novamente.", true);
      return false;
    }
  }

  setEditing(false);

  function openPhotoPicker() {
    elements.avatarInput?.click();
  }

  elements.edit?.addEventListener("click", openPhotoPicker);
  elements.changePhoto?.addEventListener("click", openPhotoPicker);

  form.querySelectorAll("input:not([type='file']), select").forEach((field) => {
    if (field.hasAttribute("data-areas-input")) return;

    field.addEventListener("focus", () => {
      if (!editing) startEditing();
    });

    field.addEventListener("click", () => {
      if (!editing) startEditing();
    });

    field.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || !editing) return;
      event.preventDefault();
      if (!form.reportValidity()) return;
      void saveProfile();
    });
  });

  form.elements.namedItem("state").addEventListener("change", (event) => {
    void loadCities(event.currentTarget.value);
  });

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
      void saveProfile(false).then((saved) => {
        if (saved) showFeedback("Foto de perfil atualizada.");
        else setAvatar(previousAvatarUrl, value("fullName"));
        if (elements.avatarInput) elements.avatarInput.value = "";
      });
    });
    reader.readAsDataURL(file);
  });

  elements.removePhoto?.addEventListener("click", () => {
    const previousAvatarUrl = avatarDataUrl;
    pendingAvatarFile = null;
    removeAvatar = true;
    setAvatar("", value("fullName"));
    void saveProfile(false).then((saved) => {
      if (saved) showFeedback("Foto de perfil removida.");
      else setAvatar(previousAvatarUrl, value("fullName"));
    });
  });

  elements.areasAdd?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-area-option]");
    const area = option?.dataset.areaOption;
    if (!area || !editing) return;
    if (areas.some((item) => normalizeArea(item) === normalizeArea(area))) {
      return;
    }
    areas.push(area);
    renderAreas(true);
  });

  elements.areasToggle?.addEventListener("click", () => {
    if (!editing || !elements.areasAdd) return;
    elements.areasAdd.hidden = !elements.areasAdd.hidden;
    elements.areasToggle.setAttribute("aria-expanded", String(!elements.areasAdd.hidden));
    if (!elements.areasAdd.hidden) {
      elements.areasAdd.querySelector("[data-area-option]:not(:disabled)")?.focus();
    }
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
      const profile = loaded.profile;
      const professional = loaded.professional;
      userId = loaded.user.id;
      avatarPath = profile.avatar_url || "";
      avatarDataUrl = loaded.avatarUrl;
      areas = Array.isArray(professional.areas_atuacao) ? professional.areas_atuacao.slice() : [];
      session = {
        id: userId,
        role: ROLE,
        name: profile.nome_social || profile.nome_completo,
        fullName: profile.nome_completo,
        socialName: profile.nome_social || "",
        pronoun: profile.pronomes || "",
        gender: profile.genero || "",
        city: profile.cidade || "",
        state: profile.estado || "",
        birthDate: profile.data_nascimento || "",
        phone: profile.telefone || "",
        email: profile.email,
        avatarDataUrl,
        areas: areas.slice(),
        professionalData: {
          crp: professional.crp_numero,
          crpState: professional.crp_uf,
          specialty: professional.especialidade || "",
          serviceFormat: professional.formato_atendimento,
          about: professional.sobre_mim || "",
          approach: professional.abordagem_terapeutica || "",
          audience: professional.publico_atendido || ""
        }
      };
      snapshot = profileFromSession();
      snapshot.areas = areas.slice();
      await render(snapshot);
      setEditing(false);
    } catch (error) {
      console.error(error);
      showFeedback("Não foi possível carregar seu perfil.", true);
    }
  }

  initialize();
}());
