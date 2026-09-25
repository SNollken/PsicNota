"use strict";


/* =========================================================
   DADOS GLOBAIS
   ========================================================= */

const patientData = window.PsiNoteData;

if (!patientData) {
  throw new Error(
    "PsiNoteData não foi carregado. Verifique se shared-data.js é carregado antes de agenda-paciente.js."
  );
}


/* =========================================================
   CLIENTE SUPABASE
   ========================================================= */

const supabaseClient =
  window.PsicNotaSupabase || null;


/* =========================================================
   ELEMENTOS DA INTERFACE
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
   ELEMENTOS DO POPUP DE HORÁRIOS
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
   ELEMENTOS DO POPUP DE PEDIDOS
   ========================================================= */

const pendingRequestsCard =
  document.getElementById(
    "pendingRequestsCard"
  );

const requestsPopup =
  document.getElementById(
    "requestsPopup"
  );

const requestsPopupClose =
  document.getElementById(
    "requestsPopupClose"
  );

const requestsPopupList =
  document.getElementById(
    "requestsPopupList"
  );

  /* =========================================================
   ELEMENTOS DO POPUP DE PRÓXIMAS CONSULTAS
   ========================================================= */

const nextAppointmentCard =
  document.getElementById(
    "nextAppointmentCard"
  );

const appointmentsPopup =
  document.getElementById(
    "appointmentsPopup"
  );

const appointmentsPopupClose =
  document.getElementById(
    "appointmentsPopupClose"
  );

const appointmentsPopupList =
  document.getElementById(
    "appointmentsPopupList"
  );

  /* =========================================================
   ELEMENTOS DO POPUP DE CONSULTAS REALIZADAS
   ========================================================= */

const completedAppointmentsCard =
  document.getElementById(
    "completedAppointmentsCard"
  );

const completedPopup =
  document.getElementById(
    "completedPopup"
  );

const completedPopupClose =
  document.getElementById(
    "completedPopupClose"
  );

const completedPopupList =
  document.getElementById(
    "completedPopupList"
  );

  /* =========================================================
   RENDERIZA CONSULTAS REALIZADAS
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


/* =========================================================
   ABRIR POPUP
   ========================================================= */

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


/* =========================================================
   FECHAR POPUP
   ========================================================= */

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
   RENDERIZA PRÓXIMAS CONSULTAS
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


/* =========================================================
   ABRIR POPUP
   ========================================================= */

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


/* =========================================================
   FECHAR POPUP
   ========================================================= */

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
   EVENTOS DO POPUP DE PRÓXIMAS CONSULTAS
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
   USUÁRIO ATUAL
   ========================================================= */

const session =
  patientData.getSession();

const profiles =
  patientData.getProfiles();


/* =========================================================
   LOCALIZA O PERFIL DO PACIENTE
   ========================================================= */

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
        localStorage.getItem(
          "psinoteProfileDemo"
        ) || "null"
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
   DADOS DA AGENDA
   ========================================================= */

let appointments =
  patientData.getAppointments();

let requests =
  patientData.getRequests();

let usingRemoteRequests = false;

let usingRemoteAppointments = false;

let schedulePsychologistId = null;

let availabilityByWeekday = new Map();

let availabilityLoadFailed = false;


const today =
  new Date();

today.setHours(
  0,
  0,
  0,
  0
);


let visibleMonth =
  new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );


let selectedDateKey = "";


/* =========================================================
   DADOS DO POPUP
   ========================================================= */

let popupSelectedDate = null;
let popupSelectedTime = "";
let popupSelectedMode = "";

let toastTimer = null;


/* =========================================================
   FORMATADORES
   ========================================================= */

const monthFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      month: "long",
      year: "numeric"
    }
  );


const popupDateFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      weekday: "long",
      day: "numeric",
      month: "long"
    }
  );


