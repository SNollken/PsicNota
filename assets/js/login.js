"use strict";

const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");

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

/* Contas de demonstração para testar o protótipo sem cadastro.
   Quando houver backend, esse bloco sai e a autenticação vira real. */
const TEST_ACCOUNTS = [
  {
    email: "psicologo",
    password: "123",
    profile: {
      id: "perfil-teste-psicologo",
      role: "psicologo",
      fullName: "Psicólogo Teste",
      birthDate: "1990-05-14",
      phone: "(61) 99999-0001",
      email: "psicologo",
      professionalData: {
        crp: "01/00001",
        crpState: "DF",
        specialty: "Psicologia clínica",
        serviceFormat: "ambos"
      },
      createdAt: "2026-08-13T00:00:00.000Z"
    }
  },
  {
    email: "paciente",
    password: "123",
    profile: {
      id: "perfil-teste-paciente",
      role: "paciente",
      fullName: "Paciente Teste",
      birthDate: "2000-01-20",
      phone: "(61) 99999-0002",
      email: "paciente",
      professionalData: null,
      createdAt: "2026-08-13T00:00:00.000Z"
    }
  }
];

/* Garante que as contas teste existam no storage sem sobrescrever
   edições que o usuário já fez nelas. */
function ensureTestAccounts() {
  const profiles = readProfiles();
  let changed = false;
  TEST_ACCOUNTS.forEach((account) => {
    if (!profiles.some((item) => item.email?.toLowerCase() === account.email)) {
      profiles.push(account.profile);
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem("psinoteProfilesDemo", JSON.stringify(profiles));
  }
}

function enterWithProfile(profile, remember) {
  const session = {
    id: profile.id || `perfil-${(profile.email || "demo").toLowerCase()}`,
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
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("psinote.auth.session", JSON.stringify(session));
  storage.setItem("psinoteSession", JSON.stringify(session));

  showMessage("Login validado. Abrindo sua área...", "success");
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Entrando...";

  window.setTimeout(() => {
    window.location.href = profile.role === "psicologo" ? "../psicologo/home.html" : "../paciente/home.html";
  }, 700);
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

  const testAccount = TEST_ACCOUNTS.find((account) => account.email === email.toLowerCase());
  if (testAccount) {
    if (password !== testAccount.password) {
      setFieldError(passwordInput, "Senha incorreta para a conta teste.");
      showMessage("Confira a senha: as contas teste usam a senha 123.", "error");
      passwordInput.focus();
      return;
    }
    enterWithProfile(testAccount.profile, rememberMe.checked);
    return;
  }

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

  enterWithProfile(profile, rememberMe.checked);
});

loginForm.addEventListener("input", (event) => {
  if (event.target.matches("input")) {
    setFieldError(event.target, "");
    clearMessage();
  }
});

setupPasswordToggles();
ensureTestAccounts();
