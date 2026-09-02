"use strict";

/* ==========================================================================
   Psicólogo · Pacientes
========================================================================== */


const data = window.PsiNoteData;


/* =========================
   ELEMENTOS
========================= */

const elements = {

  psychologistName:
    document.querySelector("#psychologistName"),

  psychologistAvatar:
    document.querySelector("#psychologistAvatar"),

  patientSearch:
    document.querySelector("#patientSearch"),

  patientList:
    document.querySelector("#patientList"),

  patientTotal:
    document.querySelector("#patientTotal"),

  emptyPatients:
    document.querySelector("#emptyPatients"),

  noMatch:
    document.querySelector("#noMatch"),

  recentAppointments:
    document.querySelector("#recentAppointments"),

  recentEmpty:
    document.querySelector("#recentEmpty"),

  sidebar:
    document.querySelector(".sidebar"),

  mobileMenu:
    document.querySelector(".mobile-menu"),

  loadMore:
    document.querySelector("#loadMorePatients")

};


/* =========================
   CONFIGURAÇÃO
========================= */

const PATIENTS_PER_PAGE = 8;

let visiblePatients = PATIENTS_PER_PAGE;

let allPatients = [];


/* =========================
   FORMATADORES
========================= */

const shortDateFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );


const monthFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      month: "short"
    }
  );


/* =========================
   SESSÃO
========================= */

const session =
  data && typeof data.getSession === "function"
    ? data.getSession()
    : null;


const currentPsychologist =
  session &&
  ["psicologo", "psychologist"].includes(session.role)

    ? session

    : {

        id: "demo-psychologist",

        name: "Psicólogo PsiNota",

        fullName: "Psicólogo PsiNota",

        role: "psicologo"

      };


/* =========================
   FUNÇÕES AUXILIARES
========================= */

function getInitials(name) {

  return String(name)

    .split(/\s+/)

    .filter(Boolean)

    .slice(0, 2)

    .map(
      part => part[0]
    )

    .join("")

    .toUpperCase();

}


function getAppointmentDateTime(appointment) {

  if (
    !appointment ||
    !appointment.date ||
    !appointment.time
  ) {

    return new Date(0);

  }


  return new Date(
    `${appointment.date}T${appointment.time}:00`
  );

}


function formatDuration(duration) {

  const value = Number(duration);


  if (value === 60) {

    return "1 hora";

  }


  if (!Number.isFinite(value)) {

    return "Duração não informada";

  }


  return `${value} min`;

}


/* =========================
   CONSTRUIR PACIENTES
========================= */

function buildPatients() {

  if (
    !data ||
    typeof data.getAppointments !== "function"
  ) {

    return [];

  }


  const appointments =
    data.getAppointments() || [];


  const reports =
    typeof data.getReports === "function"
      ? data.getReports() || []
      : [];


  const documents =
    typeof data.getDocuments === "function"
      ? data.getDocuments() || []
      : [];


  const now =
    new Date();


  const byName =
    new Map();


  appointments.forEach((item) => {

    const name =
      String(item.patient || "").trim();


    if (!name) {
      return;
    }


    if (!byName.has(name)) {

      byName.set(
        name,
        []
      );

    }


    byName
      .get(name)
      .push(item);

  });


  const patients = [];


  byName.forEach(
    (items, name) => {

      const active =

        items

          .filter(
            item =>
              item.status !== "cancelled"
          )

          .map(
            item => ({

              ...item,

              dateTime:
                getAppointmentDateTime(item)

            })
          );


      const past =

        active

          .filter(
            item =>
              item.dateTime < now
          )

          .sort(
            (a, b) =>
              b.dateTime - a.dateTime
          );


      const future =

        active

          .filter(
            item =>
              item.dateTime >= now
          )

          .sort(
            (a, b) =>
              a.dateTime - b.dateTime
          );


      patients.push({

        name,

        total:
          active.length,

        last:

          past[0] || null,

        next:

          future[0] || null,

        notes:

          typeof data.hasAppointmentNote === "function"

            ? items.filter(
                item =>
                  data.hasAppointmentNote(item.id)
              ).length

            : 0,

        reports:

          reports.filter(
            report =>
              report.patient === name
          ).length,

        documents:

          documents.filter(
            document =>
              document.patient === name
          ).length,

        sortKey:

          past[0]?.dateTime ||

          future[0]?.dateTime ||

          new Date(0)

      });

    }
  );


  return patients.sort(
    (a, b) =>
      b.sortKey - a.sortKey
  );

}


/* =========================
   RENDERIZAR CARD
========================= */

