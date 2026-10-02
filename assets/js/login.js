"use strict";

(function () {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const client = window.PsicNotaSupabase;
  const data = window.PsiNoteData;
  const LEGACY_USERS = new Set(["psicologo", "paciente", "paciente2"]);

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

    setFieldError(usernameInput, identifier ? "" : "Informe seu e-mail ou usuário.");
    setFieldError(passwordInput, password ? "" : "Informe sua senha.");
    if (!identifier || !password) {
      showMessage("Revise os campos indicados antes de continuar.", "error");
      return;
    }
    const email = LEGACY_USERS.has(identifier) ? `${identifier}@psicnota.test` : identifier;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

  const googleBtn = document.getElementById("googleLoginBtn");
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        googleBtn.disabled = true;
        showMessage("Iniciando acesso com Google...", "");
        // ponytail: redireciona de volta para a tela de login para validar perfil antes de entrar
        await window.PsicNotaAuth.signInWithGoogle({
          redirectTo: window.location.href.split("?")[0].split("#")[0]
        });
      } catch (err) {
        googleBtn.disabled = false;
        showMessage(err.message || "Erro ao conectar com Google.", "error");
      }
    });
  }

  let handledOAuth = false;
  async function processUserSession(user) {
    if (handledOAuth || !user) return;
    handledOAuth = true;
    try {
      showMessage("Acessando com o Google...", "");
      const { exists } = await window.PsicNotaAuth.resolveProfile(user);
      if (exists) {
        const remember = document.getElementById("rememberMe")?.checked ?? true;
        const destination = await window.PsicNotaAuth.openAccount(user, remember);
        showMessage("Login realizado com sucesso!", "success");
        window.location.replace(destination);
      } else {
        window.location.replace("cadastro.html?completar=google");
      }
    } catch (err) {
      handledOAuth = false;
      showMessage(err.message || "Não foi possível carregar seu perfil.", "error");
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const hasOAuthCode = urlParams.has("code") || (window.location.hash && window.location.hash.includes("access_token"));
  if (hasOAuthCode) {
    client.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData?.session?.user) {
        processUserSession(sessionData.session.user);
      }
    });
  }

  if (client.auth?.onAuthStateChange) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && (hasOAuthCode || session.user.app_metadata?.provider === "google")) {
        processUserSession(session.user);
      }
    });
  }
}());
