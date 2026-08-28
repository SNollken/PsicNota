"use strict";


/* =========================================================
   1. DADOS GLOBAIS
   ========================================================= */

const patientData = window.PsiNoteData;

if (!patientData) {
  throw new Error(
    "PsiNoteData não foi carregado. Verifique se shared-data.js é carregado antes de agenda-paciente.js."
  );
}


/* =========================================================
   2. ELEMENTOS DA INTERFACE
   ========================================================= */

const ui = {
  grid: document.querySelector("#patientCalendarGrid"),
  monthTitle: document.querySelector("#patientMonthTitle"),

  previousMonth: document.querySelector("#patientPreviousMonth"),
  nextMonth: document.querySelector("#patientNextMonth"),

  completedCount: document.querySelector("#completedAppointmentsCount"),
  nextAppointment: document.querySelector("#nextAppointmentSummary"),
  pendingCount: document.querySelector("#pendingRequestsCount"),

  toast: document.querySelector("#patientToast"),
  toastMessage: document.querySelector("#patientToastMessage"),

  name: document.querySelector("#patientNameTop"),
  avatar: document.querySelector("#patientAvatar"),

  sidebar: document.querySelector(".sidebar"),
  mobileMenu: document.querySelector(".mobile-menu")
};


/* =========================================================
   3. ELEMENTOS — POPUP DE HORÁRIOS
   ========================================================= */

const schedulePopup =
  document.getElementById("schedulePopup");

const schedulePopupClose =
  document.getElementById("schedulePopupClose");

const schedulePopupDate =
  document.getElementById("schedulePopupDate");

const onlineTimes =
  document.getElementById("onlineTimes");

const presentialTimes =
  document.getElementById("presentialTimes");

const onlineColumn =
  document.getElementById("onlineColumn");

const presentialColumn =
  document.getElementById("presentialColumn");

const scheduleTerms =
  document.getElementById("scheduleTerms");

const scheduleSubmit =
  document.getElementById("scheduleSubmit");


/* =========================================================
   4. ELEMENTOS — POPUP DE PEDIDOS PENDENTES
   ========================================================= */

const pendingRequestsCard =
  document.getElementById("pendingRequestsCard");

const requestsPopup =
  document.getElementById("requestsPopup");

const requestsPopupClose =
  document.getElementById("requestsPopupClose");

const requestsPopupList =
  document.getElementById("requestsPopupList");


/* =========================================================
   5. ELEMENTOS — POPUP DE PRÓXIMAS CONSULTAS
   ========================================================= */

const nextAppointmentCard =
  document.getElementById("nextAppointmentCard");

const appointmentsPopup =
  document.getElementById("appointmentsPopup");

const appointmentsPopupClose =
  document.getElementById("appointmentsPopupClose");

const appointmentsPopupList =
  document.getElementById("appointmentsPopupList");


/* =========================================================
   6. ELEMENTOS — POPUP DE CONSULTAS REALIZADAS
   ========================================================= */

const completedAppointmentsCard =
  document.getElementById("completedAppointmentsCard");

const completedPopup =
  document.getElementById("completedPopup");

const completedPopupClose =
  document.getElementById("completedPopupClose");

const completedPopupList =
  document.getElementById("completedPopupList");


/* =========================================================
   7. USUÁRIO ATUAL
   ========================================================= */

const session =
  patientData.getSession();

const profiles =
  patientData.getProfiles();


function resolvePatientProfile() {
  const byId =
    session?.id &&
    profiles.find(
      (profile) =>
        profile.id === session.id
    );

  const byEmail =
    session?.email &&
    profiles.find(
      (profile) =>
        profile.email &&
        profile.email.toLowerCase() ===
        session.email.toLowerCase()
    );

  let latestProfile = null;

  try {
    latestProfile =
      JSON.parse(
        localStorage.getItem("psinoteProfileDemo") ||
        "null"
      );
  } catch {
    latestProfile = null;
  }

  const patientFromProfiles =
    profiles.find(
      (profile) =>
        profile.role === "paciente" ||
        profile.role === "patient"
    );

  return (
    byId ||
    byEmail ||
    latestProfile ||
    patientFromProfiles ||
    null
  );
}


