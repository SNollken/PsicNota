"use strict";

/* =========================================================
   AGENDA DO PSICÓLOGO
   Redesign fiel ao Figma: calendário mensal central,
   cards de resumo clicáveis e popups de listas.
   ========================================================= */

const data = window.PsiNoteData;

if (!data) {
  throw new Error(
    "PsiNoteData não foi carregado. Verifique se shared-data.js é carregado antes de agenda-psicologo.js."
  );
}

/* =========================================================
   ELEMENTOS DA INTERFACE
   ========================================================= */

const ui = {
  grid: document.querySelector("#psicCalendarGrid"),
  monthTitle: document.querySelector("#psicMonthTitle"),
  previousMonth: document.querySelector("#psicPreviousMonth"),
  nextMonth: document.querySelector("#psicNextMonth"),

  weekCard: document.querySelector("#weekAppointmentsCard"),
  nextCard: document.querySelector("#nextAppointmentCard"),
  pendingCard: document.querySelector("#pendingRequestsCard"),
  weekCount: document.querySelector("#weekAppointmentsCount"),
  nextAppointment: document.querySelector("#nextAppointmentSummary"),
  pendingCount: document.querySelector("#pendingRequestsCount"),

  schedulePopup: document.querySelector("#psicSchedulePopup"),
  schedulePopupClose: document.querySelector("#psicSchedulePopupClose"),
  schedulePopupDate: document.querySelector("#psicSchedulePopupDate"),
  patientSelect: document.querySelector("#psicPatientSelect"),
  onlineTimes: document.querySelector("#psicOnlineTimes"),
  presentialTimes: document.querySelector("#psicPresentialTimes"),
  scheduleTerms: document.querySelector("#psicScheduleTerms"),
  scheduleSubmit: document.querySelector("#psicScheduleSubmit"),

  requestsPopup: document.querySelector("#psicRequestsPopup"),
  requestsPopupClose: document.querySelector("#psicRequestsPopupClose"),
  requestsList: document.querySelector("#psicRequestsPopupList"),

  appointmentsPopup: document.querySelector("#psicAppointmentsPopup"),
  appointmentsPopupClose: document.querySelector("#psicAppointmentsPopupClose"),
  appointmentsList: document.querySelector("#psicAppointmentsPopupList"),

  completedPopup: document.querySelector("#psicCompletedPopup"),
  completedPopupClose: document.querySelector("#psicCompletedPopupClose"),
  completedList: document.querySelector("#psicCompletedPopupList"),

  toast: document.querySelector("#psicToast"),
  toastMessage: document.querySelector("#psicToastMessage"),
  sidebar: document.querySelector(".sidebar"),
  mobileMenu: document.querySelector(".mobile-menu")
};

/* =========================================================
   FORMATTERS
   ========================================================= */

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const popupDateFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/* =========================================================
   ESTADO
   ========================================================= */

let appointments = data.getAppointments();
let requests = data.getRequests();
let patientOptions = [];

const now0 = new Date();
let visibleMonth = new Date(now0.getFullYear(), now0.getMonth(), 1);

let popupSelectedDate = null;
let popupSelectedTime = "";
let popupSelectedMode = "";
let toastTimer = null;

/* =========================================================
   HELPERS
   ========================================================= */

function capitalizeFirst(value) {
  return value ? value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1) : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateTimeFromItem(item) {
  return new Date(`${item.date}T${item.time}:00`);
}

function getConfirmed() {
  return appointments.filter((item) => item.status !== "cancelled");
}

function getPendingRequests() {
  return requests
    .filter((item) => item.status === "pending")
    .sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));
}

