"use strict";


/* =========================================================
   DADOS GLOBAIS
   ========================================================= */

const patientData = window.PsiNoteData;

if (!patientData) {
  throw new Error(
    "PsiNoteData não foi carregado. Verifique se o arquivo de dados é carregado antes de agenda-paciente.js."
  );
}


/* =========================================================
   ELEMENTOS DA INTERFACE
   ========================================================= */

const ui = {
  grid:
    document.querySelector(
      "#patientCalendarGrid"
    ),

  monthTitle:
    document.querySelector(
      "#patientMonthTitle"
    ),

  previousMonth:
    document.querySelector(
      "#patientPreviousMonth"
    ),

  nextMonth:
    document.querySelector(
      "#patientNextMonth"
    ),

  completedCount:
    document.querySelector(
      "#completedAppointmentsCount"
    ),

  nextAppointment:
    document.querySelector(
      "#nextAppointmentSummary"
    ),

  pendingCount:
    document.querySelector(
      "#pendingRequestsCount"
    ),

  name:
    document.querySelector(
      "#patientNameTop"
    ),

  avatar:
    document.querySelector(
      "#patientAvatar"
    ),

  sidebar:
    document.querySelector(
      ".sidebar"
    ),

  mobileMenu:
    document.querySelector(
      ".mobile-menu"
    )
};


/* =========================================================
   ELEMENTOS DO POPUP
   ========================================================= */

const schedulePopup =
  document.getElementById(
    "schedulePopup"
  );

const schedulePopupClose =
  document.getElementById(
    "schedulePopupClose"
  );

const schedulePopupDate =
  document.getElementById(
    "schedulePopupDate"
  );

const onlineTimes =
  document.getElementById(
    "onlineTimes"
  );

const presentialTimes =
  document.getElementById(
    "presentialTimes"
  );

const onlineColumn =
  document.getElementById(
    "onlineColumn"
  );

const presentialColumn =
  document.getElementById(
    "presentialColumn"
  );

const scheduleTerms =
  document.getElementById(
    "scheduleTerms"
  );

const scheduleSubmit =
  document.getElementById(
    "scheduleSubmit"
  );


/* =========================================================
   USUÁRIO ATUAL
   ========================================================= */

const session =
  patientData.getSession();

const profiles =
  patientData.getProfiles();


const patientProfile =
  session
    ? profiles.find(
        (profile) => {

          const sameId =
            session.id &&
            profile.id === session.id;

          const sameEmail =
            session.email &&
            profile.email &&
            profile.email
              .toLowerCase() ===
              session.email
                .toLowerCase();

          return (
            sameId ||
            sameEmail
          );
        }
      )
    : null;


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


let selectedDateKey =
  "";


/* =========================================================
   DADOS DO POPUP
   ========================================================= */

let popupSelectedDate =
  null;

let popupSelectedTime =
  "";

let popupSelectedMode =
  "";


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
    value
      .charAt(0)
      .toLocaleUpperCase("pt-BR") +
    value.slice(1)
  );
}


function getInitials(name) {

  return String(
    name || "PN"
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]
    )
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
    new Date(
      firstDay
    );


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
      item.status !==
        "cancelled"
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
   HORÁRIOS DISPONÍVEIS
   ========================================================= */

function getSelectableSlots(
  dateKey
) {

  const slots =
    patientData.getOpenSlots(
      dateKey
    ) || [];


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
   * Dia no passado.
   */

  if (
    selectedDay <
    currentDay
  ) {
    return [];
  }


  /*
   * Se não for hoje,
   * todos os horários livres
   * continuam disponíveis.
   */

  if (
    selectedDay.getTime() !==
    currentDay.getTime()
  ) {
    return slots;
  }


  /*
   * Se for hoje,
   * remove horários que
   * já passaram.
   */

  const now =
    new Date();


  return slots.filter(
    (time) => {

      const [
        hour,
        minute
      ] =
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


      return (
        slotDate >
        now
      );
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
      currentPatient
        .avatarDataUrl
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
      new Date(
        start
      );


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


    button.append(
      number
    );


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
        pendingRequests[0]
          .time;


      button.append(
        info
      );

    } else if (
      !isOtherMonth &&
      futureAppointment
    ) {

      button.classList.add(
        "has-approved"
      );


      info.textContent =
        futureAppointment
          .time;


      button.append(
        info
      );

    } else if (
      dateKey ===
      todayKey
    ) {

      button.classList.add(
        "today"
      );


      info.textContent =
        "HOJE";


      button.append(
        info
      );

    } else if (
      !isOtherMonth &&
      openSlots.length
    ) {

      button.classList.add(
        "has-available"
      );


      info.textContent =
        openSlots[0];


      button.append(
        info
      );
    }


    /*
     * Só permite clicar
     * se existir pelo menos
     * um horário realmente livre.
     */

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
    new Date(
      now
    );


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


  message.textContent =
    "Nenhum horário disponível.";


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


  /*
   * Atualmente PsiNoteData fornece
   * os horários livres do dia,
   * mas não separa disponibilidade
   * por modalidade.
   *
   * Portanto os horários realmente
   * livres aparecem nas duas colunas.
   *
   * A modalidade escolhida é salva
   * junto da solicitação.
   */

  if (
    onlineColumn
  ) {

    onlineColumn.hidden =
      false;
  }


  if (
    presentialColumn
  ) {

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


  slots.forEach(
    (time) => {

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


  /*
   * Busca os dados novamente
   * antes de salvar.
   */

  const currentRequests =
    patientData.getRequests();


  const currentAppointments =
    patientData.getAppointments();


  /*
   * Verifica se o paciente já
   * possui pedido nesse horário.
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
   * Verifica se o paciente já
   * possui consulta nesse horário.
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

    alert(
      "Você já possui uma solicitação ou consulta nesse horário."
    );

    return;
  }


  /*
   * Confere novamente se o horário
   * ainda está livre antes de salvar.
   */

  const availableSlots =
    getSelectableSlots(
      dateKey
    );


  if (
    !availableSlots.includes(
      popupSelectedTime
    )
  ) {

    alert(
      "Esse horário não está mais disponível. Escolha outro."
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
   * Mantém os dados locais
   * atualizados.
   */

  requests =
    currentRequests;


  appointments =
    currentAppointments;


  closeSchedulePopup();


  selectedDateKey =
    "";


  renderCalendar();

  renderSummary();


  alert(
    "Solicitação enviada com sucesso."
  );
}


/* =========================================================
   EVENTOS DO POPUP
   ========================================================= */

if (
  scheduleTerms
) {

  scheduleTerms.addEventListener(
    "change",
    updateScheduleSubmit
  );
}


if (
  schedulePopupClose
) {

  schedulePopupClose.addEventListener(
    "click",
    closeSchedulePopup
  );
}


if (
  schedulePopup
) {

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


if (
  scheduleSubmit
) {

  scheduleSubmit.addEventListener(
    "click",
    submitScheduleRequest
  );
}


/* =========================================================
   NAVEGAÇÃO DOS MESES
   ========================================================= */

if (
  ui.previousMonth
) {

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


if (
  ui.nextMonth
) {

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
        String(
          isOpen
        )
      );
    }
  );


  document.addEventListener(
    "click",
    (event) => {

      if (
        window.innerWidth >
        720
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
   SINCRONIZAÇÃO ENTRE ABAS
   ========================================================= */

function refreshData() {

  appointments =
    patientData.getAppointments();


  requests =
    patientData.getRequests();


  renderCalendar();

  renderSummary();
}


window.addEventListener(
  "storage",
  refreshData
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

renderPatientProfile();

renderCalendar();

renderSummary();