const patientProfile =
  resolvePatientProfile();


const currentPatient = {
  ...(session || {}),
  ...(patientProfile || {}),

  id:
    patientProfile?.id ||
    session?.id ||
    "demo-paciente",

  name:
    patientProfile?.socialName ||
    patientProfile?.fullName ||
    session?.fullName ||
    session?.name ||
    "Paciente PsicNota",

  avatarDataUrl:
    patientProfile?.avatarDataUrl ||
    session?.avatarDataUrl ||
    "",

  role: "paciente"
};


/* =========================================================
   8. ESTADO DA AGENDA
   ========================================================= */

let appointments =
  patientData.getAppointments();

let requests =
  patientData.getRequests();


const today =
  new Date();

today.setHours(0, 0, 0, 0);


let visibleMonth =
  new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );


let selectedDateKey = "";


/* =========================================================
   9. ESTADO DO POPUP DE HORÁRIOS
   ========================================================= */

let popupSelectedDate = null;
let popupSelectedTime = "";
let popupSelectedMode = "";

let toastTimer = null;


/* =========================================================
   10. FORMATADORES
   ========================================================= */

const monthFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      month: "long",
      year: "numeric"
    }
  );


const longDateFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      weekday: "long",
      day: "numeric",
      month: "long"
    }
  );


/* =========================================================
   11. FUNÇÕES AUXILIARES
   ========================================================= */

function capitalizeFirst(value) {
  if (!value) {
    return "";
  }

  return (
    value
      .charAt(0)
      .toLocaleUpperCase("pt-BR") +
    value.slice(1)
  );
}


function getInitials(name) {
  return String(name || "PN")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}


function getCalendarStart(month) {
  const firstDay =
    new Date(
      month.getFullYear(),
      month.getMonth(),
      1
    );

  const start =
    new Date(firstDay);

  start.setDate(
    firstDay.getDate() -
    firstDay.getDay()
  );

  return start;
}


function dateTimeFromItem(item) {
  return new Date(
    `${item.date}T${item.time}:00`
  );
}


function isSamePatient(item) {
  return (
    item.patientId ===
    currentPatient.id
  );
}


function getMyAppointments() {
  return appointments.filter(
    (item) =>
      isSamePatient(item) &&
      item.status !== "cancelled"
  );
}


function getMyRequests() {
  return requests.filter(
    (item) =>
      isSamePatient(item)
  );
}


function formatCompactDate(
  dateKey,
  time
) {
  const date =
    patientData.fromDateKey(dateKey);

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  const months = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez"
  ];

  return (
    `${day} ` +
    `${months[date.getMonth()]} · ` +
    `${time}`
  );
}


function formatRequestDate(dateKey) {
  const date =
    patientData.fromDateKey(dateKey);

  return capitalizeFirst(
    longDateFormatter.format(date)
  );
}


/* =========================================================
   12. HORÁRIOS DISPONÍVEIS
   ========================================================= */

function getSelectableSlots(dateKey) {
  const slots =
    patientData.getOpenSlots(dateKey) ||
    [];

  const selectedDate =
    patientData.fromDateKey(dateKey);

  const selectedDay =
    new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

  const currentDay =
    new Date();

  currentDay.setHours(0, 0, 0, 0);


  if (selectedDay < currentDay) {
    return [];
  }


  if (
    selectedDay.getTime() !==
    currentDay.getTime()
  ) {
    return slots;
  }


  const now =
    new Date();


  return slots.filter((time) => {
    const [hour, minute] =
      time
        .split(":")
        .map(Number);

    const slotDate =
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hour,
        minute,
        0,
        0
      );

    return slotDate > now;
  });
}


/* =========================================================
   13. PERFIL NA SIDEBAR
   ========================================================= */

function renderPatientProfile() {
  if (ui.name) {
    ui.name.textContent =
      currentPatient.name;
  }

  if (!ui.avatar) {
    return;
  }

  ui.avatar.textContent =
    getInitials(
      currentPatient.name
    );

  const hasPhoto =
    Boolean(
      currentPatient.avatarDataUrl
    );

  ui.avatar.classList.toggle(
    "has-photo",
    hasPhoto
  );

  ui.avatar.style.backgroundImage =
    hasPhoto
      ? `url("${currentPatient.avatarDataUrl}")`
      : "";
}