function renderPatient(patient) {

  const card =
    document.createElement("article");


  card.className =
    "patient-card";


  card.setAttribute(
    "tabindex",
    "0"
  );


  card.setAttribute(
    "role",
    "link"
  );


  card.setAttribute(
    "aria-label",
    `Abrir histórico de ${patient.name}`
  );


  function openHistory() {

    window.location.href =
      `historico.html?paciente=${encodeURIComponent(
        patient.name
      )}`;

  }


  card.addEventListener(
    "click",
    openHistory
  );


  card.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        openHistory();

      }

    }
  );


  /* =========================
     AVATAR
  ========================= */

  const avatar =
    document.createElement("div");


  avatar.className =
    "patient-avatar";


  avatar.setAttribute(
    "aria-hidden",
    "true"
  );


  avatar.textContent =
    getInitials(patient.name);


  /* Caso futuramente o paciente
     tenha uma foto no shared-data. */

  if (patient.avatarDataUrl) {

    avatar.classList.add(
      "has-photo"
    );

    avatar.style.backgroundImage =
      `url("${patient.avatarDataUrl}")`;

  }


  /* =========================
     INFORMAÇÕES
  ========================= */

  const info =
    document.createElement("div");


  info.className =
    "patient-info";


  const name =
    document.createElement("strong");


  const names = patient.name.split(" ");

  name.innerHTML =
    names.length > 1
      ? `${names[0]}<br>${names.slice(1).join(" ")}`
      : patient.name;


  const meta =
    document.createElement("div");


  meta.className =
    "patient-meta";


  // Próxima consulta
  if (patient.next) {

    const next =
      document.createElement("span");


    next.className =
      "patient-next";


    next.textContent =
      `Próxima: ${
        shortDateFormatter.format(
          patient.next.dateTime
        )
      } às ${
        patient.next.time
      }`;


    meta.append(next);

  }


  // Última consulta
  if (patient.last) {

    const last =
      document.createElement("span");


    last.textContent =
      `Última consulta: ${
        shortDateFormatter.format(
          patient.last.dateTime
        )
      }`;


    meta.append(last);

  }


  info.append(
    name,
    meta
  );


  /* =========================
     SETA
  ========================= */

  const arrow =
    document.createElement("div");


  arrow.className =
    "patient-arrow";


  arrow.setAttribute(
    "aria-hidden",
    "true"
  );


  arrow.innerHTML = `

    <svg viewBox="0 0 24 24">

      <path d="M9 18l6-6-6-6"/>

    </svg>

  `;


  /* =========================
     MONTAR CARD
  ========================= */

  card.append(
    avatar,
    info,
    arrow
  );


  return card;

}


/* =========================
   RENDERIZAR PACIENTES
========================= */

function renderPatients() {

  if (!elements.patientList) {
    return;
  }


  const query =
    elements.patientSearch
      ? elements.patientSearch.value
          .trim()
          .toLowerCase()
      : "";


  const filtered =

    query

      ? allPatients.filter(
          patient =>
            patient.name
              .toLowerCase()
              .includes(query)
        )

      : allPatients;


  elements.patientList.replaceChildren();


  if (elements.emptyPatients) {

    elements.emptyPatients.hidden =
      allPatients.length > 0;

  }


  if (elements.noMatch) {

    elements.noMatch.hidden =
      !(
        allPatients.length > 0 &&
        filtered.length === 0
      );

  }


  if (filtered.length === 0) {

    if (elements.loadMore) {

      elements.loadMore.hidden = true;

    }

    if (elements.patientTotal) {

      elements.patientTotal.textContent =
        "0 pacientes";

    }

    return;

  }


  const patientsToShow =
    filtered.slice(
      0,
      visiblePatients
    );


  if (elements.patientTotal) {

    elements.patientTotal.textContent =
    filtered.length === 1
      ? '1 paciente no total'
      : `${filtered.length} pacientes no total`;

  }


  patientsToShow.forEach(
    patient => {

      elements.patientList.append(
        renderPatient(patient)
      );

    }
  );


  if (elements.loadMore) {

    elements.loadMore.hidden =
      patientsToShow.length >= filtered.length;

  }

}


/* =========================
   CARREGAR MAIS
========================= */

function loadMorePatients() {

  visiblePatients +=
    PATIENTS_PER_PAGE;


  renderPatients();

}


/* =========================
   CONSULTAS RECENTES
========================= */

function getRecentAppointments() {

  if (
    !data ||
    typeof data.getAppointments !== "function"
  ) {

    return [];

  }


  const now =
    new Date();


  return (

    data.getAppointments() || []

  )

    .filter(
      item =>
        item.status !== "cancelled"
    )

    .map(
      item => ({

        ...item,

        dateTime:
          getAppointmentDateTime(item)

      })
    )

    .filter(
      item =>
        item.dateTime < now
    )

    .sort(
      (a, b) =>
        b.dateTime - a.dateTime
    )

    .slice(0, 4);

}


