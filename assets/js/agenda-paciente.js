"use strict";

const patientData = window.PsiNoteData;


/* =========================================================
   ELEMENTOS
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

          return sameId || sameEmail;
        }
      )
    : null;


const currentPatient = {
  ...session,
  ...patientProfile,

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
    ""
};


/* =========================================================
   DADOS
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

let selectedDateKey = "";


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


/* =========================================================
   AUXILIARES
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
    patientData.fromDateKey(
      dateKey
    );

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

    const isPast =
      date < today;


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
          dateTimeFromItem(item) >=
          new Date()
      );


    const openSlots =
      !isPast &&
      !isOtherMonth
        ? patientData.getOpenSlots(
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
      Prioridade:

      1. Solicitação pendente
      2. Consulta confirmada
      3. Hoje
      4. Horário disponível
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
      dateKey ===
      todayKey
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
      !isPast;


    button.disabled =
      !selectable;


    if (selectable) {

      button.addEventListener(
        "click",
        () => {

          selectedDateKey =
            dateKey;

          renderCalendar();

        }
      );

    }


    ui.grid.append(
      button
    );
  }
}


/* =========================================================
   CARDS INFERIORES
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
          date >= thirtyDaysAgo
        );
      }
    );


  ui.completedCount.textContent =
    `${completed.length} ` +
    `${
      completed.length === 1
        ? "atendimento"
        : "atendimentos"
    }`;


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
          item.dateTime >= now
      )
      .sort(
        (a, b) =>
          a.dateTime -
          b.dateTime
      )[0];


  ui.nextAppointment.textContent =
    next
      ? formatCompactDate(
          next.date,
          next.time
        )
      : "Nenhuma consulta";


  const pending =
    getMyRequests().filter(
      (item) =>
        item.status ===
        "pending"
    );


  ui.pendingCount.textContent =
    `${pending.length} ` +
    `${
      pending.length === 1
        ? "solicitação"
        : "solicitações"
    }`;
}


/* =========================================================
   ATUALIZA DADOS
   ========================================================= */

function refreshData() {

  appointments =
    patientData.getAppointments();

  requests =
    patientData.getRequests();

  renderCalendar();
  renderSummary();
}


/* =========================================================
   NAVEGAÇÃO DOS MESES
   ========================================================= */

ui.previousMonth.addEventListener(
  "click",
  () => {

    visibleMonth =
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() -
          1,
        1
      );

    selectedDateKey =
      "";

    renderCalendar();

  }
);


ui.nextMonth.addEventListener(
  "click",
  () => {

    visibleMonth =
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() +
          1,
        1
      );

    selectedDateKey =
      "";

    renderCalendar();

  }
);


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
   SINCRONIZAÇÃO
   ========================================================= */

window.addEventListener(
  "storage",
  refreshData
);


/* =========================================================
   INICIALIZA
   ========================================================= */

renderPatientProfile();
renderCalendar();
renderSummary();