/* =========================================================
   14. TOAST
   ========================================================= */

function showToast(
  message,
  isError = false
) {
  if (
    !ui.toast ||
    !ui.toastMessage
  ) {
    return;
  }

  window.clearTimeout(
    toastTimer
  );

  ui.toastMessage.textContent =
    message;

  ui.toast.classList.toggle(
    "toast-error",
    isError
  );

  const icon =
    ui.toast.querySelector(
      "[aria-hidden='true']"
    );

  if (icon) {
    icon.textContent =
      isError
        ? "!"
        : "✓";
  }

  ui.toast.hidden =
    false;

  toastTimer =
    window.setTimeout(
      () => {
        ui.toast.hidden =
          true;

        ui.toast.classList.remove(
          "toast-error"
        );
      },
      3500
    );
}


/* =========================================================
   15. CALENDÁRIO
   ========================================================= */

function renderCalendar() {
  if (
    !ui.grid ||
    !ui.monthTitle
  ) {
    return;
  }


  ui.grid.replaceChildren();


  ui.monthTitle.textContent =
    capitalizeFirst(
      monthFormatter.format(
        visibleMonth
      )
    );


  const start =
    getCalendarStart(
      visibleMonth
    );

  const todayKey =
    patientData.toDateKey(
      today
    );

  const myAppointments =
    getMyAppointments();

  const myRequests =
    getMyRequests();


  for (
    let index = 0;
    index < 42;
    index += 1
  ) {
    const date =
      new Date(start);

    date.setDate(
      start.getDate() +
      index
    );

    const dateKey =
      patientData.toDateKey(
        date
      );

    const isOtherMonth =
      date.getMonth() !==
      visibleMonth.getMonth();

    const dayOnly =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

    const isPast =
      dayOnly < today;


    const dayAppointments =
      myAppointments
        .filter(
          (item) =>
            item.date === dateKey
        )
        .sort(
          (a, b) =>
            a.time.localeCompare(
              b.time
            )
        );


    const pendingRequests =
      myRequests
        .filter(
          (item) =>
            item.date === dateKey &&
            item.status === "pending"
        )
        .sort(
          (a, b) =>
            a.time.localeCompare(
              b.time
            )
        );


    const futureAppointment =
      dayAppointments.find(
        (item) =>
          dateTimeFromItem(item) >=
          new Date()
      );

    const completedAppointment =
      [...dayAppointments]
        .filter(
          (item) =>
            dateTimeFromItem(item) <
            new Date()
        )
        .sort(
          (a, b) =>
            dateTimeFromItem(b) -
            dateTimeFromItem(a)
        )[0];


    const openSlots =
      !isPast &&
        !isOtherMonth
        ? getSelectableSlots(dateKey)
        : [];


    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "patient-day";

    button.setAttribute(
      "role",
      "gridcell"
    );

    button.dataset.date =
      dateKey;


    if (isOtherMonth) {
      button.classList.add(
        "other-month"
      );
    }


    if (
      dateKey ===
      selectedDateKey
    ) {
      button.classList.add(
        "selected"
      );
    }


    const number =
      document.createElement(
        "span"
      );

    number.className =
      "patient-day-number";

    number.textContent =
      String(
        date.getDate()
      );

    button.append(number);


    const info =
      document.createElement(
        "span"
      );

    info.className =
      "patient-day-info";


    /*
     * Prioridade visual:
     *
     * 1. Solicitação pendente
     * 2. Consulta confirmada
     * 3. Hoje
     * 4. Horário disponível
     */

    if (
      !isOtherMonth &&
      pendingRequests.length
    ) {
      button.classList.add(
        "has-pending"
      );

      info.textContent =
        pendingRequests[0].time;

      button.append(info);

    } else if (
      !isOtherMonth &&
      futureAppointment
    ) {
      button.classList.add(
        "has-approved"
      );

      info.textContent =
        futureAppointment.time;

      button.append(info);

    } else if (
      !isOtherMonth &&
      completedAppointment
    ) {
      button.classList.add(
        "has-completed"
      );

      info.textContent =
        completedAppointment.time;

      button.append(info);

    } else if (
      dateKey === todayKey
    ) {
      button.classList.add(
        "today"
      );

      info.textContent =
        "HOJE";

      button.append(info);

    } else if (
      !isOtherMonth &&
      openSlots.length
    ) {
      button.classList.add(
        "has-available"
      );

      info.textContent =
        openSlots[0];

      button.append(info);
    }


    const selectable =
      !isOtherMonth &&
      !isPast &&
      openSlots.length > 0;


    button.disabled =
      !selectable;


    if (selectable) {
      button.addEventListener(
        "click",
        () => {
          selectedDateKey =
            dateKey;

          renderCalendar();

          openSchedulePopup(
            date
          );
        }
      );
    }


    ui.grid.append(button);
  }
}


