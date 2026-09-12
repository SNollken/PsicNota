"use strict";

/* Tela de recuperação de senha (auth/esqueci-senha.html).
   Validação de e-mail no frontend + feedback de erro/sucesso.
   O envio real ainda não existe: o backend de auth do Supabase está
   bloqueado até a decisão da Sofia sobre seed/ref. */
(function () {
  const form = document.getElementById("recoveryForm");
  const emailInput = document.getElementById("recoveryEmail");
  const message = document.getElementById("recoveryMessage");

  if (!form || !emailInput || !message) return;

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

  /* PONTO DE INTEGRAÇÃO DO SUPABASE AUTH.
     Quando o auth for liberado, trocar o corpo desta função por:

       const { error } = await window.PsicNotaSupabase.auth.resetPasswordForEmail(email, {
         redirectTo: window.location.origin + "/auth/login.html"
       });
       if (error) { showMessage("Não foi possível enviar o link. Tente novamente.", "error"); return; }

     e carregar no HTML, antes deste script:
       <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
       <script src="../assets/js/supabase-client.js"></script>
     Até lá, nenhum cliente Supabase é carregado nesta página. */
  async function handleSubmitRecuperacao(email) {
    void email;
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
