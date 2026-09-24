"use strict";

(function () {
  const DAYS = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
  ];
  const client = window.PsicNotaSupabase;
  const form = document.getElementById("scheduleForm");
  const rows = document.getElementById("scheduleRows");
  const selectAll = document.getElementById("selectAll");
  const message = document.getElementById("scheduleMessage");
  const deleteSelected = document.getElementById("deleteSelected");
  const weekList = document.querySelector(".week-summary ul");
  const submitButton = form.querySelector('button[type="submit"]');
  let psychologistId = null;
  let editingId = null;
  let availability = [];
  let modalityColumnAvailable = true;

  function modalityMigrationMessage() {
    return "Horários carregados. Para escolher entre online e presencial, aplique a migração 20260923120000_adiciona_modalidade_disponibilidades.sql no Supabase.";
  }

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
    message.hidden = !text;
  }

  function formatTime(value) {
    return String(value || "").slice(0, 5);
  }

  function createActionButton(className, label, iconPath) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action-button ${className}`;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPath}"></path></svg>`;
    return button;
  }

  function renderSummary() {
    const slotsByDay = Array(7).fill(0);
    availability.forEach((slot) => {
      slotsByDay[slot.dia_semana] += 1;
    });

    weekList.replaceChildren();
    [1, 2, 3, 4, 5, 6, 0].forEach((day) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      const total = document.createElement("strong");
      label.textContent = DAYS[day];

      if (slotsByDay[day]) {
        total.textContent = `${slotsByDay[day]} ${slotsByDay[day] === 1 ? "horário" : "horários"}`;
      } else {
        total.className = "unavailable";
        total.textContent = "Não disponível";
      }

      item.append(label, total);
      weekList.append(item);
    });
  }

  function renderRows() {
    rows.replaceChildren();
    availability.forEach((slot) => {
      const dayName = DAYS[slot.dia_semana] || `Dia ${slot.dia_semana}`;
      const time = formatTime(slot.horario);
      const row = document.createElement("tr");
      row.dataset.id = slot.id;

      const selectCell = document.createElement("td");
      const label = document.createElement("label");
      label.className = "check-control";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "row-check";
      checkbox.setAttribute("aria-label", `Selecionar ${dayName}, ${time}`);
      const checkboxMark = document.createElement("span");
      checkboxMark.setAttribute("aria-hidden", "true");
      label.append(checkbox, checkboxMark);
      selectCell.append(label);

      const dayCell = document.createElement("td");
      dayCell.dataset.label = "Dia da semana";
      dayCell.textContent = dayName;

      const timeCell = document.createElement("td");
      timeCell.dataset.label = "Horário";
      timeCell.textContent = time;

      const modalityCell = document.createElement("td");
      modalityCell.dataset.label = "Modalidade";
      modalityCell.textContent = slot.modalidade === "presencial" ? "Presencial" : "Online";

      const actionCell = document.createElement("td");
      actionCell.className = "row-actions";
      actionCell.dataset.label = "Ações";
      actionCell.append(
        createActionButton(
          "edit-schedule",
          `Editar horário de ${dayName.toLowerCase()}, ${time}`,
          "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"
        ),
        createActionButton(
          "delete-schedule",
          `Excluir horário de ${dayName.toLowerCase()}, ${time}`,
          "M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"
        )
      );

      row.append(selectCell, dayCell, timeCell, modalityCell, actionCell);
      rows.append(row);
    });
    selectAll.checked = false;
    renderSummary();
  }

  async function loadAvailability() {
    let result;
    let error;
    try {
      ({ data: result, error } = await client
        .from("disponibilidades")
        .select("id, dia_semana, horario, modalidade")
        .eq("psicologo_id", psychologistId)
        .order("dia_semana")
        .order("horario"));

      if (error?.code === "42703" && error.message?.includes("modalidade")) {
        modalityColumnAvailable = false;
        document.getElementById("modality").disabled = true;
        ({ data: result, error } = await client
          .from("disponibilidades")
          .select("id, dia_semana, horario")
          .eq("psicologo_id", psychologistId)
          .order("dia_semana")
          .order("horario"));
      }
    } catch {
      showMessage("Não foi possível carregar seus horários. Tente novamente.", true);
      return false;
    }

    if (error) {
      showMessage("Não foi possível carregar seus horários. Tente novamente.", true);
      return false;
    }

    availability = (result || []).map((slot) => ({ ...slot, modalidade: slot.modalidade || "online" }));
    renderRows();
    if (!modalityColumnAvailable) showMessage(modalityMigrationMessage(), true);
    return true;
  }

  function resetForm() {
    editingId = null;
    form.reset();
    submitButton.textContent = "Adicionar";
    const cancelButton = document.getElementById("cancelScheduleEdit");
    if (cancelButton) cancelButton.hidden = true;
  }

  async function saveAvailability(event) {
    event.preventDefault();
    const day = Number(form.elements.weekday.value);
    const time = form.elements.startTime.value;
    const modality = form.elements.modality.value;
    if (!time || !Number.isInteger(day) || day < 0 || day > 6) return;

    const values = {
      psicologo_id: psychologistId,
      dia_semana: day,
      horario: `${time}:00`
    };
    if (modalityColumnAvailable) values.modalidade = modality;
    submitButton.disabled = true;
    showMessage("");

    let result;
    try {
      result = editingId
        ? await client.from("disponibilidades").update(values).eq("id", editingId).eq("psicologo_id", psychologistId)
        : await client.from("disponibilidades").insert(values);
    } catch {
      submitButton.disabled = false;
      showMessage("Não foi possível salvar o horário. Tente novamente.", true);
      return;
    }

    submitButton.disabled = false;
    if (result.error) {
      showMessage(
        result.error.code === "23505"
          ? "Esse horário já está cadastrado para esse dia."
          : "Não foi possível salvar o horário. Tente novamente.",
        true
      );
      return;
    }

    resetForm();
    await loadAvailability();
    if (modalityColumnAvailable) showMessage("Horário salvo.");
  }

  async function deleteAvailability(ids) {
    if (!ids.length) return;
    let error;
    try {
      ({ error } = await client
        .from("disponibilidades")
        .delete()
        .eq("psicologo_id", psychologistId)
        .in("id", ids));
    } catch {
      showMessage("Não foi possível excluir os horários selecionados.", true);
      return;
    }

    if (error) {
      showMessage("Não foi possível excluir os horários selecionados.", true);
      return;
    }

    await loadAvailability();
    showMessage("Horário removido.");
  }

  rows.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;

    if (event.target.closest(".delete-schedule")) {
      void deleteAvailability([row.dataset.id]);
    }

    if (event.target.closest(".edit-schedule")) {
      const slot = availability.find((item) => item.id === row.dataset.id);
      if (!slot) return;
      editingId = slot.id;
      form.elements.weekday.value = String(slot.dia_semana);
      form.elements.startTime.value = formatTime(slot.horario);
      form.elements.modality.value = slot.modalidade || "online";
      submitButton.textContent = "Salvar alteração";
      document.getElementById("cancelScheduleEdit").hidden = false;
      form.elements.weekday.focus();
    }
  });

  selectAll.addEventListener("change", () => {
    rows.querySelectorAll(".row-check").forEach((checkbox) => {
      checkbox.checked = selectAll.checked;
    });
  });

  deleteSelected.addEventListener("click", () => {
    const ids = [...rows.querySelectorAll(".row-check:checked")]
      .map((checkbox) => checkbox.closest("tr").dataset.id);
    void deleteAvailability(ids);
  });

  form.addEventListener("submit", saveAvailability);
  document.getElementById("cancelScheduleEdit").addEventListener("click", resetForm);

  document.addEventListener("DOMContentLoaded", async () => {
    if (!client) {
      showMessage("Não foi possível conectar ao serviço de horários.", true);
      return;
    }

    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) {
      showMessage("Entre na sua conta de psicólogo para gerenciar horários.", true);
      return;
    }

    psychologistId = data.user.id;
    await loadAvailability();
  }, { once: true });
}());