/* =========================================================
   16. CARDS DE RESUMO
   ========================================================= */

function renderSummary() {
  const now =
    new Date();

  const thirtyDaysAgo =
    new Date(now);

  thirtyDaysAgo.setDate(
    thirtyDaysAgo.getDate() -
    30
  );


  const myAppointments =
    getMyAppointments();


  const completed =
    myAppointments.filter(
      (item) => {
        const date =
          dateTimeFromItem(item);

        return (
          date < now &&
          date >= thirtyDaysAgo
        );
      }
    );


  if (ui.completedCount) {
    ui.completedCount.textContent =
      `${completed.length} ${completed.length === 1
        ? "atendimento"
        : "atendimentos"
      }`;
  }


  const next =
    myAppointments
      .map(
        (item) => ({
          ...item,
          dateTime:
            dateTimeFromItem(item)
        })
      )
      .filter(
        (item) =>
          item.dateTime >= now
      )
      .sort(
        (a, b) =>
          a.dateTime -
          b.dateTime
      )[0];


  if (ui.nextAppointment) {
    ui.nextAppointment.textContent =
      next
        ? formatCompactDate(
          next.date,
          next.time
        )
        : "Nenhuma consulta";
  }


  const pending =
    getMyRequests().filter(
      (item) =>
        item.status === "pending"
    );


  if (ui.pendingCount) {
    ui.pendingCount.textContent =
      `${pending.length} ${pending.length === 1
        ? "solicitação"
        : "solicitações"
      }`;
  }
}


/* =========================================================
   17. POPUP DE HORÁRIOS
   ========================================================= */

function updateScheduleSubmit() {
  if (!scheduleSubmit) {
    return;
  }

  scheduleSubmit.disabled =
    !popupSelectedTime ||
    !popupSelectedMode ||
    !scheduleTerms?.checked;
}


function createScheduleTimeButton(
  time,
  mode
) {
  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    "schedule-time";

  button.textContent =
    time;

  button.dataset.time =
    time;

  button.dataset.mode =
    mode;

  button.setAttribute(
    "aria-pressed",
    "false"
  );


  button.addEventListener(
    "click",
    () => {
      schedulePopup
        ?.querySelectorAll(
          ".schedule-time"
        )
        .forEach(
          (item) => {
            item.classList.remove(
              "selected"
            );

            item.setAttribute(
              "aria-pressed",
              "false"
            );
          }
        );


      button.classList.add(
        "selected"
      );

      button.setAttribute(
        "aria-pressed",
        "true"
      );

      popupSelectedTime =
        time;

      popupSelectedMode =
        mode;

      updateScheduleSubmit();
    }
  );


  return button;
}


function createNoSlotsMessage() {
  const message =
    document.createElement(
      "p"
    );

  message.className =
    "schedule-no-slots";

  message.textContent =
    "Nenhum horário disponível.";

  return message;
}


