"use strict";

const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const forgotPasswordLink = document.querySelector("#forgotPassword");

function setFieldError(input, message) {
  const errorElement = document.querySelector(`#${input.id}Error`);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (errorElement) errorElement.textContent = message;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearMessage() {
  loginMessage.textContent = "";
  loginMessage.className = "form-message";
}

function showMessage(message, type) {
  loginMessage.textContent = message;
  loginMessage.className = `form-message is-${type}`;
}

function setupPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.querySelector(`#${button.dataset.passwordToggle}`);
      const isVisible = input.type === "text";
      input.type = isVisible ? "password" : "text";
      button.textContent = isVisible ? "Mostrar" : "Ocultar";
      button.setAttribute("aria-pressed", String(!isVisible));
      button.setAttribute("aria-label", isVisible ? "Mostrar senha" : "Ocultar senha");
    });
  });
}

function readProfiles() {
  try {
    const profiles = JSON.parse(localStorage.getItem("psinoteProfilesDemo") || "[]");
    if (Array.isArray(profiles) && profiles.length) return profiles;
    const latest = JSON.parse(localStorage.getItem("psinoteProfileDemo") || "null");
    return latest ? [latest] : [];
  } catch {
    return [];
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessage();

  const emailInput = document.querySelector("#loginEmail");
  const passwordInput = document.querySelector("#loginPassword");
  const rememberMe = document.querySelector("#rememberMe");
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  let isValid = true;

  setFieldError(emailInput, "");
  setFieldError(passwordInput, "");

  if (!email) {
    setFieldError(emailInput, "Informe seu e-mail.");
    isValid = false;
  } else if (!isValidEmail(email)) {
    setFieldError(emailInput, "Digite um e-mail válido.");
    isValid = false;
  }

  if (!password) {
    setFieldError(passwordInput, "Informe sua senha.");
    isValid = false;
  } else if (password.length < 8) {
    setFieldError(passwordInput, "A senha precisa ter pelo menos 8 caracteres.");
    isValid = false;
  }

  if (!isValid) {
    showMessage("Revise os campos indicados antes de continuar.", "error");
    loginForm.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  const profile = readProfiles().find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!profile) {
    setFieldError(emailInput, "Nenhuma conta foi encontrada com este e-mail.");
    showMessage("Cadastre esse e-mail antes de entrar.", "error");
    emailInput.focus();
    return;
  }

  const session = {
    id: profile.id || `perfil-${email.toLowerCase()}`,
    name: profile.fullName,
    fullName: profile.fullName,
    email: profile.email,
    role: profile.role,
    professionalData: profile.professionalData || null,
    avatarDataUrl: profile.avatarDataUrl || "",
    loggedAt: new Date().toISOString()
  };

  [localStorage, sessionStorage].forEach((storage) => {
    storage.removeItem("psinote.auth.session");
    storage.removeItem("psinoteSession");
  });
  const storage = rememberMe.checked ? localStorage : sessionStorage;
  storage.setItem("psinote.auth.session", JSON.stringify(session));
  storage.setItem("psinoteSession", JSON.stringify(session));

  showMessage("Login validado. Abrindo sua agenda...", "success");
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Entrando...";

  window.setTimeout(() => {
    window.location.href = profile.role === "psicologo" ? "agenda.html" : "agenda-paciente.html";
  }, 700);
});

loginForm.addEventListener("input", (event) => {
  if (event.target.matches("input")) {
    setFieldError(event.target, "");
    clearMessage();
  }
});

forgotPasswordLink.addEventListener("click", (event) => {
  event.preventDefault();
  showMessage("A recuperação de senha será conectada ao backend posteriormente.", "success");
});

setupPasswordToggles();
