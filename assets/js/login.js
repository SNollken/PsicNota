"use strict";

(function () {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const client = window.PsicNotaSupabase;
  const data = window.PsiNoteData;
  const USER_EMAIL_DOMAIN = "@psicnota.test";

  if (!form || !client || !data || !window.PsicNotaAuth) return;

  function setFieldError(input, text) {
    const error = document.getElementById(input.id + "Error");
    input.setAttribute("aria-invalid", text ? "true" : "false");
    if (error) error.textContent = text;
  }

  function showMessage(text, type = "") {
    message.textContent = text;
    message.className = "form-message" + (type ? " is-" + type : "");
  }

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.textContent = visible ? "Mostrar" : "Ocultar";
      button.setAttribute("aria-pressed", String(!visible));
      button.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.querySelector('button[type="submit"]').disabled) return;
    const usernameInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const identifier = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const submit = form.querySelector('button[type="submit"]');

    setFieldError(usernameInput, identifier ? "" : "Informe seu usuário ou e-mail.");
    setFieldError(passwordInput, password ? "" : "Informe sua senha.");
    if (!identifier || !password) {
      showMessage("Revise os campos indicados antes de continuar.", "error");
      return;
    }
    const email = identifier.includes("@")
      ? identifier
      : /^[a-z0-9._-]+$/.test(identifier)
        ? identifier + USER_EMAIL_DOMAIN
        : null;
    if (!email) {
      setFieldError(usernameInput, "Digite um e-mail válido ou nome de usuário.");
      showMessage("Confira o e-mail ou usuário informado.", "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Entrando...";
    showMessage("");

    try {
      const { data: authData, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.code === "email_not_confirmed") {
          showMessage("Confirme seu cadastro pelo link enviado ao seu e-mail antes de entrar.", "error");
        } else {
          setFieldError(passwordInput, "Usuário ou senha incorretos.");
          showMessage("Não foi possível entrar. Confira o usuário e a senha.", "error");
        }
        return;
      }
      const remember = document.getElementById("rememberMe").checked;
      const destination = await window.PsicNotaAuth.openAccount(authData.user, remember);
      showMessage("Login realizado com sucesso!", "success");
      window.location.href = destination;
    } catch (error) {
      const message = error.message || "";
      showMessage(message.startsWith("Seu cadastro profissional") || message.startsWith("Não foi possível carregar seu perfil")
        ? message : "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.", "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  });

  form.addEventListener("input", (event) => {
    if (event.target.matches("input")) setFieldError(event.target, "");
    showMessage("");
  });
}());
