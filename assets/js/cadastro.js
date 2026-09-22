"use strict";

/* Cadastro real via Supabase Auth. O trigger handle_new_user() cria
   automaticamente a linha em public.perfis lendo raw_user_meta_data. */
(function () {
  const client = window.PsicNotaSupabase;
  const registerForm = document.querySelector("#registerForm");
  const registerMessage = document.querySelector("#registerMessage");

  if (!registerForm || !client) return;

  const psychologistFields = document.querySelector("#psychologistFields");
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

  function formatPhone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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
    return "Não foi possível criar sua conta. Tente novamente.";
  }

  roleInputs.forEach((input) => input.addEventListener("change", updateRoleFields));

  phoneInput.addEventListener("input", () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

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
    const email = emailInput.value.trim();
    const phoneDigits = phoneInput.value.replace(/\D/g, "");
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (fullName.length < 3 || !fullName.includes(" ")) {
      setFieldError(fullNameInput, "Digite seu nome e sobrenome.");
      isValid = false;
    }

    if (!birthDateInput.value) {
      setFieldError(birthDateInput, "Informe sua data de nascimento.");
      isValid = false;
    } else if (!parseBirthDate(birthDateInput.value)) {
      setFieldError(birthDateInput, "Data de nascimento inválida.");
      isValid = false;
    }

    if (phoneDigits.length < 10) {
      setFieldError(phoneInput, "Digite um telefone válido com DDD.");
      isValid = false;
    }

    if (!email) {
      setFieldError(emailInput, "Informe seu e-mail.");
      isValid = false;
    } else if (!isValidEmail(email)) {
      setFieldError(emailInput, "Digite um e-mail válido.");
      isValid = false;
    }

    if (!password) {
      setFieldError(passwordInput, "Crie uma senha.");
      isValid = false;
    }

    if (!confirmPassword) {
      setFieldError(confirmPasswordInput, "Confirme sua senha.");
      isValid = false;
    } else if (password !== confirmPassword) {
      setFieldError(confirmPasswordInput, "As senhas não coincidem.");
      isValid = false;
    }

    if (selectedRole === "psicologo") {
      const crpInput = document.querySelector("#crp");
      const crpStateInput = document.querySelector("#crpState");
      const specialtyInput = document.querySelector("#specialty");
      const serviceFormatInput = document.querySelector("#serviceFormat");

      if (crpInput.value.trim().length < 4) {
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

    const metadata = {
      papel: selectedRole,
      nome_completo: fullName,
      data_nascimento: birthDateInput.value,
      telefone: phoneInput.value
    };

    if (selectedRole === "psicologo") {
      metadata.crp_numero = document.querySelector("#crp").value.trim();
      metadata.crp_uf = document.querySelector("#crpState").value;
      metadata.especialidade = document.querySelector("#specialty").value.trim();
      metadata.formato_atendimento = document.querySelector("#serviceFormat").value;
    }

    const submitButton = registerForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Criando conta...";

    const { error } = await client.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });

    if (error) {
      showMessage(traduzirErro(error), "error");
      submitButton.disabled = false;
      submitButton.textContent = "Criar conta";
      return;
    }

    showMessage("Cadastro realizado! Redirecionando para o login...", "success");

    window.setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  });

  updateRoleFields();
  setupPasswordToggles();
}());