/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function capitalizeFirst(value) {
  if (!value) {
    return "";
  }

  return (
    value.charAt(0).toLocaleUpperCase("pt-BR") +
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
    item.patientId === currentPatient.id ||
    (session?.id && item.patientId === session.id)
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
    patientData.fromDateKey(
      dateKey
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

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


/* =========================================================
   TOAST
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

  /*
   * Troca o símbolo do toast.
   * Sucesso = ✓
   * Erro = !
   */
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
   HORÁRIOS DISPONÍVEIS
   ========================================================= */

function getSelectableSlots(
  dateKey
) {
  const slots = availabilityByWeekday.get(
    patientData.fromDateKey(dateKey).getDay()
  ) || [];

  const occupied = new Set(
    [...appointments, ...requests]
      .filter((item) => item.date === dateKey && item.status !== "cancelled" && item.status !== "rejected")
      .map((item) => item.time)
  );
  const freeSlots = slots.filter((slot) => !occupied.has(slot.time));

  const selectedDate =
    patientData.fromDateKey(
      dateKey
    );

  const selectedDay =
    new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );

  const currentDay =
    new Date();

  currentDay.setHours(
    0,
    0,
    0,
    0
  );


  /*
   * Não permite selecionar
   * dias que já passaram.
   */

  if (
    selectedDay <
    currentDay
  ) {
    return [];
  }


  /*
   * Se for um dia futuro,
   * retorna todos os horários livres.
   */

  if (
    selectedDay.getTime() !==
    currentDay.getTime()
  ) {
    return freeSlots;
  }


  /*
   * Se for hoje,
   * remove horários que já passaram.
   */

  const now =
    new Date();


  return freeSlots.filter(
    (slot) => {
      const [
        hour,
        minute
      ] =
        slot.time
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
    }
  );
}


/* =========================================================
   PERFIL NA SIDEBAR
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
   CALENDÁRIO
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

  const now = new Date();


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
      dayOnly <
      today;


    const dayAppointments =
      myAppointments
        .filter(
          (item) =>
            item.date ===
            dateKey
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
            item.date ===
              dateKey &&
            item.status ===
              "pending"
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
          dateTimeFromItem(
            item
          ) >=
          new Date()
      );

    const completedAppointment =
      dayAppointments.find(
        (item) =>
          dateTimeFromItem(item) < now
      );


    const openSlots =
      !isPast &&
      !isOtherMonth
        ? getSelectableSlots(
            dateKey
          )
        : [];


    const button =
      document.createElement(
        "button"
      );


    button.type =
      "button";


    button.className =
      "patient-day psic-day";


    button.setAttribute(
      "role",
      "gridcell"
    );


    button.dataset.date =
      dateKey;


    if (
      date.getDay() === 0 ||
      date.getDay() === 6
    ) {
      button.classList.add(
        "weekend"
      );
    }


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
      "patient-day-number psic-day-number";


    number.textContent =
      String(
        date.getDate()
      );


    button.append(
      number
    );


    const info =
      document.createElement(
        "span"
      );


    info.className =
      "patient-day-info psic-day-info";


    /*
     * Prioridade visual:
     *
     * 1. Solicitação pendente
     * 2. Consulta confirmada
     * 3. Hoje
     * 4. Horário disponível
     */

    if (pendingRequests.length) {
      button.classList.add(
        "has-pending"
      );


      info.textContent =
        pendingRequests[0].time;


      button.append(
        info
      );

    } else if (futureAppointment) {
      button.classList.add(
        "has-approved",
        "has-confirmed"
      );


      info.textContent =
        futureAppointment.time;


      button.append(
        info
      );

    } else if (completedAppointment) {
      button.classList.add(
        "has-completed"
      );

      info.textContent =
        completedAppointment.time;

      button.append(
        info
      );

    } else if (openSlots.length) {
      button.classList.add(
        "has-available"
      );


      info.textContent =
        openSlots[0];


      button.append(
        info
      );
    }

    if (dateKey === todayKey) {
      button.classList.add("today");

      if (info.textContent) {
        const todayLabel = document.createElement("span");
        todayLabel.className = "patient-day-today-label";
        todayLabel.textContent = "HOJE";
        button.append(todayLabel);
      } else {
        info.textContent = "HOJE";
        button.append(info);
      }
    }

    if (
      dateKey !== todayKey &&
      date.getDay() !== 0 &&
      date.getDay() !== 6 &&
      !pendingRequests.length &&
      !futureAppointment &&
      !completedAppointment &&
      !openSlots.length
    ) {
      button.classList.add(
        "is-unavailable"
      );
    }


    const selectable =
      !isOtherMonth &&
      !isPast &&
      (openSlots.length > 0 || dateKey === todayKey);


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


    ui.grid.append(
      button
    );
  }
}


