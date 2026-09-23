"use strict";

(function () {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const client = window.PsicNotaSupabase;
  const USER_EMAIL_DOMAIN = "@psicnota.test";

  if (!form || !client) return;

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
      setFieldError(usernameInput, "Digite um e-mail válido ou seu usuário demo.");
      showMessage("Confira o e-mail ou usuário informado.", "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Entrando...";
    showMessage("");

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setFieldError(passwordInput, "Usuário ou senha incorretos.");
      showMessage("Não foi possível entrar. Confira o usuário e a senha.", "error");
      submit.disabled = false;
      submit.textContent = "Entrar";
      return;
    }

    const { data: profile, error: profileError } = await client
      .from("perfis")
      .select("id, papel, nome_completo, nome_social, email")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      await client.auth.signOut();
      showMessage("Sua conta não possui um perfil válido.", "error");
      submit.disabled = false;
      submit.textContent = "Entrar";
      return;
    }

    const legacySession = {
      id: profile.id,
      role: profile.papel,
      name: profile.nome_social || profile.nome_completo,
      fullName: profile.nome_completo,
      email: profile.email,
      loggedAt: new Date().toISOString()
    };
    const storage = document.getElementById("rememberMe").checked ? localStorage : sessionStorage;
    [localStorage, sessionStorage].forEach((item) => {
      item.removeItem("psinote.auth.session");
      item.removeItem("psinoteSession");
    });
    storage.setItem("psinote.auth.session", JSON.stringify(legacySession));
    storage.setItem("psinoteSession", JSON.stringify(legacySession));

    showMessage("Login realizado com sucesso!", "success");
    window.location.href = profile.papel === "psicologo" ? "../psicologo/home.html" : "../paciente/home.html";
  });

  form.addEventListener("input", (event) => {
    if (event.target.matches("input")) setFieldError(event.target, "");
    showMessage("");
  });
}());
