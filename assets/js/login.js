"use strict";

(function () {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const client = window.PsicNotaSupabase;
  const data = window.PsiNoteData;
  const DEMO_USERS = new Set(["psicologo", "paciente"]);

  if (!form || !client || !data) return;

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

    setFieldError(usernameInput, identifier ? "" : "Informe psicologo ou paciente.");
    setFieldError(passwordInput, password ? "" : "Informe sua senha.");
    if (!identifier || !password) {
      showMessage("Revise os campos indicados antes de continuar.", "error");
      return;
    }
    if (!DEMO_USERS.has(identifier)) {
      setFieldError(usernameInput, "Digite psicologo ou paciente.");
      showMessage("Use psicologo ou paciente para entrar.", "error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Entrando...";
    showMessage("");

    let authResult;
    try {
      authResult = await client.auth.signInWithPassword({
        email: `${identifier}@psicnota.test`,
        password
      });
    } catch (error) {
      showMessage("Não foi possível conectar. Verifique sua internet e tente novamente.", "error");
      submit.disabled = false;
      submit.textContent = "Entrar";
      return;
    }
    const { data: authData, error } = authResult;

    if (error) {
      setFieldError(passwordInput, "Usuário ou senha incorretos.");
      showMessage("Não foi possível entrar. Confira o usuário e a senha.", "error");
      submit.disabled = false;
      submit.textContent = "Entrar";
      return;
    }

    let profileResult;
    try {
      profileResult = await client
        .from("perfis")
        .select("id, papel, nome_completo, nome_social, email")
        .eq("id", authData.user.id)
        .single();
    } catch (error) {
      showMessage("Não foi possível carregar o perfil. Tente novamente.", "error");
      submit.disabled = false;
      submit.textContent = "Entrar";
      return;
    }
    const { data: profile, error: profileError } = profileResult;

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
    const remember = document.getElementById("rememberMe").checked;
    data.setSession(legacySession, remember);

    showMessage("Login realizado com sucesso!", "success");
    window.location.href = profile.papel === "psicologo" ? "../psicologo/home.html" : "../paciente/home.html";
  });

  form.addEventListener("input", (event) => {
    if (event.target.matches("input")) setFieldError(event.target, "");
    showMessage("");
  });
}());