/* =========================================================
   CARDS DE RESUMO
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
          dateTimeFromItem(
            item
          );


        return (
          date < now &&
          date >=
            thirtyDaysAgo
        );
      }
    );


  if (ui.completedCount) {
    ui.completedCount.textContent =
      `${completed.length} ` +
      `${
        completed.length === 1
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
            dateTimeFromItem(
              item
            )
        })
      )
      .filter(
        (item) =>
          item.dateTime >=
          now
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
        item.status ===
        "pending"
    );


  if (ui.pendingCount) {
    ui.pendingCount.textContent =
      `${pending.length} ` +
      `${
        pending.length === 1
          ? "solicitação"
          : "solicitações"
      }`;
  }
}


/* =========================================================
   POPUP - ESTADO DO BOTÃO
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


/* =========================================================
   CRIA BOTÃO DE HORÁRIO
   ========================================================= */

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
      if (schedulePopup) {
        schedulePopup
          .querySelectorAll(
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
      }


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


/* =========================================================
   MENSAGEM SEM HORÁRIOS
   ========================================================= */

function createNoSlotsMessage() {
  const message =
    document.createElement(
      "p"
    );


  message.className =
    "schedule-no-slots";


  message.textContent = availabilityLoadFailed
    ? "Não foi possível carregar os horários do psicólogo. Tente novamente mais tarde."
    : "Nenhum horário disponível para esta data.";


  return message;
}


/* =========================================================
   PREENCHE HORÁRIOS REAIS
   ========================================================= */

function renderScheduleTimes(
  date
) {
  if (
    !onlineTimes ||
    !presentialTimes
  ) {
    return;
  }


  const dateKey =
    patientData.toDateKey(
      date
    );


  const slots =
    getSelectableSlots(
      dateKey
    );


  onlineTimes.replaceChildren();

  presentialTimes.replaceChildren();


  if (!slots.length) {
    if (onlineColumn) onlineColumn.hidden = false;
    if (presentialColumn) presentialColumn.hidden = false;
    onlineTimes.append(
      createNoSlotsMessage()
    );


    presentialTimes.append(
      createNoSlotsMessage()
    );


    return;
  }


  const onlineSlots = slots.filter((slot) => slot.mode === "online");
  const presentialSlots = slots.filter((slot) => slot.mode === "presencial");
  if (onlineColumn) onlineColumn.hidden = onlineSlots.length === 0;
  if (presentialColumn) presentialColumn.hidden = presentialSlots.length === 0;

  slots.forEach(
    (slot) => {
      const mode = slot.mode === "presencial" ? "Presencial" : "Online";
      const target = mode === "Presencial" ? presentialTimes : onlineTimes;
      target.append(createScheduleTimeButton(slot.time, mode));
    }
  );
}


/* =========================================================
   ABRIR POPUP
   ========================================================= */

function openSchedulePopup(
  date
) {
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


  popupSelectedTime =
    "";


  popupSelectedMode =
    "";


  scheduleTerms.checked =
    false;


  updateScheduleSubmit();


  const formattedDate =
    popupDateFormatter.format(
      popupSelectedDate
    );


  schedulePopupDate.textContent =
    capitalizeFirst(
      formattedDate
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


/* =========================================================
   FECHAR POPUP
   ========================================================= */

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


  popupSelectedDate =
    null;


  popupSelectedTime =
    "";


  popupSelectedMode =
    "";


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


/* =========================================================
   SALVAR SOLICITAÇÃO
   ========================================================= */

async function submitScheduleRequest() {
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


  /*
   * Busca novamente os dados
   * antes de salvar.
   */

  const currentRequests =
    requests;


  const currentAppointments =
    patientData.getAppointments();


  /*
   * Verifica pedidos duplicados.
   */

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
          request.status ===
            "pending" ||

          request.status ===
            "approved"
        )
    );


  /*
   * Verifica consultas duplicadas.
   */

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


  /*
   * Confere mais uma vez se o
   * horário continua disponível.
   */

  const availableSlots =
    getSelectableSlots(
      dateKey
    );


  if (
    !availableSlots.some((slot) =>
      slot.time === popupSelectedTime
      && slot.mode === popupSelectedMode.toLowerCase()
    )
  ) {
    showToast(
      "Esse horário não está mais disponível. Escolha outro.",
      true
    );


    popupSelectedTime =
      "";


    popupSelectedMode =
      "";


    renderScheduleTimes(
      popupSelectedDate
    );


    updateScheduleSubmit();


    return;
  }


  /*
   * Caminho remoto: grava a solicitacao no banco.
   * Sem cliente ou sem sessao GoTrue, cai no fluxo
   * local (localStorage) abaixo.
   */

  const authUser =
    await getAuthUser();

  if (supabaseClient && authUser) {
    if (!schedulePsychologistId) {
      showToast(
        "Não há psicólogo disponível para receber a solicitação.",
        true
      );


      return;
    }


    const { error: insertError } =
      await supabaseClient
        .from("solicitacoes")
        .insert({
          psicologo_id: schedulePsychologistId,

          paciente_id: authUser.id,

          data_desejada: dateKey,

          horario: `${popupSelectedTime}:00`,

          duracao_min: 50,

          modalidade:
            popupSelectedMode.toLowerCase(),

          observacao: null,

          status: "pending"
        });


    if (insertError) {
      if (insertError.code === "23505") {
        showToast(
          "Você já possui uma solicitação ou consulta nesse horário.",
          true
        );


        return;
      }


      showToast(
        "Não foi possível enviar a solicitação. Tente novamente.",
        true
      );


      return;
    }


    await loadRemoteRequests();


    closeSchedulePopup();


    selectedDateKey =
      "";


    renderCalendar();

    renderSummary();


    showToast(
      "Solicitação enviada com sucesso."
    );


    return;
  }


  /*
   * Cria a solicitação.
   */

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
      new Date()
        .toISOString(),

    status:
      "pending"
  };


  currentRequests.push(
    request
  );


  patientData.saveRequests(
    currentRequests
  );


  /*
   * Atualiza os dados locais.
   */

  requests =
    currentRequests;


  appointments =
    currentAppointments;


  /*
   * Fecha o popup.
   */

  closeSchedulePopup();


  selectedDateKey =
    "";


  /*
   * Atualiza calendário e cards.
   */

  renderCalendar();

  renderSummary();


  /*
   * Confirmação visual.
   */

  showToast(
    "Solicitação enviada com sucesso."
  );
}

