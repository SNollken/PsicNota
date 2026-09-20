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

  const SUBMIT_LABEL = "Enviar link de redefinição";

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

  /* MVP-04: formulário desabilitado — recuperação de senha indisponível na demo. */
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = SUBMIT_LABEL;
  emailInput.disabled = true;
  showMessage("Recuperação de senha não disponível nesta demonstração.", "info");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
}());