function renderScheduleTimes(date) {
  if (
    !onlineTimes ||
    !presentialTimes
  ) {
    return;
  }


  const dateKey =
    patientData.toDateKey(date);

  const slots =
    getSelectableSlots(dateKey);


  onlineTimes.replaceChildren();
  presentialTimes.replaceChildren();


  if (onlineColumn) {
    onlineColumn.hidden =
      false;
  }

  if (presentialColumn) {
    presentialColumn.hidden =
      false;
  }


  if (!slots.length) {
    onlineTimes.append(
      createNoSlotsMessage()
    );

    presentialTimes.append(
      createNoSlotsMessage()
    );

    return;
  }


  slots.forEach((time) => {
    onlineTimes.append(
      createScheduleTimeButton(
        time,
        "Online"
      )
    );

    presentialTimes.append(
      createScheduleTimeButton(
        time,
        "Presencial"
      )
    );
  });
}


function openSchedulePopup(date) {
  if (
    !schedulePopup ||
    !schedulePopupDate ||
    !scheduleTerms
  ) {
    return;
  }


  popupSelectedDate =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  popupSelectedTime = "";
  popupSelectedMode = "";

  scheduleTerms.checked =
    false;

  updateScheduleSubmit();


  schedulePopupDate.textContent =
    capitalizeFirst(
      longDateFormatter.format(
        popupSelectedDate
      )
    );


  renderScheduleTimes(
    popupSelectedDate
  );


  schedulePopup.classList.add(
    "open"
  );

  schedulePopup.setAttribute(
    "aria-hidden",
    "false"
  );
}


function closeSchedulePopup() {
  if (!schedulePopup) {
    return;
  }


  schedulePopup.classList.remove(
    "open"
  );

  schedulePopup.setAttribute(
    "aria-hidden",
    "true"
  );


  popupSelectedDate = null;
  popupSelectedTime = "";
  popupSelectedMode = "";


  if (scheduleTerms) {
    scheduleTerms.checked =
      false;
  }


  if (scheduleSubmit) {
    scheduleSubmit.disabled =
      true;
  }


  schedulePopup
    .querySelectorAll(
      ".schedule-time"
    )
    .forEach(
      (button) => {
        button.classList.remove(
          "selected"
        );

        button.setAttribute(
          "aria-pressed",
          "false"
        );
      }
    );
}


function submitScheduleRequest() {
  if (
    !popupSelectedDate ||
    !popupSelectedTime ||
    !popupSelectedMode ||
    !scheduleTerms?.checked
  ) {
    return;
  }


  const dateKey =
    patientData.toDateKey(
      popupSelectedDate
    );

  const currentRequests =
    patientData.getRequests();

  const currentAppointments =
    patientData.getAppointments();


  const duplicateRequest =
    currentRequests.some(
      (request) =>
        request.patientId ===
        currentPatient.id &&
        request.date ===
        dateKey &&
        request.time ===
        popupSelectedTime &&
        (
          request.status === "pending" ||
          request.status === "approved"
        )
    );


  const duplicateAppointment =
    currentAppointments.some(
      (appointment) =>
        appointment.patientId ===
        currentPatient.id &&
        appointment.date ===
        dateKey &&
        appointment.time ===
        popupSelectedTime &&
        appointment.status !==
        "cancelled"
    );


  if (
    duplicateRequest ||
    duplicateAppointment
  ) {
    showToast(
      "Você já possui uma solicitação ou consulta nesse horário.",
      true
    );

    return;
  }


  const availableSlots =
    getSelectableSlots(dateKey);


  if (
    !availableSlots.includes(
      popupSelectedTime
    )
  ) {
    showToast(
      "Esse horário não está mais disponível. Escolha outro.",
      true
    );

    popupSelectedTime = "";
    popupSelectedMode = "";

    renderScheduleTimes(
      popupSelectedDate
    );

    updateScheduleSubmit();

    return;
  }


  const request = {
    id:
      patientData.createId(
        "request"
      ),

    patientId:
      currentPatient.id,

    patient:
      currentPatient.name,

    date:
      dateKey,

    time:
      popupSelectedTime,

    duration:
      50,

    mode:
      popupSelectedMode,

    note:
      "",

    requestedAt:
      new Date().toISOString(),

    status:
      "pending"
  };


  currentRequests.push(
    request
  );

  patientData.saveRequests(
    currentRequests
  );


  requests =
    currentRequests;

  appointments =
    currentAppointments;


  closeSchedulePopup();

  selectedDateKey =
    "";

  renderCalendar();
  renderSummary();


  showToast(
    "Solicitação enviada com sucesso."
  );
}


