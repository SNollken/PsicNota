"use strict";

(function () {
  const client = window.PsicNotaSupabase;
  const form = document.getElementById("inviteCodeForm");
  if (!form) return;

  const input = document.getElementById("psychologistInviteCode");
  const saveButton = document.getElementById("saveInviteCode");
  const copyButton = document.getElementById("copyInviteLink");
  const retryButton = document.getElementById("retryInviteCode");
  const status = document.getElementById("inviteCodeStatus");
  let savedCode = "";
  let busy = false;

  function normalize(value) {
    return value.trim().toUpperCase();
  }

  function message(text, isError = false) {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  }

  function updateControls() {
    input.disabled = busy || !savedCode;
    saveButton.disabled = busy || !savedCode || normalize(input.value) === savedCode;
    copyButton.disabled = busy || !savedCode;
    retryButton.disabled = busy;
  }

  async function loadCode() {
    busy = true;
    retryButton.hidden = true;
    updateControls();
    message("Carregando seu código...");
    try {
      const { data: code, error } = await client.rpc("obter_codigo_psicologo");
      if (error || !code) throw error || new Error("Código indisponível");
      savedCode = code;
      input.value = code;
      message("Código pronto para compartilhar.");
    } catch (error) {
      message("Não foi possível carregar seu código. Tente novamente.", true);
      retryButton.hidden = false;
    } finally {
      busy = false;
      updateControls();
    }
  }

  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    updateControls();
    message(normalize(input.value) === savedCode
      ? "Código pronto para compartilhar."
      : "Salve a alteração antes de compartilhar o novo código.");
  });
  input.addEventListener("blur", () => { input.value = normalize(input.value); });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !savedCode) return;
    const code = normalize(input.value);
    input.value = code;
    if (!/^[A-Z0-9][A-Z0-9-]{2,23}$/.test(code)) {
      input.setAttribute("aria-invalid", "true");
      message("Use de 3 a 24 letras, números ou hífens, começando com uma letra ou número.", true);
      input.focus();
      return;
    }
    if (code === savedCode) return;
    busy = true;
    updateControls();
    message("Salvando código...");
    try {
      const { data: updatedCode, error } = await client.rpc("personalizar_codigo_psicologo", { novo_codigo: code });
      if (error || !updatedCode) throw error || new Error("Código indisponível");
      savedCode = updatedCode;
      input.value = updatedCode;
      input.removeAttribute("aria-invalid");
      message("Código atualizado. Você já pode compartilhar o novo link.");
    } catch (error) {
      input.setAttribute("aria-invalid", "true");
      message(error.code === "23505"
        ? "Este código já está em uso. Escolha outro."
        : error.code === "22023"
          ? (/^PN-[0-9]+$/.test(code)
            ? "O formato PN seguido de números é reservado. Escolha outro código."
            : "Use de 3 a 24 letras, números ou hífens, começando com uma letra ou número.")
          : "Não foi possível salvar o código. Seu código anterior continua válido.", true);
    } finally {
      busy = false;
      updateControls();
    }
  });

  copyButton.addEventListener("click", async () => {
    if (busy || !savedCode) return;
    const inviteUrl = new URL("../auth/cadastro.html", window.location.href);
    inviteUrl.searchParams.set("codigo", savedCode);
    try {
      await navigator.clipboard.writeText(inviteUrl.toString());
      message(normalize(input.value) === savedCode
        ? "Link de convite copiado."
        : "Link com o código salvo copiado. Salve a alteração para usar o novo código.");
    } catch (error) {
      message("Não foi possível copiar o link. Seu código salvo é " + savedCode + ".", true);
    }
  });

  retryButton.addEventListener("click", loadCode);
  void loadCode();
}());
