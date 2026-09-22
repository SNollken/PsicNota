"use strict";

/* Tela de recuperação de senha (auth/esqueci-senha.html).
   Validação de e-mail no frontend + resetPasswordForEmail no Supabase Auth. */
(function () {
  const client = window.PsicNotaSupabase;
  const form = document.getElementById("recoveryForm");
  const emailInput = document.getElementById("recoveryEmail");
  const message = document.getElementById("recoveryMessage");

  if (!form || !emailInput || !message || !client) return;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const SUBMIT_LABEL = "Enviar link de redefinição";

  function setFieldError(text) {
    const error = document.getElementById("recoveryEmailError");
    emailInput.setAttribute("aria-invalid", text ? "true" : "false");
    if (error) error.textContent = text;
  }

  function showMessage(text, type = "") {
    message.textContent = text;
    message.className = "form-message" + (type ? " is-" + type : "");
  }

  async function handleSubmitRecuperacao(email) {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/login.html"
    });

    if (error) {
      const mensagem = (error.message || "").toLowerCase();
      if (mensagem.includes("network") || mensagem.includes("fetch")) {
        showMessage("Sem conexão com o servidor. Verifique sua internet e tente novamente.", "error");
      } else {
        showMessage("Não foi possível enviar o link. Verifique o e-mail e tente novamente.", "error");
      }
      return;
    }

    showMessage(
      "Instruções enviadas! Verifique sua caixa de entrada para redefinir sua senha.",
      "success"
    );
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const submit = form.querySelector('button[type="submit"]');

    if (!email) {
      setFieldError("Informe seu e-mail.");
      showMessage("Revise o campo indicado antes de continuar.", "error");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setFieldError("Digite um e-mail válido.");
      showMessage("O e-mail informado não parece válido.", "error");
      return;
    }

    setFieldError("");
    showMessage("");
    submit.disabled = true;
    submit.textContent = "Enviando...";

    await handleSubmitRecuperacao(email);

    submit.disabled = false;
    submit.textContent = SUBMIT_LABEL;
  });

  form.addEventListener("input", (event) => {
    if (event.target.matches("input")) setFieldError("");
    showMessage("");
  });
}());