/* =========================================================
   18. POPUP DE PEDIDOS PENDENTES
   ========================================================= */

function renderPendingRequestsPopup() {
  if (!requestsPopupList) {
    return;
  }


  requestsPopupList.replaceChildren();


  const pending =
    patientData
      .getRequests()
      .filter(
        (request) =>
          request.patientId ===
          currentPatient.id &&
          request.status ===
          "pending"
      )
      .sort(
        (a, b) =>
          dateTimeFromItem(a) -
          dateTimeFromItem(b)
      );


  if (!pending.length) {
    const empty =
      document.createElement(
        "p"
      );

    empty.className =
      "requests-empty";

    empty.textContent =
      "Nenhuma solicitação pendente.";

    requestsPopupList.append(
      empty
    );

    return;
  }


  pending.forEach((request) => {
    const item =
      document.createElement(
        "article"
      );

    item.className =
      "pending-request-item";


    const info =
      document.createElement(
        "div"
      );

    info.className =
      "pending-request-info";


    const date =
      document.createElement(
        "strong"
      );

    date.className =
      "pending-request-date";

    date.textContent =
      formatRequestDate(
        request.date
      );


    const details =
      document.createElement(
        "span"
      );

    details.className =
      "pending-request-details";

    details.textContent =
      `${request.time} · ${request.mode ||
      "Modalidade não informada"
      }`;


    const cancel =
      document.createElement(
        "button"
      );

    cancel.type =
      "button";

    cancel.className =
      "pending-request-cancel";

    cancel.textContent =
      "Cancelar";


    cancel.addEventListener(
      "click",
      () => {
        cancelPendingRequest(
          request.id
        );
      }
    );


    info.append(
      date,
      details
    );

    item.append(
      info,
      cancel
    );

    requestsPopupList.append(
      item
    );
  });
}


function openRequestsPopup() {
  if (!requestsPopup) {
    return;
  }

  renderPendingRequestsPopup();

  requestsPopup.classList.add(
    "open"
  );

  requestsPopup.setAttribute(
    "aria-hidden",
    "false"
  );
}


function closeRequestsPopup() {
  if (!requestsPopup) {
    return;
  }

  requestsPopup.classList.remove(
    "open"
  );

  requestsPopup.setAttribute(
    "aria-hidden",
    "true"
  );
}


function cancelPendingRequest(
  requestId
) {
  const currentRequests =
    patientData.getRequests();


  const updatedRequests =
    currentRequests.map(
      (request) => {
        if (
          request.id !== requestId
        ) {
          return request;
        }

        return {
          ...request,

          status:
            "cancelled",

          cancelledAt:
            new Date().toISOString()
        };
      }
    );


  patientData.saveRequests(
    updatedRequests
  );

  requests =
    updatedRequests;


  renderCalendar();
  renderSummary();
  renderPendingRequestsPopup();


  showToast(
    "Solicitação cancelada."
  );
}


/* =========================================================
   19. POPUP DE PRÓXIMAS CONSULTAS
   ========================================================= */

function renderUpcomingAppointmentsPopup() {
  if (!appointmentsPopupList) {
    return;
  }


  appointmentsPopupList.replaceChildren();


  const now =
    new Date();


  const upcoming =
    getMyAppointments()
      .map(
        (appointment) => ({
          ...appointment,

          dateTime:
            dateTimeFromItem(
              appointment
            )
        })
      )
      .filter(
        (appointment) =>
          appointment.dateTime >= now
      )
      .sort(
        (a, b) =>
          a.dateTime -
          b.dateTime
      );


  if (!upcoming.length) {
    const empty =
      document.createElement(
        "p"
      );

    empty.className =
      "appointments-empty";

    empty.textContent =
      "Nenhuma consulta agendada.";

    appointmentsPopupList.append(
      empty
    );

    return;
  }


  upcoming.forEach(
    (appointment) => {
      const item =
        document.createElement(
          "article"
        );

      item.className =
        "upcoming-appointment-item";


      const date =
        document.createElement(
          "strong"
        );

      date.className =
        "upcoming-appointment-date";

      date.textContent =
        `${formatRequestDate(
          appointment.date
        )} · ${appointment.time}`;


      const details =
        document.createElement(
          "div"
        );

      details.className =
        "upcoming-appointment-details";


      const duration =
        document.createElement(
          "span"
        );

      duration.textContent =
        `${appointment.duration || 50} min`;


      const mode =
        document.createElement(
          "span"
        );

      mode.className =
        "upcoming-appointment-mode";

      mode.textContent =
        appointment.mode ||
        "Modalidade não informada";


      details.append(
        duration,
        mode
      );

      item.append(
        date,
        details
      );

      appointmentsPopupList.append(
        item
      );
    }
  );
}