function getConfirmedForDate(dateKey) {
  return getConfirmed()
    .filter((item) => item.date === dateKey)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function getPendingForDate(dateKey) {
  return getPendingRequests().filter((item) => item.date === dateKey);
}

function getSelectableSlots(dateKey) {
  const slots = data.getOpenSlots(dateKey) || [];
  const selected = data.fromDateKey(dateKey);
  const day = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (day < today) return [];
  return slots;
}

function formatCompactDate(date, time) {
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} ${SHORT_MONTHS[date.getMonth()]} · ${time}`;
}

function getCalendarStart(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return start;
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, isError = false) {
  if (!ui.toast || !ui.toastMessage) return;
  window.clearTimeout(toastTimer);
  ui.toastMessage.textContent = message;
  ui.toast.classList.toggle("toast-error", isError);
  const icon = ui.toast.querySelector("[aria-hidden='true']");
  if (icon) icon.textContent = isError ? "!" : "✓";
  ui.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    ui.toast.hidden = true;
    ui.toast.classList.remove("toast-error");
  }, 3500);
}

/* =========================================================
   CALENDÁRIO
   ========================================================= */

function renderCalendar() {
  ui.grid.replaceChildren();
  ui.monthTitle.textContent = capitalizeFirst(monthFormatter.format(visibleMonth));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = data.toDateKey(new Date());
  const start = getCalendarStart(visibleMonth);

  for (let index = 0; index < 42; index += 1) {
    const date = data.addDays(start, index);
    const dateKey = data.toDateKey(date);
    const isOtherMonth = date.getMonth() !== visibleMonth.getMonth();
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const isPast = dayStart < today;

    const confirmed = getConfirmedForDate(dateKey);
    const pending = getPendingForDate(dateKey);
    const openSlots = !isOtherMonth && !isPast ? getSelectableSlots(dateKey) : [];

    const button = document.createElement("button");
    button.type = "button";
    button.className = "psic-day";
    button.dataset.date = dateKey;
    button.setAttribute("role", "gridcell");

    const number = document.createElement("span");
    number.className = "psic-day-number";
    number.textContent = String(date.getDate());
    button.append(number);

    const info = document.createElement("span");
    info.className = "psic-day-info";

    if (isOtherMonth) {
      button.classList.add("other-month");
      button.disabled = true;
    } else if (pending.length) {
      button.classList.add("has-pending");
      info.textContent = pending[0].time;
      button.append(info);
    } else if (confirmed.length) {
      button.classList.add("has-confirmed");
      info.textContent = confirmed[0].time;
      button.append(info);
    } else if (dateKey === todayKey) {
      button.classList.add("today");
      info.textContent = "HOJE";
      button.append(info);
    } else if (openSlots.length) {
      button.classList.add("has-available");
      info.textContent = openSlots[0];
      button.append(info);
    }

    /*
     * O psicólogo pode abrir o popup de marcação
     * em qualquer dia do mês atual que não seja passado.
     */
    const selectable = !isOtherMonth && !isPast;
    button.disabled = !selectable;
    if (selectable) {
      button.addEventListener("click", () => openSchedulePopup(date));
    }

    ui.grid.append(button);
  }
}

/* =========================================================
   CARDS DE RESUMO
   ========================================================= */

function renderSummary() {
  const now = new Date();
  const confirmed = getConfirmed();

  const dayOfWeek = now.getDay();
  const weekStart = data.addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -dayOfWeek);
  const weekEnd = data.addDays(weekStart, 6);
  const week = confirmed.filter((item) => {
    const date = data.fromDateKey(item.date);
    return date >= weekStart && date <= weekEnd;
  });
  ui.weekCount.textContent = week.length === 1 ? "1 atendimento" : `${week.length} atendimentos`;

  const next = confirmed
    .map((item) => ({ ...item, dateTime: dateTimeFromItem(item) }))
    .filter((item) => item.dateTime >= now)
    .sort((a, b) => a.dateTime - b.dateTime)[0];
  ui.nextAppointment.textContent = next
    ? formatCompactDate(next.dateTime, next.time)
    : "Nenhum agendamento";

  const pending = getPendingRequests();
  ui.pendingCount.textContent = pending.length === 1 ? "1 solicitação" : `${pending.length} solicitações`;
}

/* =========================================================
   POPUPS — ABRIR / FECHAR
   ========================================================= */

function openPopup(popup) {
  if (!popup) return;
  popup.classList.add("open");
  popup.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closePopup(popup) {
  if (!popup) return;
  popup.classList.remove("open");
  popup.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

/* =========================================================
   POPUP DE HORÁRIOS DISPONÍVEIS (marcar consulta)
   ========================================================= */

function getPatientOptions() {
  const map = new Map();

  data.getProfiles().forEach((profile) => {
    if (profile.role === "paciente" || profile.role === "patient") {
      const name = profile.socialName || profile.fullName || profile.name;
      if (name) {
        map.set(String(name).toLowerCase(), { id: profile.id || null, name });
      }
    }
  });

  [...requests, ...appointments].forEach((item) => {
    if (item.patient) {
      const key = String(item.patient).toLowerCase();
      if (!map.has(key)) {
        map.set(key, { id: item.patientId || null, name: item.patient });
      }
    }
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function renderPatientSelect() {
  patientOptions = getPatientOptions();
  ui.patientSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Clique para escolher seu paciente";
  ui.patientSelect.append(placeholder);

  patientOptions.forEach((option, index) => {
    const optionElement = document.createElement("option");
    optionElement.value = String(index);
    optionElement.textContent = option.name;
    ui.patientSelect.append(optionElement);
  });
}

function createTimeButton(time, mode) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "psic-schedule-time";
  button.textContent = time;
  button.dataset.time = time;
  button.dataset.mode = mode;
  button.setAttribute("aria-pressed", "false");

  button.addEventListener("click", () => {
    ui.schedulePopup.querySelectorAll(".psic-schedule-time").forEach((item) => {
      item.classList.remove("selected");
      item.setAttribute("aria-pressed", "false");
    });
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    popupSelectedTime = time;
    popupSelectedMode = mode;
    updateScheduleSubmit();
  });

  return button;
}

function createNoSlotsMessage() {
  const message = document.createElement("p");
  message.className = "psic-schedule-no-slots";
  message.textContent = "Nenhum horário disponível.";
  return message;
}

function renderScheduleTimes(date) {
  const dateKey = data.toDateKey(date);
  const slots = getSelectableSlots(dateKey);

  ui.onlineTimes.replaceChildren();
  ui.presentialTimes.replaceChildren();

  if (!slots.length) {
    ui.onlineTimes.append(createNoSlotsMessage());
    ui.presentialTimes.append(createNoSlotsMessage());
    return;
  }

  slots.forEach((time) => {
    ui.onlineTimes.append(createTimeButton(time, "Online"));
    ui.presentialTimes.append(createTimeButton(time, "Presencial"));
  });
}

function updateScheduleSubmit() {
  const ready = Boolean(
    popupSelectedTime &&
    popupSelectedMode &&
    ui.patientSelect.value !== "" &&
    ui.scheduleTerms.checked
  );
  ui.scheduleSubmit.disabled = !ready;
}

function openSchedulePopup(date) {
  popupSelectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  popupSelectedTime = "";
  popupSelectedMode = "";
  ui.scheduleTerms.checked = false;

  renderPatientSelect();
  ui.schedulePopupDate.textContent = capitalizeFirst(popupDateFormatter.format(popupSelectedDate));
  renderScheduleTimes(popupSelectedDate);
  updateScheduleSubmit();
  openPopup(ui.schedulePopup);
}

function handleMarkAppointment() {
  const option = patientOptions[Number(ui.patientSelect.value)];
  if (!option || !popupSelectedTime || !popupSelectedMode || !popupSelectedDate) return;

  const dateKey = data.toDateKey(popupSelectedDate);
  const conflict = appointments.some(
    (item) => item.date === dateKey && item.time === popupSelectedTime && item.status !== "cancelled"
  );
  if (conflict) {
    showToast("Esse horário já foi ocupado por uma consulta confirmada.", true);
    return;
  }

  appointments.push({
    id: data.createId("appointment"),
    patient: option.name,
    patientId: option.id || null,
    date: dateKey,
    time: popupSelectedTime,
    duration: 50,
    mode: popupSelectedMode,
    observation: "",
    status: "confirmed",
    source: "psychologist"
  });
  data.saveAppointments(appointments);

  closePopup(ui.schedulePopup);
  renderAll();
  showToast(`Consulta de ${option.name} marcada para ${popupSelectedTime}.`);
}

/* =========================================================
   POPUP DE SOLICITAÇÕES (aprovar / recusar)
   ========================================================= */

function renderRequestsPopup() {
  const pending = getPendingRequests();
  ui.requestsList.replaceChildren();

  if (!pending.length) {
    ui.requestsList.append(createEmptyMessage("Nenhuma solicitação pendente."));
    return;
  }

  pending.forEach((request, index) => {
    const item = document.createElement("article");
    item.className = "psic-request-item";

    const info = document.createElement("div");
    info.className = "psic-request-info";
    info.innerHTML = `
      <span class="psic-request-mode">${escapeHtml(request.mode)}</span>
      <strong>${escapeHtml(request.patient)}</strong>
      <span class="psic-request-datetime">${fullDateFormatter.format(data.fromDateKey(request.date))} - ${escapeHtml(request.time)}</span>
      <small>Solicitado em ${data.formatRequestMoment(request.requestedAt, false)} · ${index + 1}º na fila</small>
    `;

    const actions = document.createElement("div");
    actions.className = "psic-request-actions";

    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = "psic-request-approve";
    approve.setAttribute("aria-label", `Aprovar solicitação de ${request.patient}`);
    approve.title = "Aprovar";
    approve.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>';
    approve.addEventListener("click", () => approveRequest(request.id));

    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "psic-request-reject";
    reject.setAttribute("aria-label", `Recusar solicitação de ${request.patient}`);
    reject.title = "Recusar";
    reject.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    reject.addEventListener("click", () => rejectRequest(request.id));

    actions.append(approve, reject);
    item.append(info, actions);
    ui.requestsList.append(item);
  });
}

function approveRequest(requestId) {
  const request = requests.find((item) => item.id === requestId);
  if (!request || request.status !== "pending") return;

  const earlierSameSlot = getPendingRequests().find((item) => (
    item.id !== request.id &&
    item.date === request.date &&
    item.time === request.time &&
    new Date(item.requestedAt) < new Date(request.requestedAt)
  ));
  if (earlierSameSlot) {
    showToast(`Existe um pedido anterior de ${earlierSameSlot.patient} para esse mesmo horário.`, true);
    return;
  }

  const conflict = appointments.some(
    (item) => item.date === request.date && item.time === request.time && item.status !== "cancelled"
  );
  if (conflict) {
    showToast("Esse horário já foi ocupado por uma consulta confirmada.", true);
    return;
  }

  appointments.push({
    id: data.createId("appointment"),
    patient: request.patient,
    patientId: request.patientId,
    date: request.date,
    time: request.time,
    duration: request.duration,
    mode: request.mode,
    observation: request.note || "",
    status: "confirmed",
    source: "patient-request",
    requestId: request.id
  });
  request.status = "approved";
  request.reviewedAt = new Date().toISOString();

  requests.forEach((other) => {
    if (
      other.id !== request.id &&
      other.status === "pending" &&
      other.date === request.date &&
      other.time === request.time
    ) {
      other.status = "rejected";
      other.reviewedAt = request.reviewedAt;
      other.rejectionReason = "Horário preenchido por uma solicitação anterior.";
    }
  });

  data.saveAppointments(appointments);
  data.saveRequests(requests);
  renderAll();
  showToast(`Solicitação de ${request.patient} aprovada para ${request.time}.`);
}

function rejectRequest(requestId) {
  const request = requests.find((item) => item.id === requestId);
  if (!request || request.status !== "pending") return;
  if (!window.confirm(`Recusar a solicitação de ${request.patient} para ${request.time}?`)) return;
  request.status = "rejected";
  request.reviewedAt = new Date().toISOString();
  data.saveRequests(requests);
  renderAll();
  showToast(`Solicitação de ${request.patient} recusada.`);
}

/* =========================================================
   POPUPS DE PRÓXIMAS CONSULTAS E CONCLUÍDAS
   ========================================================= */

function createEmptyMessage(text) {
  const empty = document.createElement("p");
  empty.className = "psic-popup-empty";
  empty.textContent = text;
  return empty;
}

function createAppointmentCard(item, withActions) {
  const card = document.createElement("article");
  card.className = "psic-appointment-item";

  const info = document.createElement("div");
  info.className = "psic-appointment-info";
  info.innerHTML = `
    <span class="psic-appointment-mode">${escapeHtml(item.mode)}</span>
    <strong>${escapeHtml(item.patient)}</strong>
    <span class="psic-appointment-datetime">${fullDateFormatter.format(data.fromDateKey(item.date))} - ${escapeHtml(item.time)}</span>
  `;
  card.append(info);

  if (withActions) {
    const actions = document.createElement("div");
    actions.className = "psic-appointment-actions";

    const open = document.createElement("a");
    open.className = "psic-appointment-open";
    open.href = `consulta.html?id=${item.id}`;
    open.setAttribute("aria-label", `Notas rápidas da consulta de ${item.patient}`);
    open.title = "Notas rápidas";
    open.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "psic-appointment-cancel";
    cancel.setAttribute("aria-label", `Cancelar consulta de ${item.patient}`);
    cancel.title = "Cancelar consulta";
    cancel.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    cancel.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteAppointment(item.id);
    });

    actions.append(open, cancel);
    card.append(actions);
  }

  return card;
}

function renderAppointmentsPopup() {
  const now = new Date();
  const upcoming = getConfirmed()
    .map((item) => ({ ...item, dateTime: dateTimeFromItem(item) }))
    .filter((item) => item.dateTime >= now)
    .sort((a, b) => a.dateTime - b.dateTime);

  ui.appointmentsList.replaceChildren();
  if (!upcoming.length) {
    ui.appointmentsList.append(createEmptyMessage("Nenhuma consulta agendada."));
    return;
  }
  upcoming.forEach((item) => ui.appointmentsList.append(createAppointmentCard(item, true)));
}

function renderCompletedPopup() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const completed = getConfirmed()
    .map((item) => ({ ...item, dateTime: dateTimeFromItem(item) }))
    .filter((item) => item.dateTime < now && item.dateTime >= sevenDaysAgo)
    .sort((a, b) => b.dateTime - a.dateTime);

  ui.completedList.replaceChildren();
  if (!completed.length) {
    ui.completedList.append(createEmptyMessage("Nenhum atendimento nos últimos 7 dias."));
    return;
  }
  completed.forEach((item) => ui.completedList.append(createAppointmentCard(item, false)));
}

function deleteAppointment(appointmentId) {
  const appointment = appointments.find((item) => item.id === appointmentId);
  if (!appointment) return;
  if (!window.confirm(`Cancelar a consulta de ${appointment.patient} às ${appointment.time}?`)) return;
  appointment.status = "cancelled";
  data.saveAppointments(appointments);
  renderAll();
  showToast("Consulta cancelada. O horário voltou a ficar disponível.");
}

/* =========================================================
   RENDER GERAL
   ========================================================= */

function renderAll() {
  appointments = data.getAppointments();
  requests = data.getRequests();
  renderCalendar();
  renderSummary();
  renderRequestsPopup();
  renderAppointmentsPopup();
  renderCompletedPopup();
}

/* =========================================================
   EVENTOS
   ========================================================= */

ui.previousMonth.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});

ui.nextMonth.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});

ui.weekCard.addEventListener("click", () => {
  renderCompletedPopup();
  openPopup(ui.completedPopup);
});

ui.nextCard.addEventListener("click", () => {
  renderAppointmentsPopup();
  openPopup(ui.appointmentsPopup);
});

ui.pendingCard.addEventListener("click", () => {
  renderRequestsPopup();
  openPopup(ui.requestsPopup);
});

ui.schedulePopupClose.addEventListener("click", () => closePopup(ui.schedulePopup));
ui.scheduleTerms.addEventListener("change", updateScheduleSubmit);
ui.patientSelect.addEventListener("change", updateScheduleSubmit);
ui.scheduleSubmit.addEventListener("click", handleMarkAppointment);
ui.schedulePopup.addEventListener("click", (event) => {
  if (event.target === ui.schedulePopup) closePopup(ui.schedulePopup);
});

ui.requestsPopupClose.addEventListener("click", () => closePopup(ui.requestsPopup));
ui.appointmentsPopupClose.addEventListener("click", () => closePopup(ui.appointmentsPopup));
ui.completedPopupClose.addEventListener("click", () => closePopup(ui.completedPopup));

[ui.requestsPopup, ui.appointmentsPopup, ui.completedPopup].forEach((popup) => {
  popup.addEventListener("click", (event) => {
    if (event.target === popup) closePopup(popup);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  [ui.schedulePopup, ui.requestsPopup, ui.appointmentsPopup, ui.completedPopup].forEach((popup) => {
    if (popup.classList.contains("open")) closePopup(popup);
  });
});

if (ui.mobileMenu && ui.sidebar) {
  ui.mobileMenu.addEventListener("click", () => {
    const isOpen = ui.sidebar.classList.toggle("open");
    ui.mobileMenu.setAttribute("aria-expanded", String(isOpen));
  });
}

window.addEventListener("storage", renderAll);

renderAll();
