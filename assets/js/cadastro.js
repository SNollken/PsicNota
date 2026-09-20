"use strict";

/* MVP-04: cadastro desabilitado — não cria conta utilizável na demonstração.
   O formulário é exibido mas desabilitado. Para integração futura com Supabase,
   restaurar a lógica de validação e submit original (ver histórico git). */
(function () {
  const form = document.getElementById("registerForm");
  const message = document.getElementById("registerMessage");
  if (!form || !message) return;

  const fields = form.querySelectorAll("input, select, button");
  fields.forEach(function (field) { field.disabled = true; });

  message.textContent = "Cadastro não disponível nesta demonstração. Use psicologo, paciente ou paciente2 com senha 123.";
  message.className = "form-message is-info";

  form.addEventListener("submit", function (event) { event.preventDefault(); });
}());