function openAppointmentsPopup() {
  if (!appointmentsPopup) {
    return;
  }

  renderUpcomingAppointmentsPopup();

  appointmentsPopup.classList.add(
    "open"
  );

  appointmentsPopup.setAttribute(
    "aria-hidden",
    "false"
  );
}


function closeAppointmentsPopup() {
  if (!appointmentsPopup) {
    return;
  }

  appointmentsPopup.classList.remove(
    "open"
  );

  appointmentsPopup.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* =========================================================
   20. POPUP DE CONSULTAS REALIZADAS
   ========================================================= */

function renderCompletedAppointmentsPopup() {
  if (!completedPopupList) {
    return;
  }


  completedPopupList.replaceChildren();


  const now =
    new Date();

  const thirtyDaysAgo =
    new Date(now);

  thirtyDaysAgo.setDate(
    thirtyDaysAgo.getDate() -
    30
  );


  const completed =
    getMyAppointments()
      .map(
        (appointment) => ({
          ...appointment,

          dateTime:
            dateTimeFromItem(
              appointment
            )
        })
      )
      .filter(
        (appointment) =>
          appointment.dateTime < now &&
          appointment.dateTime >=
          thirtyDaysAgo
      )
      .sort(
        (a, b) =>
          b.dateTime -
          a.dateTime
      );


  if (!completed.length) {
    const empty =
      document.createElement(
        "p"
      );

    empty.className =
      "completed-empty";

    empty.textContent =
      "Nenhuma consulta realizada nos últimos 30 dias.";

    completedPopupList.append(
      empty
    );

    return;
  }


  completed.forEach(
    (appointment) => {
      const item =
        document.createElement(
          "article"
        );

      item.className =
        "completed-appointment-item";


      const date =
        document.createElement(
          "strong"
        );

      date.className =
        "completed-appointment-date";

      date.textContent =
        `${formatRequestDate(
          appointment.date
        )} · ${appointment.time}`;


      const details =
        document.createElement(
          "div"
        );

      details.className =
        "completed-appointment-details";


      const duration =
        document.createElement(
          "span"
        );

      duration.textContent =
        `${appointment.duration || 50} min`;


      const mode =
        document.createElement(
          "span"
        );

      mode.className =
        "completed-appointment-mode";

      mode.textContent =
        appointment.mode ||
        "Modalidade não informada";


      details.append(
        duration,
        mode
      );

      item.append(
        date,
        details
      );

      completedPopupList.append(
        item
      );
    }
  );
}


function openCompletedPopup() {
  if (!completedPopup) {
    return;
  }

  renderCompletedAppointmentsPopup();

  completedPopup.classList.add(
    "open"
  );

  completedPopup.setAttribute(
    "aria-hidden",
    "false"
  );
}


function closeCompletedPopup() {
  if (!completedPopup) {
    return;
  }

  completedPopup.classList.remove(
    "open"
  );

  completedPopup.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* =========================================================
   21. EVENTOS — POPUP DE HORÁRIOS
   ========================================================= */

if (scheduleTerms) {
  scheduleTerms.addEventListener(
    "change",
    updateScheduleSubmit
  );
}


if (schedulePopupClose) {
  schedulePopupClose.addEventListener(
    "click",
    closeSchedulePopup
  );
}


if (scheduleSubmit) {
  scheduleSubmit.addEventListener(
    "click",
    submitScheduleRequest
  );
}


if (schedulePopup) {
  schedulePopup.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        schedulePopup
      ) {
        closeSchedulePopup();
      }
    }
  );
}


