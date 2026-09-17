"use strict";


const data = window.PsiNoteData;


const params =
  new URLSearchParams(window.location.search);


const patientName =
  params.get("paciente") || "Paciente";


const PAGE_SIZE = 8;

let visibleNotes = PAGE_SIZE;
let patientNotes = [];


const elements = {

  title:
    document.querySelector("#patientTitle"),

  name:
    document.querySelector("#patientName"),

  meta:
    document.querySelector("#patientMeta"),

  avatar:
    document.querySelector("#patientAvatar"),

  email:
    document.querySelector("#patientEmail"),

  phone:
    document.querySelector("#patientPhone"),

  location:
    document.querySelector("#patientLocation"),

  notesList:
    document.querySelector("#notesHistoryList"),

  empty:
    document.querySelector("#notesEmpty"),

  loadMore:
    document.querySelector("#loadMoreButton"),

  sidebar:
    document.querySelector(".sidebar"),

  mobile:
    document.querySelector(".mobile-menu")

};


/* ===============================
   DATA
================================ */

function formatDate(dateKey) {

  if (!dateKey) {
    return "--/--/----";
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(
    data.fromDateKey(dateKey)
  );

}



/* ===============================
   PACIENTE
================================ */

function getPatient() {

  if (!data.getProfiles) {
    return null;
  }


  return data
    .getProfiles()
    .find(
      patient =>
        patient.name === patientName ||
        patient.fullName === patientName
    );

}



function renderPatient() {

  const patient =
    getPatient();


  elements.title.textContent =
    `PERFIL DE ${patientName.toUpperCase()}`;


  elements.name.textContent =
    patientName;


  if (!patient) {
    return;
  }


  elements.email.textContent =
    patient.email ||
    "Não informado";


  elements.phone.textContent =
    patient.phone ||
    patient.telephone ||
    "Não informado";


  elements.location.textContent =
    patient.location ||
    patient.city ||
    "Não informado";


  if (patient.age) {

    const pronouns =
      patient.pronouns ||
      patient.pronome ||
      "";

    elements.meta.textContent =
      pronouns
        ? `${patient.age} anos • ${pronouns}`
        : `${patient.age} anos`;

  }


  if (patient.avatar) {

    elements.avatar.src =
      patient.avatar;

  }
  else if (patient.photo) {

    elements.avatar.src =
      patient.photo;

  }

}



/* ===============================
   LINKS DAS ABAS
================================ */

function updateTabsLinks() {

  const encodedPatient =
    encodeURIComponent(patientName);


  document
    .querySelectorAll(".patient-tabs a")
    .forEach(link => {

      const href =
        link.getAttribute("href");

      if (!href) {
        return;
      }


      const page =
        href.split("?")[0];


      link.href =
        `${page}?paciente=${encodedPatient}`;

    });

}



/* ===============================
   BUSCAR NOTAS
================================ */

function getPatientNotes() {

  return data
    .getAppointments()

    .filter(
      appointment =>
        appointment.patient === patientName &&
        data.hasAppointmentNote(appointment.id)
    )

    .map(appointment => ({

      appointmentId:
        appointment.id,

      date:
        appointment.date,

      time:
        appointment.time,

      text:
        data.getAppointmentNote(
          appointment.id
        )

    }))

    .sort((a, b) => {

      const aKey =
        `${a.date}T${a.time || "00:00"}`;

      const bKey =
        `${b.date}T${b.time || "00:00"}`;


      return bKey.localeCompare(aKey);

    });

}



/* ===============================
   CRIAR CARD
================================ */

function createNoteItem(note) {

  const item =
    document.createElement("article");


  item.className =
    "note-history-item";


  item.tabIndex = 0;


  item.innerHTML = `

    <div class="note-history-icon">
      <i data-lucide="message-square"></i>
    </div>


    <div class="note-history-content">

      <strong class="note-history-date">
        ${formatDate(note.date)}
      </strong>

      <p class="note-history-text">
        ${escapeHTML(note.text)}
      </p>

    </div>


    <div class="note-history-arrow">
      <i data-lucide="chevron-right"></i>
    </div>

  `;


  const openAppointment = () => {

    window.location.href =
      `consulta.html?id=${encodeURIComponent(note.appointmentId)}&paciente=${encodeURIComponent(patientName)}`;

  };


  item.addEventListener(
    "click",
    openAppointment
  );


  item.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        openAppointment();

      }

    }
  );


  return item;

}



/* ===============================
   SEGURANÇA DO TEXTO
================================ */

function escapeHTML(value) {

  const element =
    document.createElement("div");


  element.textContent =
    String(value || "");


  return element.innerHTML;

}



/* ===============================
   RENDERIZAÇÃO
================================ */

function renderNotes() {

  elements.notesList.innerHTML = "";


  if (!patientNotes.length) {

    elements.empty.hidden = false;
    elements.loadMore.hidden = true;

    lucide.createIcons();

    return;

  }


  elements.empty.hidden = true;


  patientNotes
    .slice(0, visibleNotes)
    .forEach(note => {

      elements.notesList.append(
        createNoteItem(note)
      );

    });


  elements.loadMore.hidden =
    visibleNotes >= patientNotes.length;


  lucide.createIcons();

}



/* ===============================
   CARREGAR MAIS
================================ */

elements.loadMore?.addEventListener(
  "click",
  () => {

    visibleNotes += PAGE_SIZE;

    renderNotes();

  }
);



/* ===============================
   MENU MOBILE
================================ */

elements.mobile?.addEventListener(
  "click",
  () => {

    if (!elements.sidebar) {
      return;
    }


    const open =
      elements.sidebar
        .classList
        .toggle("open");


    elements.mobile.setAttribute(
      "aria-expanded",
      String(open)
    );

  }
);



/* ===============================
   INIT
================================ */

function init() {

  renderPatient();

  updateTabsLinks();

  patientNotes =
    getPatientNotes();

  renderNotes();

  lucide.createIcons();

}


init();