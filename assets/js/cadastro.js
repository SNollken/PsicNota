"use strict";

/* Cadastro real via Supabase Auth. O trigger handle_new_user() cria
   automaticamente a linha em public.perfis lendo raw_user_meta_data. */
(function () {
  const client = window.PsicNotaSupabase;
  const registerForm = document.querySelector("#registerForm");
  const registerMessage = document.querySelector("#registerMessage");

  if (!registerForm) return;
  if (!client || !window.PsiNoteData || !window.PsicNotaAuth) {
    registerMessage.textContent = "Não foi possível conectar ao serviço. Recarregue a página para tentar novamente.";
    registerMessage.className = "form-message is-error";
    registerForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }
  let submitting = false;
  let isGoogleOAuthUser = false;
  let googleUser = null;

  const psychologistFields = document.querySelector("#psychologistFields");
  const inviteFields = document.querySelector("#inviteFields");
  const inviteInput = document.querySelector("#inviteCode");
  const roleInputs = document.querySelectorAll('input[name="role"]');
  const phoneInput = document.querySelector("#phone");
  const birthDateInput = document.querySelector("#birthDate");

  function setFieldError(input, message) {
    const errorElement = document.querySelector(`#${input.id}Error`);
    input.setAttribute("aria-invalid", message ? "true" : "false");

    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function clearMessage() {
    registerMessage.textContent = "";
    registerMessage.className = "form-message";
  }

  function showMessage(message, type) {
    registerMessage.textContent = message;
    registerMessage.className = `form-message is-${type}`;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function parseBirthDate(value) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    const isValid =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

    return isValid ? date : null;
  }

  function formatBirthDate(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);

    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  function updateRoleFields() {
    const selectedRole = document.querySelector('input[name="role"]:checked').value;
    const isPsychologist = selectedRole === "psicologo";

    psychologistFields.hidden = !isPsychologist;
    inviteFields.hidden = isPsychologist;
    inviteInput.required = !isPsychologist;
    if (isPsychologist) {
      inviteInput.value = "";
      setFieldError(inviteInput, "");
    }

    ["crp", "crpState", "specialty", "serviceFormat"].forEach((id) => {
      const field = document.querySelector(`#${id}`);
      field.required = isPsychologist;

      if (!isPsychologist) {
        field.value = "";
        setFieldError(field, "");
      }
    });
  }

  function setupPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      const baseLabel = button.getAttribute("aria-label") || "Mostrar senha";

      button.addEventListener("click", () => {
        const input = document.querySelector(`#${button.dataset.passwordToggle}`);
        const isVisible = input.type === "text";

        input.type = isVisible ? "password" : "text";
        button.setAttribute("aria-pressed", String(!isVisible));
        button.setAttribute(
          "aria-label",
          baseLabel.replace(/^Mostrar/, isVisible ? "Mostrar" : "Ocultar")
        );
      });
    });
  }

  function traduzirErro(error) {
    if (!error) return "Não foi possível criar sua conta. Tente novamente.";

    const mensagem = (error.message || "").toLowerCase();

    if (mensagem.includes("código do psicólogo inválido") || mensagem.includes("codigo do psicologo")) {
      return "Código do psicólogo inválido.";
    }
    if (mensagem.includes("dados de crp")) {
      return "Dados de CRP obrigatórios.";
    }
    if (mensagem.includes("already registered") || mensagem.includes("already been registered")) {
      return "Este e-mail já está cadastrado. Tente fazer login ou recupere sua senha.";
    }
    if (mensagem.includes("invalid email") || mensagem.includes("email_address_invalid")) {
      return "O e-mail informado não é válido.";
    }
    if (mensagem.includes("password")) {
      return "A senha informada não pôde ser usada. Escolha outra.";
    }
    if (mensagem.includes("network") || mensagem.includes("fetch")) {
      return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
    }
    if (error.status === 429 || mensagem.includes("rate limit")) {
      return "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.";
    }
    return "Não foi possível criar sua conta. Tente novamente.";
  }

  roleInputs.forEach((input) => input.addEventListener("change", updateRoleFields));



  birthDateInput.addEventListener("input", () => {
    birthDateInput.value = formatBirthDate(birthDateInput.value);
  });

  registerForm.addEventListener("input", (event) => {
    if (event.target.matches("input, select")) {
      setFieldError(event.target, "");
      clearMessage();
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    clearMessage();

    const selectedRole = document.querySelector('input[name="role"]:checked').value;
    const fullNameInput = document.querySelector("#fullName");
    const emailInput = document.querySelector("#registerEmail");
    const passwordInput = document.querySelector("#registerPassword");
    const confirmPasswordInput = document.querySelector("#confirmPassword");
    const termsInput = document.querySelector("#terms");

    const fieldsToClear = registerForm.querySelectorAll("input, select");
    fieldsToClear.forEach((field) => setFieldError(field, ""));

    let isValid = true;
    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const birthDate = parseBirthDate(birthDateInput.value);

    if (fullName.length < 3 || !fullName.includes(" ")) {
      setFieldError(fullNameInput, "Digite seu nome e sobrenome.");
      isValid = false;
    }

    if (!birthDateInput.value) {
      setFieldError(birthDateInput, "Informe sua data de nascimento.");
      isValid = false;
    } else if (!birthDate || birthDate.getFullYear() < 1900 || birthDate > new Date()) {
      setFieldError(birthDateInput, "Data de nascimento inválida.");
      isValid = false;
    }

    if (!window.PsicNotaPhone.valid(phoneInput)) {
      setFieldError(phoneInput, "Selecione o país e digite um telefone válido.");
      isValid = false;
    }

    if (!email) {
      setFieldError(emailInput, "Informe seu e-mail.");
      isValid = false;
    } else if (!isValidEmail(email)) {
      setFieldError(emailInput, "Digite um e-mail válido.");
      isValid = false;
    }

    if (!isGoogleOAuthUser) {
      if (!password) {
        setFieldError(passwordInput, "Crie uma senha.");
        isValid = false;
      } else if (password.length < 8) {
        setFieldError(passwordInput, "Use uma senha com pelo menos 8 caracteres.");
        isValid = false;
      }

      if (!confirmPassword) {
        setFieldError(confirmPasswordInput, "Confirme sua senha.");
        isValid = false;
      } else if (password !== confirmPassword) {
        setFieldError(confirmPasswordInput, "As senhas não coincidem.");
        isValid = false;
      }
    }

    if (selectedRole === "paciente" && !inviteInput.value.trim()) {
      setFieldError(inviteInput, "Informe o código do seu psicólogo.");
      isValid = false;
    }

    if (selectedRole === "psicologo") {
      const crpInput = document.querySelector("#crp");
      const crpStateInput = document.querySelector("#crpState");
      const specialtyInput = document.querySelector("#specialty");
      const serviceFormatInput = document.querySelector("#serviceFormat");

      if (!/^\d{4,10}$/.test(crpInput.value.trim())) {
        setFieldError(crpInput, "Informe um número de CRP válido.");
        isValid = false;
      }

      if (!crpStateInput.value) {
        setFieldError(crpStateInput, "Selecione o estado do CRP.");
        isValid = false;
      }

      if (specialtyInput.value.trim().length < 3) {
        setFieldError(specialtyInput, "Informe sua área de atuação.");
        isValid = false;
      }

      if (!serviceFormatInput.value) {
        setFieldError(serviceFormatInput, "Selecione o formato de atendimento.");
        isValid = false;
      }
    }

    if (!termsInput.checked) {
      setFieldError(termsInput, "Você precisa aceitar os termos para continuar.");
      isValid = false;
    }

    if (!isValid) {
      showMessage("Revise os campos indicados antes de criar sua conta.", "error");
      registerForm.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    if (isGoogleOAuthUser) {
      const submitButton = registerForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "Concluindo cadastro...";
      submitting = true;

      const payload = {
        p_papel: selectedRole,
        p_nome_completo: fullName,
        p_data_nascimento: `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, "0")}-${String(birthDate.getDate()).padStart(2, "0")}`,
        p_telefone: window.PsicNotaPhone.value(phoneInput)
      };

      if (selectedRole === "paciente") {
        payload.p_codigo_convite = inviteInput.value.trim().toUpperCase();
      } else if (selectedRole === "psicologo") {
        payload.p_crp_numero = document.querySelector("#crp").value.trim();
        payload.p_crp_uf = document.querySelector("#crpState").value;
        payload.p_especialidade = document.querySelector("#specialty").value.trim();
        payload.p_formato_atendimento = document.querySelector("#serviceFormat").value;
      }

      try {
        await window.PsicNotaAuth.completeOAuthRegistration(payload);
        window.sessionStorage?.removeItem("psicnota_oauth_draft");
        const destination = await window.PsicNotaAuth.openAccount(googleUser);
        showMessage("Conta criada! Abrindo seu painel...", "success");
        window.location.replace(destination + (selectedRole === "psicologo" ? "?boas-vindas=1" : ""));
      } catch (err) {
        submitting = false;
        submitButton.disabled = false;
        submitButton.textContent = "Concluir cadastro";
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("código do psicólogo inválido") || msg.includes("codigo do psicologo")) {
          setFieldError(inviteInput, "Código do psicólogo inválido.");
        }
        showMessage(traduzirErro(err), "error");
      }
      return;
    }

    const metadata = {
      papel: selectedRole,
      nome_completo: fullName,
      data_nascimento: `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, "0")}-${String(birthDate.getDate()).padStart(2, "0")}`,
      telefone: window.PsicNotaPhone.value(phoneInput)
    };

    if (selectedRole === "paciente") {
      metadata.codigo_convite = inviteInput.value.trim().toUpperCase();
    }

    if (selectedRole === "psicologo") {
      metadata.crp_numero = document.querySelector("#crp").value.trim();
      metadata.crp_uf = document.querySelector("#crpState").value;
      metadata.especialidade = document.querySelector("#specialty").value.trim();
      metadata.formato_atendimento = document.querySelector("#serviceFormat").value;
    }

    const submitButton = registerForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Criando conta...";

    submitting = true;
    let accountCreated = false;
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: new URL("login.html", window.location.href).href
        }
      });
      if (error) {
        showMessage(traduzirErro(error), "error");
        return;
      }
      accountCreated = true;
      passwordInput.value = "";
      confirmPasswordInput.value = "";
      if (!data.session) {
        showMessage("Confira seu e-mail para confirmar o cadastro. Depois, entre com seu e-mail e senha. Se já possui uma conta, use Entrar ou recupere sua senha.", "success");
        submitButton.textContent = "Confira seu e-mail";
        return;
      }
      const destination = await window.PsicNotaAuth.openAccount(data.user);
      showMessage("Conta criada! Abrindo seu painel...", "success");
      window.location.replace(destination + (selectedRole === "psicologo" ? "?boas-vindas=1" : ""));
    } catch (error) {
      showMessage(accountCreated
        ? "Sua conta foi criada, mas não foi possível abrir o painel. Use Entrar para tentar novamente."
        : traduzirErro(error), "error");
    } finally {
      if (!accountCreated) {
        submitting = false;
        submitButton.disabled = false;
        submitButton.textContent = "Criar conta";
      } else if (submitButton.textContent === "Criando conta...") {
        submitButton.textContent = "Conta criada";
      }
    }
  });

  const codeFromLink = new URLSearchParams(window.location.search).get("codigo");
  if (codeFromLink) {
    document.querySelector("#rolePatient").checked = true;
    inviteInput.value = codeFromLink.trim().toUpperCase();
  }
  updateRoleFields();
  setupPasswordToggles();

  const googleSignupBtn = document.querySelector("#googleSignupBtn");
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener("click", async () => {
      try {
        googleSignupBtn.disabled = true;
        const selectedRoleInput = document.querySelector('input[name="role"]:checked');
        const draft = {
          role: selectedRoleInput ? selectedRoleInput.value : "paciente",
          fullName: document.querySelector("#fullName")?.value || "",
          birthDate: document.querySelector("#birthDate")?.value || "",
          phone: document.querySelector("#phone")?.value || "",
          inviteCode: document.querySelector("#inviteCode")?.value || "",
          crp: document.querySelector("#crp")?.value || "",
          crpState: document.querySelector("#crpState")?.value || "",
          specialty: document.querySelector("#specialty")?.value || "",
          serviceFormat: document.querySelector("#serviceFormat")?.value || ""
        };
        window.sessionStorage?.setItem("psicnota_oauth_draft", JSON.stringify(draft));
        showMessage("Conectando com o Google...", "");
        // ponytail: redireciona de volta com flag completar=google
        const redirectBase = window.location.href.split("?")[0].split("#")[0];
        await window.PsicNotaAuth.signInWithGoogle({
          redirectTo: redirectBase + "?completar=google"
        });
      } catch (err) {
        googleSignupBtn.disabled = false;
        showMessage(err.message || "Erro ao conectar com Google.", "error");
      }
    });
  }

  function aplicarModoGoogle(user) {
    if (isGoogleOAuthUser || !user) return;
    isGoogleOAuthUser = true;
    googleUser = user;

    const emailInput = document.querySelector("#registerEmail");
    if (emailInput) {
      emailInput.value = user.email || "";
      emailInput.readOnly = true;
    }

    const fullNameInput = document.querySelector("#fullName");
    if (fullNameInput && !fullNameInput.value) {
      const googleName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      if (googleName) fullNameInput.value = googleName;
    }

    const passwordFields = document.querySelector("#passwordFields");
    if (passwordFields) passwordFields.hidden = true;

    try {
      const saved = window.sessionStorage?.getItem("psicnota_oauth_draft");
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.role) {
          const radio = document.querySelector(`input[name="role"][value="${draft.role}"]`);
          if (radio) radio.checked = true;
        }
        if (draft.fullName && fullNameInput) fullNameInput.value = draft.fullName;
        if (draft.birthDate) birthDateInput.value = draft.birthDate;
        if (draft.phone && phoneInput) phoneInput.value = draft.phone;
        if (draft.inviteCode && inviteInput) inviteInput.value = draft.inviteCode;
        if (draft.crp) { const f = document.querySelector("#crp"); if (f) f.value = draft.crp; }
        if (draft.crpState) { const f = document.querySelector("#crpState"); if (f) f.value = draft.crpState; }
        if (draft.specialty) { const f = document.querySelector("#specialty"); if (f) f.value = draft.specialty; }
        if (draft.serviceFormat) { const f = document.querySelector("#serviceFormat"); if (f) f.value = draft.serviceFormat; }
        updateRoleFields();
      }
    } catch (_) {}

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Concluir cadastro";
    if (googleSignupBtn) googleSignupBtn.hidden = true;
    const divider = document.querySelector(".auth-divider");
    if (divider) divider.hidden = true;

    const topTitle = document.querySelector("#register-title");
    if (topTitle) topTitle.textContent = "Complete seu cadastro";
  }

  async function verificarSessaoOAuth(user) {
    if (!user) return;
    try {
      const { exists } = await window.PsicNotaAuth.resolveProfile(user);
      if (exists) {
        const destination = await window.PsicNotaAuth.openAccount(user);
        window.location.replace(destination);
        return;
      }
      aplicarModoGoogle(user);
    } catch (_) {
      aplicarModoGoogle(user);
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const isCompletarGoogle = urlParams.get("completar") === "google" || urlParams.has("code") || (window.location.hash && window.location.hash.includes("access_token"));
  if (isCompletarGoogle && client?.auth?.getSession) {
    client.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData?.session?.user) {
        verificarSessaoOAuth(sessionData.session.user);
      }
    });
  }

  if (client?.auth?.onAuthStateChange) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && (isCompletarGoogle || session.user.app_metadata?.provider === "google")) {
        verificarSessaoOAuth(session.user);
      }
    });
  }
}());
