"use strict";

(function () {
  const form = document.getElementById("perfilForm");
  const nome = document.getElementById("nome");
  const email = document.getElementById("email");
  const crp = document.getElementById("crp");
  const especialidade = document.getElementById("especialidade");
  const nascimento = document.getElementById("nascimento");
  const telefone = document.getElementById("telefone");
  const avatar = document.getElementById("perfilAvatar");
  const avatarInput = document.getElementById("avatarInput");
  const cancelBtn = document.getElementById("cancelBtn");

  const confirmModal = document.getElementById("confirmModal");
  const successModal = document.getElementById("successModal");
  const confirmCancelBtn = document.getElementById("confirmCancelBtn");
  const confirmSaveBtn = document.getElementById("confirmSaveBtn");
  const successOkBtn = document.getElementById("successOkBtn");

  if (!form || !nome || !email) return;

  let role = "psicologo";
  let avatarDataUrl = "";

  function openModal(modal) {
    if (modal) modal.hidden = false;
  }

  function closeModal(modal) {
    if (modal) modal.hidden = true;
  }

  function persist() {
    const data = window.PsiNoteData;
    const session = data ? data.getSession() : null;
    if (!session) return false;

    session.name = nome.value.trim();
    session.email = email.value.trim();
    session.avatarDataUrl = avatarDataUrl || session.avatarDataUrl || "";
    session.role = role;
    if (role === "psicologo") {
      session.crp = crp.value.trim();
      session.specialty = especialidade.value.trim();
    } else {
      session.birthDate = nascimento.value;
      session.phone = telefone.value.trim();
    }

    if (data.setSession) data.setSession(session, true);
    saveToProfiles();
    return true;
  }

  function saveToProfiles() {
    const data = window.PsiNoteData;
    if (!data || !data.setSession) return;
    const session = data.getSession();
    if (!session) return;
    const profiles = data.getProfiles();
    const idx = profiles.findIndex((p) => p.id === session.id);
    const profile = {
      id: session.id,
      fullName: session.name,
      email: session.email,
      role: session.role,
      crp: session.crp,
      specialty: session.specialty,
      birthDate: session.birthDate,
      phone: session.phone,
      avatarDataUrl: session.avatarDataUrl
    };
    if (idx >= 0) profiles[idx] = profile;
    else profiles.push(profile);
    data.saveProfiles(profiles);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!nome.value.trim() || !email.value.trim()) return;
    openModal(confirmModal);
  });

  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener("click", () => closeModal(confirmModal));
  }

  if (confirmSaveBtn) {
    confirmSaveBtn.addEventListener("click", () => {
      closeModal(confirmModal);
      if (persist()) openModal(successModal);
    });
  }

  if (successOkBtn) {
    successOkBtn.addEventListener("click", () => closeModal(successModal));
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      fillForm();
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      const data = window.PsiNoteData;
      if (!data) return;
      data.clearSession();
      window.location.href = "login.html";
    });
  }

  function fillForm() {
    const data = window.PsiNoteData;
    if (!data) return;
    const session = data.getSession();
    if (!session) return;
    if (session.avatarDataUrl) setAvatar(session.avatarDataUrl);
    nome.value = session.name || "";
    email.value = session.email || "";
    role = session.role === "paciente" ? "paciente" : "psicologo";
    if (role === "psicologo") {
      crp.value = session.crp || "";
      especialidade.value = session.specialty || "";
    } else {
      nascimento.value = session.birthDate || "";
      telefone.value = session.phone || "";
    }
  }

  function setAvatar(src) {
    avatar.src = src;
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    if (sidebarAvatar) sidebarAvatar.src = src;
  }

  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files && avatarInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      avatarDataUrl = reader.result;
      setAvatar(avatarDataUrl);
    };
    reader.readAsDataURL(file);
  });

  function applyRoleFields() {
    const data = window.PsiNoteData;
    const session = data ? data.getSession() : null;
    role = session && session.role === "paciente" ? "paciente" : "psicologo";
    document.querySelectorAll(".form-group[data-role]").forEach((group) => {
      const groupRole = group.getAttribute("data-role");
      group.hidden = groupRole !== role;
    });
  }

  applyRoleFields();
  fillForm();
}());