/* =========================================================
   FORMATA DATA DO PEDIDO
   ========================================================= */

function formatRequestDate(
  dateKey
) {
  const date =
    patientData.fromDateKey(
      dateKey
    );

  return capitalizeFirst(
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        weekday: "long",
        day: "numeric",
        month: "long"
      }
    ).format(date)
  );
}


/* =========================================================
   RENDERIZA PEDIDOS PENDENTES
   ========================================================= */

function renderPendingRequestsPopup() {
  if (!requestsPopupList) {
    return;
  }

  requestsPopupList.replaceChildren();


  const pending =
    requests
      .filter(
        (request) =>
          isSamePatient(
            request
          ) &&

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


  pending.forEach(
    (request) => {

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
        `${request.time} · ${request.mode || "Modalidade não informada"}`;


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
    }
  );
}


/* =========================================================
   ABRIR POPUP DE PEDIDOS
   ========================================================= */

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


/* =========================================================
   FECHAR POPUP DE PEDIDOS
   ========================================================= */

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


/* =========================================================
   CANCELAR PEDIDO
   ========================================================= */

async function cancelPendingRequest(
  requestId
) {
  const authUser =
    await getAuthUser();

  if (supabaseClient && authUser) {
    const { error: cancelError, count } =
      await supabaseClient
        .from("solicitacoes")
        .update(
          {
            status: "cancelled",

            revisado_em:
              new Date().toISOString()
          },
          { count: "exact" }
        )
        .eq("id", requestId)
        .eq("status", "pending");


    if (cancelError) {
      showToast(
        "Não foi possível cancelar a solicitação.",
        true
      );


      return;
    }


    if (!count) {
      showToast(
        "Esta solicitação não está mais pendente.",
        true
      );


      await loadRemoteRequests();


      renderCalendar();

      renderSummary();

      renderPendingRequestsPopup();


      return;
    }


    await loadRemoteRequests();


    renderCalendar();

    renderSummary();

    renderPendingRequestsPopup();


    showToast(
      "Solicitação cancelada."
    );


    return;
  }


  const currentRequests =
    requests;


  const updatedRequests =
    currentRequests.map(
      (request) => {

        if (
          request.id !==
          requestId
        ) {
          return request;
        }


        return {
          ...request,

          status:
            "cancelled",

          cancelledAt:
            new Date()
              .toISOString()
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
   EVENTOS DO POPUP
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


if (scheduleSubmit) {
  scheduleSubmit.addEventListener(
    "click",
    submitScheduleRequest
  );
}

/* =========================================================
   EVENTOS DO POPUP DE PEDIDOS
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
   EVENTOS DO POPUP DE CONSULTAS REALIZADAS
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
   NAVEGAÇÃO DOS MESES
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
   MENU MOBILE
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


}


/* =========================================================
   SINCRONIZAÇÃO ENTRE ABAS
   ========================================================= */

function refreshData() {
  if (!usingRemoteAppointments) {
    appointments =
      patientData.getAppointments();
  }


  if (!usingRemoteRequests) {
    requests =
      patientData.getRequests();
  }


  renderCalendar();

  renderSummary();
}


window.addEventListener(
  "storage",
  refreshData
);


/* =========================================================
   SOLICITAÇÕES REMOTAS (Supabase)
   ========================================================= */

function normalizeRemoteRequest(row) {
  return {
    id: row.id,

    patientId: row.paciente_id,

    patient: currentPatient.name,

    date: row.data_desejada,

    time:
      String(row.horario || "").slice(0, 5),

    duration: row.duracao_min || 50,

    mode: capitalizeFirst(row.modalidade),

    note: row.observacao || "",

    requestedAt: row.solicitado_em,

    status: row.status
  };
}


async function getAuthUser() {
  if (!supabaseClient) {
    return null;
  }

  try {
    const { data, error } =
      await supabaseClient.auth.getUser();

    if (error || !data?.user) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}


async function loadRemoteAvailability() {
  const authUser = await getAuthUser();
  if (!supabaseClient || !authUser) {
    availabilityLoadFailed = true;
    return false;
  }

  try {
    const { data: psychologist, error: psychologistError } = await supabaseClient
      .from("perfis")
      .select("id")
      .eq("papel", "psicologo")
      .limit(1)
      .maybeSingle();

    if (psychologistError || !psychologist?.id) {
      availabilityLoadFailed = true;
      return false;
    }

    const { data: rows, error } = await supabaseClient
      .from("disponibilidades")
      .select("dia_semana, horario, modalidade")
      .eq("psicologo_id", psychologist.id)
      .order("dia_semana")
      .order("horario");

    if (error) {
      availabilityLoadFailed = true;
      return false;
    }

    schedulePsychologistId = psychologist.id;
    availabilityByWeekday = new Map();
    (rows || []).forEach((row) => {
      const day = Number(row.dia_semana);
      const time = String(row.horario || "").slice(0, 5);
      if (!Number.isInteger(day) || day < 0 || day > 6 || !time) return;
      const slots = availabilityByWeekday.get(day) || [];
      slots.push({ time, mode: row.modalidade === "presencial" ? "presencial" : "online" });
      availabilityByWeekday.set(day, slots);
    });
    availabilityLoadFailed = false;
    return true;
  } catch {
    availabilityLoadFailed = true;
    return false;
  }
}


async function loadRemoteRequests() {
  const authUser =
    await getAuthUser();

  if (!authUser) {
    return false;
  }


  const { data: rows, error } =
    await supabaseClient
      .from("solicitacoes")
      .select(
        "id, paciente_id, data_desejada, horario, duracao_min, modalidade, observacao, solicitado_em, status"
      )
      .eq("paciente_id", authUser.id)
      .order("solicitado_em", { ascending: false });


  if (error) {
    return false;
  }


  requests =
    (rows || []).map(normalizeRemoteRequest);

  usingRemoteRequests = true;


  renderCalendar();

  renderSummary();


  return true;
}


async function loadRemoteAppointments() {
  const authUser =
    await getAuthUser();

  if (!authUser) {
    return false;
  }


  const remote =
    await patientData.loadAppointmentsFromDb();

  if (!remote) {
    return false;
  }


  currentPatient.id = authUser.id;

  appointments = remote;

  usingRemoteAppointments = true;


  renderCalendar();

  renderSummary();


  return true;
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

void (async function () {
  const _auth = await window.PsicNotaBackend.requireProfile("paciente");
  if (!_auth) return;

  renderPatientProfile();

  await loadRemoteAvailability();

  await Promise.all([
    loadRemoteAppointments(),
    loadRemoteRequests()
  ]);

  renderCalendar();

  renderSummary();
}());