/* =========================================================
   22. EVENTOS — PEDIDOS PENDENTES
   ========================================================= */

if (pendingRequestsCard) {
  pendingRequestsCard.addEventListener(
    "click",
    openRequestsPopup
  );
}


if (requestsPopupClose) {
  requestsPopupClose.addEventListener(
    "click",
    closeRequestsPopup
  );
}


if (requestsPopup) {
  requestsPopup.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        requestsPopup
      ) {
        closeRequestsPopup();
      }
    }
  );
}


/* =========================================================
   23. EVENTOS — PRÓXIMAS CONSULTAS
   ========================================================= */

if (nextAppointmentCard) {
  nextAppointmentCard.addEventListener(
    "click",
    openAppointmentsPopup
  );
}


if (appointmentsPopupClose) {
  appointmentsPopupClose.addEventListener(
    "click",
    closeAppointmentsPopup
  );
}


if (appointmentsPopup) {
  appointmentsPopup.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        appointmentsPopup
      ) {
        closeAppointmentsPopup();
      }
    }
  );
}


/* =========================================================
   24. EVENTOS — CONSULTAS REALIZADAS
   ========================================================= */

if (completedAppointmentsCard) {
  completedAppointmentsCard.addEventListener(
    "click",
    openCompletedPopup
  );
}


if (completedPopupClose) {
  completedPopupClose.addEventListener(
    "click",
    closeCompletedPopup
  );
}


if (completedPopup) {
  completedPopup.addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        completedPopup
      ) {
        closeCompletedPopup();
      }
    }
  );
}


/* =========================================================
   25. NAVEGAÇÃO DOS MESES
   ========================================================= */

if (ui.previousMonth) {
  ui.previousMonth.addEventListener(
    "click",
    () => {
      visibleMonth =
        new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth() - 1,
          1
        );

      selectedDateKey =
        "";

      renderCalendar();
    }
  );
}


if (ui.nextMonth) {
  ui.nextMonth.addEventListener(
    "click",
    () => {
      visibleMonth =
        new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth() + 1,
          1
        );

      selectedDateKey =
        "";

      renderCalendar();
    }
  );
}


/* =========================================================
   26. MENU MOBILE
   ========================================================= */

if (
  ui.mobileMenu &&
  ui.sidebar
) {
  ui.mobileMenu.addEventListener(
    "click",
    () => {
      const isOpen =
        ui.sidebar.classList.toggle(
          "open"
        );

      ui.mobileMenu.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }
  );


  document.addEventListener(
    "click",
    (event) => {
      if (
        window.innerWidth > 720
      ) {
        return;
      }

      if (
        ui.sidebar.contains(
          event.target
        ) ||
        ui.mobileMenu.contains(
          event.target
        )
      ) {
        return;
      }

      ui.sidebar.classList.remove(
        "open"
      );

      ui.mobileMenu.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  );
}


/* =========================================================
   27. SINCRONIZAÇÃO ENTRE ABAS
   ========================================================= */

function refreshData() {
  appointments =
    patientData.getAppointments();

  requests =
    patientData.getRequests();


  renderCalendar();
  renderSummary();


  if (
    requestsPopup?.classList.contains(
      "open"
    )
  ) {
    renderPendingRequestsPopup();
  }


  if (
    appointmentsPopup?.classList.contains(
      "open"
    )
  ) {
    renderUpcomingAppointmentsPopup();
  }


  if (
    completedPopup?.classList.contains(
      "open"
    )
  ) {
    renderCompletedAppointmentsPopup();
  }


  if (
    schedulePopup?.classList.contains(
      "open"
    ) &&
    popupSelectedDate
  ) {
    popupSelectedTime = "";
    popupSelectedMode = "";

    renderScheduleTimes(
      popupSelectedDate
    );

    updateScheduleSubmit();
  }
}


window.addEventListener(
  "storage",
  refreshData
);


/* =========================================================
   28. INICIALIZAÇÃO
   ========================================================= */

renderPatientProfile();
renderCalendar();
renderSummary();