"use strict";


const data = window.PsiNoteData;


const params = new URLSearchParams(window.location.search);

const patientName =
  params.get("paciente") || "Paciente";



const elements = {

  title:
    document.querySelector("#patientTitle"),

  name:
    document.querySelector("#patientName"),

  avatar:
    document.querySelector("#patientAvatar"),

  email:
    document.querySelector("#patientEmail"),

  phone:
    document.querySelector("#patientPhone"),

  location:
    document.querySelector("#patientLocation"),


  nextDate:
    document.querySelector("#nextDate"),

  nextInfo:
    document.querySelector("#nextInfo"),

  lastDate:
    document.querySelector("#lastDate"),

  lastInfo:
    document.querySelector("#lastInfo"),


  notes:
    document.querySelector("#notesList"),

  reports:
    document.querySelector("#reportsList"),


  sidebar:
    document.querySelector(".sidebar"),

  mobile:
    document.querySelector(".mobile-menu")

};






function initials(name) {

  return name
    .split(" ")
    .map(x => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

}







function renderPsychologist() {


  const session = data.getSession();


  if (!session) return;


}








function getPatient() {

  if (!data.getProfiles)
    return null;


  return data
    .getProfiles()
    .find(
      p =>
        p.name === patientName ||
        p.fullName === patientName
    );

}








function renderPatient() {


  const patient =
    getPatient();



  elements.title.textContent =
    `PERFIL DE ${patientName.toUpperCase()}`;



  elements.name.textContent =
    patientName;



  if (!patient)
    return;



  elements.email.textContent =
    patient.email || "Não informado";


  elements.phone.textContent =
    patient.phone ||
    patient.telephone ||
    "Não informado";


  elements.location.textContent =
    patient.location ||
    patient.city ||
    "Não informado";



  if (patient.avatar) {

    elements.avatar.src = patient.avatar;

  }
  else if (patient.photo) {

    elements.avatar.src = patient.photo;

  }


}









function formatDate(date) {


  const parts =
    date.split("-");


  return `${parts[2]}/${parts[1]}/${parts[0]}`;

}









function renderAppointments() {


  if (
    !elements.nextDate ||
    !elements.lastDate
  )
    return;



  const appointments =

    data.getAppointments()

      .filter(

        item =>

          item.patient === patientName &&

          item.status !== "cancelled"

      )

      .sort(

        (a, b) =>

          (a.date + a.time)
            .localeCompare(
              b.date + b.time
            )

      );




  if (!appointments.length) {

    elements.nextDate.textContent =
      "--/--/----";

    elements.nextInfo.textContent =
      "Sem consultas";

    elements.lastDate.textContent =
      "--/--/----";

    elements.lastInfo.textContent =
      "Sem consultas";

    return;

  }




  const now =
    new Date();



  const future =

    appointments.filter(item => {


      return new Date(
        `${item.date}T${item.time}`
      ) >= now;


    });




  const next =

    future[0] || appointments[0];




  const previous =

    appointments

      .filter(
        item =>
          item !== next
      )

      .sort(

        (a, b) =>

          (b.date + b.time)
            .localeCompare(
              a.date + a.time
            )

      )[0];






  if (next) {


    elements.nextDate.textContent =

      formatDate(next.date);


    elements.nextInfo.textContent =

      `${next.time} • ${next.mode}`;


  }





  if (previous) {


    elements.lastDate.textContent =

      formatDate(previous.date);


    elements.lastInfo.textContent =

      `${previous.time} • ${previous.mode}`;


  }


}










function createItem(date, text, type) {


  const item =
    document.createElement("div");


  item.className =
    "list-item";



  item.innerHTML = `

    <span class="icon">

      ${type === "report"
      ? '<i data-lucide="file-text"></i>'
      : '<i data-lucide="message-square"></i>'
    }

    </span>


    <div>

      <strong>
        ${date}
      </strong>


      <p>
        ${text}
      </p>

    </div>


    <b>
      ›
    </b>

  `;



  return item;

}









function renderNotes() {


  if (!elements.notes)
    return;



  elements.notes.innerHTML = "";



  const appointments =

    data.getAppointments()

      .filter(

        item =>

          item.patient === patientName

      );



  const notes =

    appointments

      .filter(

        item =>

          data.hasAppointmentNote(item.id)

      );




  if (notes.length === 0) {


    elements.notes.append(

      createItem(
        "--",
        "Nenhuma nota rápida encontrada",
        "note"
      )

    );


    return;

  }






  notes.slice(0, 3)

    .forEach(item => {


      elements.notes.append(


        createItem(

          new Intl.DateTimeFormat(
            "pt-BR"
          )

            .format(

              data.fromDateKey(
                item.date
              )

            ),


          data.getAppointmentNote(
            item.id
          ),


          "note"

        )

      );


    });


}









function renderReports() {


  if (!elements.reports)
    return;



  elements.reports.innerHTML = "";



  const reports =


    data.getReports()

      .filter(

        item =>

          item.patient === patientName

      )

      .slice(0, 3);





  if (reports.length === 0) {


    elements.reports.append(

      createItem(
        "--",
        "Nenhum relatório encontrado",
        "report"
      )

    );


    return;

  }







  reports.forEach(report => {


    elements.reports.append(


      createItem(

        new Intl.DateTimeFormat(
          "pt-BR"
        )

          .format(

            new Date(
              report.createdAt
            )

          ),


        "Relatório pós-consulta disponível",


        "report"

      )

    );


  });


}








/* MENU MOBILE */


elements.mobile?.addEventListener(

  "click",

  () => {


    const open =

      elements.sidebar.classList.toggle(
        "open"
      );


    elements.mobile

      .setAttribute(

        "aria-expanded",

        String(open)

      );


  });










function init() {


  renderPsychologist();

  renderPatient();

  renderAppointments();

  renderNotes();

  renderReports();


  lucide.createIcons();

}


init();