/* =========================
   RENDERIZAR CONSULTA
========================= */

function renderRecentAppointment(
  appointment
) {

  const item =
    document.createElement("article");


  item.className =
    "recent-appointment";


  const date =
    document.createElement("div");


  date.className =
    "recent-date";


  const day =
    document.createElement("strong");


  day.textContent =
    String(
      appointment.dateTime.getDate()
    ).padStart(2, "0");


  const month =
    document.createElement("span");


  month.textContent =
    monthFormatter
      .format(
        appointment.dateTime
      )
      .replace(".", "");


  date.append(
    day,
    month
  );


  const copy =
    document.createElement("div");


  copy.className =
    "recent-copy";


  const patient =
    document.createElement("strong");


  patient.textContent =
    appointment.patient;


  const meta =
    document.createElement("span");


  const mode =
    appointment.mode ||
    "Modalidade não informada";


  meta.textContent =

    `${appointment.time} · ` +

    `${formatDuration(
      appointment.duration
    )} · ` +

    `${mode}`;


  copy.append(
    patient,
    meta
  );


  const open =
    document.createElement("a");


  open.className =
    "recent-open";


  open.href =
    `consulta.html?id=${encodeURIComponent(
      appointment.id
    )}`;


  open.setAttribute(
    "aria-label",
    `Abrir registro da consulta de ${appointment.patient}`
  );


  open.innerHTML = `

    <svg
      viewBox="0 0 24 24"
      aria-hidden="true">

      <path d="M9 18l6-6-6-6"/>

    </svg>

  `;


  item.append(
    date,
    copy,
    open
  );


  return item;

}


/* =========================
   RENDERIZAR CONSULTAS
========================= */

function renderRecentAppointments() {

  if (
    !elements.recentAppointments
  ) {

    return;

  }


  const recent =
    getRecentAppointments();


  elements.recentAppointments
    .replaceChildren();


  if (elements.recentEmpty) {

    elements.recentEmpty.hidden =
      recent.length > 0;

  }


  recent.forEach(
    appointment => {

      elements.recentAppointments.append(
        renderRecentAppointment(
          appointment
        )
      );

    }
  );

}


/* =========================
   CABEÇALHO DO PSICÓLOGO
========================= */

function renderHeader() {

  const displayName =

    currentPsychologist.fullName ||

    currentPsychologist.name ||

    "Psicólogo PsiNota";


  if (elements.psychologistName) {

    elements.psychologistName.textContent =
      displayName;

  }


  if (elements.psychologistAvatar) {

    elements.psychologistAvatar.textContent =
      getInitials(displayName);


    elements.psychologistAvatar
      .classList.toggle(
        "has-photo",
        Boolean(
          currentPsychologist.avatarDataUrl
        )
      );


    elements.psychologistAvatar.style
      .backgroundImage =

      currentPsychologist.avatarDataUrl

        ? `url("${currentPsychologist.avatarDataUrl}")`

        : "";

  }

}


/* =========================
   RENDER GERAL
========================= */

function renderAll() {

  allPatients =
    buildPatients();


  visiblePatients =
    PATIENTS_PER_PAGE;


  renderHeader();

  renderPatients();

  renderRecentAppointments();

}


/* =========================
   BUSCA
========================= */

if (elements.patientSearch) {

  elements.patientSearch
    .addEventListener(
      "input",
      () => {

        visiblePatients =
          PATIENTS_PER_PAGE;

        renderPatients();

      }
    );

}


/* =========================
   CARREGAR MAIS
========================= */

if (elements.loadMore) {

  elements.loadMore
    .addEventListener(
      "click",
      loadMorePatients
    );

}


/* =========================
   MENU MOBILE
========================= */

if (
  elements.mobileMenu &&
  elements.sidebar
) {

  elements.mobileMenu
    .addEventListener(
      "click",
      () => {

        const isOpen =
          elements.sidebar
            .classList
            .toggle("open");


        elements.mobileMenu
          .setAttribute(
            "aria-expanded",
            String(isOpen)
          );

      }
    );


  document.addEventListener(
    "click",
    (event) => {

      if (

        window.innerWidth <= 720 &&

        !elements.sidebar
          .contains(event.target) &&

        !elements.mobileMenu
          .contains(event.target)

      ) {

        elements.sidebar
          .classList
          .remove("open");


        elements.mobileMenu
          .setAttribute(
            "aria-expanded",
            "false"
          );

      }

    }
  );

}


/* =========================
   STORAGE
========================= */

window.addEventListener(
  "storage",
  renderAll
);


/* =========================
   INICIALIZAÇÃO
========================= */

renderAll();
